import { useEffect, useRef, useState } from "react";
import { normalizarModoRespuesta, textoIntegrantes } from "../utils/arbitroIntegrantes";
import { nombreArchivoInformeArbitro } from "../utils/arbitroDocumentos";
import { listaCriterios } from "../utils/arbitroCriterios";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useArbitroT, useFormatoPuntos, fillArbitro, useLocaleArbitro, useTituloPagina, LanguageSelector, IDIOMAS_ARBITRO, arbitroDic } from "../i18n";
import { localeDeIdioma } from "../utils/idiomaSesion";
import { etiquetaCalificacion } from "../utils/arbitroEtiquetas";
import { nombreVisible } from "../utils/arbitroNombres";
import { esIaNoDisponible, motivoDeError, textoErrorArbitro } from "../utils/arbitroErrores";
import { useNavigate } from "react-router-dom";
import { app } from "../firebase.config";
import { useAuth } from "../contexts/AuthContext";
import { PALETA } from "../utils/arbitroPalette";
import { coloresArea } from "../utils/arbitroAreas";
import { DialogoEnPagina, ModalDialogo, fieldsetReset, legendReset, srOnly } from "../utils/arbitroA11y";

const ADMIN_UID = "P2lU12xoCxMkZ0AdZdMoGGksJ5o1";

interface SesionResumen {
  id: string;
  materia: string;
  nivel: string;
  anio: string;
  tema: string;
  area?: string;
  creadoEn: string;
  expiresAt: string;
  tieneInforme: boolean;
  partidasCount?: number;
  textoFuente?: string;
  docenteUid?: string;
  // Idioma en el que se jugó la sesión ('es' | 'en'; las sesiones viejas no lo traen = 'es'). listarSesionesDocente
  // ya lo manda (spread de d.data()); el PDF del curso (Etapa 3) lo necesita para armarse en ese idioma, no en el
  // del panel — ver txCurso, más abajo.
  idioma?: string;
}

// Coincide EXACTAMENTE con el JSON que devuelve generarInformeSesion en
// functions/src/index.ts: fortalezas y areasDeOportunidad son párrafos (string),
// no listas, y el campo de recomendaciones se llama "recomendacionesDocente".
// Filas (pregunta + respuesta) de una reflexión del modo competitivo. Si la sesión personalizó las preguntas, el informe las trae en
// `preguntas` y se muestran tal cual (con {tema} reemplazado); si no, las etiquetas cortas por defecto del diccionario.
function filasMeta(preguntas: string[] | undefined, respuestas: Record<string, string> | undefined, porDefecto: string[], tema: string) {
  const n = preguntas && preguntas.length > 0 ? preguntas.length : porDefecto.length;
  return Array.from({ length: n }, (_, i) => ({
    label: preguntas && preguntas.length > 0 ? preguntas[i].replace(/\{tema\}/g, tema) : porDefecto[i],
    val: respuestas?.[`q${i + 1}`],
  })).filter(r => r.val?.trim());
}

interface InformeMetacognicion {
  id: string;
  modo?: string;
  // Modo competitivo
  grupoNombre?: string;
  equipos?: Array<{
    nombre: string;
    color: string;
    integrantes: string | string[]; // array (actual) o string (informes viejos): se lee con textoIntegrantes
    puntos: number;
    respuestas?: Record<string, string>; // q1..qN (N = cantidad de preguntas de la sesión; 4 por defecto)
    // Metacognición individual: una entrada por alumno que respondió (no existe en informes grupales ni viejos).
    individuales?: Array<{ alumno: string; respuestas: Record<string, string> }>;
  }>;
  // Modo normal
  nombreAlumno?: string;
  nombreEquipo?: string;
  respuestas?: {
    aprendizaje: string;
    dificultad: string;
    preguntaPendiente: string;
    ensenanza: string;
  };
  creadoEn: string;
  partidaId?: string; // une el informe con las rondas registradas (registrarRonda)
  preguntas?: string[]; // preguntas de metacognición personalizadas que usó la sesión (ausente = las 4 por defecto)
  // Detalle ronda por ronda de esta partida — lo guarda guardarInformeArbitro
  // a partir de lo jugado en ArbitroJuegoPage.tsx (modo competitivo).
  registros?: Array<{
    ronda: number;
    equipoPregunta: string;
    equipoResponde: string;
    pregunta: string;
    respuesta: string;
    calificacion: "completa" | "incompleta" | "no" | "pasada" | "fuera_de_tema";
    puntos: number;
    fueAlArbitro: boolean;
    veredictoArbitro?: string;
  }>;
}

type RegistroRonda = NonNullable<InformeMetacognicion["registros"]>[number];

// Ronda registrada por registrarRonda (sesiones_arbitro/{id}/rondas). Solo nombres de equipos.
interface RepartoRonda { puntosPregunta: number; puntosResponde: number; tieneRazon: string | null; grado: string | null }
interface RondaDoc {
  id: string;
  partidaId: string;
  ronda: number;
  equipoPregunta: string;
  equipoResponde: string;
  pregunta: string;
  // Modo de respuesta «escrita»: lo que escribió el equipo. "" en modo oral sin disputa (sigue siendo oral).
  respuesta: string;
  calificacion: "completa" | "incompleta" | "no" | "pasada" | "fuera_de_tema";
  estado: string;
  fueAlArbitro: boolean;
  reparto: RepartoRonda;
  disputa: null | {
    planteo: string; posicionPregunta: string; posicionResponde: string; resultado: string;
    veredicto: string; explicacion: string; paraSeguirPensando: string; repartoOriginal: RepartoRonda;
  };
  correccion: null | { repartoOriginal: RepartoRonda; repartoNuevo: RepartoRonda; fecha: string; docenteUid: string };
  // Etapa 2: agotó los intentos automáticos de revisión (LIMITE_INTENTOS_REVISION en arbitroRevision.ts) sin
  // que Gemini devolviera un veredicto válido. Lo calcula listarRondasSesion; el panel no conoce el límite,
  // solo este booleano.
  noRevisable?: boolean;
}
interface TotalPartida { partidaId: string; rondasCorregidas: number; equipos: Array<{ nombre: string; puntosAlumnos: number; puntosFinales: number }>; creadoEn: string }

// Observación de la IA sobre una ronda sin disputa (Etapa 2): la guarda y la actualiza el servidor
// (revisarPartidaArbitro / revisarObservacionArbitro); el panel solo la muestra y dispara las acciones del docente.
interface ObservacionIA {
  veredictoIA: "completa" | "incompleta" | "no";
  explicacionIA: string;
  comparacion: "sin_observacion" | "error_no_detectado" | "acierto_no_defendido";
  estadoDocente: "pendiente" | "confirmada" | "corregida" | "descartada";
  notaDocente: string | null;
  // Etapa 3: el veredicto del DOCENTE (no el de la IA), obligatorio al corregir. Puede faltar en una observación
  // "corregida" guardada ANTES de esta etapa (dato legado): el panel la muestra pidiendo que se complete.
  veredictoDocente?: "completa" | "incompleta" | "no" | null;
  // Comparación EFECTIVA (Etapa 3): para "corregida", recalculada con veredictoDocente contra la calificación de
  // la ronda (listarRondasSesion la calcula una sola vez, ver comparacionEfectiva en arbitroRevision.ts); para
  // el resto de los estados, es la misma que `comparacion`. null = corregida sin veredictoDocente todavía (hace
  // falta completarlo): no entra al PDF del curso hasta entonces.
  comparacionEfectiva?: "sin_observacion" | "error_no_detectado" | "acierto_no_defendido" | null;
}
// notaGeneral (Etapa 3): nota libre del docente por partida, en los dos modos (oral y escrito) — aparte de la
// nota puntual de una observación corregida. La guarda guardarNotaPartidaArbitro y sale en el PDF del curso.
interface RevisionPartida { observaciones: Record<string, ObservacionIA>; intentos?: Record<string, number>; notaGeneral?: string }
interface RondasData {
  rondas: RondaDoc[];
  totales: TotalPartida[];
  resumen: { rondasConVeredicto: number; rondasCorregidas: number };
  puedeCorregir: boolean;
  modoRespuesta?: string; // 'oral' | 'escrita'; las sesiones viejas no lo traen (= 'oral')
  // Etapa A.3: boolean solo si la sesión tiene el campo guardado (true/false según lo que eligió el docente);
  // undefined en una sesión vieja de antes de este cambio — el panel no muestra nada en ese caso.
  verTextoDuranteJuego?: boolean;
  // Criterios de calificación usados en la sesión (B.5): [] en sesiones viejas sin el campo, o si el docente
  // no cargó ninguno — no se muestra nada en ese caso.
  criteriosCalificacion?: string[];
  revisiones?: Record<string, RevisionPartida>; // por partidaId (Etapa 2)
  // Por partida, cuántas rondas todavía faltan revisar (lo calcula listarRondasSesion con la MISMA función que
  // usa revisarPartidaArbitro): el panel solo mira este número, no repite el filtro del servidor.
  faltantesPorPartida?: Record<string, number>;
}
// Estado local de la revisión con IA por partida: se dispara sola al abrir el panel (una vez por partida por
// visita) y el botón de reintentar la vuelve a llamar a mano.
interface EstadoRevisionPartida { estado: "revisando" | "lista" | "error"; observaciones: Record<string, ObservacionIA>; errorMsg?: string }

// Los 6 repartos posibles (misma tabla que el servidor): [puntos de quien preguntó, puntos de quien respondió].
const OPCIONES_REPARTO: Array<{ key: string; puntos: [number, number] }> = [
  { key: "pregunta|total", puntos: [1, 0] },
  { key: "pregunta|parcial", puntos: [0.75, 0.25] },
  { key: "ambos|parcial", puntos: [0.5, 0.5] },
  { key: "responde|parcial", puntos: [0.25, 0.75] },
  { key: "responde|total", puntos: [0, 1] },
  { key: "ninguno|parcial", puntos: [0, 0] },
];

interface InformeSesion {
  resumenEjecutivo: string;
  conceptosDebatidos: string[];
  fortalezas: string;
  areasDeOportunidad: string;
  patronesObservados: string;
  recomendacionesDocente: string[];
  preguntasParaRetomar: string[];
  nivelDebate: "superficial" | "adecuado" | "profundo";
  // Metadatos para saber si conviene regenerar el informe (más parejas
  // pueden terminar de jugar después de la primera vez que se generó).
  totalConsultas?: number;
  totalConsultasActual?: number;
  // Cuándo se generó el informe con Gemini (ISO): se compara con la fecha de las correcciones del docente.
  generadoEn?: string;
  // Rondas que los equipos pasaron sin responder: quedan fuera del análisis
  // pedagógico pero se listan aparte porque señalan dificultad.
  rondasPasadas?: Array<{ pregunta: string; equipoPregunta: string; tiempoSegundos?: number | null }>;
  // Rondas que el docente corrigió y totales recalculados (se calculan en cada lectura).
  correcciones?: { rondasConVeredicto: number; rondasCorregidas: number; totales: TotalPartida[] };
}

// Los colores por área viven en utils/arbitroPalette.ts (clave corta); las sesiones
// viejas guardaron el nombre completo y coloresArea() también lo acepta.

// Ícono de cada calificación (no se traduce): lo usa el badge del panel (ver badgeCalificacion, hardcodeado al
// idioma del panel) y la vista del PDF del curso (Etapa 3), que arma sus propias etiquetas en el idioma de la
// SESIÓN con etiquetaCalificacion(calif, txCurso) pero reutiliza este mismo ícono.
const ICONO_CALIFICACION: Record<string, string> = { completa: "✅", incompleta: "⚡", pasada: "⏭️", fuera_de_tema: "🚫", no: "❌" };

// Colores del nivel de debate (el texto sale del diccionario, ver nivelEtiqueta).
const NIVEL_BADGE: Record<string, { color: string; bg: string }> = {
  superficial: { color: "#92400e", bg: "#fef3c7" },
  adecuado:    { color: "#166534", bg: "#dcfce7" },
  profundo:    { color: "#1e40af", bg: "#dbeafe" },
};

export default function ArbitroPanelPage() {
  const ta = useArbitroT();
  const locale = useLocaleArbitro(); // fechas y números según el idioma (es-AR / en-US)
  const fmt = useFormatoPuntos();
  useTituloPagina(`${ta.panPageTitle} — ${ta.pageTitleSuffix}`);
  const nivelEtiqueta = (k: string) => (k === "superficial" ? ta.panLevelShallow : k === "profundo" ? ta.panLevelDeep : ta.panLevelAdequate);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const functions = getFunctions(app, "us-central1");

  const [sesiones, setSesiones] = useState<SesionResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sesionSeleccionada, setSesionSeleccionada] = useState<SesionResumen | null>(null);
  const [informe, setInforme] = useState<InformeSesion | null>(null);
  const [loadingInforme, setLoadingInforme] = useState(false);
  const [errorInforme, setErrorInforme] = useState("");
  const [metacogniciones, setMetacogniciones] = useState<InformeMetacognicion[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [modoAdmin, setModoAdmin] = useState(false);
  const [todasSesiones, setTodasSesiones] = useState<SesionResumen[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [rondasData, setRondasData] = useState<RondasData | null>(null);
  const [loadingRondas, setLoadingRondas] = useState(false);
  const [errorRondas, setErrorRondas] = useState("");
  const [seleccion, setSeleccion] = useState<Record<string, string>>({});
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);
  const [errorCorreccion, setErrorCorreccion] = useState<{ id: string; msg: string } | null>(null);
  const [avisoCorreccion, setAvisoCorreccion] = useState(""); // «Corrección guardada», para la región viva
  const [corrAbierta, setCorrAbierta] = useState<Record<string, boolean>>({}); // «Corregir el reparto» desplegado por ronda
  const [alumnoAbierto, setAlumnoAbierto] = useState<Record<string, boolean>>({}); // reflexión individual desplegada por alumno
  // Identificación del PDF: qué partida (par de equipos) se está imprimiendo sola, si alguna. null = imprimir
  // todo (varios pares juntos, como hoy). Se usa para el título del archivo y para ocultar el resto al imprimir.
  const [partidaParaImprimir, setPartidaParaImprimir] = useState<string | null>(null);
  const tituloAntesDeImprimir = useRef<string | null>(null);
  // Revisión con IA de las respuestas sin disputa en modo escrito (Etapa 2). Se dispara sola, una vez por
  // partida, al abrir el panel (partidasRevisadasRef evita repetirla en cada render); el botón «Reintentar»
  // la vuelve a llamar a mano. Las observaciones de corridas anteriores llegan ya en rondasData.revisiones;
  // esto solo guarda lo que trae CADA llamada a revisarPartidaArbitro (que siempre devuelve el mapa completo).
  const [revisionPartidas, setRevisionPartidas] = useState<Record<string, EstadoRevisionPartida>>({});
  const partidasRevisadasRef = useRef<Set<string>>(new Set());
  // Acción del docente sobre una observación puntual: qué ronda tiene abierto el formulario de «Corregir»
  // (con su borrador de nota), cuál se está guardando y el error de la última acción fallida, si la hay.
  // rondaId -> borrador { nota, veredicto } mientras el formulario de "Corregir" está abierto (Etapa 3: el
  // veredicto del docente es obligatorio, el selector arranca sin ninguna opción preseleccionada).
  const [corregirAbierto, setCorregirAbierto] = useState<Record<string, { nota: string; veredicto: "" | "completa" | "incompleta" | "no" }>>({});
  const [guardandoObservacion, setGuardandoObservacion] = useState<string | null>(null);
  const [errorObservacion, setErrorObservacion] = useState<{ id: string; msg: string } | null>(null);
  const [detalleRevisionAbierto, setDetalleRevisionAbierto] = useState<Record<string, boolean>>({}); // por partidaId
  // Nota general del docente por partida (Etapa 3, en los dos modos): borrador mientras escribe — si todavía no
  // tocó el campo, se muestra lo que ya está guardado en rondasData.revisiones[pid].notaGeneral. Se guarda sola
  // al salir del campo (onBlur), no con un botón: así no se pierde si el docente imprime o cambia de sesión sin
  // acordarse de guardar (ver guardarNotaGeneral e imprimirInforme).
  const [notaGeneralBorrador, setNotaGeneralBorrador] = useState<Record<string, string>>({});
  const [guardandoNotaGeneral, setGuardandoNotaGeneral] = useState<string | null>(null); // partidaId en vuelo
  const [errorNotaGeneral, setErrorNotaGeneral] = useState<{ id: string; msg: string } | null>(null); // partidaId
  const [notaGeneralGuardada, setNotaGeneralGuardada] = useState<Record<string, boolean>>({}); // partidaId -> se guardó con éxito el último cambio (se borra en cuanto el docente vuelve a tocar el campo)
  // PDF del curso (Etapa 3, plan a/c/d/e/f): además del informe del docente (arriba), un PDF por partida en el
  // idioma de la SESIÓN, para el curso. No escribe nada en Firestore — arma otra vista de lectura con lo que ya
  // trae rondasData (ver generarPdfCurso y el bloque .arb-curso-pdf, más abajo). modoImprimirCurso distingue esta
  // impresión de la del docente (misma mecánica de partidaParaImprimir + window.print(), pero con CSS y
  // contenido propios). avisoPendientesCurso guarda la partida y la cantidad de observaciones sin revisar
  // cuando hace falta confirmar antes de generar (si no hay ninguna pendiente, se genera directo).
  const [modoImprimirCurso, setModoImprimirCurso] = useState(false);
  const [avisoPendientesCurso, setAvisoPendientesCurso] = useState<{ pid: string; cantidad: number } | null>(null);

  // Restaura document.title después de imprimir (o de cancelar el diálogo de impresión).
  useEffect(() => {
    const restaurar = () => {
      if (tituloAntesDeImprimir.current !== null) { document.title = tituloAntesDeImprimir.current; tituloAntesDeImprimir.current = null; }
      setPartidaParaImprimir(null);
      setModoImprimirCurso(false);
    };
    window.addEventListener("afterprint", restaurar);
    return () => window.removeEventListener("afterprint", restaurar);
  }, []);

  // Si queda algún borrador de nota general sin guardar (distinto de lo último guardado en
  // rondasData.revisiones[pid].notaGeneral) en CUALQUIER partida de la sesión, que el navegador avise antes de
  // cerrar la pestaña o salir de la página — para no perder lo escrito. Los navegadores modernos ignoran el
  // texto que se le ponga a returnValue y muestran su propio diálogo, así que no hace falta un mensaje
  // traducible. El efecto se reinscribe cada vez que cambia hayNotaGeneralSinGuardar: en cuanto se guarda (o se
  // descarta el borrador), deja de haber nada sin guardar y el listener se saca solo.
  const hayNotaGeneralSinGuardar = Object.keys(notaGeneralBorrador).some(
    pid => notaGeneralBorrador[pid] !== (rondasData?.revisiones?.[pid]?.notaGeneral ?? "")
  );
  useEffect(() => {
    if (!hayNotaGeneralSinGuardar) return;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [hayNotaGeneralSinGuardar]);

  useEffect(() => {
    if (authLoading) return; // esperar a que Firebase Auth termine de restaurar la sesión
    if (!user) { navigate("/login"); return; }

    const fn = httpsCallable(functions, "listarSesionesDocente");
    // El servidor usa el uid de la sesión autenticada; no se envía uid desde acá.
    fn({ limit: 50 })
      .then((res: any) => { setSesiones(res.data.sesiones || []); setLoading(false); })
      .catch((e: any) => { setError(textoErrorArbitro(e, ta, e.message)); setLoading(false); });
  }, [authLoading, user]);

  const cargarRondas = (sessionId: string) => {
    setRondasData(null);
    setErrorRondas("");
    setLoadingRondas(true);
    // Nueva sesión: se olvida qué partidas ya se revisaron (partidasRevisadasRef) para que el efecto de más
    // abajo dispare la revisión de las de la sesión que se está por mostrar.
    partidasRevisadasRef.current = new Set();
    setRevisionPartidas({});
    const fn = httpsCallable(functions, "listarRondasSesion");
    fn({ sessionId })
      .then((res: any) => { setRondasData(res.data as RondasData); })
      .catch((e: any) => { setErrorRondas(textoErrorArbitro(e, ta, ta.roundsError)); })
      .finally(() => setLoadingRondas(false));
  };

  // Revisión con IA (Etapa 2): llama a revisarPartidaArbitro para UNA partida. El servidor es incremental (solo
  // manda a Gemini las rondas que todavía no tienen observación) y siempre devuelve el mapa COMPLETO de
  // observaciones de la partida, así que acá simplemente se reemplaza lo que había.
  const dispararRevision = (sessionId: string, partidaId: string) => {
    setRevisionPartidas(prev => ({ ...prev, [partidaId]: { estado: "revisando", observaciones: prev[partidaId]?.observaciones ?? {} } }));
    const fn = httpsCallable(functions, "revisarPartidaArbitro");
    fn({ sessionId, partidaId })
      .then((res: any) => {
        setRevisionPartidas(prev => ({ ...prev, [partidaId]: { estado: "lista", observaciones: (res.data?.observaciones ?? {}) as Record<string, ObservacionIA> } }));
      })
      .catch((e: any) => {
        setRevisionPartidas(prev => ({ ...prev, [partidaId]: { estado: "error", observaciones: prev[partidaId]?.observaciones ?? {}, errorMsg: textoErrorArbitro(e, ta, ta.revError) } }));
      });
  };

  // Se dispara sola, una vez por partida, cuando el panel ya sabe que la sesión es de modo escrito y tiene las
  // rondas cargadas — pero solo si listarRondasSesion (rondasData.faltantesPorPartida) ya muestra que falta algo
  // por revisar. El panel NO repite el filtro del servidor (rondasFaltantesParaRevisar vive en
  // functions/src/arbitroRevision.ts, no es código compartido con el front): solo mira el número que ya viene
  // calculado. Si una partida está al día (o sus rondas pendientes agotaron el límite de intentos y quedaron
  // "no revisables"), ese número es 0 y no se llama a revisarPartidaArbitro: así no se muestra «Revisando…» ni
  // se gasta una llamada para algo que ya está hecho o que no se va a poder revisar solo.
  // No hay botón para arrancarla a mano ni disparo desde el juego: solo el panel la pide (y «Reintentar», abajo).
  useEffect(() => {
    if (!sesionSeleccionada || !rondasData || normalizarModoRespuesta(rondasData.modoRespuesta) !== "escrita") return;
    const partidaIds = Array.from(new Set(rondasData.rondas.map(r => r.partidaId)));
    for (const pid of partidaIds) {
      if (partidasRevisadasRef.current.has(pid)) continue;
      partidasRevisadasRef.current.add(pid);
      if (!rondasData.faltantesPorPartida?.[pid]) continue;
      dispararRevision(sesionSeleccionada.id, pid);
    }
  }, [sesionSeleccionada, rondasData]);

  // Acción del docente sobre UNA observación (confirmar / corregir con nota obligatoria / descartar). Al
  // terminar, se actualiza solo esa observación en el estado local (no hace falta volver a pedir todo).
  const actuarSobreObservacion = async (partidaId: string, rondaId: string, accion: "confirmar" | "corregir" | "descartar", nota?: string, veredictoDocente?: string) => {
    if (!sesionSeleccionada) return;
    setGuardandoObservacion(rondaId);
    setErrorObservacion(null);
    try {
      const fn = httpsCallable(functions, "revisarObservacionArbitro");
      await fn({ sessionId: sesionSeleccionada.id, partidaId, rondaId, accion, nota, veredictoDocente });
      // Se vuelve a pedir TODO con listarRondasSesion (en vez de aplicar solo lo que devolvió esta función),
      // igual que ya hace corregirRonda más abajo: comparacionEfectiva (Etapa 3) la calcula listarRondasSesion,
      // no revisarObservacionArbitro, así que es la única forma de que el panel la muestre actualizada sin
      // recalcularla por su cuenta (y sin arriesgarse a que diverja de lo que va a usar el PDF del curso).
      const lista = httpsCallable(functions, "listarRondasSesion");
      const res = await lista({ sessionId: sesionSeleccionada.id }) as any;
      const datos = res.data as RondasData;
      setRondasData(datos);
      setRevisionPartidas(prev => ({
        ...prev,
        [partidaId]: { estado: "lista", observaciones: datos.revisiones?.[partidaId]?.observaciones ?? {} },
      }));
      setCorregirAbierto(prev => { const n = { ...prev }; delete n[rondaId]; return n; });
    } catch (e: any) {
      setErrorObservacion({ id: rondaId, msg: textoErrorArbitro(e, ta, ta.revSaveError) });
      // "observacion_no_encontrada": lo que el panel tenía en pantalla para esta ronda ya no existe en el
      // servidor (vista vieja, de antes de algún cambio). Se vuelve a pedir todo para que el botón fantasma
      // desaparezca solo, en vez de quedar ahí repitiendo siempre el mismo error.
      if (motivoDeError(e) === "observacion_no_encontrada" && sesionSeleccionada) {
        const lista = httpsCallable(functions, "listarRondasSesion");
        lista({ sessionId: sesionSeleccionada.id }).then((res: any) => setRondasData(res.data as RondasData)).catch(() => {});
      }
    }
    setGuardandoObservacion(null);
  };

  // Nota general del docente por partida (Etapa 3, en los dos modos): la guarda guardarNotaPartidaArbitro en
  // sesiones_arbitro/{id}/revisiones/{partidaId}.notaGeneral y sale en el PDF del curso. Se vuelve a pedir todo
  // con listarRondasSesion al guardar (mismo motivo que actuarSobreObservacion: una sola fuente de verdad).
  const guardarNotaGeneral = async (pid: string) => {
    if (!sesionSeleccionada) return;
    const valorGuardado = rondasData?.revisiones?.[pid]?.notaGeneral ?? "";
    const valor = notaGeneralBorrador[pid] ?? valorGuardado;
    if (valor === valorGuardado) return; // sin cambios: el blur puede disparar esto sin que haya nada que guardar
    setGuardandoNotaGeneral(pid);
    setErrorNotaGeneral(null);
    try {
      const fn = httpsCallable(functions, "guardarNotaPartidaArbitro");
      await fn({ sessionId: sesionSeleccionada.id, partidaId: pid, nota: valor });
      const lista = httpsCallable(functions, "listarRondasSesion");
      const res = await lista({ sessionId: sesionSeleccionada.id }) as any;
      setRondasData(res.data as RondasData);
      // Vuelve a reflejar lo guardado (ya normalizado por el servidor: espacios, saltos de línea, largo máximo).
      setNotaGeneralBorrador(prev => { const n = { ...prev }; delete n[pid]; return n; });
      setNotaGeneralGuardada(prev => ({ ...prev, [pid]: true }));
    } catch (e: any) {
      setErrorNotaGeneral({ id: pid, msg: textoErrorArbitro(e, ta, ta.revSaveError) });
    }
    setGuardandoNotaGeneral(null);
  };

  // Corrección del docente: cambia el reparto de una ronda con veredicto. La verifica el servidor
  // (solo el docente dueño de la sesión). No cambia el marcador que ya vieron los alumnos.
  const corregirRonda = async (r: RondaDoc) => {
    const elegida = seleccion[r.id];
    if (!elegida || !sesionSeleccionada) return;
    const [tieneRazon, grado] = elegida.split("|");
    setCorrigiendo(r.id);
    setErrorCorreccion(null);
    setAvisoCorreccion("");
    try {
      const fn = httpsCallable(functions, "corregirRonda");
      await fn({ sessionId: sesionSeleccionada.id, rondaId: r.id, tieneRazon, grado });
      const lista = httpsCallable(functions, "listarRondasSesion");
      const res = await lista({ sessionId: sesionSeleccionada.id }) as any;
      setRondasData(res.data as RondasData);
      setSeleccion(prev => { const n = { ...prev }; delete n[r.id]; return n; });
      setCorrAbierta(prev => ({ ...prev, [r.id]: false }));
      setAvisoCorreccion(ta.correctSaved);
    } catch (e: any) {
      setErrorCorreccion({ id: r.id, msg: String(e?.code || "").endsWith("permission-denied") ? ta.correctOnlyOwner : ta.correctError });
    }
    setCorrigiendo(null);
  };

  const verInforme = async (sesion: SesionResumen, forceRegenerar = false) => {
    setSesionSeleccionada(sesion);
    setInforme(null);
    setErrorInforme("");
    setLoadingInforme(true);

    // Rondas registradas (con veredicto y reparto) en paralelo
    cargarRondas(sesion.id);

    // Cargar metacogniciones en paralelo
    setLoadingMeta(true);
    const fnMeta = httpsCallable(functions, "getInformesMetacognicion");
    fnMeta({ sessionId: sesion.id })
      .then((res: any) => { setMetacogniciones(res.data.informes || []); })
      .catch(() => { setMetacogniciones([]); })
      .finally(() => setLoadingMeta(false));

    try {
      const fn = httpsCallable(functions, "generarInformeSesion");
      const res = await fn({ sessionId: sesion.id, forceRegenerar }) as any;
      setInforme(res.data);
    } catch (e: any) {
      // Gemini caído: texto propio según el código. El resto (login, permisos, sin consultas) como hoy.
      setErrorInforme(esIaNoDisponible(e) ? ta.aiUnavailable : textoErrorArbitro(e, ta, e.message));
    }
    setLoadingInforme(false);
  };

  // Abre el texto base en pantalla completa directamente desde la lista,
  // sin pasar por generarInformeSesion — así funciona antes de que los
  // alumnos jueguen, cuando todavía no hay consultas registradas.
  const mostrarTextoDesdeLista = (sesion: SesionResumen) => {
    setSesionSeleccionada(sesion);
    setMostrarTexto(true);
  };

  const cargarTodasSesiones = async () => {
    setLoadingAdmin(true);
    try {
      const fn = httpsCallable(functions, "listarTodasSesionesAdmin");
      const res = await fn({}) as any;
      setTodasSesiones(res.data.sesiones || []);
      setModoAdmin(true);
    } catch (e: any) {
      setError(textoErrorArbitro(e, ta, e.message));
    }
    setLoadingAdmin(false);
  };

  // ── Rondas: textos auxiliares ───────────────────────────────────────────
  const repartoTxt = (r: RondaDoc, rep: { puntosPregunta: number; puntosResponde: number }) =>
    `${r.equipoPregunta} ${fmt(rep.puntosPregunta)} · ${r.equipoResponde} ${fmt(rep.puntosResponde)}`;
  const textoOpcion = (key: string, r: RondaDoc) => {
    const quien = key.startsWith("pregunta") ? r.equipoPregunta : r.equipoResponde;
    const base = key.endsWith("|total") ? fillArbitro(ta.optTotal, { team: quien })
      : key === "ambos|parcial" ? ta.optBoth
      : key === "ninguno|parcial" ? ta.optNone
      : fillArbitro(ta.optPartial, { team: quien });
    const o = OPCIONES_REPARTO.find(x => x.key === key)!;
    return `${base} — ${r.equipoPregunta} ${fmt(o.puntos[0])} · ${r.equipoResponde} ${fmt(o.puntos[1])}`;
  };
  // La etiqueta sale del diccionario a partir de la clave estable de la calificación.
  const badgeCalificacion = (c: RondaDoc["calificacion"]) =>
    c === "completa" ? { icon: "✅", label: etiquetaCalificacion(c, ta), color: "#166534", bg: "#dcfce7" }
    : c === "incompleta" ? { icon: "⚡", label: etiquetaCalificacion(c, ta), color: "#92400e", bg: "#fef3c7" }
    : c === "pasada" ? { icon: "⏭️", label: etiquetaCalificacion(c, ta), color: "#475569", bg: "#f1f5f9" }
    : c === "fuera_de_tema" ? { icon: "🚫", label: etiquetaCalificacion(c, ta), color: "#9a3412", bg: "#ffedd5" }
    : { icon: "❌", label: etiquetaCalificacion(c, ta), color: "#991b1b", bg: "#fee2e2" };
  // Correcciones y totales: lo último que trajo el panel (rondasData) o, si no cargó, lo que trae el informe.
  const correcciones = rondasData
    ? { rondasConVeredicto: rondasData.resumen.rondasConVeredicto, rondasCorregidas: rondasData.resumen.rondasCorregidas, totales: rondasData.totales }
    : informe?.correcciones;
  // Modo de respuesta de la sesión (para decidir si se muestra la respuesta de las rondas sin disputa).
  const modoEscritaSesion = normalizarModoRespuesta(rondasData?.modoRespuesta) === "escrita";
  // Observaciones de la IA de una partida: lo que ya trae el panel (rondasData.revisiones, de corridas
  // anteriores) fusionado con lo que haya devuelto la corrida de ESTA visita (revisionPartidas), que manda si
  // existe porque siempre es el mapa completo y más reciente.
  const observacionesDePartida = (pid: string): Record<string, ObservacionIA> =>
    revisionPartidas[pid]?.observaciones ?? rondasData?.revisiones?.[pid]?.observaciones ?? {};
  // ¿Hay rondas corregidas con fecha posterior al informe de Gemini? (el texto narrativo no se reescribe con las correcciones)
  const informeAntesDeCorrecciones = !!informe?.generadoEn && !!rondasData?.rondas.some(r => r.correccion?.fecha && new Date(r.correccion.fecha).getTime() > new Date(informe.generadoEn!).getTime());
  // Una sola lista de rondas por partida: une lo que guardó el servidor (rondas: reparto, veredicto, correcciones)
  // con el registro del cliente (informes.registros: puntos y marca «fue al árbitro»). Se cruzan por partida + número de ronda.
  const numeroDePartida: Record<string, number> = {};
  metacogniciones.forEach((m, i) => { if (m.partidaId) numeroDePartida[m.partidaId] = i + 1; });
  const partidasRondas = (() => {
    const orden: string[] = [];
    const mapa: Record<string, Map<number, { doc?: RondaDoc; reg?: RegistroRonda }>> = {};
    const entrada = (pid: string, n: number) => {
      if (!mapa[pid]) { mapa[pid] = new Map(); orden.push(pid); }
      if (!mapa[pid].has(n)) mapa[pid].set(n, {});
      return mapa[pid].get(n)!;
    };
    metacogniciones.forEach(m => { if (m.partidaId) (m.registros ?? []).forEach(rg => { entrada(m.partidaId!, rg.ronda).reg = rg; }); });
    (rondasData?.rondas ?? []).forEach(rd => { entrada(rd.partidaId, rd.ronda).doc = rd; });
    let extra = metacogniciones.length;
    return orden
      .map(pid => ({ pid, numero: numeroDePartida[pid] ?? 0, rondas: Array.from(mapa[pid].entries()).sort((a, b) => a[0] - b[0]).map(([n, v]) => ({ n, ...v })) }))
      .sort((a, b) => (a.numero || 1e9) - (b.numero || 1e9))
      .map(x => (x.numero ? x : { ...x, numero: ++extra }));
  })();
  const totalDePartida = (partidaId?: string) => (partidaId ? correcciones?.totales.find(t => t.partidaId === partidaId) : undefined);

  // ── Identificación del PDF (encabezado y nombre del archivo) ────────────────────────────────────────────
  // Si se eligió imprimir una partida puntual, es esa. Si no se eligió ninguna pero la sesión tiene una sola
  // partida, el botón general ya identifica a ese único par (no hay ambigüedad). Con varias partidas y sin
  // elegir una, no hay un par que nombrar.
  const partidaIdentificada = partidaParaImprimir ?? (partidasRondas.length === 1 ? partidasRondas[0].pid : null);
  // Totales (y con ellos, la fecha) de la partida identificada, si hay una. Sin partida identificada (varias
  // partidas y sin elegir una puntual) no hay una fecha de partida que mostrar: se usa la de creación de la sesión.
  const totalPartidaIdentificada = partidaIdentificada ? totalDePartida(partidaIdentificada) : undefined;
  const equiposIdentificados = totalPartidaIdentificada ? totalPartidaIdentificada.equipos.map(e => e.nombre) : null;

  const imprimirInforme = (pid: string | null) => {
    if (sesionSeleccionada) {
      const objetivo = pid ?? (partidasRondas.length === 1 ? partidasRondas[0].pid : null);
      const tp = objetivo ? totalDePartida(objetivo) : undefined;
      const equipos = tp ? tp.equipos.map(e => e.nombre) : null;
      // Fecha de la PARTIDA (cuándo se jugó), no la fecha en que se imprime el informe.
      const fecha = tp?.creadoEn || sesionSeleccionada.creadoEn;
      tituloAntesDeImprimir.current = document.title;
      document.title = nombreArchivoInformeArbitro(ta.panPdfJuego, sesionSeleccionada.tema, equipos, fecha);
    }
    setPartidaParaImprimir(pid);
    // Se imprime en el siguiente frame para que el título y el CSS de impresión (que depende del estado) ya estén aplicados.
    requestAnimationFrame(() => window.print());
  };

  // PDF del curso de UNA partida (Etapa 3): mismo mecanismo que imprimirInforme (título + partidaParaImprimir +
  // window.print()), pero además prende modoImprimirCurso, que en el <style> de abajo cambia qué se ve al
  // imprimir — la vista del docente queda afuera (arb-doc-print-only) y aparece la vista del curso
  // (arb-curso-pdf), armada en el idioma de la SESIÓN, no el del panel.
  const generarPdfCurso = (pid: string) => {
    if (!sesionSeleccionada) return;
    const tp = totalDePartida(pid);
    const equipos = tp ? tp.equipos.map(e => e.nombre) : null;
    const fecha = tp?.creadoEn || sesionSeleccionada.creadoEn;
    // Sufijo para no pisar el archivo del informe del docente de la misma partida (mismo encabezado y nombre
    // base, como pidió Pablo, pero no puede ser EXACTAMENTE el mismo nombre si se descargan los dos).
    tituloAntesDeImprimir.current = document.title;
    document.title = nombreArchivoInformeArbitro(txCurso.panPdfJuego, sesionSeleccionada.tema, equipos, fecha, `_${txCurso.panPdfCourseSuffix}`);
    setModoImprimirCurso(true);
    setPartidaParaImprimir(pid);
    requestAnimationFrame(() => window.print());
  };

  // Si hay observaciones sin revisar, avisa cuántas son antes de generar (plan f): no van a salir en el PDF.
  const pedirPdfCurso = (pid: string, pendientes: number) => {
    if (pendientes > 0) { setAvisoPendientesCurso({ pid, cantidad: pendientes }); return; }
    generarPdfCurso(pid);
  };

  const colors = sesionSeleccionada
    ? coloresArea(sesionSeleccionada.area)
    : coloresArea(null);
  const materiaDe = (m: string) => nombreVisible(ta.materiaNames, m);
  const nivelDe = (n: string) => nombreVisible(ta.levelNames, n);
  // Diccionario del PDF del curso (Etapa 3): el idioma de la SESIÓN, no el del panel (un docente con la interfaz
  // en español puede haber jugado la sesión en inglés, y la versión para el curso tiene que salir en inglés).
  const txCurso = arbitroDic(sesionSeleccionada?.idioma);
  const materiaDeCurso = (m: string) => nombreVisible(txCurso.materiaNames, m);
  const nivelDeCurso = (n: string) => nombreVisible(txCurso.levelNames, n);

  // ── Vista detalle de sesión ─────────────────────────────────────────────
  if (sesionSeleccionada) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <style>{`
          #panel-print-title { display: none; }
          /* Etapa 3: la nota general es un <textarea> en pantalla (editable), pero un <textarea> imprime
             CORTADO — solo lo que entra en su recuadro visible, no el texto completo. El campo de edición
             lleva data-noprint (se oculta al imprimir, como el resto de los controles) y arb-print-only hace
             lo inverso: invisible en pantalla siempre, visible SOLO al imprimir, para mostrar la nota guardada
             como texto plano completo (ver el bloque de notaGeneral, más abajo). */
          .arb-print-only { display: none; }
          /* PDF del curso (Etapa 3, plan a/c/d/e/f): además del informe del docente de arriba, un PDF por
             partida para el curso, en el idioma de la SESIÓN — otra vista, no una traducción de la misma.
             #panel-print-title-curso y .arb-curso-pdf viven siempre en el DOM (armados con txCurso) pero
             ocultos; .arb-doc-print-only marca lo que es SOLO del informe del docente (el encabezado normal,
             la fila de "Partida N" con los totales, y toda la lista de rondas tal como la ve el docente). Al
             imprimir en modo curso (modoImprimirCurso) se invierte cuál de los dos juegos de bloques se ve —
             nunca los dos a la vez — ver el bloque condicional al final de este @media print. */
          #panel-print-title-curso { display: none; }
          .arb-curso-pdf { display: none; }
          @media print {
            [data-noprint] { display: none !important; }
            .arb-ind-panel { display: block !important; }
            .arb-ind-toggle { pointer-events: none; }
            .arb-chev { display: none; }
            #panel-print-title { display: block !important; margin-bottom: 16px; }
            body { background: white; }
            .arb-print-only { display: block !important; }
            ${partidaParaImprimir ? `
            [data-partida-id]:not([data-partida-id="${partidaParaImprimir}"]) { display: none !important; }
            [data-informe-general] { display: none !important; }
            ` : ""}
            ${modoImprimirCurso ? `
            #panel-print-title { display: none !important; }
            .arb-print-only { display: none !important; }
            .arb-ind-panel { display: none !important; }
            .arb-doc-print-only { display: none !important; }
            #panel-print-title-curso { display: block !important; margin-bottom: 16px; }
            .arb-curso-pdf { display: block !important; }
            ` : ""}
          }
        `}</style>
        {/* Header */}
        <div data-noprint style={{ background: colors.gradient, padding: "20px 24px", color: "white" }}>
          <div className="pan-top" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
            <button onClick={() => { setSesionSeleccionada(null); setInforme(null); setMetacogniciones([]); setRondasData(null); setErrorRondas(""); setSeleccion({}); }}
              style={{ background: "rgba(0,0,0,0.25)", border: "none", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {ta.panBackToList}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LanguageSelector compact tone="onColor" idiomas={IDIOMAS_ARBITRO} />
              {informe && (
                <button onClick={() => imprimirInforme(null)}
                  style={{ background: "rgba(0,0,0,0.25)", border: "none", color: "white", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  {ta.panDownloadPdf}
                </button>
              )}
            </div>
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900 }}>⚖️ {materiaDe(sesionSeleccionada.materia)}</h1>
          <p style={{ margin: 0, fontSize: 13 }}>{sesionSeleccionada.tema}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12 }}>
            {nivelDe(sesionSeleccionada.nivel)} · {sesionSeleccionada.anio} ·{" "}
            {new Date(sesionSeleccionada.creadoEn).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div id="panel-print-title">
          <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.4px" }}>{ta.infTitle}</p>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900, color: "#1e293b" }}>⚖️ {materiaDe(sesionSeleccionada.materia)}</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#1e293b" }}>{sesionSeleccionada.tema}</p>
          {equiposIdentificados && (
            <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{equiposIdentificados.join(" vs ")}</p>
          )}
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>
            {nivelDe(sesionSeleccionada.nivel)} · {sesionSeleccionada.anio} ·{" "}
            {new Date(totalPartidaIdentificada?.creadoEn || sesionSeleccionada.creadoEn).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
          </p>
          {/* Etapa A.3: se muestra en los dos casos (cambia cómo se leen los resultados — Pablo, 2026-10-19),
              pero NO en una sesión vieja sin el campo guardado (verTextoDuranteJuego === undefined). */}
          {rondasData?.verTextoDuranteJuego !== undefined && (
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}>
              {rondasData.verTextoDuranteJuego ? ta.panJugadoConTexto : ta.panJugadoSinTexto}
            </p>
          )}
          {/* B.5: criterios de calificación de la sesión, si el docente cargó alguno. */}
          {listaCriterios(rondasData?.criteriosCalificacion).length > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
              {ta.panCriteriosLabel} {listaCriterios(rondasData?.criteriosCalificacion).join(" · ")}
            </p>
          )}
        </div>
        {/* Encabezado del PDF del curso (Etapa 3): mismo contenido que el de arriba (equipos, nivel, año, fecha
            de la PARTIDA), pero armado con txCurso — el idioma de la sesión — y con el locale de ESE idioma para
            la fecha, no el del panel. Solo se ve en modoImprimirCurso (ver el <style> de más arriba); siempre
            imprime una sola partida (partidaParaImprimir viene seteado desde generarPdfCurso), así que
            equiposIdentificados/totalPartidaIdentificada (ya calculados arriba a partir de partidaParaImprimir)
            valen igual acá. */}
        <div id="panel-print-title-curso">
          <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.4px" }}>{txCurso.infTitle}</p>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900, color: "#1e293b" }}>⚖️ {materiaDeCurso(sesionSeleccionada.materia)}</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#1e293b" }}>{sesionSeleccionada.tema}</p>
          {equiposIdentificados && (
            <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{equiposIdentificados.join(" vs ")}</p>
          )}
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>
            {nivelDeCurso(sesionSeleccionada.nivel)} · {sesionSeleccionada.anio} ·{" "}
            {new Date(totalPartidaIdentificada?.creadoEn || sesionSeleccionada.creadoEn).toLocaleDateString(localeDeIdioma(sesionSeleccionada.idioma), { day: "numeric", month: "long", year: "numeric" })}
          </p>
          {/* B.5: mismos criterios, en el idioma de la sesión (txCurso). */}
          {listaCriterios(rondasData?.criteriosCalificacion).length > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
              {txCurso.panCriteriosLabel} {listaCriterios(rondasData?.criteriosCalificacion).join(" · ")}
            </p>
          )}
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
          {/* Proyectar el texto base para que la clase lo lea antes de jugar */}
          {sesionSeleccionada.textoFuente && (
            <div data-noprint style={{ marginBottom: 16 }}>
              <button
                onClick={() => setMostrarTexto(true)}
                style={{ padding: "10px 20px", borderRadius: 10, border: `2px solid ${colors.primary}`, backgroundColor: "white", color: colors.primary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {ta.panShowText}
              </button>
              <span style={{ fontSize: 12, color: PALETA.gris, marginLeft: 10 }}>
                {ta.panShowTextHint}
              </span>
            </div>
          )}

          <div role="status" aria-live="polite">
            {loadingInforme && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div aria-hidden="true" style={{ fontSize: 36, marginBottom: 12 }}>⚖️</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>{ta.panGenerating}</p>
                <p style={{ fontSize: 13, color: "#64748b" }}>{ta.panAnalyzing}</p>
              </div>
            )}
          </div>

          {errorInforme && (
            <div role="alert" style={{ backgroundColor: "#fef2f2", borderRadius: 12, padding: 20, border: "1px solid #fecaca" }}>
              <p style={{ margin: 0, color: "#b91c1c", fontWeight: 600 }}>⚠️ {errorInforme}</p>
              <button onClick={() => verInforme(sesionSeleccionada)}
                style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: "#dc2626", color: "white", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                {ta.cfgRetryPlain}
              </button>
            </div>
          )}

          {informe && (
            <div data-informe-general style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Aviso: hay correcciones del docente posteriores al informe generado con Gemini */}
              {informeAntesDeCorrecciones && (
                <div role="status" data-testid="aviso-informe-antes-correcciones" style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: "12px 16px", border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                    ✏️ {ta.reportBeforeCorrections}
                  </div>
                  <button
                    onClick={() => sesionSeleccionada && verInforme(sesionSeleccionada, true)}
                    disabled={loadingInforme}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "none", backgroundColor: PALETA.ambar, color: "white", fontWeight: 700, fontSize: 12, cursor: loadingInforme ? "default" : "pointer", whiteSpace: "nowrap" }}>
                    {ta.panUpdateReport}
                  </button>
                </div>
              )}

              {/* Aviso de partidas nuevas desde que se generó este informe */}
              {informe.totalConsultasActual !== undefined &&
                informe.totalConsultas !== undefined &&
                informe.totalConsultasActual > informe.totalConsultas && (
                <div style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: "12px 16px", border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                    {ta.panNewQueries}
                  </div>
                  <button
                    onClick={() => sesionSeleccionada && verInforme(sesionSeleccionada, true)}
                    disabled={loadingInforme}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "none", backgroundColor: PALETA.ambar, color: "white", fontWeight: 700, fontSize: 12, cursor: loadingInforme ? "default" : "pointer", whiteSpace: "nowrap" }}>
                    {ta.panUpdateReport}
                  </button>
                </div>
              )}

              {/* Nivel de debate */}
              {informe.nivelDebate && (() => {
                const nb = NIVEL_BADGE[informe.nivelDebate] || NIVEL_BADGE.adecuado;
                const nbLabel = nivelEtiqueta(informe.nivelDebate);
                return (
                  <div style={{ backgroundColor: nb.bg, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 28 }}>
                      {informe.nivelDebate === "profundo" ? "🏆" : informe.nivelDebate === "adecuado" ? "✅" : "📊"}
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: nb.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{ta.panDebateLevel}</h2>
                      <div style={{ fontSize: 18, fontWeight: 900, color: nb.color }}>{nbLabel}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Resumen ejecutivo */}
              <Card title={ta.panExecSummary}>
                <p style={{ margin: 0, fontSize: 14, color: "#1e293b", lineHeight: 1.7 }}>{informe.resumenEjecutivo}</p>
              </Card>

              {/* Conceptos debatidos */}
              {informe.conceptosDebatidos?.length > 0 && (
                <Card title={ta.panConcepts}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {informe.conceptosDebatidos.map((c, i) => (
                      <span key={i} style={{ backgroundColor: colors.light, color: colors.primary, border: `1px solid ${colors.primary}30`, borderRadius: 20, padding: "4px 12px", fontSize: 13, fontWeight: 600 }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Fortalezas y áreas de oportunidad */}
              <div className="arb-una-columna" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {informe.fortalezas && (
                  <Card title={ta.panStrengths}>
                    <p style={{ margin: 0, fontSize: 13, color: "#166534", lineHeight: 1.6 }}>{informe.fortalezas}</p>
                  </Card>
                )}
                {informe.areasDeOportunidad && (
                  <Card title={ta.panOpportunities}>
                    <p style={{ margin: 0, fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>{informe.areasDeOportunidad}</p>
                  </Card>
                )}
              </div>

              {/* Patrones observados */}
              {informe.patronesObservados && (
                <Card title={ta.panPatterns}>
                  <p style={{ margin: 0, fontSize: 14, color: "#1e293b", lineHeight: 1.7 }}>{informe.patronesObservados}</p>
                </Card>
              )}

              {/* Recomendaciones */}
              {informe.recomendacionesDocente?.length > 0 && (
                <Card title={ta.panRecommendations}>
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {informe.recomendacionesDocente.map((r, i) => (
                      <li key={i} style={{ fontSize: 13, color: "#1e293b", marginBottom: 8, lineHeight: 1.6 }}>{r}</li>
                    ))}
                  </ol>
                </Card>
              )}

              {/* Preguntas para retomar */}
              {informe.preguntasParaRetomar?.length > 0 && (
                <Card title={ta.panRetake}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {informe.preguntasParaRetomar.map((p, i) => (
                      <div key={i} style={{ backgroundColor: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0", fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>
                        {i + 1}. {p}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Rondas corregidas por el docente + totales recalculados */}
              {correcciones && correcciones.totales.length > 0 && (
                <Card title={`🛠️ ${ta.reportCorrectionsTitle}`}>
                  <p style={{ margin: "0 0 10px", fontSize: 14, color: "#1e293b", lineHeight: 1.6 }} data-testid="informe-rondas-corregidas">
                    <strong>{fillArbitro(ta.reportCorrectedRounds, { n: correcciones.rondasCorregidas, total: correcciones.rondasConVeredicto })}</strong>
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {correcciones.totales.map((tp, i) => (
                      <div key={tp.partidaId} style={{ backgroundColor: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0", fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>
                        <strong>{fillArbitro(ta.gameN, { n: i + 1 })}</strong>
                        {tp.equipos.map(e => (
                          <div key={e.nombre}>
                            {e.nombre}: {e.puntosFinales !== e.puntosAlumnos
                              ? <>{fmt(e.puntosAlumnos)} → <strong>{fmt(e.puntosFinales)}</strong> {ta.pointsAbbrev}</>
                              : <>{fmt(e.puntosFinales)} {ta.pointsAbbrev}</>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 10, fontStyle: "italic" }}>{ta.correctionNote}</div>
                </Card>
              )}

              {/* Preguntas pasadas — fuera del análisis, pero visibles */}
              {informe.rondasPasadas && informe.rondasPasadas.length > 0 && (
                <Card title={ta.panPassed}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {informe.rondasPasadas.map((r, i) => (
                      <div key={i} style={{ backgroundColor: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 12, color: PALETA.gris, marginBottom: 4 }}>
                          {fillArbitro(ta.panPassedBy, { team: r.equipoPregunta || ta.panAnotherTeam })}
                          {typeof r.tiempoSegundos === "number"
                            ? fillArbitro(ta.panPassedTime, { time: `${Math.floor(r.tiempoSegundos / 60)}:${String(r.tiempoSegundos % 60).padStart(2, "0")}` })
                            : ""}
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{r.pregunta || ta.panNoText}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 10, fontStyle: "italic" }}>
                    {ta.panPassedNote}
                  </div>
                </Card>
              )}

            </div>
          )}

          {/* Rondas de la sesión: cada ronda aparece UNA sola vez (datos del servidor + registro del juego) + corrección del docente */}
          {(loadingRondas || errorRondas || partidasRondas.length > 0) && (
            <div style={{ marginBottom: 16 }}>
              <Card title={`🧾 ${ta.roundsTitle}`}>
                <div role="status" aria-live="polite">
                  {loadingRondas && <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{ta.roundsLoading}</p>}
                  {avisoCorreccion && <p style={srOnly}>{avisoCorreccion}</p>}
                </div>
                {errorRondas && <p role="alert" style={{ margin: 0, fontSize: 13, color: "#dc2626" }}>⚠️ {errorRondas}</p>}
                {partidasRondas.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {rondasData && !rondasData.puedeCorregir && (
                        <div style={{ fontSize: 12, color: PALETA.gris }}>{ta.correctOnlyOwner}</div>
                      )}
                      {partidasRondas.map(({ pid, numero, rondas: items }) => {
                        const tot = rondasData?.totales.find(t => t.partidaId === pid);
                        // Revisión con IA (Etapa 2): resumen de esta partida. «Marcadas y pendientes» son las
                        // que el docente todavía no confirmó/corrigió/descartó y difieren de lo que calificó el
                        // otro equipo — esas se muestran abiertas, abajo, en su ronda. El resto (sin novedad, o
                        // ya resueltas por el docente) se cuenta acá nomás, como detalle expandible.
                        const revPid = revisionPartidas[pid];
                        const obsPid = observacionesDePartida(pid);
                        const obsEntries = Object.entries(obsPid);
                        const marcadasPendientes = obsEntries.filter(([, o]) => o.comparacion !== "sin_observacion" && o.estadoDocente === "pendiente");
                        const resto = obsEntries.filter(([id]) => !marcadasPendientes.some(([mid]) => mid === id));
                        // Rondas que agotaron los intentos automáticos de revisión (Etapa 2, ajuste pedido):
                        // sin disputa, sin observación (nunca llegó a tener una) y marcadas noRevisable por
                        // listarRondasSesion. El docente las revisa a mano.
                        const noRevisablesPid = items.filter(({ doc: r, reg }) => {
                          if (!r) return false;
                          const fueAlArbitroItem = !!(r.disputa || r.fueAlArbitro || reg?.fueAlArbitro);
                          return !fueAlArbitroItem && !!r.noRevisable && !obsPid[r.id];
                        });
                        // Punto (f) del plan de Etapa 3: para el PDF del curso, "pendiente" es tanto lo que el
                        // docente nunca tocó (marcadasPendientes, de arriba) como una "corregida" a la que
                        // todavía le falta el veredicto (necesitaCompletarVeredicto, por ronda) — ninguna de
                        // las dos tiene un resultado final, así que ninguna puede entrar al PDF del curso.
                        const pendientesParaCurso = obsEntries.filter(([, o]) =>
                          o.comparacion !== "sin_observacion" &&
                          (o.estadoDocente === "pendiente" || (o.estadoDocente === "corregida" && o.comparacionEfectiva == null))
                        ).length;
                        return (
                          <div key={pid} data-partida-id={pid} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, backgroundColor: "#fafafa" }}>
                            <div className="arb-doc-print-only" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                              <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "white", backgroundColor: "#3730a3", borderRadius: 20, padding: "2px 10px" }}>{fillArbitro(ta.gameN, { n: numero })}</h3>
                              {tot && (
                                <span style={{ fontSize: 12, color: "#475569" }} data-testid="partida-totales">
                                  {tot.equipos.map(e => e.puntosFinales !== e.puntosAlumnos
                                    ? `${e.nombre} ${fmt(e.puntosAlumnos)} → ${fmt(e.puntosFinales)}`
                                    : `${e.nombre} ${fmt(e.puntosFinales)}`).join(" · ")}
                                </span>
                              )}
                              {informe && (
                                <button type="button" data-noprint onClick={() => imprimirInforme(pid)}
                                  style={{ marginLeft: "auto", minHeight: 32, padding: "4px 10px", borderRadius: 8, border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                  {ta.panPrintThisGame}
                                </button>
                              )}
                              <button type="button" data-noprint onClick={() => pedirPdfCurso(pid, pendientesParaCurso)}
                                style={{ marginLeft: informe ? 0 : "auto", minHeight: 32, padding: "4px 10px", borderRadius: 8, border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                {ta.panGenerateCoursePdf}
                              </button>
                            </div>
                            {modoEscritaSesion && (
                              <div data-noprint style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 12 }}>
                                <span style={{ fontWeight: 700, color: "#334155" }}>{ta.revTitle}</span>
                                {revPid?.estado === "revisando" ? (
                                  <span style={{ color: "#64748b" }}>{ta.revChecking}</span>
                                ) : revPid?.estado === "error" ? (
                                  <>
                                    <span role="alert" style={{ color: "#dc2626" }}>⚠️ {revPid.errorMsg}</span>
                                    <button type="button" onClick={() => sesionSeleccionada && dispararRevision(sesionSeleccionada.id, pid)}
                                      style={{ minHeight: 32, padding: "2px 10px", borderRadius: 8, border: "1px solid #dc2626", backgroundColor: "white", color: "#dc2626", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                      {ta.revRetry}
                                    </button>
                                  </>
                                ) : marcadasPendientes.length > 0 ? (
                                  <span style={{ fontWeight: 700, color: "#92400e", backgroundColor: "#fef3c7", borderRadius: 20, padding: "2px 10px" }}>{ta.revFlaggedCount(marcadasPendientes.length)}</span>
                                ) : (
                                  <span style={{ color: "#16a34a" }}>✅ {ta.revNoneFlagged}</span>
                                )}
                                {noRevisablesPid.length > 0 && (
                                  <span style={{ fontWeight: 700, color: "#475569", backgroundColor: "#f1f5f9", borderRadius: 20, padding: "2px 10px" }}>⚠️ {ta.revNotRevisableCount(noRevisablesPid.length)}</span>
                                )}
                                {resto.length > 0 && (
                                  <button type="button" onClick={() => setDetalleRevisionAbierto(prev => ({ ...prev, [pid]: !prev[pid] }))}
                                    style={{ minHeight: 32, padding: "2px 10px", borderRadius: 8, border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                    {detalleRevisionAbierto[pid] ? ta.revHideDetails : ta.revShowDetails(resto.length)}
                                  </button>
                                )}
                              </div>
                            )}
                            {/* Etapa 3: nota general del docente por partida, en los DOS modos (oral y escrito) — aparte
                                de la nota puntual de una observación corregida. Se guarda en
                                revisiones/{partidaId}.notaGeneral (guardarNotaPartidaArbitro) y sale en el PDF del
                                curso. Un docente ajeno (admin viendo la sesión) la ve pero no puede editarla
                                (readOnly) — mismo criterio que corregir/confirmar/descartar.
                                Se guarda SOLA al salir del campo (onBlur, y solo si el texto cambió respecto de lo
                                guardado — ver el chequeo `valor === valorGuardado` al principio de
                                guardarNotaGeneral), no con un botón. Además, si queda un borrador sin guardar en
                                CUALQUIER partida de la sesión, un listener de beforeunload (más abajo) le avisa al
                                docente antes de cerrar la pestaña o salir de la página.
                                El textarea de edición lleva data-noprint — un <textarea> imprime cortado, no el
                                texto completo — y lo que está escrito EN ESE MOMENTO (el borrador, no lo último
                                guardado: así Ctrl+P imprime lo mismo que se ve en pantalla, sin depender de que el
                                guardado en el servidor ya haya terminado) se repite aparte como texto plano (clase
                                arb-print-only, ver el <style> de más arriba), que solo se ve al imprimir y solo si
                                hay algo escrito. */}
                            {(() => {
                              const valorGuardado = rondasData?.revisiones?.[pid]?.notaGeneral ?? "";
                              const valorActual = notaGeneralBorrador[pid] ?? valorGuardado;
                              return (
                                <div style={{ marginBottom: 10 }}>
                                  <div data-noprint>
                                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155" }} htmlFor={`nota-general-${pid}`}>{ta.revGeneralNoteLabel}</label>
                                    <textarea id={`nota-general-${pid}`} rows={2} value={valorActual} placeholder={ta.revGeneralNotePlaceholder}
                                      readOnly={!rondasData?.puedeCorregir}
                                      onChange={e => {
                                        setNotaGeneralBorrador(prev => ({ ...prev, [pid]: e.target.value }));
                                        setNotaGeneralGuardada(prev => (prev[pid] ? { ...prev, [pid]: false } : prev));
                                      }}
                                      onBlur={() => { if (rondasData?.puedeCorregir) guardarNotaGeneral(pid); }}
                                      style={{ display: "block", width: "100%", marginTop: 4, borderRadius: 8, border: "1px solid #cbd5e1", padding: "6px 8px", fontSize: 12, fontFamily: "inherit", resize: "vertical" }} />
                                    {rondasData?.puedeCorregir && (
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap", minHeight: 16 }}>
                                        <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{ta.revNoteGoesInCoursePdf}</p>
                                        {guardandoNotaGeneral === pid ? (
                                          <span style={{ fontSize: 11, color: "#64748b" }}>{ta.revGeneralNoteSaving}</span>
                                        ) : errorNotaGeneral?.id === pid ? (
                                          <span role="alert" style={{ fontSize: 11, color: "#dc2626" }}>⚠️ {errorNotaGeneral.msg}</span>
                                        ) : notaGeneralGuardada[pid] ? (
                                          <span style={{ fontSize: 11, color: "#16a34a" }}>✅ {ta.revGeneralNoteSaved}</span>
                                        ) : null}
                                      </div>
                                    )}
                                  </div>
                                  {valorActual && (
                                    <div className="arb-print-only">
                                      <strong>{ta.revGeneralNoteLabel}:</strong>
                                      <div style={{ whiteSpace: "pre-wrap" }}>{valorActual}</div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            <div className="arb-doc-print-only" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {items.map(({ n, doc: r, reg }) => {
                                const calif = (r?.calificacion ?? reg?.calificacion)!;
                                const b = badgeCalificacion(calif);
                                const puntos = reg ? reg.puntos : r?.reparto.puntosResponde;
                                const clave = r?.id ?? `${pid}_${n}`;
                                const actual = r?.disputa ? `${r.reparto.tieneRazon}|${r.reparto.grado}` : "";
                                const elegida = r ? (seleccion[r.id] ?? "") : "";
                                const abierta = !!(r && corrAbierta[r.id]);
                                const fueAlArbitro = !!(r?.disputa || r?.fueAlArbitro || reg?.fueAlArbitro);
                                const pregunta = r?.pregunta || reg?.pregunta;
                                // Revisión con IA (Etapa 2): observación de esta ronda, si la hay (solo aplica a rondas sin disputa en modo escrito).
                                const obs = r && !fueAlArbitro ? obsPid[r.id] : undefined;
                                const esMarcadaPendiente = !!obs && obs.comparacion !== "sin_observacion" && obs.estadoDocente === "pendiente";
                                // Etapa 3: observación "corregida" sin veredictoDocente (dato legado, de antes de que
                                // este campo existiera): comparacionEfectiva queda en null hasta que se complete, y
                                // mientras tanto no entra al PDF del curso. Se destaca igual que una marcada pendiente.
                                const necesitaCompletarVeredicto = !!obs && obs.estadoDocente === "corregida" && obs.comparacionEfectiva === null;
                                const destacada = esMarcadaPendiente || necesitaCompletarVeredicto;
                                // Etapa 2: esta ronda agotó los intentos automáticos de revisión sin que Gemini
                                // devolviera un veredicto válido (ver noRevisablesPid, arriba). Nunca va a tener
                                // observación propia: el docente la revisa a mano.
                                const noRevisable = !!(r && !fueAlArbitro && !obs && r.noRevisable);
                                return (
                                  <div key={clave} data-testid={`ronda-${n}`} style={{ backgroundColor: "white", borderRadius: 10, padding: "10px 12px", border: `1px solid ${r?.correccion ? "#fcd34d" : destacada ? "#f59e0b" : "#f1f5f9"}` }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{fillArbitro(ta.roundLabel, { n })}: {r?.equipoPregunta ?? reg?.equipoPregunta} → {r?.equipoResponde ?? reg?.equipoResponde}</span>
                                      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: b.color, backgroundColor: b.bg, borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>
                                          {b.icon} {b.label}{typeof puntos === "number" ? ` (${fmt(puntos)} ${ta.pointsAbbrev})` : ""}
                                        </span>
                                        {r?.correccion && (
                                          <span data-testid="badge-corregido" style={{ fontSize: 12, fontWeight: 700, color: "#92400e", backgroundColor: "#fef3c7", borderRadius: 20, padding: "2px 8px", whiteSpace: "nowrap" }}>🛠️ {ta.correctedByTeacher}</span>
                                        )}
                                      </span>
                                    </div>
                                    {pregunta && <div style={{ marginTop: 6, fontSize: 13, color: "#1e293b", lineHeight: 1.5 }}>{pregunta}</div>}
                                    {/* Modo escrito: la respuesta escrita por el equipo. En las rondas con disputa se repite
                                        más abajo, dentro de «Fue al árbitro», arriba del veredicto. */}
                                    {!fueAlArbitro && modoEscritaSesion && r?.respuesta && (
                                      <div style={{ marginTop: 4, fontSize: 13, color: "#1e293b", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                                        <strong style={{ whiteSpace: "normal" }}>{ta.panAnswerLabel}</strong> {r.respuesta}
                                      </div>
                                    )}
                                    {/* Observación de la IA (Etapa 2): se RENDERIZA siempre que exista (no condicionada a estar
                                        abierta en pantalla), para que al imprimir (arb-ind-panel fuerza display:block) se vea el
                                        contenido aunque estuviera colapsado. En pantalla, solo se ve abierta de entrada si está
                                        marcada y pendiente, o si el docente abrió «Ver detalle» de la partida. Los botones de
                                        acción sí llevan data-noprint: eso es lo único que no tiene que salir en el informe impreso. */}
                                    {r && obs && (() => {
                                      const abiertaEnPantalla = destacada || !!detalleRevisionAbierto[pid];
                                      // Formulario compartido de "Corregir" (Etapa 3: nota + veredicto del docente, obligatorio).
                                      // Lo usan dos lugares: la observación pendiente real (de abajo) y, si hace falta completar
                                      // el veredicto de una "corregida" legada, el aviso de arriba — misma acción del servidor
                                      // ("corregir"), mismo formulario, para no duplicar la UI.
                                      const formularioCorregir = (rondaId: string, notaInicial: string, etiquetaAbrir: string) => (
                                        corregirAbierto[rondaId] === undefined ? (
                                          <button type="button" disabled={guardandoObservacion === rondaId}
                                            onClick={() => setCorregirAbierto(prev => ({ ...prev, [rondaId]: { nota: notaInicial, veredicto: "" } }))}
                                            style={{ minHeight: 36, padding: "6px 12px", borderRadius: 8, border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                            {etiquetaAbrir}
                                          </button>
                                        ) : (
                                          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 240px" }}>
                                            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }} htmlFor={`veredicto-${rondaId}`}>{ta.revVerdictLabel}</label>
                                            <select id={`veredicto-${rondaId}`} value={corregirAbierto[rondaId].veredicto}
                                              onChange={e => setCorregirAbierto(prev => ({ ...prev, [rondaId]: { ...prev[rondaId], veredicto: e.target.value as "" | "completa" | "incompleta" | "no" } }))}
                                              style={{ borderRadius: 8, border: "1px solid #cbd5e1", padding: "6px 8px", fontSize: 12, fontFamily: "inherit", backgroundColor: "white" }}>
                                              <option value="">{ta.revVerdictChoose}</option>
                                              {(["completa", "incompleta", "no"] as const).map(v => (
                                                <option key={v} value={v}>{etiquetaCalificacion(v, ta)}</option>
                                              ))}
                                            </select>
                                            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }} htmlFor={`nota-${rondaId}`}>{ta.revNoteLabel}</label>
                                            <textarea id={`nota-${rondaId}`} rows={2} value={corregirAbierto[rondaId].nota} placeholder={ta.revNotePlaceholder}
                                              onChange={e => setCorregirAbierto(prev => ({ ...prev, [rondaId]: { ...prev[rondaId], nota: e.target.value } }))}
                                              style={{ width: "100%", borderRadius: 8, border: "1px solid #cbd5e1", padding: "6px 8px", fontSize: 12, fontFamily: "inherit", resize: "vertical" }} />
                                            <p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 400 }}>{ta.revNoteGoesInCoursePdf}</p>
                                            <div style={{ display: "flex", gap: 6 }}>
                                              <button type="button" disabled={guardandoObservacion === rondaId || !corregirAbierto[rondaId].nota.trim() || !corregirAbierto[rondaId].veredicto}
                                                onClick={() => actuarSobreObservacion(pid, rondaId, "corregir", corregirAbierto[rondaId].nota, corregirAbierto[rondaId].veredicto)}
                                                style={{ minHeight: 36, padding: "6px 12px", borderRadius: 8, border: "none", backgroundColor: !corregirAbierto[rondaId].nota.trim() || !corregirAbierto[rondaId].veredicto || guardandoObservacion === rondaId ? "#94a3b8" : "#92400e", color: "white", fontWeight: 700, fontSize: 12, cursor: !corregirAbierto[rondaId].nota.trim() || !corregirAbierto[rondaId].veredicto || guardandoObservacion === rondaId ? "default" : "pointer" }}>
                                                {guardandoObservacion === rondaId ? ta.revSaving : ta.revCorrect}
                                              </button>
                                              <button type="button" disabled={guardandoObservacion === rondaId}
                                                onClick={() => setCorregirAbierto(prev => { const nn = { ...prev }; delete nn[rondaId]; return nn; })}
                                                style={{ minHeight: 36, padding: "6px 12px", borderRadius: 8, border: "1px solid #cbd5e1", backgroundColor: "white", color: "#334155", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                                                {ta.revCancel}
                                              </button>
                                            </div>
                                          </div>
                                        )
                                      );
                                      return (
                                        <div className="arb-ind-panel" hidden={!abiertaEnPantalla}
                                          style={{ display: abiertaEnPantalla ? "block" : "none", marginTop: 8, borderRadius: 8, padding: "8px 10px", fontSize: 12, lineHeight: 1.5, backgroundColor: destacada ? "#fffbeb" : "#f8fafc", border: `1px solid ${destacada ? "#fcd34d" : "#e2e8f0"}` }}>
                                          {obs.estadoDocente === "confirmada" ? (
                                            <div style={{ color: "#166534" }}>{ta.revStatusConfirmed}</div>
                                          ) : obs.estadoDocente === "corregida" ? (
                                            <>
                                              <div style={{ color: "#92400e" }}>{ta.revStatusCorrected}</div>
                                              {obs.veredictoDocente && <div style={{ marginTop: 2 }}><strong>{ta.revTeacherVerdictLabel}:</strong> {etiquetaCalificacion(obs.veredictoDocente, ta)}</div>}
                                              {obs.notaDocente && <div style={{ marginTop: 2 }}><strong>{ta.revTeacherNoteLabel}:</strong> {obs.notaDocente}</div>}
                                              {/* Etapa 3: dato legado (corregida antes de que el veredicto del docente fuera
                                                  obligatorio, como la observación de YVBRKD) — no entra al PDF del curso hasta
                                                  que se complete. Reusa el mismo formulario de "Corregir" (misma acción del
                                                  servidor), con la nota ya cargada para no hacer que el docente la reescriba. */}
                                              {necesitaCompletarVeredicto && rondasData?.puedeCorregir && r && (
                                                <div data-noprint style={{ marginTop: 6 }}>
                                                  <div style={{ color: "#92400e", fontWeight: 700, marginBottom: 4 }}>⚠️ {ta.revCompleteVerdictBanner}</div>
                                                  {formularioCorregir(r.id, obs.notaDocente || "", ta.revCompleteVerdict)}
                                                  {errorObservacion?.id === r.id && <div role="alert" style={{ marginTop: 6, color: "#dc2626" }}>⚠️ {errorObservacion.msg}</div>}
                                                </div>
                                              )}
                                            </>
                                          ) : obs.estadoDocente === "descartada" ? (
                                            <div style={{ color: "#64748b" }}>{ta.revStatusDiscarded}</div>
                                          ) : obs.comparacion === "sin_observacion" ? (
                                            <div style={{ color: "#64748b" }}>{ta.revComparisonNone}</div>
                                          ) : (
                                            <>
                                              <div style={{ color: "#92400e", fontWeight: 700 }}>
                                                {obs.comparacion === "error_no_detectado" ? ta.revComparisonErrorNotCaught : ta.revComparisonNotDefended}
                                              </div>
                                              <div style={{ marginTop: 4 }}><strong>{ta.revAiVerdictLabel}</strong> {etiquetaCalificacion(obs.veredictoIA, ta)}</div>
                                              <div style={{ marginTop: 2 }}><strong>{ta.revAiExplanationLabel}:</strong> {obs.explicacionIA}</div>
                                              {rondasData?.puedeCorregir && (
                                                <div data-noprint style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
                                                  <button type="button" disabled={guardandoObservacion === r.id}
                                                    onClick={() => actuarSobreObservacion(pid, r.id, "confirmar")}
                                                    style={{ minHeight: 36, padding: "6px 12px", borderRadius: 8, border: "1px solid #16a34a", backgroundColor: "white", color: "#166534", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                                    {ta.revConfirm}
                                                  </button>
                                                  {formularioCorregir(r.id, "", ta.revCorrect)}
                                                  <button type="button" disabled={guardandoObservacion === r.id}
                                                    onClick={() => actuarSobreObservacion(pid, r.id, "descartar")}
                                                    style={{ minHeight: 36, padding: "6px 12px", borderRadius: 8, border: "1px solid #cbd5e1", backgroundColor: "white", color: "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                                    {ta.revDiscard}
                                                  </button>
                                                </div>
                                              )}
                                              {errorObservacion?.id === r.id && <div data-noprint role="alert" style={{ marginTop: 6, color: "#dc2626" }}>⚠️ {errorObservacion.msg}</div>}
                                            </>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    {/* Etapa 2: ronda que agotó los intentos automáticos sin que Gemini devolviera
                                        un veredicto válido. No es un estado transitorio (no va a resolverse solo
                                        en una próxima visita), así que se ve siempre, sin data-noprint. */}
                                    {r && noRevisable && (
                                      <div style={{ marginTop: 8, borderRadius: 8, padding: "8px 10px", fontSize: 12, lineHeight: 1.5, backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", color: "#475569" }}>
                                        ⚠️ {ta.revNotRevisable}
                                      </div>
                                    )}
                                    {r && (
                                      <div style={{ marginTop: 4, fontSize: 12, color: "#475569" }}>
                                        <strong>{ta.splitLabel}:</strong> {repartoTxt(r, r.reparto)}
                                      </div>
                                    )}
                                    {r?.correccion && (
                                      <div style={{ marginTop: 4, fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                                        {fillArbitro(ta.correctedDetail, {
                                          original: repartoTxt(r, r.correccion.repartoOriginal),
                                          nuevo: repartoTxt(r, r.correccion.repartoNuevo),
                                          fecha: new Date(r.correccion.fecha).toLocaleDateString(locale),
                                        })}
                                      </div>
                                    )}
                                    {fueAlArbitro && (
                                      <div style={{ marginTop: 6, fontSize: 12, color: "#7c3aed", backgroundColor: "#f5f3ff", borderRadius: 6, padding: "6px 10px", lineHeight: 1.5 }}>
                                        <strong>{ta.panWentToReferee}</strong>
                                        {r?.disputa ? (
                                          <>
                                            {modoEscritaSesion && r?.respuesta && (
                                              <div style={{ marginTop: 2, whiteSpace: "pre-wrap" }}>
                                                <strong>{ta.panAnswerLabel}</strong> {r.respuesta}
                                              </div>
                                            )}
                                            {r.disputa.veredicto && <div style={{ marginTop: 2 }}><strong>{ta.verdictLabel}:</strong> {r.disputa.veredicto}</div>}
                                            {r.disputa.explicacion && <div style={{ marginTop: 2 }}><strong>{ta.explanationLabel}:</strong> {r.disputa.explicacion}</div>}
                                            <div style={{ marginTop: 4 }}>
                                              <button type="button" className="arb-ind-toggle" aria-expanded={!!alumnoAbierto[`pos-${clave}`]} aria-controls={`pos-${clave}`}
                                                onClick={() => setAlumnoAbierto(prev => ({ ...prev, [`pos-${clave}`]: !prev[`pos-${clave}`] }))}
                                                style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 44, padding: "4px 0", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#7c3aed", textAlign: "left" }}>
                                                <span className="arb-chev" aria-hidden="true">{alumnoAbierto[`pos-${clave}`] ? "▾" : "▸"}</span>{ta.positionsLabel}
                                              </button>
                                              <div id={`pos-${clave}`} className="arb-ind-panel" hidden={!alumnoAbierto[`pos-${clave}`]} style={{ display: alumnoAbierto[`pos-${clave}`] ? "block" : "none" }}>
                                                <div style={{ marginTop: 2, whiteSpace: "pre-wrap" }}>{r.disputa.posicionPregunta}</div>
                                                <div style={{ marginTop: 2, whiteSpace: "pre-wrap" }}>{r.disputa.posicionResponde}</div>
                                              </div>
                                            </div>
                                          </>
                                        ) : (
                                          reg?.veredictoArbitro && <div style={{ marginTop: 2 }}><strong>{ta.explanationLabel}:</strong> {reg.veredictoArbitro}</div>
                                        )}
                                      </div>
                                    )}
                                    {r?.disputa && rondasData?.puedeCorregir && (
                                      <div data-noprint style={{ marginTop: 8 }}>
                                        <button type="button" className="arb-corr-toggle" aria-expanded={abierta} aria-controls={`corr-${r.id}`}
                                          onClick={() => setCorrAbierta(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                                          style={{ minHeight: 44, padding: "8px 14px", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", border: "2px solid #cbd5e1", backgroundColor: "white", color: "#334155" }}>
                                          <span aria-hidden="true">{abierta ? "▾" : "▸"} </span>{ta.correctSplit}
                                        </button>
                                        <div id={`corr-${r.id}`} hidden={!abierta} style={{ marginTop: 8, display: abierta ? "flex" : "none", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                                          <fieldset style={{ ...fieldsetReset, flex: "1 1 260px" }}>
                                            <legend style={{ ...legendReset, fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 3 }}>{ta.correctSplit}</legend>
                                            <div className="arb-una-columna" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                              {OPCIONES_REPARTO.map(o => {
                                                const marcada = (elegida || actual) === o.key;
                                                return (
                                                  <button key={o.key} type="button" aria-pressed={marcada} disabled={corrigiendo === r.id}
                                                    onClick={() => setSeleccion(prev => ({ ...prev, [r.id]: o.key === actual ? "" : o.key }))}
                                                    style={{ minHeight: 44, padding: "8px 10px", fontSize: 13, textAlign: "left", lineHeight: 1.3, borderRadius: 8, cursor: "pointer", border: `2px solid ${marcada ? "#3730a3" : "#cbd5e1"}`, backgroundColor: marcada ? "#eef2ff" : "white", color: marcada ? "#312e81" : "#1e293b", fontWeight: marcada ? 700 : 500 }}>
                                                    {marcada && <span aria-hidden="true">✓ </span>}{textoOpcion(o.key, r)}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </fieldset>
                                          <button onClick={() => corregirRonda(r)} disabled={!elegida || corrigiendo === r.id}
                                            style={{ minHeight: 44, padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: !elegida || corrigiendo === r.id ? "#94a3b8" : "#3730a3", color: "white", fontWeight: 700, fontSize: 13, cursor: !elegida || corrigiendo === r.id ? "default" : "pointer" }}>
                                            {corrigiendo === r.id ? ta.correctSaving : ta.correctSave}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    {r && errorCorreccion?.id === r.id && (
                                      <div role="alert" style={{ marginTop: 6, fontSize: 12, color: "#dc2626" }}>⚠️ {errorCorreccion.msg}</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {/* PDF del curso (Etapa 3, plan a/c/d/e/f): vista aparte, en el idioma de la SESIÓN
                                (txCurso), que reemplaza — nunca convive con — la vista de arriba al imprimir en
                                modoImprimirCurso (ver generarPdfCurso y el <style> de más arriba). Mismo
                                documento en los dos modos: todas las preguntas y, en las disputas, la
                                explicación del árbitro; en modo escrito se suman las respuestas y las
                                observaciones ya revisadas por el docente que siguen siendo una discrepancia
                                real (comparacionEfectiva), con su nota — las pendientes y las corregidas sin
                                veredicto NUNCA entran (ver pendientesParaCurso, arriba, que avisa cuántas son
                                antes de generar). Sin integrantes ni metacognición (plan d): solo equipos. */}
                            <div className="arb-curso-pdf">
                              {items.map(({ n, doc: r, reg }) => {
                                if (!r) return null; // sin documento de ronda (solo informes.registros, de sesiones viejas): no hay bastante para listar acá
                                const fueAlArbitroItem = !!(r.disputa || r.fueAlArbitro || reg?.fueAlArbitro);
                                const obs = !fueAlArbitroItem ? obsPid[r.id] : undefined;
                                // Solo un resultado FINAL entra: confirmada, o corregida con veredicto ya
                                // completo. comparacionEfectiva es la fuente de verdad para "corregida" (null =
                                // todavía sin veredicto, no entra) y coincide con `comparacion` para el resto de
                                // los estados (ver el comentario de ObservacionIA, arriba).
                                const comparacionFinal = obs && (obs.estadoDocente === "confirmada" || (obs.estadoDocente === "corregida" && obs.comparacionEfectiva != null))
                                  ? (obs.comparacionEfectiva ?? obs.comparacion)
                                  : "sin_observacion";
                                const pregunta = r.pregunta || reg?.pregunta;
                                const calif = r.calificacion ?? reg?.calificacion;
                                return (
                                  <div key={n} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                                      {fillArbitro(txCurso.roundLabel, { n })}: {r.equipoPregunta} → {r.equipoResponde}
                                      {calif && <span style={{ marginLeft: 8, fontWeight: 600 }}>{ICONO_CALIFICACION[calif] ?? ""} {etiquetaCalificacion(calif, txCurso)}</span>}
                                    </div>
                                    {pregunta && <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>{pregunta}</div>}
                                    {modoEscritaSesion && r.respuesta && (
                                      <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                                        <strong style={{ whiteSpace: "normal" }}>{txCurso.panAnswerLabel}</strong> {r.respuesta}
                                      </div>
                                    )}
                                    {fueAlArbitroItem && (
                                      <div style={{ marginTop: 6, fontSize: 12, color: "#7c3aed", backgroundColor: "#f5f3ff", borderRadius: 6, padding: "6px 10px", lineHeight: 1.5 }}>
                                        <strong>{txCurso.panWentToReferee}</strong>
                                        {r.disputa ? (
                                          <>
                                            {r.disputa.veredicto && <div style={{ marginTop: 2 }}><strong>{txCurso.verdictLabel}:</strong> {r.disputa.veredicto}</div>}
                                            {r.disputa.explicacion && <div style={{ marginTop: 2 }}><strong>{txCurso.explanationLabel}:</strong> {r.disputa.explicacion}</div>}
                                          </>
                                        ) : (
                                          reg?.veredictoArbitro && <div style={{ marginTop: 2 }}><strong>{txCurso.explanationLabel}:</strong> {reg.veredictoArbitro}</div>
                                        )}
                                        {/* Ajuste pedido (4): si el docente corrigió el REPARTO de puntos de esta disputa
                                            (r.correccion), decirlo en una frase — sin números, el PDF del curso no lleva
                                            puntajes. */}
                                        {r.correccion && <div style={{ marginTop: 4, fontStyle: "italic" }}>{txCurso.revRefereeRulingCorrected}</div>}
                                      </div>
                                    )}
                                    {comparacionFinal !== "sin_observacion" && obs && (
                                      <div style={{ marginTop: 6, fontSize: 12, backgroundColor: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 6, padding: "6px 10px", lineHeight: 1.5 }}>
                                        <div style={{ fontWeight: 700, color: "#92400e" }}>
                                          {comparacionFinal === "error_no_detectado" ? txCurso.revComparisonErrorNotCaught : txCurso.revComparisonNotDefended}
                                        </div>
                                        {/* Ajuste pedido (2): sin la calificación que dio el otro equipo, "error no
                                            detectado"/"acierto no defendido" no se entienden. */}
                                        {calif && <div style={{ marginTop: 2 }}><strong>{txCurso.revGradedAsLabel}:</strong> {etiquetaCalificacion(calif, txCurso)}</div>}
                                        {/* Ajuste pedido (1): confirmada = el docente hizo suya la explicación de la IA
                                            (plan b); corregida = veredicto del docente, sin la explicación de la IA. La
                                            nota del docente va en las dos, si la hay. */}
                                        {obs.estadoDocente === "confirmada" && obs.explicacionIA && (
                                          <div style={{ marginTop: 2 }}><strong>{txCurso.revAiExplanationLabel}:</strong> {obs.explicacionIA}</div>
                                        )}
                                        {obs.estadoDocente === "corregida" && obs.veredictoDocente && (
                                          <div style={{ marginTop: 2 }}><strong>{txCurso.revTeacherVerdictLabel}:</strong> {etiquetaCalificacion(obs.veredictoDocente, txCurso)}</div>
                                        )}
                                        {obs.notaDocente && <div style={{ marginTop: 2 }}><strong>{txCurso.revTeacherNoteLabel}:</strong> {obs.notaDocente}</div>}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {(() => {
                                // Ajuste pedido (3): el PDF del curso tiene que mostrar lo que está escrito en el
                                // campo EN ESE MOMENTO, no lo último guardado — mismo motivo que en el PDF del
                                // docente (ver valorActual, arriba): al apretar el botón, el campo pierde el foco y
                                // dispara el guardado, pero ese guardado es async y window.print() no lo espera.
                                const nota = notaGeneralBorrador[pid] ?? rondasData?.revisiones?.[pid]?.notaGeneral ?? "";
                                if (!nota) return null;
                                return (
                                  <div style={{ marginTop: 4 }}>
                                    <strong>{txCurso.revGeneralNoteLabel}:</strong>
                                    <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{nota}</div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                      {rondasData && <div style={{ fontSize: 12, color: PALETA.gris, fontStyle: "italic" }}>{ta.correctionNote}</div>}
                    </div>
                )}
              </Card>
            </div>
          )}

          {/* Reflexiones de los equipos — agrupadas por partida, porque una
              sola sesión puede tener 6-7 parejas jugando en simultáneo desde
              el mismo link */}
          {(loadingMeta || metacogniciones.length > 0) && (
            <Card title={`✍️ ${ta.panReflectionsTitle(metacogniciones.length)}`}>
              {loadingMeta ? (
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{ta.panLoadingReflections}</p>
              ) : metacogniciones.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{ta.panNoReflections}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {metacogniciones.map((meta, idx) => {
                    // Modo competitivo
                    if (meta.modo === "competitivo" && meta.equipos) {
                      return (
                        <div key={meta.id} data-partida-id={meta.partidaId || undefined} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, backgroundColor: "#fafafa" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "white", backgroundColor: "#3730a3", borderRadius: 20, padding: "2px 10px" }}>
                              {fillArbitro(ta.gameN, { n: meta.partidaId ? (numeroDePartida[meta.partidaId] ?? idx + 1) : idx + 1 })}
                            </h3>
                            <span style={{ fontSize: 12, color: "#64748b" }}>
                              {meta.equipos.map(eq => `${eq.nombre} (${fmt(eq.puntos)})`).join(" vs ")}
                            </span>
                            {(() => {
                              const tp = totalDePartida(meta.partidaId);
                              if (!tp || !tp.equipos.some(e => e.puntosFinales !== e.puntosAlumnos)) return null;
                              return (
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e", backgroundColor: "#fef3c7", borderRadius: 20, padding: "2px 8px" }}>
                                  🛠️ {ta.totalCorrected}: {tp.equipos.map(e => `${e.nombre} ${fmt(e.puntosFinales)}`).join(" · ")}
                                </span>
                              );
                            })()}
                          </div>
                          {meta.equipos.map((eq, i) => (
                            <div key={i} style={{ marginBottom: i < meta.equipos!.length - 1 ? 16 : 0, backgroundColor: "white", borderRadius: 10, padding: 12, border: "1px solid #f1f5f9" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                <div aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: eq.color }} />
                                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{eq.nombre}</h4>
                                <span style={{ fontSize: 12, color: PALETA.gris }}>{textoIntegrantes(eq.integrantes)}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginLeft: "auto" }}>{fmt(eq.puntos)} {ta.pointsAbbrev}</span>
                              </div>
                              {/* Individual: desglose por alumno. Grupal (o informe viejo): una reflexión por equipo. */}
                              {eq.individuales
                                ? eq.individuales.map((ind, a) => {
                                    const filas = filasMeta(meta.preguntas, ind.respuestas, [ta.panQ1, ta.panQ2, ta.panQ3, ta.panQ4], sesionSeleccionada?.tema ?? "");
                                    const clave = `${meta.id}-${i}-${a}`;
                                    const ab = !!alumnoAbierto[clave];
                                    return (
                                      <div key={a} style={{ marginBottom: 6, paddingLeft: 10, borderLeft: "3px solid #c7d2fe" }}>
                                        <h5 style={{ margin: 0, fontSize: 13 }}>
                                          <button type="button" className="arb-ind-toggle" aria-expanded={ab} aria-controls={`ind-${clave}`}
                                            onClick={() => setAlumnoAbierto(prev => ({ ...prev, [clave]: !prev[clave] }))}
                                            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", minHeight: 44, padding: "6px 8px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 800, color: "#3730a3" }}>
                                            <span className="arb-chev" aria-hidden="true">{ab ? "▾" : "▸"}</span>
                                            <span>{ind.alumno}</span>
                                            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "#64748b" }}>{fillArbitro(ta.indAnswersCount, { n: filas.length })}</span>
                                          </button>
                                        </h5>
                                        <div id={`ind-${clave}`} className="arb-ind-panel" hidden={!ab} style={{ display: ab ? "block" : "none", marginTop: 4 }}>
                                          {filas.map((r, j) => (
                                            <div key={j} style={{ marginBottom: 8 }}>
                                              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 3 }}>{r.label}</div>
                                              <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6, backgroundColor: "#f8fafc", borderRadius: 8, padding: "8px 12px", border: "1px solid #e2e8f0" }}>{r.val}</div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })
                                : filasMeta(meta.preguntas, eq.respuestas, [ta.panQ1, ta.panQ2, ta.panQ3, ta.panQ4], sesionSeleccionada?.tema ?? "").map((r, j) => (
                                <div key={j} style={{ marginBottom: 8 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 3 }}>{r.label}</div>
                                  <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6, backgroundColor: "#f8fafc", borderRadius: 8, padding: "8px 12px", border: "1px solid #e2e8f0" }}>{r.val}</div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    // Modo normal
                    const r = meta.respuestas as any;
                    const pregsNormal = [
                      { label: ta.panQ1s, val: r?.aprendizaje },
                      { label: ta.panQ2, val: r?.dificultad },
                      { label: ta.panQ3, val: r?.preguntaPendiente },
                      { label: ta.panQ4s, val: r?.ensenanza },
                    ].filter(p => p.val?.trim());

                    return (
                      <div key={meta.id} data-informe-general style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, backgroundColor: "#fafafa" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "white", backgroundColor: "#3730a3", borderRadius: 20, padding: "2px 10px" }}>
                            #{idx + 1}
                          </h3>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>
                            {meta.nombreEquipo ? `${meta.nombreEquipo} — ` : ""}{meta.nombreAlumno}
                          </span>
                        </div>
                        {pregsNormal.map((p, j) => (
                          <div key={j} style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 3 }}>{p.label}</div>
                            <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6, backgroundColor: "#f8fafc", borderRadius: 8, padding: "8px 12px", border: "1px solid #e2e8f0" }}>{p.val}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Vista proyectable del texto base */}
        {mostrarTexto && sesionSeleccionada.textoFuente && (
          <DialogoEnPagina onCerrar={() => setMostrarTexto(false)} idTitulo="panel-texto-titulo" extra={{ "data-noprint": true }}
            style={{
              position: "fixed", inset: 0, backgroundColor: "white",
              zIndex: 9999, overflow: "auto", padding: "48px 10%",
              fontFamily: "'Georgia', serif",
            }}>
            <button
              type="button"
              data-autofocus
              onClick={() => setMostrarTexto(false)}
              style={{
                position: "fixed", top: 20, right: 24,
                padding: "10px 20px", borderRadius: 10,
                border: "2px solid #e2e8f0", backgroundColor: "white",
                fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#64748b",
              }}>
              {ta.panCloseX}
            </button>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <h2 id="panel-texto-titulo" style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: PALETA.gris, textTransform: "uppercase", letterSpacing: "1px" }}>
                {materiaDe(sesionSeleccionada.materia)} · {sesionSeleccionada.tema}
              </h2>
              <div style={{ fontSize: 20, lineHeight: 1.9, color: "#1e293b", whiteSpace: "pre-wrap" }}>
                {sesionSeleccionada.textoFuente}
              </div>
            </div>
          </DialogoEnPagina>
        )}

        {/* Aviso de observaciones sin revisar antes de generar el PDF del curso (plan f, Etapa 3): no van a
            salir, así que se confirma antes de imprimir. Mismo patrón que el aviso de "PDF no compartido" de
            ArbitroConfigPage: cerrar el modal y recién después, con un pequeño delay, disparar la impresión —
            el modal tarda un instante en desmontarse, y window.print() congela la página; si no se espera, el
            velo oscuro del modal queda en la captura. */}
        {avisoPendientesCurso && (
          <ModalDialogo onCerrar={() => setAvisoPendientesCurso(null)} idTitulo="dlg-curso-pend-titulo" idDescripcion="dlg-curso-pend-desc" panelStyle={{ padding: "28px 28px 24px" }}>
            <div aria-hidden="true" style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h2 id="dlg-curso-pend-titulo" style={{ margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
              {ta.revCoursePdfPendingTitle}
            </h2>
            <p id="dlg-curso-pend-desc" style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
              {ta.revCoursePdfPendingDesc(avisoPendientesCurso.cantidad)}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setAvisoPendientesCurso(null)}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", backgroundColor: "#3730a3", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {ta.revCancel}
              </button>
              <button
                onClick={() => {
                  const pid = avisoPendientesCurso.pid;
                  setAvisoPendientesCurso(null);
                  setTimeout(() => generarPdfCurso(pid), 80);
                }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#475569" }}>
                {ta.revCoursePdfGenerateAnyway}
              </button>
            </div>
          </ModalDialogo>
        )}
      </main>
    );
  }

  // ── Vista lista de sesiones ─────────────────────────────────────────────
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg,#1e3a5f,#3730a3)", padding: "24px", color: "white", position: "relative" }}>
        <style>{`@media (max-width: 560px) { .pan-sel { position: static !important; margin-bottom: 10px; } .pan-h1 { padding-right: 0 !important; } }`}</style>
        <div className="pan-sel" style={{ position: "absolute", top: 14, right: 16, zIndex: 10 }}>
          <LanguageSelector compact tone="onColor" idiomas={IDIOMAS_ARBITRO} />
        </div>
        <h1 className="pan-h1" style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, paddingRight: 90 }}>{ta.panTitle}</h1>
        <p style={{ margin: 0, fontSize: 13 }}>{ta.panSubtitle}</p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
        {/* Vista admin — solo visible para Pablo */}
        {user?.uid === ADMIN_UID && (
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={modoAdmin ? () => setModoAdmin(false) : cargarTodasSesiones}
              disabled={loadingAdmin}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                border: `2px solid ${modoAdmin ? "#dc2626" : "#7c3aed"}`,
                backgroundColor: modoAdmin ? "#fef2f2" : "#f5f3ff",
                color: modoAdmin ? "#dc2626" : "#7c3aed",
                fontWeight: 700,
                fontSize: 13,
                cursor: loadingAdmin ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}>
              {loadingAdmin ? ta.panAdminLoading : modoAdmin ? ta.panAdminBack : ta.panAdminAll}
            </button>
            {modoAdmin && (
              <div style={{ fontSize: 12, color: "#7c3aed", textAlign: "center", marginTop: 4 }}>
                {ta.panAdminShowing}
              </div>
            )}
          </div>
        )}

        <div role="status" aria-live="polite">
          {(loading || authLoading) && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
              {ta.panLoadingSessions}
            </div>
          )}
        </div>

        {error && (
          <div role="alert" style={{ backgroundColor: "#fef2f2", borderRadius: 12, padding: 20, border: "1px solid #fecaca" }}>
            <p style={{ margin: 0, color: "#b91c1c", fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}

        {!loading && !authLoading && !error && (modoAdmin ? todasSesiones : sesiones).length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 15, fontWeight: 600 }}>{ta.panNoSessions}</p>
            <p style={{ fontSize: 13 }}>{ta.panNoSessionsHint}</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(modoAdmin ? todasSesiones : sesiones).map(sesion => {
            const c = coloresArea(sesion.area);
            const fecha = new Date(sesion.creadoEn).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
            return (
              <div key={sesion.id}
                style={{ backgroundColor: "white", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "stretch" }}>
                  <div style={{ width: 6, background: c.gradient, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{materiaDe(sesion.materia)}</h2>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{sesion.tema}</div>
                        <div style={{ fontSize: 12, color: PALETA.gris, marginTop: 4 }}>
                          {nivelDe(sesion.nivel)} · {sesion.anio} · {fecha}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                        {!!sesion.partidasCount && (
                          <span style={{
                            fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                            backgroundColor: "#e0e7ff", color: "#4338ca", border: "1px solid #c7d2fe", whiteSpace: "nowrap",
                          }}>
                            {ta.panGamesCount(sesion.partidasCount)}
                          </span>
                        )}
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                          backgroundColor: sesion.tieneInforme ? "#dcfce7" : "#f1f5f9",
                          color: sesion.tieneInforme ? "#166534" : PALETA.grisOscuro,
                          border: `1px solid ${sesion.tieneInforme ? "#86efac" : "#e2e8f0"}`,
                          whiteSpace: "nowrap",
                        }}>
                          {sesion.tieneInforme ? ta.panWithReport : ta.panNoReport}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                      {sesion.textoFuente && (
                        <button onClick={() => mostrarTextoDesdeLista(sesion)}
                          style={{ padding: "8px 16px", borderRadius: 8, border: `2px solid ${c.primary}`, backgroundColor: "white", color: c.primary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          {ta.panGroupReading}
                        </button>
                      )}
                      <button onClick={() => verInforme(sesion)}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: c.gradient, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        {sesion.tieneInforme ? ta.panViewReport : ta.panGenerateReport}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

// El título de cada tarjeta es un encabezado: h2 por defecto (los h3 de adentro, como «Partida 1», cuelgan de él).
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ backgroundColor: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fafafa" }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{title}</h2>
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </section>
  );
}
