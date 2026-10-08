import { useState, useEffect, useRef } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useParams } from "react-router-dom";
import { app } from "../firebase.config";
import { useArbitroT, fillArbitro, useFormatoPuntos, useIdiomaSesion, useLocaleArbitro, useTituloPagina } from "../i18n";
import { textoInformePartida } from "../utils/arbitroDocumentos";
import { etiquetaCalificacion } from "../utils/arbitroEtiquetas";
import { calificacionPreguntaParaServidor } from "../utils/arbitroCalificacion";
import { esIaNoDisponible, esRespuestaNoClara, textoErrorArbitro } from "../utils/arbitroErrores";
import { PALETA, EQUIPO_COLORES, EQUIPO_COLOR_1, EQUIPO_COLOR_2 } from "../utils/arbitroPalette";
import { coloresArea } from "../utils/arbitroAreas";
import { DialogoEnPagina, fieldsetReset, legendReset } from "../utils/arbitroA11y";
import {
  leerPartida, guardarPartida, borrarPartida, purgarPartidasVencidas, sesionVencida,
  type PartidaGuardada,
} from "../utils/arbitroPartida";

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
  permitirPreguntasPropias?: boolean; // «Permitir preguntas propias»; las sesiones viejas no lo traen (= permitido)
  idioma?: string; // 'es' | 'en'; las sesiones viejas no lo traen (= 'es')
}

interface Veredicto {
  resultado: "A" | "B" | "ambas_correctas" | "ambas_incorrectas" | "fuera_de_tema";
  calificacionRecomendada?: "completa" | "incompleta" | "no";
  puntosResponde?: number;
  puntosPregunta?: number;
  veredicto: string;
  explicacion: string;
  paraSeguirPensando: string;
  consultaId?: string; // id de la consulta guardada por el servidor: registrarRonda toma de ahí el veredicto y el reparto
}

interface RegistroRonda {
  ronda: number;
  equipoPregunta: string;
  equipoResponde: string;
  pregunta: string;
  respuesta: string;
  calificacion: "completa" | "incompleta" | "no" | "pasada" | "fuera_de_tema";
  puntos: number;
  fueAlArbitro: boolean;
  veredictoArbitro?: string;
  tiempoSegundos?: number;
  consultaId?: string;   // solo cliente: para registrar la ronda en el servidor
  registrada?: boolean;  // solo cliente: true cuando registrarRonda confirmó el guardado
}

// Id de la partida (une las rondas de una misma partida bajo el mismo link de sesión).
const nuevoIdPartida = (): string => {
  try { return crypto.randomUUID().replace(/-/g, "").slice(0, 24); }
  catch { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
};

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
  const locale = useLocaleArbitro(); // fechas y números según el idioma (es-AR / en-US)
  const fmt = useFormatoPuntos(); // solo para mostrar; lo guardado y sumado es el valor exacto
  useTituloPagina(`${t.sesTitle} — ${t.pageTitleSuffix}`);
  // Texto con un {team} en el medio: el nombre del equipo entra como elemento (con su color).
  const conEquipo = (texto: string, nodo: React.ReactNode) => {
    const [antes, despues] = texto.split("{team}");
    return <>{antes}{nodo}{despues}</>;
  };

  // ── Sesión ────────────────────────────────────────────────────────────────
  const [sesion, setSesion] = useState<SesionData | null>(null);
  const [loadingSesion, setLoadingSesion] = useState(true);
  // El idioma de la pantalla (interfaz y <html lang>) sale de la sesión, no del navegador.
  useIdiomaSesion(sesion?.idioma, !!sesion);
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

  // ── Reconexión ────────────────────────────────────────────────────────────
  // La partida se guarda en localStorage (una clave por id de sesión) en cada cambio de estado.
  // Al cargar, si hay una partida guardada en curso se pregunta si continuar o empezar de nuevo.
  // "resuelta" queda en false mientras haya una decisión pendiente: hasta entonces NO se guarda
  // nada, para que el estado inicial vacío no pise la partida guardada.
  const [partidaId, setPartidaId] = useState<string>(nuevoIdPartida);
  const [validandoPropia, setValidandoPropia] = useState(false);
  const [errorPropia, setErrorPropia] = useState<string | null>(null);
  const [rec, setRec] = useState<{ guardada: PartidaGuardada | null; resuelta: boolean }>(() => {
    const g = leerPartida(sessionId);
    return { guardada: g, resuelta: !g };
  });

  const aplicarPartida = (g: PartidaGuardada) => {
    setNombreEquipo1(g.nombreEquipo1); setNombreEquipo2(g.nombreEquipo2);
    setColorEquipo1(g.colorEquipo1); setColorEquipo2(g.colorEquipo2);
    setIntegrantesEquipo1(g.integrantesEquipo1); setIntegrantesEquipo2(g.integrantesEquipo2);
    setVueltasTotales(g.vueltasTotales);
    setPreguntaNumero(g.preguntaNumero); setEquipoPreguntaIdx(g.equipoPreguntaIdx);
    setPuntosEquipo1(g.puntosEquipo1); setPuntosEquipo2(g.puntosEquipo2);
    setRegistros(g.registros);
    if (g.partidaId) setPartidaId(g.partidaId);
    setPreguntaActual(g.preguntaActual); setUsarPreguntaPropia(g.usarPreguntaPropia); setPreguntaBorrador(g.preguntaBorrador);
    setRespuestaActual(g.respuestaActual); setCalificacionActual(g.calificacionActual); setJustificacionCalificacion(g.justificacionCalificacion);
    setDisputaPregunta(g.disputaPregunta); setDisputaRespuesta(g.disputaRespuesta);
    setDisputaArgEquipoPregunta(g.disputaArgEquipoPregunta); setDisputaArgEquipoRespuesta(g.disputaArgEquipoRespuesta);
    setVeredictoArbitro(g.veredictoArbitro);
    setSegundos(g.segundos); setTiempoVencido(g.tiempoVencido); setCorriendo(g.corriendo); setSonidoActivo(g.sonidoActivo);
    setMetaEquipoActual(g.metaEquipoActual);
    setMeta1E1(g.meta[0]); setMeta2E1(g.meta[1]); setMeta3E1(g.meta[2]); setMeta4E1(g.meta[3]);
    setMeta1E2(g.meta[4]); setMeta2E2(g.meta[5]); setMeta3E2(g.meta[6]); setMeta4E2(g.meta[7]);
    // Una consulta al árbitro en vuelo no sobrevive a la recarga: sin veredicto se vuelve a la disputa.
    setPantalla(g.pantalla === "arbitro" && !g.veredictoArbitro ? "disputa" : g.pantalla);
    setErrorArbitro(null);
    setRec({ guardada: null, resuelta: true });
  };

  const continuarPartida = () => { if (rec.guardada) aplicarPartida(rec.guardada); };
  const empezarDeNuevo = () => {
    if (sessionId) borrarPartida(sessionId);
    setPartidaId(nuevoIdPartida()); // partida nueva = id nuevo
    setRec({ guardada: null, resuelta: true });
  };

  // Un guardado que quedó en la pantalla de armado de equipos no es "una partida en curso":
  // se restaura sin preguntar (son solo los nombres que ya habían escrito).
  useEffect(() => {
    purgarPartidasVencidas();
    if (rec.guardada && rec.guardada.pantalla === "setup") aplicarPartida(rec.guardada);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cargar sesión ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const fn = httpsCallable(getFunctions(app), "getSesionArbitro");
    fn({ sessionId })
      .then((res: any) => {
        if (sesionVencida(res.data?.expiresAt)) {
          borrarPartida(sessionId);
          setRec({ guardada: null, resuelta: true });
        }
        setSesion(res.data); setLoadingSesion(false);
      })
      .catch((err) => {
        // Sesión vencida o inexistente: el guardado ya no sirve. Un error de red NO lo borra:
        // se puede reintentar y retomar la partida.
        const code = String(err?.code || "");
        if (code.endsWith("deadline-exceeded") || code.endsWith("not-found")) {
          borrarPartida(sessionId);
          setRec({ guardada: null, resuelta: true });
        }
        setSesionError(textoErrorArbitro(err, t, err.message)); setLoadingSesion(false);
      });
  }, [sessionId]);

  // Autoguardado: en cada cambio de estado de la partida.
  useEffect(() => {
    if (!sessionId || !sesion || !rec.resuelta) return;
    // Partida terminada (informe enviado) o sesión vencida: no queda nada guardado.
    if (metaEnviada || sesionVencida(sesion.expiresAt)) { borrarPartida(sessionId); return; }
    const sinDatos = pantalla === "setup" && !nombreEquipo1 && !nombreEquipo2 && !integrantesEquipo1 && !integrantesEquipo2;
    if (sinDatos) { borrarPartida(sessionId); return; }
    guardarPartida(sessionId, {
      v: 1, expiresAt: sesion.expiresAt, guardadoEn: Date.now(), partidaId,
      nombreEquipo1, nombreEquipo2, colorEquipo1, colorEquipo2, integrantesEquipo1, integrantesEquipo2,
      vueltasTotales,
      pantalla: pantalla === "arbitro" && !veredictoArbitro ? "disputa" : pantalla,
      preguntaNumero, equipoPreguntaIdx, puntosEquipo1, puntosEquipo2, registros,
      preguntaActual, usarPreguntaPropia, preguntaBorrador, respuestaActual, calificacionActual, justificacionCalificacion,
      disputaPregunta, disputaRespuesta, disputaArgEquipoPregunta, disputaArgEquipoRespuesta,
      veredictoArbitro, segundos, tiempoVencido, corriendo, sonidoActivo, metaEquipoActual,
      meta: [meta1E1, meta2E1, meta3E1, meta4E1, meta1E2, meta2E2, meta3E2, meta4E2],
    });
  }, [
    sessionId, sesion, rec.resuelta, metaEnviada, partidaId,
    nombreEquipo1, nombreEquipo2, colorEquipo1, colorEquipo2, integrantesEquipo1, integrantesEquipo2, vueltasTotales,
    pantalla, preguntaNumero, equipoPreguntaIdx, puntosEquipo1, puntosEquipo2, registros,
    preguntaActual, usarPreguntaPropia, preguntaBorrador, respuestaActual, calificacionActual, justificacionCalificacion,
    disputaPregunta, disputaRespuesta, disputaArgEquipoPregunta, disputaArgEquipoRespuesta,
    veredictoArbitro, segundos, tiempoVencido, corriendo, sonidoActivo, metaEquipoActual,
    meta1E1, meta2E1, meta3E1, meta4E1, meta1E2, meta2E2, meta3E2, meta4E2,
  ]);

  // ── Registro de rondas en el servidor ─────────────────────────────────────
  // Cada ronda confirmada se registra con registrarRonda (el cliente no escribe directo en la base).
  // La llamada es idempotente (id = partida + número de ronda): si falla la red, se reintenta; y si se
  // recarga la página, las rondas que quedaron sin registrar (registrada !== true) se mandan al volver.
  const rondasEnVuelo = useRef<Set<number>>(new Set());
  const intentosRonda = useRef<Map<number, number>>(new Map());
  const [reintentoTick, setReintentoTick] = useState(0);
  useEffect(() => {
    if (!sessionId || !sesion || !rec.resuelta) return;
    const pendientes = registros.filter(r =>
      r.registrada !== true && !rondasEnVuelo.current.has(r.ronda) && (intentosRonda.current.get(r.ronda) ?? 0) < 4
      && (!r.fueAlArbitro || !!r.consultaId));
    pendientes.forEach(r => {
      rondasEnVuelo.current.add(r.ronda);
      intentosRonda.current.set(r.ronda, (intentosRonda.current.get(r.ronda) ?? 0) + 1);
      const fn = httpsCallable(getFunctions(app, "us-central1"), "registrarRonda");
      fn({
        sessionId, partidaId, ronda: r.ronda,
        equipoPregunta: r.equipoPregunta, equipoResponde: r.equipoResponde,
        pregunta: r.pregunta, calificacion: r.calificacion,
        consultaId: r.consultaId, tiempoSegundos: r.tiempoSegundos,
      })
        .then(() => setRegistros(prev => prev.map(x => (x.ronda === r.ronda ? { ...x, registrada: true } : x))))
        .catch((e: any) => {
          console.error("registrarRonda:", e);
          const code = String(e?.code || "");
          // Errores que no se arreglan reintentando (sesión vencida, datos inválidos): no insistir.
          if (/invalid-argument|failed-precondition|not-found/.test(code)) intentosRonda.current.set(r.ronda, 99);
          else setTimeout(() => setReintentoTick(n => n + 1), 8000);
        })
        .finally(() => { rondasEnVuelo.current.delete(r.ronda); });
    });
  }, [registros, sessionId, sesion, rec.resuelta, partidaId, reintentoTick]);

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
    // Suma exacta: los puntos son múltiplos de 0,25, que se representan sin error en binario.
    // (Antes se redondeaba a un decimal y 0,25 pasaba a 0,3.) El formato se aplica al mostrar.
    if (equipoIdx === 0) setPuntosEquipo1(p => p + pts);
    else setPuntosEquipo2(p => p + pts);
  };

  const puntosCalificacion = (c: "completa" | "incompleta" | "no" | "pasada") =>
    c === "completa" ? 1 : c === "incompleta" ? 0.5 : 0;

  const puntosReparto = (v: Veredicto): { puntosResponde: number; puntosPregunta: number } => ({
    puntosResponde: typeof v.puntosResponde === "number" ? v.puntosResponde : 0,
    puntosPregunta: typeof v.puntosPregunta === "number" ? v.puntosPregunta : 0,
  });

  // El árbitro devuelve A/B/ambas_correctas/ambas_incorrectas, no un puntaje.
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
  // El informe exportado (copiar / .txt) sale del diccionario del idioma de la sesión (el mismo que usa esta pantalla).
  const generarTextoInforme = () => textoInformePartida(t, {
    materia: sesion?.materia, tema: sesion?.tema,
    fecha: new Date().toLocaleDateString(locale),
    equipos: equipos.map(eq => ({ nombre: eq.nombre, integrantes: eq.integrantes, puntos: eq.puntos })),
    reflexiones: [
      { nombre: nombreEquipo1, integrantes: integrantesEquipo1, respuestas: [meta1E1, meta2E1, meta3E1, meta4E1] },
      { nombre: nombreEquipo2, integrantes: integrantesEquipo2, respuestas: [meta1E2, meta2E2, meta3E2, meta4E2] },
    ],
    formatoPuntos: fmt,
  });

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
    a.download = `${t.docFileName}-${sesion?.materia}-${new Date().toLocaleDateString(locale).replace(/\//g, "-")}.txt`;
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
      setErrorArbitro(t.jgSlow);
    }, 20000); // 20 segundos

    try {
      const fn = httpsCallable(getFunctions(app, "us-central1"), "requestVeredicto");
      const res = await fn({
        sessionId,
        modo: "juego_oral",
        // El texto que se manda al árbitro sale del diccionario del idioma de la sesión (el prompt del servidor está en ese idioma).
        conflicto: fillArbitro(t.modelConflict, { pregunta: disputaPregunta, equipo: equipoRespuesta.nombre, respuesta: disputaRespuesta }),
        // La calificación de quien preguntó viaja como dato aparte, no dentro del texto de la Posición A.
        calificacionPregunta: calificacionPreguntaParaServidor(calificacionActual),
        posicionA: `${equipoPregunta.nombre}: ${disputaArgEquipoPregunta}`,
        posicionB: fillArbitro(t.modelPositionB, { equipo: equipoRespuesta.nombre, argumento: disputaArgEquipoRespuesta }),
        equipoPregunta: equipoPregunta.nombre,
        equipoResponde: equipoRespuesta.nombre,
      }) as { data: Veredicto };
      clearTimeout(timeoutId);
      setErrorArbitro(null); // por si la respuesta llegó tarde, después de que el timeout ya haya marcado error
      setVeredictoArbitro(res.data);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(err);
      // El texto sale del código del error, no del mensaje del servidor.
      // - Gemini no disponible (saldo, cuota, modelo, red): aiUnavailable.
      // - Gemini respondió algo inutilizable (JSON inválido): errorNoClearAnswer.
      // En ningún caso se aplica un punto: se muestra el error con «Reintentar».
      if (esIaNoDisponible(err)) {
        setErrorArbitro(t.aiUnavailable);
      } else if (esRespuestaNoClara(err)) {
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
      consultaId: fueAlArbitro ? veredictoArbitro?.consultaId : undefined,
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

  // Pregunta fuera del texto/tema (el árbitro respondió fuera_de_tema): no se suman puntos, la ronda
  // queda registrada como "fuera_de_tema" para el informe y NO se consume: el mismo equipo vuelve a
  // elegir otra pregunta (la rechazada queda marcada como usada en la lista).
  const registrarFueraDeTema = () => {
    setRegistros(prev => [...prev, {
      ronda: prev.length + 1,
      equipoPregunta: equipoPregunta.nombre,
      equipoResponde: equipoRespuesta.nombre,
      pregunta: preguntaActual,
      respuesta: disputaRespuesta,
      calificacion: "fuera_de_tema",
      puntos: 0,
      fueAlArbitro: true,
      veredictoArbitro: veredictoArbitro?.veredicto,
      tiempoSegundos: segundos,
      consultaId: veredictoArbitro?.consultaId,
    }]);
    detenerTimer();
    setPreguntaActual("");
    setUsarPreguntaPropia(false);
    setPreguntaBorrador("");
    setSegundos(0);
    setTiempoVencido(false);
    setRespuestaActual("");
    setCalificacionActual(null);
    setJustificacionCalificacion("");
    setVeredictoArbitro(null);
    setErrorArbitro(null);
    setDisputaPregunta("");
    setDisputaRespuesta("");
    setDisputaArgEquipoPregunta("");
    setDisputaArgEquipoRespuesta("");
    setPantalla("turno_pregunta");
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
  if (loadingSesion) return <FullPage><div role="status"><h1 style={{ margin: 0, color: "white", fontSize: 18, fontWeight: 600 }}>{t.sesLoading}</h1></div></FullPage>;
  if (sesionError || !sesion) return (
    <FullPage>
      <div role="alert" style={{ backgroundColor: "white", borderRadius: 16, padding: 32, maxWidth: 400, textAlign: "center" }}>
        <div aria-hidden="true" style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{t.sesUnavailable}</h1>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>{t.jgCheckLink}</div>
      </div>
    </FullPage>
  );

  // Hay una partida guardada en curso: se pregunta antes de mostrar nada del juego.
  if (!rec.resuelta && rec.guardada) {
    const g = rec.guardada;
    return (
      <FullPage gradient={colors.gradient}>
        <DialogoEnPagina style={cardWhite} onCerrar={continuarPartida} idTitulo="resume-q" idDescripcion="resume-summary">
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} titulo={t.gameScreenResume} />
          <div style={{ padding: "28px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }} aria-hidden="true">⏸️</div>
            <h2 id="resume-q" style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800, color: PALETA.texto, lineHeight: 1.35 }}>{t.resumeQuestion}</h2>
            <div id="resume-summary" style={{ fontSize: 14, color: PALETA.grisOscuro, marginBottom: 22, lineHeight: 1.5 }} data-testid="resume-summary">
              {fillArbitro(t.resumeSummary, {
                team1: g.nombreEquipo1, points1: fmt(g.puntosEquipo1),
                team2: g.nombreEquipo2, points2: fmt(g.puntosEquipo2),
                round: g.preguntaNumero, total: g.vueltasTotales,
              })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={continuarPartida} style={btnPrimario(colors.gradient, false)}>{t.resumeContinue}</button>
              <button onClick={empezarDeNuevo}
                style={{ width: "100%", minHeight: 44, padding: "13px", fontSize: 14, fontWeight: 700, borderRadius: 12, border: `2px solid ${PALETA.gris}`, background: "white", color: PALETA.texto, cursor: "pointer" }}>
                {t.resumeRestart}
              </button>
            </div>
          </div>
        </DialogoEnPagina>
      </FullPage>
    );
  }

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
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} titulo={t.gameScreenSetup} />
          <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div aria-hidden="true" style={{ fontSize: 24, marginBottom: 4 }}>⚖️ {t.sesTitle}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{sesion.materia} · {sesion.tema}</div>
            </div>

            {[0, 1].map(idx => {
              const colorTarjeta = idx === 0 ? colorEquipo1 : colorEquipo2;
              return (
              <div key={idx} style={{ backgroundColor: `${colorTarjeta}15`, borderRadius: 16, padding: 18, border: `2px solid ${colorTarjeta}` }}>
                <h2 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 800, color: "#1e293b" }}>
                  {fillArbitro(t.jgTeamN, { n: idx + 1 })}
                </h2>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor={`equipo-${idx + 1}-nombre`} style={lbl}>{t.jgTeamNameLabel}</label>
                  <input id={`equipo-${idx + 1}-nombre`} type="text" value={idx === 0 ? nombreEquipo1 : nombreEquipo2}
                    onChange={e => idx === 0 ? setNombreEquipo1(e.target.value) : setNombreEquipo2(e.target.value)}
                    placeholder={t.jgTeamNamePlaceholder}
                    style={inp} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor={`equipo-${idx + 1}-integrantes`} style={lbl}>{t.jgMembersLabel}</label>
                  <input id={`equipo-${idx + 1}-integrantes`} type="text" value={idx === 0 ? integrantesEquipo1 : integrantesEquipo2}
                    onChange={e => idx === 0 ? setIntegrantesEquipo1(e.target.value) : setIntegrantesEquipo2(e.target.value)}
                    placeholder={t.jgMembersPlaceholder}
                    style={inp} />
                </div>
                <fieldset style={fieldsetReset}>
                  <legend style={{ ...legendReset, ...lbl }}>{fillArbitro(t.teamColorGroup, { team: (idx === 0 ? nombreEquipo1 : nombreEquipo2).trim() || fillArbitro(t.teamColorNumber, { n: idx + 1 }) })}</legend>
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
                </fieldset>
              </div>
              );
            })}

            <fieldset style={fieldsetReset}>
              <legend style={{ ...legendReset, ...lbl }}>{t.jgHowManyQuestions}</legend>
              <div style={{ display: "flex", gap: 8 }}>
                {[5, 10, 15, 20, 25].map(v => (
                  <button key={v} onClick={() => setVueltasTotales(v)} aria-pressed={vueltasTotales === v}
                    style={{ flex: 1, minHeight: 44, padding: "10px 0", borderRadius: 10, border: `2px solid ${vueltasTotales === v ? colors.primary : "#e2e8f0"}`, backgroundColor: vueltasTotales === v ? `${colors.primary}15` : "white", fontWeight: 700, fontSize: 13, color: vueltasTotales === v ? colors.primary : PALETA.gris, cursor: "pointer" }}>
                    {v}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 4 }}>
                {t.jgTotalHint}
              </div>
            </fieldset>

            <button onClick={() => setPantalla("turno_pregunta")}
              disabled={!puedeEmpezar}
              style={{ padding: "14px", fontSize: 15, fontWeight: 800, borderRadius: 12, border: "none", background: puedeEmpezar ? colors.gradient : PALETA.gris, color: "white", cursor: puedeEmpezar ? "pointer" : "not-allowed" }}>
              {t.jgStart}
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
          <div style={{ fontSize: 28, fontWeight: 900, color: PALETA.texto }}>{fmt(eq.puntos)}</div>
          <div style={{ fontSize: 12, color: "#475569" }}>{t.pointsUnit}</div>
        </div>
      ))}
    </div>
  );

  // Texto gris oscuro sobre la tarjeta blanca (antes: blanco al 70 % sobre blanco).
  const InfoRonda = () => (
    <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", textAlign: "center", marginBottom: 8 }}>
      {fillArbitro(t.jgQuestionOf, { n: preguntaNumero, total: vueltasTotales })}
    </div>
  );


  // ── TURNO: elegir la pregunta y hacerla en voz alta ───────────────────────
  // Pantalla única: el equipo elige del banco (o escribe la suya), y recién
  // ahí arranca el cronómetro y se muestra la pregunta para leerla en voz alta.
  if (pantalla === "turno_pregunta") {
    // «Permitir preguntas propias» (opción de la sesión): si el docente la desactivó, solo se elige de la lista
    // (salvo que la lista esté vacía: entonces no habría con qué jugar).
    const permitirPropias = sesion.permitirPreguntasPropias !== false;
    const escribiendoPropia = (permitirPropias && usarPreguntaPropia) || preguntasDisponibles.length === 0;

    // Antes de pasarle la pregunta al otro equipo se verifica con Gemini que corresponda al texto base y al tema.
    // Si no corresponde, se avisa y NO se gasta la ronda ni arranca el reloj. Si la verificación no está
    // disponible (red, IA caída), se sigue: el árbitro igual puede marcar la pregunta como fuera de tema.
    const confirmarPreguntaPropia = async () => {
      const texto = preguntaBorrador.trim();
      if (!texto || validandoPropia) return;
      setErrorPropia(null);
      setValidandoPropia(true);
      let pertinente = true;
      try {
        const fn = httpsCallable(getFunctions(app, "us-central1"), "validarPreguntaPropia", { timeout: 20000 });
        const res = await fn({ sessionId, pregunta: texto }) as { data: { pertinente?: boolean } };
        pertinente = res.data?.pertinente !== false;
      } catch (e) {
        console.error("validarPreguntaPropia:", e);
      }
      setValidandoPropia(false);
      if (!pertinente) { setErrorPropia(t.ownQuestionOffTopic); return; }
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
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} titulo={t.gameScreenAsk} />
          <div style={{ padding: "20px 24px" }}>
            <InfoRonda />
            <Tablero />

            {/* Quién pregunta a quién */}
            <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 16, border: "1.5px solid #e2e8f0" }}>
              <div style={{ backgroundColor: `${equipoPregunta.color}15`, padding: "14px 18px", borderBottom: `2px solid ${equipoPregunta.color}30` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: PALETA.grisOscuro, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{t.jgAsksLabel}</div>
                <div style={{ fontSize: 18, fontWeight: 900 }}><TeamName color={equipoPregunta.color}>{equipoPregunta.nombre}</TeamName></div>
                <div style={{ fontSize: 12, color: PALETA.grisOscuro }}>{equipoPregunta.integrantes}</div>
              </div>
              <div style={{ backgroundColor: "#f8fafc", padding: "6px 18px", textAlign: "center" }}>
                <div aria-hidden="true" style={{ fontSize: 16, color: PALETA.gris }}>↓</div>
              </div>
              <div style={{ backgroundColor: `${equipoRespuesta.color}15`, padding: "14px 18px", borderTop: `2px solid ${equipoRespuesta.color}30` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: PALETA.grisOscuro, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{t.jgAnswersLabel}</div>
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
                      ? (tiempoVencido ? `⏰ ${t.timerAnnounceUp}` : alerta ? t.timerLastSeconds : t.jgTimeLeft)
                      : t.jgTimeElapsed}
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
                <h2 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#374151" }}>
                  {fillArbitro(t.jgPickFromList, { team: equipoPregunta.nombre })}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
                  {preguntasDisponibles.map((preg, i) => {
                    const usada = preguntasUsadas.has(preg.trim());
                    return (
                      <button
                        key={i}
                        className="arb-foco"
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
                {permitirPropias && (
                  <button
                    onClick={() => { setUsarPreguntaPropia(true); setPreguntaBorrador(""); setErrorPropia(null); }}
                    style={{ marginTop: 10, background: "none", border: "none", color: "#0369a1", fontSize: 12, fontWeight: 600, textDecoration: "underline", cursor: "pointer", padding: 0, minHeight: 44 }}>
                    {t.jgWriteOwn}
                  </button>
                )}
              </div>
            )}

            {/* ── Sin pregunta elegida: escribir la propia ── */}
            {!preguntaActual && escribiendoPropia && (
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="pregunta-propia" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                  {fillArbitro(t.jgWriteOwnLabel, { team: equipoPregunta.nombre })}
                </label>
                <textarea
                  id="pregunta-propia"
                  value={preguntaBorrador}
                  onChange={e => { setPreguntaBorrador(e.target.value); if (errorPropia) setErrorPropia(null); }}
                  aria-describedby={errorPropia ? "pregunta-propia-error" : undefined}
                  aria-invalid={errorPropia ? true : undefined}
                  rows={3}
                  placeholder={t.jgWriteOwnPlaceholder}
                  style={{ ...inp, resize: "none", fontFamily: "inherit" }}
                />
                {errorPropia && (
                  <div id="pregunta-propia-error" role="alert" style={{ marginTop: 10, backgroundColor: "#fff7ed", border: "1px solid #fdba74", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: PALETA.naranjaOscuro, lineHeight: 1.5 }}>
                    🚫 {errorPropia}
                  </div>
                )}
                {/* Aviso de espera: región siempre presente para que se anuncie */}
                <div role="status" style={srOnly}>{validandoPropia ? t.ownQuestionChecking : ""}</div>
                <button
                  onClick={confirmarPreguntaPropia}
                  disabled={!preguntaBorrador.trim() || validandoPropia}
                  style={{ ...btnPrimario(colors.gradient, !preguntaBorrador.trim() || validandoPropia), marginTop: 10 }}>
                  {validandoPropia ? `⏳ ${t.ownQuestionChecking}` : t.jgConfirmQuestion}
                </button>
                {preguntasDisponibles.length > 0 && (
                  <button
                    onClick={() => { setUsarPreguntaPropia(false); setPreguntaBorrador(""); setErrorPropia(null); }}
                    style={{ marginTop: 8, background: "none", border: "none", color: "#64748b", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0, minHeight: 44 }}>
                    {t.jgPickFromListBack}
                  </button>
                )}
              </div>
            )}

            {/* ── Pregunta elegida: leerla en voz alta ── */}
            {preguntaActual && (
              <>
                <div style={{ backgroundColor: "#f0f9ff", borderRadius: 12, padding: "14px 16px", border: "1.5px solid #0ea5e9", marginBottom: 16 }}>
                  <h2 style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {t.jgChosenTitle}
                  </h2>
                  <div style={{ fontSize: 14, color: "#0c4a6e", lineHeight: 1.6, fontWeight: 600, marginBottom: 8 }}>
                    {preguntaActual}
                  </div>
                  <button
                    onClick={volverAElegir}
                    style={{ fontSize: 12, color: "#0369a1", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: "0", minHeight: 44 }}>
                    {t.jgChooseAnother}
                  </button>
                </div>

                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 16, textAlign: "center" }}>
                  <strong>{equipoRespuesta.nombre}</strong> {t.jgAnswersAloud}
                </div>
              </>
            )}

            <button
              onClick={() => { detenerTimer(); setPantalla("calificacion"); }}
              disabled={!preguntaActual.trim()}
              style={btnPrimario(colors.gradient, !preguntaActual.trim())}>
              {t.jgAnswered}
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
                {t.jgPass}
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
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} titulo={t.gameScreenGrade} />
          <div style={{ padding: "20px 24px" }}>
            <InfoRonda />
            <Tablero />

            <div style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 4, textTransform: "uppercase" }}>{t.jgQuestionLabel}</div>
              <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.5 }}>{preguntaActual}</div>
            </div>
            <div style={{ backgroundColor: "#f0fdf4", borderRadius: 12, padding: "14px 16px", border: "1px solid #86efac", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 4, textTransform: "uppercase" }}>{fillArbitro(t.jgAnswerOf, { team: equipoRespuesta.nombre })}</div>
              <div style={{ fontSize: 13, color: "#14532d", lineHeight: 1.5 }}>{respuestaActual}</div>
            </div>

            <fieldset style={{ ...fieldsetReset, marginBottom: 20 }}>
            <legend style={{ ...legendReset, fontSize: 14, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>
              {fillArbitro(t.jgIsComplete, { team: equipoPregunta.nombre })}
            </legend>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { val: "completa" as const, label: `✅ ${t.gradeCompleta}`, desc: t.pointsText(fmt(1), 1), color: PALETA.verde, bg: "#f0fdf4", border: "#86efac" },
                { val: "incompleta" as const, label: `⚡ ${t.gradeIncompleta}`, desc: t.pointsText(fmt(0.5), 0.5), color: PALETA.ambar, bg: "#fffbeb", border: "#fde68a" },
                { val: "no" as const, label: `❌ ${t.gradeIncorrecta}`, desc: t.pointsText(fmt(0), 0), color: PALETA.rojo, bg: "#fef2f2", border: "#fecaca" },
              ]).map(op => (
                <button key={op.val} onClick={() => setCalificacionActual(op.val)} aria-pressed={calificacionActual === op.val}
                  style={{ padding: "14px 18px", borderRadius: 12, border: `2px solid ${calificacionActual === op.val ? op.color : op.border}`, backgroundColor: calificacionActual === op.val ? op.bg : "white", textAlign: "left" as const, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: op.color }}>{op.label}</span>
                  <span style={{ fontSize: 13, color: op.color, fontWeight: 600 }}>{op.desc}</span>
                </button>
              ))}
            </div>
            </fieldset>

            {calificacionActual && calificacionActual !== "completa" && (
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="justificacion-calificacion" style={{ ...lbl, color: PALETA.ambar }}>
                  {fillArbitro(t.jgWhatMissing, { team: equipoPregunta.nombre })}
                </label>
                <textarea
                  id="justificacion-calificacion"
                  value={justificacionCalificacion}
                  onChange={e => setJustificacionCalificacion(e.target.value)}
                  rows={2}
                  placeholder={t.jgWhatMissingPlaceholder}
                  style={{ ...inp, resize: "none", fontFamily: "inherit", borderColor: "#fde68a" }}
                />
              </div>
            )}

            <button onClick={() => setPantalla("aceptacion")}
              disabled={!calificacionActual || (calificacionActual !== "completa" && !justificacionCalificacion.trim())}
              style={btnPrimario(colors.gradient, !calificacionActual || (calificacionActual !== "completa" && !justificacionCalificacion.trim()))}>
              {t.jgContinue}
            </button>
          </div>
        </div>
      </FullPage>
    );
  }

  // ── ACEPTACIÓN ────────────────────────────────────────────────────────────
  if (pantalla === "aceptacion") {
    const pts = puntosCalificacion(calificacionActual!);
    const labelCal = `${etiquetaCalificacion(calificacionActual, t)} (${t.pointsText(fmt(pts), pts)})`;
    return (
      <FullPage gradient={colors.gradient}>
        <div style={cardWhite}>
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} titulo={t.gameScreenAccept} />
          <div style={{ padding: "20px 24px" }}>
            <InfoRonda />
            <Tablero />

            <div style={{ backgroundColor: "#f8fafc", borderRadius: 14, padding: 18, border: "1px solid #e2e8f0", marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                {fillArbitro(t.jgGradedAs, { team: equipoPregunta.nombre })}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#1e293b", marginBottom: 4 }}>
                {labelCal}
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {fillArbitro(t.jgForTeam, { team: equipoRespuesta.nombre })}
              </div>
            </div>

            {justificacionCalificacion.trim() && (
              <div style={{ backgroundColor: "#fffbeb", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4, textTransform: "uppercase" }}>
                  {fillArbitro(t.jgSaysMissing, { team: equipoPregunta.nombre })}
                </div>
                <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.5 }}>{justificacionCalificacion}</div>
              </div>
            )}

            <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#1e293b", textAlign: "center" }}>
              {fillArbitro(t.jgAccepts, { team: equipoRespuesta.nombre })}
            </h2>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => cerrarRonda(pts, false)}
                style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: PALETA.verde, color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                {t.jgYesAccept}
              </button>
              <button onClick={() => {
                setDisputaPregunta(preguntaActual);
                setDisputaArgEquipoPregunta(justificacionCalificacion);
                setPantalla("disputa");
              }}
                style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${PALETA.naranja}, ${PALETA.naranjaOscuro})`, color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                {t.jgConsult}
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
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} titulo={t.gameScreenDispute} />
          <div style={{ padding: "20px 24px" }}>
            <InfoRonda />
            <Tablero />

            <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#1e293b", textAlign: "center" }}>
              {t.jgDisputeTitle}
            </h2>
            <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", marginBottom: 20 }}>
              {t.jgDisputeHint}
            </div>

            {/* Pregunta */}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="disputa-pregunta" style={{ ...lbl, color: "#0369a1" }}>
                {t.jgWhatQuestion}
              </label>
              <textarea
                id="disputa-pregunta"
                value={disputaPregunta}
                onChange={e => setDisputaPregunta(e.target.value)}
                rows={2}
                placeholder={t.jgWhatQuestionPlaceholder}
                style={{ ...inp, resize: "none", fontFamily: "inherit", borderColor: "#bae6fd" }}
              />
            </div>

            {/* Respuesta */}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="disputa-respuesta" style={{ ...lbl, color: "#166534" }}>
                {conEquipo(t.jgWhatAnswered, <TeamName color={equipoRespuesta.color}>{equipoRespuesta.nombre}</TeamName>)}
              </label>
              <textarea
                id="disputa-respuesta"
                value={disputaRespuesta}
                onChange={e => setDisputaRespuesta(e.target.value)}
                rows={2}
                placeholder={t.jgWhatAnsweredPlaceholder}
                style={{ ...inp, resize: "none", fontFamily: "inherit", borderColor: "#86efac" }}
              />
            </div>

            {/* Argumento equipo que calificó */}
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="disputa-arg-pregunta" style={lbl}>
                {conEquipo(t.jgWhyGraded, <TeamName color={equipoPregunta.color}>{equipoPregunta.nombre}</TeamName>)}
              </label>
              <textarea
                id="disputa-arg-pregunta"
                value={disputaArgEquipoPregunta}
                onChange={e => setDisputaArgEquipoPregunta(e.target.value)}
                rows={2}
                placeholder={fillArbitro(t.jgWhyGradedPlaceholder, { team: equipoPregunta.nombre, grade: etiquetaCalificacion(calificacionActual, t).toLowerCase() })}
                style={{ ...inp, resize: "none", fontFamily: "inherit", borderColor: `${equipoPregunta.color}60` }}
              />
            </div>

            {/* Argumento equipo que respondió */}
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="disputa-arg-respuesta" style={lbl}>
                {conEquipo(t.jgWhyNotAccept, <TeamName color={equipoRespuesta.color}>{equipoRespuesta.nombre}</TeamName>)}
              </label>
              <textarea
                id="disputa-arg-respuesta"
                value={disputaArgEquipoRespuesta}
                onChange={e => setDisputaArgEquipoRespuesta(e.target.value)}
                rows={2}
                placeholder={fillArbitro(t.jgWhyNotAcceptPlaceholder, { team: equipoRespuesta.nombre })}
                style={{ ...inp, resize: "none", fontFamily: "inherit", borderColor: `${equipoRespuesta.color}60` }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setPantalla("aceptacion")}
                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {t.jgBack}
              </button>
              <button
                onClick={() => { consultarArbitro(); setPantalla("arbitro"); }}
                disabled={!puedeConsultar}
                style={{ flex: 2, ...btnPrimario(colors.gradient, !puedeConsultar) }}>
                {t.jgConsult}
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
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} titulo={t.gameScreenReferee} />
          <div style={{ padding: "20px 24px" }}>
            <InfoRonda />
            <Tablero />

            {errorArbitro ? (
              <div role="alert" style={{ textAlign: "center", padding: "24px 0" }}>
                <div aria-hidden="true" style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>
                  {errorArbitro}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button
                    onClick={() => { setErrorArbitro(null); consultarArbitro(); }}
                    style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: colors.gradient, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {t.jgRetry}
                  </button>
                  <button
                    onClick={() => { setErrorArbitro(null); setPantalla("disputa"); }}
                    style={{ flex: 1, padding: "12px", borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {t.jgBack}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 16 }}>
                  {t.errorRetryHint}
                </div>
              </div>
            ) : loadingArbitro ? (
              <div role="status" aria-live="polite" style={{ textAlign: "center", padding: "32px 0" }}>
                <div aria-hidden="true" style={{ fontSize: 40, marginBottom: 12 }}>⚖️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{t.jgAnalyzing}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{t.jgOneMoment}</div>
              </div>
            ) : veredictoArbitro && veredictoArbitro.resultado === "fuera_de_tema" ? (
              <div>
                <div role="alert" style={{ backgroundColor: "#fff7ed", borderRadius: 14, padding: "16px 18px", border: "2px solid #fdba74", marginBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: PALETA.naranjaOscuro, marginBottom: 6 }}>⚠️ {t.offTopicQuestion}</div>
                  {veredictoArbitro.explicacion && <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{veredictoArbitro.explicacion}</div>}
                </div>
                <div style={{ fontSize: 12, color: PALETA.grisOscuro, textAlign: "center", marginBottom: 16 }}>{t.offTopicNoPoints}</div>
                <button onClick={registrarFueraDeTema} style={btnPrimario(colors.gradient, false)}>
                  {t.offTopicChooseAnother}
                </button>
              </div>
            ) : veredictoArbitro ? (() => {
              const { puntosResponde, puntosPregunta } = puntosReparto(veredictoArbitro);
              const equipoRespondeIdx = equipoPreguntaIdx === 0 ? 1 : 0;
              return (
              <div>
                {/* Veredicto */}
                <div style={{ backgroundColor: "#f0f9ff", borderRadius: 14, padding: "16px 18px", border: "2px solid #0ea5e9", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                    {t.jgVerdictTitle}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{veredictoArbitro.veredicto}</div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{veredictoArbitro.explicacion}</div>
                </div>

                {veredictoArbitro.paraSeguirPensando && (
                  <div style={{ backgroundColor: "#fef9c3", borderRadius: 10, padding: "10px 14px", border: "1px solid #fde047", marginBottom: 16, fontSize: 12, color: "#713f12" }}>
                    <strong>{t.jgThink}</strong> {veredictoArbitro.paraSeguirPensando}
                  </div>
                )}

                {/* Reparto visual del punto */}
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>
                  {t.jgSplitTitle}
                </div>
                <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", marginBottom: 8, border: "2px solid #e2e8f0" }}>
                  <div style={{
                    flex: puntosPregunta || 0.001, backgroundColor: `${equipoPregunta.color}20`,
                    padding: "14px 10px", textAlign: "center", borderRight: "2px solid white",
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: PALETA.texto }}>{fmt(puntosPregunta)}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, display: "flex", justifyContent: "center" }}><TeamName color={equipoPregunta.color}>{equipoPregunta.nombre}</TeamName></div>
                  </div>
                  <div style={{
                    flex: puntosResponde || 0.001, backgroundColor: `${equipoRespuesta.color}20`,
                    padding: "14px 10px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: PALETA.texto }}>{fmt(puntosResponde)}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, display: "flex", justifyContent: "center" }}><TeamName color={equipoRespuesta.color}>{equipoRespuesta.nombre}</TeamName></div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: PALETA.gris, textAlign: "center", marginBottom: 20 }}>
                  {t.jgSumInPlay(fmt(puntosResponde + puntosPregunta), puntosResponde + puntosPregunta)}
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
                  {t.jgConfirmContinue}
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
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} titulo={t.gameScreenRound} />
          <div style={{ padding: "20px 24px" }}>
            <Tablero />

            {ultimoRegistro && (
              <div style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase" }}>{t.jgLastRound}</div>
                {ultimoRegistro.calificacion === "pasada" ? (
                  <>
                    <div style={{ fontSize: 12, color: "#1e293b", marginBottom: 4 }}>
                      {conEquipo(t.jgDidNotAnswer, <strong>{ultimoRegistro.equipoResponde}</strong>)}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {t.jgPassedNoPoints}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: "#1e293b", marginBottom: 4 }}>
                      <strong>{ultimoRegistro.equipoResponde}</strong> {t.jgResponded} "{ultimoRegistro.respuesta.substring(0, 80)}{ultimoRegistro.respuesta.length > 80 ? "..." : ""}"
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {t.jgGradeLabel} <strong>{etiquetaCalificacion(ultimoRegistro.calificacion, t)}</strong> · {t.pointsText(fmt(ultimoRegistro.puntos), ultimoRegistro.puntos)}
                      {ultimoRegistro.fueAlArbitro ? t.jgValidatedByReferee : ""}
                    </div>
                  </>
                )}
              </div>
            )}

            {juegoTerminado ? (
              <div>
                <button onClick={() => setPantalla("fin_juego")}
                  style={btnPrimario(colors.gradient, false)}>
                  {t.jgSeeFinal}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={siguienteRonda}
                  style={btnPrimario(colors.gradient, false)}>
                  {fillArbitro(t.jgNext, { n: preguntaNumero + 1, total: vueltasTotales })}
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
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} titulo={t.gameScreenEnd} />
          <div style={{ padding: "20px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
              {ganador ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 900, display: "flex", justifyContent: "center" }}><TeamName color={ganador.color}>{fillArbitro(t.jgWon, { team: ganador.nombre })}</TeamName></div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{ganador.integrantes}</div>
                </>
              ) : (
                <div style={{ fontSize: 22, fontWeight: 900, color: "#1e293b" }}>{t.jgTie}</div>
              )}
            </div>

            <Tablero />

            <div style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>{t.jgRoundSummary}</div>
              {registros.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: "#1e293b", marginBottom: 4, paddingBottom: 4, borderBottom: "1px solid #f1f5f9" }}>
                  {fillArbitro(t.jgRoundLine, { n: i + 1, from: r.equipoPregunta, to: r.equipoResponde, grade: etiquetaCalificacion(r.calificacion, t), points: `${fmt(r.puntos)} ${t.pointsAbbrev}` })} {r.fueAlArbitro ? "⚖️" : ""}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => { setVueltasTotales(v => v + 5); setPreguntaNumero(p => p + 1); setEquipoPreguntaIdx(equipoPreguntaIdx === 0 ? 1 : 0); setPantalla("turno_pregunta"); }}
                style={{ padding: "12px", borderRadius: 10, border: `2px solid ${colors.primary}`, backgroundColor: "white", color: colors.primary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {t.jgAddFive}
              </button>
              <button onClick={() => { setMetaEquipoActual(0); setPantalla("metacognicion"); }}
                style={btnPrimario(colors.gradient, false)}>
                {t.jgDoReport}
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
      { label: fillArbitro(t.jgMetaQ1, { tema: sesion.tema }), required: true },
      { label: t.jgMetaQ2, required: false },
      { label: t.jgMetaQ3, required: false },
      { label: t.jgMetaQ4, required: false },
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
            partidaId,
            modo: "competitivo",
            equipos: [
              { nombre: nombreEquipo1, color: colorEquipo1, integrantes: integrantesEquipo1, puntos: puntosEquipo1,
                respuestas: { q1: meta1E1, q2: meta2E1, q3: meta3E1, q4: meta4E1 } },
              { nombre: nombreEquipo2, color: colorEquipo2, integrantes: integrantesEquipo2, puntos: puntosEquipo2,
                respuestas: { q1: meta1E2, q2: meta2E2, q3: meta3E2, q4: meta4E2 } },
            ],
            registros: registros.map(({ consultaId: _c, registrada: _r, ...resto }) => resto),
          });
          // Solo confirmamos éxito si la llamada realmente terminó bien.
          setMetaEnviada(true);
        } catch (e: any) {
          console.error(e);
          setMetaError(textoErrorArbitro(e, t, t.jgReportSendError));
        } finally {
          setMetaEnviando(false);
        }
      }
    };

    if (metaEnviada) {
      return (
        <FullPage gradient={colors.gradient}>
          <div style={cardWhite}>
            <Header colors={colors} materia={sesion.materia} tema={sesion.tema} titulo={t.gameScreenReflect} />
            <div style={{ padding: "28px 24px", textAlign: "center" }}>

              <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
              <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: "#166534" }}>
                {t.jgReportSent}
              </h2>
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
                {t.jgReportSentDesc1}<br />{t.jgReportSentDesc2}
              </div>

              {/* Resultado final */}
              <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                {equipos.map((eq, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: 14, padding: "14px 10px", backgroundColor: `${eq.color}15`, border: `2px solid ${eq.color}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 4, display: "flex", justifyContent: "center" }}><TeamName color={eq.color}>{eq.nombre}</TeamName></div>
                    <div style={{ fontSize: 12, color: PALETA.grisOscuro, marginBottom: 6 }}>{eq.integrantes}</div>
                    <div style={{ fontSize: 30, fontWeight: 900, color: PALETA.texto }}>{fmt(eq.puntos)}</div>
                    <div style={{ fontSize: 12, color: PALETA.grisOscuro }}>{t.pointsUnit}</div>
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
                          {fillArbitro(t.jgWon, { team: ganador.nombre })}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 20 }}>🤝</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#166534" }}>{t.jgTie}</div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div style={{ backgroundColor: "#f8fafc", borderRadius: 10, padding: "12px 16px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                  {t.jgCloseTab}<br />
                  <span style={{ fontSize: 12, color: PALETA.gris }}>
                    {t.jgTeacherSees}
                  </span>
                </div>
              </div>

              {/* Opciones secundarias de entrega */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: PALETA.gris, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                  {t.jgSendManually}
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
                    {copiado ? t.jgCopiedShort : t.jgCopyReport}
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
                    {t.jgDownloadTxt}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 8, lineHeight: 1.5 }}>
                  {t.jgManualHint}
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
          <Header colors={colors} materia={sesion.materia} tema={sesion.tema} titulo={t.gameScreenReflect} />
          <div style={{ padding: "20px 24px" }}>
            <div style={{ backgroundColor: `${eq.color}15`, borderRadius: 12, padding: "12px 16px", border: `2px solid ${eq.color}`, marginBottom: 16, textAlign: "center" }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, display: "flex", justifyContent: "center" }}><TeamName color={eq.color}>{fillArbitro(t.jgReportOf, { team: eq.nombre })}</TeamName></h2>
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
              <div role="alert" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991b1b" }}>
                ⚠️ {metaError}
              </div>
            )}

            <button onClick={handleSiguienteEquipo}
              disabled={!values[0].trim() || metaEnviando}
              style={btnPrimario(colors.gradient, !values[0].trim() || metaEnviando)}>
              {metaEquipoActual === 0
                ? fillArbitro(t.jgNextReport, { team: nombreEquipo2 })
                : metaEnviando ? t.jgSending : metaError ? t.jgRetrySend : t.jgSendReport}
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
    <main style={{ minHeight: "100vh", background: gradient || "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {children}
    </main>
  );
}

// El <h1> de cada pantalla: el nombre del juego (visible) más el título de la pantalla
// (solo para lectores de pantalla), así cada pantalla tiene un h1 distinto.
function Header({ colors, materia, tema, titulo }: { colors: { gradient: string; primary: string }; materia: string; tema: string; titulo: string }) {
  const t = useArbitroT();
  return (
    <div style={{ background: colors.gradient, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
      <span aria-hidden="true" style={{ fontSize: 22 }}>⚔️</span>
      <div style={{ color: "white" }}>
        <h1 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>
          <span aria-hidden="true">⚖️ </span>{t.sesTitle}<span style={srOnly}>: {titulo}</span>
        </h1>
        <div style={{ fontSize: 12 }}>{materia} · {tema}</div>
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
