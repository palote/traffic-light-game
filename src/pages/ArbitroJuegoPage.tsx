import { useState, useEffect, useRef } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useParams } from "react-router-dom";
import { app } from "../firebase.config";
import { useArbitroT, fillArbitro } from "../i18n";
import { PALETA, EQUIPO_COLORES, EQUIPO_COLOR_1, EQUIPO_COLOR_2 } from "../utils/arbitroPalette";
import { coloresArea } from "../utils/arbitroAreas";

interface SesionData {
  area?: string;
  materia: string;
  nivel: string;
  anio: string;
  tema: string;
  subtema?: string;
  ejercicio?: string;
  tiempoPregunta?: number;
  textoFuente?: string;
  expiresAt: string;
  docenteEmail?: string;
}

interface Veredicto {
  resultado: "A" | "B" | "ambas_correctas" | "ambas_incorrectas" | "fuera_de_tema";
  calificacionRecomendada?: "completa" | "incompleta" | "no";
  puntosResponde?: number;
  puntosPregunta?: number;
  veredicto: string;
  explicacion: string;
  paraSeguirPensando: string;
}

interface RegistroRonda {
  ronda: number;
  equipoPregunta: string;
  equipoResponde: string;
  pregunta: string;
  respuesta: string;
  calificacion: "completa" | "incompleta" | "no" | "pasada";
  puntos: number;
  fueAlArbitro: boolean;
  veredictoArbitro?: string;
  tiempoSegundos?: number;
}

// Los colores por área (AREA_COLORS) viven en utils/arbitroPalette.ts, indexados por
// la clave corta del área; coloresArea() acepta también el nombre completo de las
// sesiones viejas.

// ── Tipos de pantalla del flujo ──────────────────────────────────────────────
type Pantalla =
  | "setup"           // Ingreso de nombres y color de equipos
  | "config_vueltas"  // Cuántas vueltas jugar
  | "turno_pregunta"  // El equipo que pregunta le hace la pregunta elegida en voz alta
  | "calificacion"    // El equipo preguntador califica la respuesta
  | "aceptacion"      // ¿El equipo que respondió acepta la calificación?
  | "disputa"         // Formulario para consultar al árbitro
  | "arbitro"         // El árbitro da el veredicto
  | "resultado_ronda" // Resultado de la ronda + tablero
  | "fin_juego"       // Pantalla final con tablero y metacognición
  | "metacognicion";  // Formulario de metacognición por equipo

export default function ArbitroJuegoPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const t = useArbitroT();

  // ── Sesión ────────────────────────────────────────────────────────────────
  const [sesion, setSesion] = useState<SesionData | null>(null);
  const [loadingSesion, setLoadingSesion] = useState(true);
  const [sesionError, setSesionError] = useState<string | null>(null);

  // ── Setup de equipos ──────────────────────────────────────────────────────
  const [nombreEquipo1, setNombreEquipo1] = useState("");
  const [nombreEquipo2, setNombreEquipo2] = useState("");
  const [colorEquipo1, setColorEquipo1] = useState<string>(EQUIPO_COLOR_1); // rojo por defecto
  const [colorEquipo2, setColorEquipo2] = useState<string>(EQUIPO_COLOR_2); // azul por defecto
  const [integrantesEquipo1, setIntegrantesEquipo1] = useState("");
  const [integrantesEquipo2, setIntegrantesEquipo2] = useState("");
  const [vueltasTotales, setVueltasTotales] = useState(10);

  // ── Estado del juego ──────────────────────────────────────────────────────
  const [pantalla, setPantalla] = useState<Pantalla>("setup");
  const [preguntaNumero, setPreguntaNumero] = useState(1);
  const [equipoPreguntaIdx, setEquipoPreguntaIdx] = useState(0); // 0 o 1
  const [puntosEquipo1, setPuntosEquipo1] = useState(0);
  const [puntosEquipo2, setPuntosEquipo2] = useState(0);
  const [registros, setRegistros] = useState<RegistroRonda[]>([]);

  // ── Ronda actual ──────────────────────────────────────────────────────────
  const [preguntaActual, setPreguntaActual] = useState("");
  const [usarPreguntaPropia, setUsarPreguntaPropia] = useState(false); // true = está escribiendo su propia pregunta en vez de elegir de la lista
  const [preguntaBorrador, setPreguntaBorrador] = useState(""); // texto en el textarea de pregunta propia, antes de confirmarla
  const [respuestaActual, setRespuestaActual] = useState("");
  const [calificacionActual, setCalificacionActual] = useState<"completa" | "incompleta" | "no" | "pasada" | null>(null);
  const [justificacionCalificacion, setJustificacionCalificacion] = useState("");

  // ── Disputa / consulta al árbitro ────────────────────────────────────────
  const [disputaPregunta, setDisputaPregunta] = useState("");
  const [disputaRespuesta, setDisputaRespuesta] = useState("");
  const [disputaArgEquipoPregunta, setDisputaArgEquipoPregunta] = useState("");
  const [disputaArgEquipoRespuesta, setDisputaArgEquipoRespuesta] = useState("");

  // ── Árbitro ────────────────────────────────────────────────────────────────
  const [loadingArbitro, setLoadingArbitro] = useState(false);
  const [veredictoArbitro, setVeredictoArbitro] = useState<Veredicto | null>(null);
  const [errorArbitro, setErrorArbitro] = useState<string | null>(null);

  // ── Temporizador ──────────────────────────────────────────────────────────
  const [segundos, setSegundos] = useState(0);
  const [corriendo, setCorriendo] = useState(false);
  const [tiempoVencido, setTiempoVencido] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Texto que lee el lector de pantalla (región aria-live): solo avisa a los 15 s
  // y al terminar, no cada segundo.
  const [anuncioTimer, setAnuncioTimer] = useState("");

  // ── Sonido del temporizador ───────────────────────────────────────────────
  // Web Audio nativa, sin archivos ni dependencias. El ref espeja el estado
  // porque los efectos que disparan el sonido capturarían un valor viejo: sin
  // él, silenciar a mitad de una cuenta regresiva no tendría efecto hasta la
  // ronda siguiente.
  const [sonidoActivo, setSonidoActivo] = useState(true);
  const sonidoActivoRef = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => { sonidoActivoRef.current = sonidoActivo; }, [sonidoActivo]);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Varios navegadores crean el contexto suspendido hasta que hay un gesto
    // del usuario; el timer arranca con un click, así que acá ya se puede.
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume().catch(() => {});
    return audioCtxRef.current;
  };

  const playTick = () => {
    if (!sonidoActivoRef.current) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  const playFin = () => {
    if (!sonidoActivoRef.current) return;
    try {
      const ctx = getAudioCtx();
      [0, 0.15, 0.3].forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = [523, 659, 784][i];
        gain.gain.setValueAtTime(0.2, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.2);
      });
    } catch {}
  };

  // ── Metacognición ─────────────────────────────────────────────────────────
  const [metaEquipoActual, setMetaEquipoActual] = useState(0); // 0=equipo1, 1=equipo2
  const [meta1E1, setMeta1E1] = useState(""); const [meta2E1, setMeta2E1] = useState("");
  const [meta3E1, setMeta3E1] = useState(""); const [meta4E1, setMeta4E1] = useState("");
  const [meta1E2, setMeta1E2] = useState(""); const [meta2E2, setMeta2E2] = useState("");
  const [meta3E2, setMeta3E2] = useState(""); const [meta4E2, setMeta4E2] = useState("");
  const [metaEnviada, setMetaEnviada] = useState(false);
  const [metaEnviando, setMetaEnviando] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // ── Cargar sesión ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const fn = httpsCallable(getFunctions(app), "getSesionArbitro");
    fn({ sessionId })
      .then((res: any) => { setSesion(res.data); setLoadingSesion(false); })
      .catch((err) => { setSesionError(err.message); setLoadingSesion(false); });
  }, [sessionId]);

  // ── Temporizador ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (corriendo) {
      intervalRef.current = setInterval(() => {
        setSegundos(s => {
          const limite = sesion?.tiempoPregunta ?? 0;
          if (limite > 0 && s + 1 >= limite) {
            setCorriendo(false);
            setTiempoVencido(true);
            return limite;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [corriendo, sesion?.tiempoPregunta]);

  // El sonido va en efectos aparte y NO dentro del updater de setSegundos: la
  // app corre con <StrictMode>, que invoca los updaters dos veces, y cada tic
  // sonaría duplicado en desarrollo.
  useEffect(() => {
    const limite = sesion?.tiempoPregunta ?? 0;
    if (!corriendo || limite <= 0) return;
    const restante = limite - segundos;
    if (restante <= 5 && restante > 0) playTick();
    if (restante === 15) setAnuncioTimer(t.timerAnnounce15);
  }, [segundos, corriendo, sesion?.tiempoPregunta]);

  useEffect(() => {
    if (tiempoVencido) {
      playFin();
      setAnuncioTimer(t.timerAnnounceUp);
    }
  }, [tiempoVencido]);

  // Fuera de la pantalla del turno no queda ningún aviso pendiente.
  useEffect(() => {
    if (pantalla !== "turno_pregunta") setAnuncioTimer("");
  }, [pantalla]);

  const iniciarTimer = () => {
    // El contexto de audio solo se desbloquea dentro de un gesto del usuario,
    // y acá siempre venimos de un click (elegir pregunta o confirmar la propia).
    getAudioCtx();
    setSegundos(0);
    setTiempoVencido(false);
    setAnuncioTimer("");
    setCorriendo(true);
  };
  const detenerTimer = () => setCorriendo(false);
  const formatTimer = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const equipos = [
    { nombre: nombreEquipo1, color: colorEquipo1, integrantes: integrantesEquipo1, puntos: puntosEquipo1 },
    { nombre: nombreEquipo2, color: colorEquipo2, integrantes: integrantesEquipo2, puntos: puntosEquipo2 },
  ];
  const equipoPregunta = equipos[equipoPreguntaIdx];
  const equipoRespuesta = equipos[equipoPreguntaIdx === 0 ? 1 : 0];

  const addPuntos = (equipoIdx: number, pts: number) => {
    if (equipoIdx === 0) setPuntosEquipo1(p => Math.round((p + pts) * 10) / 10);
    else setPuntosEquipo2(p => Math.round((p + pts) * 10) / 10);
  };

  const puntosCalificacion = (c: "completa" | "incompleta" | "no" | "pasada") =>
    c === "completa" ? 1 : c === "incompleta" ? 0.5 : 0;

  const puntosReparto = (v: Veredicto): { puntosResponde: number; puntosPregunta: number } => ({
    puntosResponde: typeof v.puntosResponde === "number" ? v.puntosResponde : 0,
    puntosPregunta: typeof v.puntosPregunta === "number" ? v.puntosPregunta : 0,
  });

  // El árbitro devuelve A/B/ambas_correctas/ambas_incorrectas, no un puntaje.
  // Lo traducimos a una calificación recomendada para mostrarla resaltada.
  const CALIFICACION_INFO: Record<"completa" | "incompleta" | "no", { label: string; color: string }> = {
    completa: { label: "Completa — 1 punto", color: PALETA.verde },
    incompleta: { label: "Incompleta — 0.5 puntos", color: PALETA.ambar },
    no: { label: "Incorrecta — 0 puntos", color: PALETA.rojo },
  };
  const recomendacionArbitro = (v: Veredicto): "completa" | "incompleta" | "no" => {
    // El árbitro ahora recomienda el puntaje directamente (evaluando la
    // respuesta en sí misma, no solo quién ganó el desacuerdo). Si por algún
    // motivo no viene ese campo (respuesta vieja en caché), usamos el
    // heurístico anterior como respaldo.
    if (v.calificacionRecomendada === "completa" || v.calificacionRecomendada === "incompleta" || v.calificacionRecomendada === "no") {
      return v.calificacionRecomendada;
    }
    if (v.resultado === "A") return calificacionActual && calificacionActual !== "pasada" ? calificacionActual : "incompleta"; // confirma la calificación original
    if (v.resultado === "B") return "completa"; // el equipo que respondió tenía razón: merece el punto completo
    if (v.resultado === "fuera_de_tema") return "no"; // el desacuerdo ni siquiera era válido para arbitrar: no corresponde puntaje
    return "incompleta"; // ambas_correctas / ambas_incorrectas: término medio
  };

  // ── Informe de metacognición (copiar / descargar) ───────────────────────────
  const generarTextoInforme = () => {
    const lineas: string[] = [
      `INFORME DE SESIÓN — ${sesion?.materia} · ${sesion?.tema}`,
      `Fecha: ${new Date().toLocaleDateString("es-AR")}`,
      "",
    ];

    equipos.forEach(eq => {
      lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      lineas.push(`Equipo: ${eq.nombre} (${eq.integrantes})`);
      lineas.push(`Puntaje final: ${eq.puntos} puntos`);
      lineas.push("");
    });

    const preguntasTexto = [
      `¿Qué aprendieron hoy sobre "${sesion?.tema}"?`,
      "¿En qué momento dudaron más? ¿Cómo lo resolvieron?",
      "Contá una disputa donde intervino el árbitro (IA): ¿cuál era tu postura antes y cuál después?",
      "¿Cómo le explicarían a otro compañero lo que aprendieron hoy?",
    ];

    // Equipo 1
    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push(`REFLEXIONES DE ${nombreEquipo1.toUpperCase()} (${integrantesEquipo1})`);
    lineas.push("");
    [meta1E1, meta2E1, meta3E1, meta4E1].forEach((resp, i) => {
      if (resp?.trim()) {
        lineas.push(`${i + 1}. ${preguntasTexto[i]}`);
        lineas.push(resp.trim());
        lineas.push("");
      }
    });

    // Equipo 2
    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push(`REFLEXIONES DE ${nombreEquipo2.toUpperCase()} (${integrantesEquipo2})`);
    lineas.push("");
    [meta1E2, meta2E2, meta3E2, meta4E2].forEach((resp, i) => {
      if (resp?.trim()) {
        lineas.push(`${i + 1}. ${preguntasTexto[i]}`);
        lineas.push(resp.trim());
        lineas.push("");
      }
    });

    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push("Árbitro de Aprendizaje · eljuegodelsemaforo.com");

    return lineas.join("\n");
  };

  const copiarInforme = async () => {
    try {
      await navigator.clipboard.writeText(generarTextoInforme());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      // fallback para navegadores que no soportan clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = generarTextoInforme();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  const descargarInforme = () => {
    const texto = generarTextoInforme();
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe-arbitro-${sesion?.materia}-${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Árbitro ────────────────────────────────────────────────────────────────
  const consultarArbitro = async () => {
    setLoadingArbitro(true);
    setErrorArbitro(null);
    const timeoutId = setTimeout(() => {
      setLoadingArbitro(false);
      setErrorArbitro("El árbitro está tardando más de lo normal. Puede ser la conexión a internet. Probá de nuevo.");
    }, 20000); // 20 segundos

    try {
      const fn = httpsCallable(getFunctions(app, "us-central1"), "requestVeredicto");
      const res = await fn({
        sessionId,
        modo: "juego_oral",
        conflicto: `Pregunta: "${disputaPregunta}"\n\nRespuesta de ${equipoRespuesta.nombre}: "${disputaRespuesta}"`,
        posicionA: `${equipoPregunta.nombre} (calificó como ${calificacionActual}): ${disputaArgEquipoPregunta}`,
        posicionB: `${equipoRespuesta.nombre} (no acepta la calificación): ${disputaArgEquipoRespuesta}`,
      }) as { data: Veredicto };
      clearTimeout(timeoutId);
      setErrorArbitro(null); // por si la respuesta llegó tarde, después de que el timeout ya haya marcado error
      setVeredictoArbitro(res.data);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(err);
      // "unavailable": el servidor recibió algo de Gemini que no se pudo usar
      // (JSON inválido). No se aplica ningún punto: se muestra el error con
      // «Reintentar», igual que cualquier otro fallo de la consulta.
      if (err?.code === "functions/unavailable") {
        setErrorArbitro(t.errorNoClearAnswer);
      } else {
        setErrorArbitro(t.errorConsultFailed);
      }
    }
    clearTimeout(timeoutId);
    setLoadingArbitro(false);
  };

  // ── Avanzar ronda ─────────────────────────────────────────────────────────
  // saltarSumaPuntos: cuando el reparto ya se sumó a mano con addPuntos() para
  // los dos equipos (caso del árbitro con puntosResponde/puntosPregunta),
  // ptsAsignados solo sirve para dejar registrado el punto real del equipo que
  // respondió — no hay que volver a sumarlo acá.
  const cerrarRonda = (ptsAsignados: number, fueAlArbitro: boolean, veredicto?: string, saltarSumaPuntos = false) => {
    const equipoRespondeIdx = equipoPreguntaIdx === 0 ? 1 : 0;
    if (!saltarSumaPuntos) {
      addPuntos(equipoRespondeIdx, ptsAsignados);
    }
    setRegistros(prev => [...prev, {
      ronda: registros.length + 1,
      equipoPregunta: equipoPregunta.nombre,
      equipoResponde: equipoRespuesta.nombre,
      // preguntaActual ahora se completa siempre (se elige/escribe en la
      // pantalla "turno_pregunta" antes de cada ronda). respuestaActual sigue
      // sin capturarse — la respuesta en sí queda oral salvo que la ronda vaya
      // a disputa, donde sí tenemos el texto real que tipeó el equipo.
      pregunta: fueAlArbitro ? disputaPregunta : preguntaActual,
      respuesta: fueAlArbitro ? disputaRespuesta : respuestaActual,
      calificacion: calificacionActual!,
      puntos: ptsAsignados,
      fueAlArbitro,
      veredictoArbitro: veredicto,
      tiempoSegundos: segundos,
    } as any]);

    // Limpiar estado de ronda
    setPreguntaActual("");
    setUsarPreguntaPropia(false);
    setPreguntaBorrador("");
    setSegundos(0);
    setTiempoVencido(false);
    setRespuestaActual("");
    setCalificacionActual(null);
    setJustificacionCalificacion("");
    setVeredictoArbitro(null);
    setDisputaPregunta("");
    setDisputaRespuesta("");
    setDisputaArgEquipoPregunta("");
    setDisputaArgEquipoRespuesta("");
    setPantalla("resultado_ronda");
  };

  // Salida legítima: el equipo pasa la pregunta sin puntos. La ronda queda
  // registrada como "pasada" para que el docente vea qué preguntas costaron.
  const pasarPregunta = () => {
    detenerTimer();
    setRegistros(prev => [...prev, {
      ronda: prev.length + 1,
      equipoPregunta: equipoPregunta.nombre,
      equipoResponde: equipoRespuesta.nombre,
      pregunta: preguntaActual,
      respuesta: "",
      calificacion: "pasada",
      puntos: 0,
      fueAlArbitro: false,
      tiempoSegundos: segundos,
    }]);
    setPreguntaActual("");
    setPreguntaBorrador("");
    setUsarPreguntaPropia(false);
    setRespuestaActual("");
    setCalificacionActual(null);
    setSegundos(0);
    setTiempoVencido(false);
    setPantalla("resultado_ronda");
  };

  const siguienteRonda = () => {
    const nuevaNum = preguntaNumero + 1;
    if (nuevaNum > vueltasTotales) {
      setPantalla("fin_juego");
      return;
    }
    setPreguntaNumero(nuevaNum);
    setEquipoPreguntaIdx(equipoPreguntaIdx === 0 ? 1 : 0);
    setPantalla("turno_pregunta");
  };

  const colors = coloresArea(sesion?.area);

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loadingSesion) return <FullPage><div style={{ color: "white", fontSize: 18, fontWeight: 600 }}>⏳ Cargando sesión…</div></FullPage>;
  if (sesionError || !sesion) return (
    <FullPage>
      <div style={{ backgroundColor: "white", borderRadius: 16, padding: 32, maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Sesión no disponible</div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>Verificá el link con tu profe.</div>
      </div>
    </FullPage>
  );

  // Preguntas que el docente cargó en la consigna, separadas una por línea
  // (soporta numeración "1.", "1)" y viñetas "-"/"•"). Si la consigna vino
  // como un párrafo corrido sin saltos de línea, queda una sola opción — no
  // se rompe, pero el equipo va a preferir escribir la suya.
  const preguntasDisponibles = (sesion.ejercicio || "")
    .split("\n")
    .map(l => l.replace(/^\s*\d+[.)]\s*/, "").replace(/^\s*[-•*]\s*/, "").trim())
    .filter(l => l.length > 0);

  // Preguntas ya elegidas en rondas anteriores (para marcarlas en la lista) —
  // se derivan de "registros", que ya se completa al cerrar cada ronda.
  const preguntasUsadas = new Set(registros.map(r => r.pregunta.trim()).filter(Boolean));

  // ══════════════════════════════════════════════════════════════════════════
  // PANTALLAS
  // ══════════════════════════════════════════════════════════════════════════

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (pantalla === "setup") {
    const puedeEmpezar = nombreEquipo1.trim() && nombreEquipo2.trim() && integrantesEquipo1.trim() && integrantesEquipo2.trim();
    return (
      <FullPage gradient={colors.gradient}>
        <div style={cardWhite}>
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} />
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>⚖️ Árbitro de Aprendizaje</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{sesion.materia} · {sesion.tema}</div>
            </div>

            {[0, 1].map(idx => {
              const colorTarjeta = idx === 0 ? colorEquipo1 : colorEquipo2;
              return (
              <div key={idx} style={{ backgroundColor: `${colorTarjeta}15`, borderRadius: 16, padding: 18, border: `2px solid ${colorTarjeta}` }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 14 }}>
                  Equipo {idx + 1}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor={`equipo-${idx + 1}-nombre`} style={lbl}>Nombre del equipo *</label>
                  <input id={`equipo-${idx + 1}-nombre`} type="text" value={idx === 0 ? nombreEquipo1 : nombreEquipo2}
                    onChange={e => idx === 0 ? setNombreEquipo1(e.target.value) : setNombreEquipo2(e.target.value)}
                    placeholder="Ej: Los Narradores, Equipo A..."
                    style={inp} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor={`equipo-${idx + 1}-integrantes`} style={lbl}>Integrantes *</label>
                  <input id={`equipo-${idx + 1}-integrantes`} type="text" value={idx === 0 ? integrantesEquipo1 : integrantesEquipo2}
                    onChange={e => idx === 0 ? setIntegrantesEquipo1(e.target.value) : setIntegrantesEquipo2(e.target.value)}
                    placeholder="Ej: Juan, María, Pedro"
                    style={inp} />
                </div>
                <div role="group" aria-label={fillArbitro(t.teamColorGroup, { team: (idx === 0 ? nombreEquipo1 : nombreEquipo2).trim() || fillArbitro(t.teamColorNumber, { n: idx + 1 }) })}>
                  <div style={lbl}>Color del equipo</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {EQUIPO_COLORES.map(c => {
                      const elegido = (idx === 0 ? colorEquipo1 : colorEquipo2) === c.hex;
                      const nombreColor = t.teamColors[c.id];
                      return (
                        <button key={c.id} type="button"
                          onClick={() => idx === 0 ? setColorEquipo1(c.hex) : setColorEquipo2(c.hex)}
                          aria-label={nombreColor} title={nombreColor} aria-pressed={elegido}
                          style={{ width: 44, height: 44, padding: 0, borderRadius: "50%", backgroundColor: c.hex, border: elegido ? `3px solid ${PALETA.texto}` : "3px solid transparent", boxShadow: elegido ? "inset 0 0 0 2px white" : "none", color: "white", fontSize: 20, fontWeight: 900, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span aria-hidden="true">{elegido ? "✓" : ""}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              );
            })}

            <div>
              <div id="vueltas-label" style={lbl}>¿Cuántas preguntas van a jugar en total?</div>
              <div role="group" aria-labelledby="vueltas-label" style={{ display: "flex", gap: 8 }}>
                {[5, 10, 15, 20, 25].map(v => (
                  <button key={v} onClick={() => setVueltasTotales(v)} aria-pressed={vueltasTotales === v}
                    style={{ flex: 1, minHeight: 44, padding: "10px 0", borderRadius: 10, border: `2px solid ${vueltasTotales === v ? colors.primary : "#e2e8f0"}`, backgroundColor: vueltasTotales === v ? `${colors.primary}15` : "white", fontWeight: 700, fontSize: 13, color: vueltasTotales === v ? colors.primary : PALETA.gris, cursor: "pointer" }}>
                    {v}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 4 }}>
                Cantidad de preguntas en total · Podés agregar más al terminar
              </div>
            </div>

            <button onClick={() => setPantalla("turno_pregunta")}
              disabled={!puedeEmpezar}
              style={{ padding: "14px", fontSize: 15, fontWeight: 800, borderRadius: 12, border: "none", background: puedeEmpezar ? colors.gradient : PALETA.gris, color: "white", cursor: puedeEmpezar ? "pointer" : "not-allowed" }}>
              ⚔️ ¡Empezar el juego!
            </button>
          </div>
        </div>
      </FullPage>
    );
  }

  // ── TABLERO (componente reutilizable) ─────────────────────────────────────
  const Tablero = () => (
    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
      {equipos.map((eq, i) => (
        <div key={i} style={{ flex: 1, borderRadius: 14, padding: "12px 16px", backgroundColor: `${eq.color}15`, border: `2px solid ${eq.color}`, textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", justifyContent: "center" }}>
            <TeamName color={eq.color}>{eq.nombre}</TeamName>
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>{eq.integrantes}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: PALETA.texto }}>{eq.puntos}</div>
          <div style={{ fontSize: 12, color: "#475569" }}>puntos</div>
        </div>
      ))}
    </div>
  );

  // Texto gris oscuro sobre la tarjeta blanca (antes: blanco al 70 % sobre blanco).
  const InfoRonda = () => (
    <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", textAlign: "center", marginBottom: 8 }}>
      Pregunta {preguntaNumero} de {vueltasTotales}
    </div>
  );


  // ── TURNO: elegir la pregunta y hacerla en voz alta ───────────────────────
  // Pantalla única: el equipo elige del banco (o escribe la suya), y recién
  // ahí arranca el cronómetro y se muestra la pregunta para leerla en voz alta.
  if (pantalla === "turno_pregunta") {
    const escribiendoPropia = usarPreguntaPropia || preguntasDisponibles.length === 0;

    const confirmarPreguntaPropia = () => {
      const texto = preguntaBorrador.trim();
      if (!texto) return;
      setPreguntaActual(texto);
      iniciarTimer();
    };

    const volverAElegir = () => {
      setPreguntaActual("");
      setPreguntaBorrador("");
      setUsarPreguntaPropia(false);
      detenerTimer();
      setSegundos(0);
    };

    return (
      <FullPage gradient={colors.gradient}>
        <div style={cardWhite}>
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} />
          <div style={{ padding: "20px 24px" }}>
            <InfoRonda />
            <Tablero />

            {/* Quién pregunta a quién */}
            <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 16, border: "1.5px solid #e2e8f0" }}>
              <div style={{ backgroundColor: `${equipoPregunta.color}15`, padding: "14px 18px", borderBottom: `2px solid ${equipoPregunta.color}30` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: PALETA.grisOscuro, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Pregunta</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}><TeamName color={equipoPregunta.color}>{equipoPregunta.nombre}</TeamName></div>
                <div style={{ fontSize: 12, color: PALETA.grisOscuro }}>{equipoPregunta.integrantes}</div>
              </div>
              <div style={{ backgroundColor: "#f8fafc", padding: "6px 18px", textAlign: "center" }}>
                <div aria-hidden="true" style={{ fontSize: 16, color: PALETA.gris }}>↓</div>
              </div>
              <div style={{ backgroundColor: `${equipoRespuesta.color}15`, padding: "14px 18px", borderTop: `2px solid ${equipoRespuesta.color}30` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: PALETA.grisOscuro, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Responde</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}><TeamName color={equipoRespuesta.color}>{equipoRespuesta.nombre}</TeamName></div>
                <div style={{ fontSize: 12, color: PALETA.grisOscuro }}>{equipoRespuesta.integrantes}</div>
              </div>
            </div>

            {/* Aviso para lectores de pantalla: solo a los 15 s y al terminar. */}
            <div role="status" aria-live="polite" aria-atomic="true" style={srOnly}>{anuncioTimer}</div>

            {/* Timer — solo una vez que la pregunta está elegida y el reloj corre.
                Con límite configurado cuenta hacia atrás; sin límite, hacia adelante.
                En los últimos 15 s cambia también el texto, no solo el color. */}
            {preguntaActual && (() => {
              const limite = sesion.tiempoPregunta ?? 0;
              const restante = limite > 0 ? Math.max(0, limite - segundos) : 0;
              const alerta = limite > 0 && restante <= 15 && restante > 0;
              return (
                <div style={{
                  backgroundColor: tiempoVencido ? "#fef2f2" : alerta ? "#fff7ed" : "#fffbeb",
                  borderRadius: 12, padding: "10px 18px",
                  border: `1px solid ${tiempoVencido ? "#fca5a5" : alerta ? "#fdba74" : "#fde68a"}`,
                  marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: tiempoVencido ? "#b91c1c" : alerta ? PALETA.naranjaOscuro : "#92400e" }}>
                    {limite > 0
                      ? (tiempoVencido ? `⏰ ${t.timerAnnounceUp}` : alerta ? t.timerLastSeconds : "⏱️ Tiempo restante")
                      : "⏱️ Tiempo transcurrido"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div role="timer" aria-label={t.timerName} style={{
                      fontSize: 24, fontWeight: 900,
                      color: tiempoVencido ? "#b91c1c" : alerta ? PALETA.naranja : PALETA.ambar,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {limite > 0 ? formatTimer(restante) : formatTimer(segundos)}
                    </div>
                    <button
                      onClick={() => { getAudioCtx(); setSonidoActivo(s => !s); }}
                      aria-label={sonidoActivo ? t.soundOff : t.soundOn}
                      title={sonidoActivo ? t.soundOff : t.soundOn}
                      style={{
                        background: "none", border: "none",
                        fontSize: 18, cursor: "pointer",
                        opacity: sonidoActivo ? 1 : 0.6,
                        minWidth: 44, minHeight: 44, padding: 0,
                      }}>
                      <span aria-hidden="true">{sonidoActivo ? "🔊" : "🔇"}</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Sin pregunta elegida: lista del banco ── */}
            {!preguntaActual && !escribiendoPropia && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                  📋 {equipoPregunta.nombre} — elegí una pregunta de la lista:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
                  {preguntasDisponibles.map((preg, i) => {
                    const usada = preguntasUsadas.has(preg.trim());
                    return (
                      <button
                        key={i}
                        onClick={() => { if (!usada) { setPreguntaActual(preg); iniciarTimer(); } }}
                        disabled={usada}
                        style={{
                          textAlign: "left" as const,
                          minHeight: 44,
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: `1.5px solid ${usada ? "#e2e8f0" : "#bae6fd"}`,
                          backgroundColor: usada ? "#f8fafc" : "white",
                          color: usada ? PALETA.gris : "#0c4a6e",
                          fontSize: 13,
                          fontWeight: usada ? 400 : 600,
                          cursor: usada ? "not-allowed" : "pointer",
                          lineHeight: 1.5,
                          opacity: usada ? 0.6 : 1,
                          textDecoration: usada ? "line-through" : "none",
                          transition: "all 0.15s",
                        }}
                        onMouseOver={e => { if (!usada) e.currentTarget.style.backgroundColor = "#f0f9ff"; }}
                        onMouseOut={e => { if (!usada) e.currentTarget.style.backgroundColor = "white"; }}
                      >
                        {usada ? "✓ " : `${i + 1}. `}{preg}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => { setUsarPreguntaPropia(true); setPreguntaBorrador(""); }}
                  style={{ marginTop: 10, background: "none", border: "none", color: "#0369a1", fontSize: 12, fontWeight: 600, textDecoration: "underline", cursor: "pointer", padding: 0, minHeight: 44 }}>
                  ✏️ Escribir mi propia pregunta
                </button>
              </div>
            )}

            {/* ── Sin pregunta elegida: escribir la propia ── */}
            {!preguntaActual && escribiendoPropia && (
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="pregunta-propia" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                  ✏️ {equipoPregunta.nombre} — escribí la pregunta que le van a hacer
                </label>
                <textarea
                  id="pregunta-propia"
                  value={preguntaBorrador}
                  onChange={e => setPreguntaBorrador(e.target.value)}
                  rows={3}
                  placeholder="Escribí la pregunta que le van a hacer..."
                  style={{ ...inp, resize: "none", fontFamily: "inherit" }}
                />
                <button
                  onClick={confirmarPreguntaPropia}
                  disabled={!preguntaBorrador.trim()}
                  style={{ ...btnPrimario(colors.gradient, !preguntaBorrador.trim()), marginTop: 10 }}>
                  ✅ Confirmar pregunta
                </button>
                {preguntasDisponibles.length > 0 && (
                  <button
                    onClick={() => { setUsarPreguntaPropia(false); setPreguntaBorrador(""); }}
                    style={{ marginTop: 8, background: "none", border: "none", color: "#64748b", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0 }}>
                    ← Elegir de la lista
                  </button>
                )}
              </div>
            )}

            {/* ── Pregunta elegida: leerla en voz alta ── */}
            {preguntaActual && (
              <>
                <div style={{ backgroundColor: "#f0f9ff", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #0ea5e9", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                    📋 Pregunta elegida — leerla en voz alta
                  </div>
                  <div style={{ fontSize: 14, color: "#0c4a6e", lineHeight: 1.6, fontWeight: 600, marginBottom: 8 }}>
                    {preguntaActual}
                  </div>
                  <button
                    onClick={volverAElegir}
                    style={{ fontSize: 12, color: "#0369a1", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: "0", minHeight: 44 }}>
                    ← Elegir otra pregunta
                  </button>
                </div>

                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 16, textAlign: "center" }}>
                  <strong>{equipoRespuesta.nombre}</strong> responde en voz alta. Cuando terminen, presioná el botón.
                </div>
              </>
            )}

            <button
              onClick={() => { detenerTimer(); setPantalla("calificacion"); }}
              disabled={!preguntaActual.trim()}
              style={btnPrimario(colors.gradient, !preguntaActual.trim())}>
              ✅ El equipo ya respondió — calificar
            </button>

            {preguntaActual && (
              <button
                onClick={pasarPregunta}
                style={{
                  width: "100%", marginTop: 10, minHeight: 44, padding: "11px",
                  fontSize: 13, fontWeight: 700, borderRadius: 12,
                  border: "2px solid #e2e8f0", backgroundColor: "white",
                  color: "#64748b", cursor: "pointer",
                }}>
                ⏭️ Pasar esta pregunta (sin puntos)
              </button>
            )}

          </div>
        </div>
      </FullPage>
    );
  }

  // ── CALIFICACIÓN ──────────────────────────────────────────────────────────
  if (pantalla === "calificacion") {
    return (
      <FullPage gradient={colors.gradient}>
        <div style={cardWhite}>
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} />
          <div style={{ padding: "20px 24px" }}>
            <InfoRonda />
            <Tablero />

            <div style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 4, textTransform: "uppercase" }}>Pregunta</div>
              <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.5 }}>{preguntaActual}</div>
            </div>
            <div style={{ backgroundColor: "#f0fdf4", borderRadius: 12, padding: "14px 16px", border: "1px solid #86efac", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 4, textTransform: "uppercase" }}>Respuesta de {equipoRespuesta.nombre}</div>
              <div style={{ fontSize: 13, color: "#14532d", lineHeight: 1.5 }}>{respuestaActual}</div>
            </div>

            <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>
              {equipoPregunta.nombre} — ¿es completa la respuesta?
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {([
                { val: "completa" as const, label: "✅ Completa", desc: "1 punto", color: PALETA.verde, bg: "#f0fdf4", border: "#86efac" },
                { val: "incompleta" as const, label: "⚡ Incompleta", desc: "0.5 puntos", color: PALETA.ambar, bg: "#fffbeb", border: "#fde68a" },
                { val: "no" as const, label: "❌ Incorrecta", desc: "0 puntos", color: PALETA.rojo, bg: "#fef2f2", border: "#fecaca" },
              ]).map(op => (
                <button key={op.val} onClick={() => setCalificacionActual(op.val)} aria-pressed={calificacionActual === op.val}
                  style={{ padding: "14px 18px", borderRadius: 12, border: `2px solid ${calificacionActual === op.val ? op.color : op.border}`, backgroundColor: calificacionActual === op.val ? op.bg : "white", textAlign: "left" as const, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: op.color }}>{op.label}</span>
                  <span style={{ fontSize: 13, color: op.color, fontWeight: 600 }}>{op.desc}</span>
                </button>
              ))}
            </div>

            {calificacionActual && calificacionActual !== "completa" && (
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="justificacion-calificacion" style={{ ...lbl, color: PALETA.ambar }}>
                  ✏️ {equipoPregunta.nombre} — ¿qué le faltó a la respuesta?
                </label>
                <textarea
                  id="justificacion-calificacion"
                  value={justificacionCalificacion}
                  onChange={e => setJustificacionCalificacion(e.target.value)}
                  rows={2}
                  placeholder="Explicá qué faltó o qué estuvo mal, con el mayor detalle posible..."
                  style={{ ...inp, resize: "none", fontFamily: "inherit", borderColor: "#fde68a" }}
                />
              </div>
            )}

            <button onClick={() => setPantalla("aceptacion")}
              disabled={!calificacionActual || (calificacionActual !== "completa" && !justificacionCalificacion.trim())}
              style={btnPrimario(colors.gradient, !calificacionActual || (calificacionActual !== "completa" && !justificacionCalificacion.trim()))}>
              Continuar →
            </button>
          </div>
        </div>
      </FullPage>
    );
  }

  // ── ACEPTACIÓN ────────────────────────────────────────────────────────────
  if (pantalla === "aceptacion") {
    const pts = puntosCalificacion(calificacionActual!);
    const labelCal = calificacionActual === "completa" ? "completa (1 punto)" : calificacionActual === "incompleta" ? "incompleta (0.5 puntos)" : "incorrecta (0 puntos)";
    return (
      <FullPage gradient={colors.gradient}>
        <div style={cardWhite}>
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} />
          <div style={{ padding: "20px 24px" }}>
            <InfoRonda />
            <Tablero />

            <div style={{ backgroundColor: "#f8fafc", borderRadius: 14, padding: 18, border: "1px solid #e2e8f0", marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                {equipoPregunta.nombre} calificó la respuesta como
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#1e293b", marginBottom: 4 }}>
                {labelCal}
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                Para el equipo {equipoRespuesta.nombre}
              </div>
            </div>

            {justificacionCalificacion.trim() && (
              <div style={{ backgroundColor: "#fffbeb", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4, textTransform: "uppercase" }}>
                  {equipoPregunta.nombre} dice que faltó:
                </div>
                <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.5 }}>{justificacionCalificacion}</div>
              </div>
            )}

            <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 14, textAlign: "center" }}>
              ¿{equipoRespuesta.nombre} acepta esta calificación?
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => cerrarRonda(pts, false)}
                style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: PALETA.verde, color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                ✅ Sí, acepta
              </button>
              <button onClick={() => {
                setDisputaPregunta(preguntaActual);
                setDisputaArgEquipoPregunta(justificacionCalificacion);
                setPantalla("disputa");
              }}
                style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${PALETA.naranja}, ${PALETA.naranjaOscuro})`, color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                ⚖️ Consultar al árbitro
              </button>
            </div>
          </div>
        </div>
      </FullPage>
    );
  }

  // ── DISPUTA: formulario para consultar al árbitro ───────────────────────────
  if (pantalla === "disputa") {
    const puedeConsultar = disputaPregunta.trim() &&
      disputaRespuesta.trim() &&
      disputaArgEquipoPregunta.trim() &&
      disputaArgEquipoRespuesta.trim();

    return (
      <FullPage gradient={colors.gradient}>
        <div style={cardWhite}>
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} />
          <div style={{ padding: "20px 24px" }}>
            <InfoRonda />
            <Tablero />

            <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b", marginBottom: 4, textAlign: "center" }}>
              ⚖️ Consulta al árbitro
            </div>
            <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", marginBottom: 20 }}>
              Completá los cuatro campos para que el árbitro pueda dar un veredicto justo.
            </div>

            {/* Pregunta */}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="disputa-pregunta" style={{ ...lbl, color: "#0369a1" }}>
                📋 ¿Cuál fue la pregunta?
              </label>
              <textarea
                id="disputa-pregunta"
                value={disputaPregunta}
                onChange={e => setDisputaPregunta(e.target.value)}
                rows={2}
                placeholder="Escribí la pregunta que hizo el equipo..."
                style={{ ...inp, resize: "none", fontFamily: "inherit", borderColor: "#bae6fd" }}
              />
            </div>

            {/* Respuesta */}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="disputa-respuesta" style={{ ...lbl, color: "#166534" }}>
                💬 ¿Qué respondió <TeamName color={equipoRespuesta.color}>{equipoRespuesta.nombre}</TeamName>?
              </label>
              <textarea
                id="disputa-respuesta"
                value={disputaRespuesta}
                onChange={e => setDisputaRespuesta(e.target.value)}
                rows={2}
                placeholder="Resumí la respuesta del equipo..."
                style={{ ...inp, resize: "none", fontFamily: "inherit", borderColor: "#86efac" }}
              />
            </div>

            {/* Argumento equipo que calificó */}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="disputa-arg-pregunta" style={lbl}>
                🗣️ ¿Por qué <TeamName color={equipoPregunta.color}>{equipoPregunta.nombre}</TeamName> calificó así?
              </label>
              <textarea
                id="disputa-arg-pregunta"
                value={disputaArgEquipoPregunta}
                onChange={e => setDisputaArgEquipoPregunta(e.target.value)}
                rows={2}
                placeholder={`¿Por qué ${equipoPregunta.nombre} considera que la respuesta fue ${calificacionActual === "completa" ? "completa" : calificacionActual === "incompleta" ? "incompleta" : "incorrecta"}?`}
                style={{ ...inp, resize: "none", fontFamily: "inherit", borderColor: `${equipoPregunta.color}60` }}
              />
            </div>

            {/* Argumento equipo que respondió */}
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="disputa-arg-respuesta" style={lbl}>
                🗣️ ¿Por qué <TeamName color={equipoRespuesta.color}>{equipoRespuesta.nombre}</TeamName> no acepta esa calificación?
              </label>
              <textarea
                id="disputa-arg-respuesta"
                value={disputaArgEquipoRespuesta}
                onChange={e => setDisputaArgEquipoRespuesta(e.target.value)}
                rows={2}
                placeholder={`¿Qué argumenta ${equipoRespuesta.nombre} para sostener que merece más puntos?`}
                style={{ ...inp, resize: "none", fontFamily: "inherit", borderColor: `${equipoRespuesta.color}60` }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setPantalla("aceptacion")}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                ← Volver
              </button>
              <button
                onClick={() => { consultarArbitro(); setPantalla("arbitro"); }}
                disabled={!puedeConsultar}
                style={{ flex: 2, ...btnPrimario(colors.gradient, !puedeConsultar) }}>
                ⚖️ Consultar al árbitro
              </button>
            </div>
          </div>
        </div>
      </FullPage>
    );
  }

  // ── ÁRBITRO ────────────────────────────────────────────────────────────────
  if (pantalla === "arbitro") {
    return (
      <FullPage gradient={colors.gradient}>
        <div style={cardWhite}>
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} />
          <div style={{ padding: "20px 24px" }}>
            <InfoRonda />
            <Tablero />

            {errorArbitro ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>
                  {errorArbitro}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button
                    onClick={() => { setErrorArbitro(null); consultarArbitro(); }}
                    style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: colors.gradient, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    🔄 Reintentar
                  </button>
                  <button
                    onClick={() => { setErrorArbitro(null); setPantalla("disputa"); }}
                    style={{ flex: 1, padding: "12px", borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    ← Volver
                  </button>
                </div>
                <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 16 }}>
                  {t.errorRetryHint}
                </div>
              </div>
            ) : loadingArbitro ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚖️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>El árbitro está analizando…</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Un momento</div>
              </div>
            ) : veredictoArbitro ? (() => {
              const { puntosResponde, puntosPregunta } = puntosReparto(veredictoArbitro);
              const equipoRespondeIdx = equipoPreguntaIdx === 0 ? 1 : 0;
              return (
              <div>
                {/* Veredicto */}
                <div style={{ backgroundColor: "#f0f9ff", borderRadius: 14, padding: "16px 18px", border: "2px solid #0ea5e9", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                    ⚖️ Veredicto del árbitro
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{veredictoArbitro.veredicto}</div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{veredictoArbitro.explicacion}</div>
                </div>

                {veredictoArbitro.paraSeguirPensando && (
                  <div style={{ backgroundColor: "#fef9c3", borderRadius: 10, padding: "10px 14px", border: "1px solid #fde047", marginBottom: 16, fontSize: 12, color: "#713f12" }}>
                    <strong>💭 Para seguir pensando:</strong> {veredictoArbitro.paraSeguirPensando}
                  </div>
                )}

                {/* Reparto visual del punto */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>
                  Así reparte el punto de esta ronda:
                </div>
                <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", marginBottom: 8, border: "2px solid #e2e8f0" }}>
                  <div style={{
                    flex: puntosPregunta || 0.001, backgroundColor: `${equipoPregunta.color}20`,
                    padding: "14px 10px", textAlign: "center", borderRight: "2px solid white",
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: PALETA.texto }}>{puntosPregunta}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, display: "flex", justifyContent: "center" }}><TeamName color={equipoPregunta.color}>{equipoPregunta.nombre}</TeamName></div>
                  </div>
                  <div style={{
                    flex: puntosResponde || 0.001, backgroundColor: `${equipoRespuesta.color}20`,
                    padding: "14px 10px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: PALETA.texto }}>{puntosResponde}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, display: "flex", justifyContent: "center" }}><TeamName color={equipoRespuesta.color}>{equipoRespuesta.nombre}</TeamName></div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: PALETA.gris, textAlign: "center", marginBottom: 20 }}>
                  Suma: {(puntosResponde + puntosPregunta).toFixed(2)} punto{(puntosResponde + puntosPregunta) !== 1 ? "s" : ""} de 1 en juego
                </div>

                <button
                  onClick={() => {
                    addPuntos(equipoPreguntaIdx, puntosPregunta);
                    addPuntos(equipoRespondeIdx, puntosResponde);
                    // saltarSumaPuntos: true porque los dos addPuntos de arriba ya
                    // repartieron el punto — ptsAsignados acá solo queda para que
                    // el registro de la ronda guarde el puntaje real del equipo
                    // que respondió, no para volver a sumarlo.
                    cerrarRonda(puntosResponde, true, veredictoArbitro.explicacion, true);
                  }}
                  style={btnPrimario(colors.gradient, false)}>
                  ✅ Confirmar y continuar
                </button>
              </div>
              );
            })() : null}
          </div>
        </div>
      </FullPage>
    );
  }

  // ── RESULTADO DE RONDA ────────────────────────────────────────────────────
  if (pantalla === "resultado_ronda") {
    const ultimoRegistro = registros[registros.length - 1];
    const juegoTerminado = preguntaNumero >= vueltasTotales;

    return (
      <FullPage gradient={colors.gradient}>
        <div style={cardWhite}>
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} />
          <div style={{ padding: "20px 24px" }}>
            <Tablero />

            {ultimoRegistro && (
              <div style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>Última ronda</div>
                {ultimoRegistro.calificacion === "pasada" ? (
                  <>
                    <div style={{ fontSize: 12, color: "#1e293b", marginBottom: 4 }}>
                      <strong>{ultimoRegistro.equipoResponde}</strong> no respondió esta pregunta.
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      ⏭️ Pregunta pasada — sin puntos
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: "#1e293b", marginBottom: 4 }}>
                      <strong>{ultimoRegistro.equipoResponde}</strong> respondió "{ultimoRegistro.respuesta.substring(0, 80)}{ultimoRegistro.respuesta.length > 80 ? "..." : ""}"
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Calificación: <strong>{ultimoRegistro.calificacion}</strong> · {ultimoRegistro.puntos} punto{ultimoRegistro.puntos !== 1 ? "s" : ""}
                      {ultimoRegistro.fueAlArbitro ? " · ⚖️ Validado por árbitro" : ""}
                    </div>
                  </>
                )}
              </div>
            )}

            {juegoTerminado ? (
              <div>
                <button onClick={() => setPantalla("fin_juego")}
                  style={btnPrimario(colors.gradient, false)}>
                  🏆 Ver resultado final
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={siguienteRonda}
                  style={btnPrimario(colors.gradient, false)}>
                  {`▶️ Siguiente — pregunta ${preguntaNumero + 1} de ${vueltasTotales}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </FullPage>
    );
  }

  // ── FIN DEL JUEGO ─────────────────────────────────────────────────────────
  if (pantalla === "fin_juego") {
    const ganador = puntosEquipo1 > puntosEquipo2 ? equipos[0] : puntosEquipo2 > puntosEquipo1 ? equipos[1] : null;
    return (
      <FullPage gradient={colors.gradient}>
        <div style={cardWhite}>
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} />
          <div style={{ padding: "20px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
              {ganador ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 900, display: "flex", justifyContent: "center" }}><TeamName color={ganador.color}>¡Ganó {ganador.nombre}!</TeamName></div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{ganador.integrantes}</div>
                </>
              ) : (
                <div style={{ fontSize: 22, fontWeight: 900, color: "#1e293b" }}>¡Empate!</div>
              )}
            </div>

            <Tablero />

            <div style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Resumen de rondas</div>
              {registros.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: "#1e293b", marginBottom: 4, paddingBottom: 4, borderBottom: "1px solid #f1f5f9" }}>
                  Ronda {i + 1}: {r.equipoPregunta} → {r.equipoResponde} · {r.calificacion} · {r.puntos}pts {r.fueAlArbitro ? "⚖️" : ""}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => { setVueltasTotales(v => v + 5); setPreguntaNumero(p => p + 1); setEquipoPreguntaIdx(equipoPreguntaIdx === 0 ? 1 : 0); setPantalla("turno_pregunta"); }}
                style={{ padding: "12px", borderRadius: 10, border: `2px solid ${colors.primary}`, backgroundColor: "white", color: colors.primary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                ➕ Agregar 5 preguntas más
              </button>
              <button onClick={() => { setMetaEquipoActual(0); setPantalla("metacognicion"); }}
                style={btnPrimario(colors.gradient, false)}>
                ✍️ Completar informe de metacognición
              </button>
            </div>
          </div>
        </div>
      </FullPage>
    );
  }

  // ── METACOGNICIÓN ─────────────────────────────────────────────────────────
  if (pantalla === "metacognicion") {
    const eq = equipos[metaEquipoActual];
    const setters = metaEquipoActual === 0
      ? [setMeta1E1, setMeta2E1, setMeta3E1, setMeta4E1]
      : [setMeta1E2, setMeta2E2, setMeta3E2, setMeta4E2];
    const values = metaEquipoActual === 0
      ? [meta1E1, meta2E1, meta3E1, meta4E1]
      : [meta1E2, meta2E2, meta3E2, meta4E2];

    const preguntas = [
      { label: `¿Qué aprendieron hoy sobre "${sesion.tema}"?`, required: true },
      { label: "¿En qué momento dudaron más? ¿Cómo lo resolvieron?", required: false },
      { label: "Contá una disputa donde intervino el árbitro (IA): ¿cuál era tu postura antes y cuál después? ¿Estuviste de acuerdo con su veredicto, o hubo algo que no pudo evaluar bien?", required: false },
      { label: "¿Cómo le explicarían a otro compañero lo que aprendieron hoy?", required: false },
    ];

    const handleSiguienteEquipo = async () => {
      if (metaEquipoActual === 0) {
        setMetaEquipoActual(1);
      } else {
        // Guardar en Firestore
        setMetaEnviando(true);
        setMetaError(null);
        try {
          const fn = httpsCallable(getFunctions(app, "us-central1"), "guardarInformeArbitro");
          await fn({
            sessionId,
            modo: "competitivo",
            equipos: [
              { nombre: nombreEquipo1, color: colorEquipo1, integrantes: integrantesEquipo1, puntos: puntosEquipo1,
                respuestas: { q1: meta1E1, q2: meta2E1, q3: meta3E1, q4: meta4E1 } },
              { nombre: nombreEquipo2, color: colorEquipo2, integrantes: integrantesEquipo2, puntos: puntosEquipo2,
                respuestas: { q1: meta1E2, q2: meta2E2, q3: meta3E2, q4: meta4E2 } },
            ],
            registros,
          });
          // Solo confirmamos éxito si la llamada realmente terminó bien.
          setMetaEnviada(true);
        } catch (e: any) {
          console.error(e);
          setMetaError(e?.message || "No se pudo enviar el informe. Revisá tu conexión e intentá de nuevo.");
        } finally {
          setMetaEnviando(false);
        }
      }
    };

    if (metaEnviada) {
      return (
        <FullPage gradient={colors.gradient}>
          <div style={cardWhite}>
            <Header colors={colors} materia={sesion.materia} tema={sesion.tema} />
            <div style={{ padding: "28px 24px", textAlign: "center" }}>

              <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#166534", marginBottom: 8 }}>
                ¡Informe enviado!
              </div>
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
                El docente puede ver los resultados<br />y las reflexiones de ambos equipos.
              </div>

              {/* Resultado final */}
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                {equipos.map((eq, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: 14, padding: "14px 10px", backgroundColor: `${eq.color}15`, border: `2px solid ${eq.color}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 4, display: "flex", justifyContent: "center" }}><TeamName color={eq.color}>{eq.nombre}</TeamName></div>
                    <div style={{ fontSize: 12, color: PALETA.grisOscuro, marginBottom: 6 }}>{eq.integrantes}</div>
                    <div style={{ fontSize: 30, fontWeight: 900, color: PALETA.texto }}>{eq.puntos}</div>
                    <div style={{ fontSize: 12, color: PALETA.grisOscuro }}>puntos</div>
                  </div>
                ))}
              </div>

              {/* Ganador */}
              {(() => {
                const ganador = puntosEquipo1 > puntosEquipo2
                  ? equipos[0]
                  : puntosEquipo2 > puntosEquipo1
                  ? equipos[1]
                  : null;
                return (
                  <div style={{ backgroundColor: "#f0fdf4", borderRadius: 12, padding: "12px 16px", border: "1px solid #86efac", marginBottom: 24 }}>
                    {ganador ? (
                      <>
                        <div style={{ fontSize: 20 }}>🏆</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#166534" }}>
                          ¡Ganó {ganador.nombre}!
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 20 }}>🤝</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#166534" }}>¡Empate!</div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div style={{ backgroundColor: "#f8fafc", borderRadius: 10, padding: "12px 16px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  📱 Podés cerrar esta pestaña.<br />
                  <span style={{ fontSize: 12, color: PALETA.gris }}>
                    El docente verá el informe en su panel.
                  </span>
                </div>
              </div>

              {/* Opciones secundarias de entrega */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: PALETA.gris, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                  También podés enviárselo al docente manualmente
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={copiarInforme}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "2px solid #e2e8f0",
                      backgroundColor: copiado ? "#f0fdf4" : "white",
                      color: copiado ? "#166534" : "#475569",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}>
                    {copiado ? "✅ ¡Copiado!" : "📋 Copiar informe"}
                  </button>
                  <button
                    onClick={descargarInforme}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "2px solid #e2e8f0",
                      backgroundColor: "white",
                      color: "#475569",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}>
                    ⬇️ Descargar .txt
                  </button>
                </div>
                <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 8, lineHeight: 1.5 }}>
                  Copiá el texto y pegalo como comentario privado en la tarea de Classroom, o descargalo y mandáselo al docente.
                </div>
              </div>

            </div>
          </div>
        </FullPage>
      );
    }

    return (
      <FullPage gradient={colors.gradient}>
        <div style={cardWhite}>
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} />
          <div style={{ padding: "20px 24px" }}>
            <div style={{ backgroundColor: `${eq.color}15`, borderRadius: 12, padding: "12px 16px", border: `2px solid ${eq.color}`, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 800, display: "flex", justifyContent: "center" }}><TeamName color={eq.color}>✍️ Informe de {eq.nombre}</TeamName></div>
              <div style={{ fontSize: 12, color: PALETA.grisOscuro }}>{eq.integrantes}</div>
            </div>

            {preguntas.map((q, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <label htmlFor={`meta-equipo${metaEquipoActual + 1}-q${i + 1}`} style={{ ...lbl, fontSize: 12 }}>
                  {q.label} {q.required && <span style={{ color: PALETA.rojo }}>*</span>}
                </label>
                <textarea id={`meta-equipo${metaEquipoActual + 1}-q${i + 1}`} value={values[i]} onChange={e => setters[i](e.target.value)} rows={2}
                  style={{ ...inp, resize: "none", fontFamily: "inherit" }} />
              </div>
            ))}

            {metaError && (
              <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991b1b" }}>
                ⚠️ {metaError}
              </div>
            )}

            <button onClick={handleSiguienteEquipo}
              disabled={!values[0].trim() || metaEnviando}
              style={btnPrimario(colors.gradient, !values[0].trim() || metaEnviando)}>
              {metaEquipoActual === 0
                ? `Siguiente — informe de ${nombreEquipo2} →`
                : metaEnviando ? "📤 Enviando…" : metaError ? "🔁 Reintentar envío" : "📤 Enviar informe al docente"}
            </button>
          </div>
        </div>
      </FullPage>
    );
  }

  return null;
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

// Nombre de equipo: texto oscuro con un punto del color del equipo (el color
// identifica, no transmite el texto).
function TeamName({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: PALETA.texto }}>
      <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <span>{children}</span>
    </span>
  );
}

function FullPage({ children, gradient }: { children: React.ReactNode; gradient?: string }) {
  return (
    <div style={{ minHeight: "100vh", background: gradient || "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {children}
    </div>
  );
}

function Header({ colors, materia, tema }: { colors: { gradient: string; primary: string }; materia: string; tema: string }) {
  return (
    <div style={{ background: colors.gradient, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 22 }}>⚔️</span>
      <div style={{ color: "white" }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>⚖️ Árbitro de Aprendizaje</div>
        <div style={{ fontSize: 12, opacity: 0.95 }}>{materia} · {tema}</div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const cardWhite: React.CSSProperties = { backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 520, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", overflow: "hidden" };
// Texto solo para lectores de pantalla (región aria-live del temporizador).
const srOnly: React.CSSProperties = { position: "absolute", width: 1, height: 1, margin: -1, padding: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 };
const lbl: React.CSSProperties = { display: "block", marginBottom: 5, fontSize: 13, fontWeight: 700, color: "#374151" };
const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", fontSize: 13, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "#f8fafc", boxSizing: "border-box" as const };
const btnPrimario = (gradient: string, disabled: boolean): React.CSSProperties => ({
  width: "100%", minHeight: 44, padding: "13px", fontSize: 14, fontWeight: 700, borderRadius: 12, border: "none",
  background: disabled ? PALETA.gris : gradient, color: "white",
  cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.7 : 1,
});
