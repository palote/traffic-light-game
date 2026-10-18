// Guardado local de la partida del Árbitro para poder reconectarse (recarga, corte de
// conexión, pestaña que se cierra sola en el celu). Vive en localStorage, con UNA clave por
// id de sesión, así que dos sesiones distintas en el mismo dispositivo no se pisan.
//
// Todas las lecturas y escrituras van dentro de try/catch: localStorage puede estar
// bloqueado (modo privado, cookies deshabilitadas), lleno o devolver datos corruptos. Si falla,
// el juego sigue funcionando igual, solo que sin reconexión.

import { camposDesdeGuardado } from "./arbitroIntegrantes";

export const PREFIJO_PARTIDA = "tlg_partida_arbitro_v1_";
const VERSION = 1;

export const PANTALLAS_VALIDAS = [
  "setup", "config_vueltas", "turno_pregunta", "calificacion", "aceptacion",
  "disputa", "arbitro", "resultado_ronda", "fin_juego", "metacognicion",
] as const;
export type PantallaGuardada = typeof PANTALLAS_VALIDAS[number];

export type CalificacionActual = "completa" | "incompleta" | "no" | "pasada" | null;

export interface RegistroGuardado {
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
  consultaId?: string;
  registrada?: boolean;
}

export interface VeredictoGuardado {
  resultado: "A" | "B" | "ambas_correctas" | "ambas_incorrectas" | "fuera_de_tema";
  calificacionRecomendada?: "completa" | "incompleta" | "no";
  puntosResponde?: number;
  puntosPregunta?: number;
  veredicto: string;
  explicacion: string;
  paraSeguirPensando: string;
  consultaId?: string;
}

export interface PartidaGuardada {
  v: number;
  /** Vencimiento de la sesión (ISO) cuando se guardó: sirve para descartar guardados vencidos. */
  expiresAt: string;
  guardadoEn: number;
  /** Id de la partida (une las rondas registradas en el servidor). Los guardados viejos no lo tienen. */
  partidaId?: string;
  nombreEquipo1: string; nombreEquipo2: string;
  colorEquipo1: string; colorEquipo2: string;
  /** Un elemento por alumno (puede haber campos vacíos). Las partidas guardadas antes guardaban un solo string: se leen igual. */
  integrantesEquipo1: string[]; integrantesEquipo2: string[];
  vueltasTotales: number;
  pantalla: PantallaGuardada;
  preguntaNumero: number;
  equipoPreguntaIdx: number;
  puntosEquipo1: number; puntosEquipo2: number;
  registros: RegistroGuardado[];
  preguntaActual: string;
  usarPreguntaPropia: boolean;
  preguntaBorrador: string;
  respuestaActual: string;
  calificacionActual: CalificacionActual;
  justificacionCalificacion: string;
  disputaPregunta: string; disputaRespuesta: string;
  disputaArgEquipoPregunta: string; disputaArgEquipoRespuesta: string;
  veredictoArbitro: VeredictoGuardado | null;
  segundos: number;
  tiempoVencido: boolean;
  corriendo: boolean;
  sonidoActivo: boolean;
  metaEquipoActual: number;
  /** Formato anterior (8 casilleros: respuestas 1..4 del equipo 1 y 1..4 del equipo 2). Solo se lee; ya no se escribe. */
  meta?: [string, string, string, string, string, string, string, string];
  /** Reflexión grupal: [equipo][pregunta] (hasta 6 preguntas). */
  metaG?: string[][];
  /** Metacognición individual: [equipo][alumno] → [respuesta 1..4]. Opcional: las partidas guardadas antes no lo traen. */
  metaInd?: string[][][];
  /** Turno actual de la metacognición individual (0 = primer alumno del equipo 1). */
  metaTurno?: number;
}

export const claveDePartida = (sessionId: string) => PREFIJO_PARTIDA + sessionId;

const esStr = (x: unknown): x is string => typeof x === "string";
const esNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const esBool = (x: unknown): x is boolean => typeof x === "boolean";

const CALIF_REGISTRO = ["completa", "incompleta", "no", "pasada", "fuera_de_tema"];
const RESULTADOS = ["A", "B", "ambas_correctas", "ambas_incorrectas", "fuera_de_tema"];

function registroValido(r: any): r is RegistroGuardado {
  return !!r && esNum(r.ronda) && esStr(r.equipoPregunta) && esStr(r.equipoResponde) && esStr(r.pregunta)
    && esStr(r.respuesta) && CALIF_REGISTRO.includes(r.calificacion) && esNum(r.puntos) && esBool(r.fueAlArbitro)
    && (r.veredictoArbitro === undefined || esStr(r.veredictoArbitro))
    && (r.tiempoSegundos === undefined || esNum(r.tiempoSegundos))
    && (r.consultaId === undefined || esStr(r.consultaId)) && (r.registrada === undefined || esBool(r.registrada));
}

function veredictoValido(v: any): v is VeredictoGuardado {
  return !!v && RESULTADOS.includes(v.resultado) && esStr(v.veredicto) && esStr(v.explicacion) && esStr(v.paraSeguirPensando)
    && (v.puntosResponde === undefined || esNum(v.puntosResponde))
    && (v.puntosPregunta === undefined || esNum(v.puntosPregunta))
    && (v.consultaId === undefined || esStr(v.consultaId));
}

/** Valida un objeto leído de localStorage. Devuelve null si algo no cierra (datos viejos, corruptos o manipulados). */
export function validarPartida(raw: unknown): PartidaGuardada | null {
  const p = raw as any;
  if (!p || typeof p !== "object" || p.v !== VERSION) return null;
  const strs = ["expiresAt", "nombreEquipo1", "nombreEquipo2", "colorEquipo1", "colorEquipo2",
    "preguntaActual", "preguntaBorrador", "respuestaActual", "justificacionCalificacion",
    "disputaPregunta", "disputaRespuesta", "disputaArgEquipoPregunta", "disputaArgEquipoRespuesta"];
  if (!strs.every(k => esStr(p[k]))) return null;
  // Integrantes: array de nombres (formato actual) o un único string (formato viejo). Se normaliza a array.
  const integrantesValidos = (x: unknown) => esStr(x) || (Array.isArray(x) && x.length <= 50 && x.every(esStr));
  if (!integrantesValidos(p.integrantesEquipo1) || !integrantesValidos(p.integrantesEquipo2)) return null;
  if (p.metaInd !== undefined && !(Array.isArray(p.metaInd) && p.metaInd.every((e: unknown) => Array.isArray(e) && e.every((a: unknown) => Array.isArray(a) && a.length >= 1 && a.length <= 6 && a.every(esStr))))) return null;
  if (p.metaTurno !== undefined && !(esNum(p.metaTurno) && p.metaTurno >= 0)) return null;
  const nums = ["vueltasTotales", "preguntaNumero", "equipoPreguntaIdx", "puntosEquipo1", "puntosEquipo2", "segundos", "metaEquipoActual"];
  if (!nums.every(k => esNum(p[k]))) return null;
  if (!esBool(p.usarPreguntaPropia) || !esBool(p.tiempoVencido) || !esBool(p.corriendo) || !esBool(p.sonidoActivo)) return null;
  if (!PANTALLAS_VALIDAS.includes(p.pantalla)) return null;
  if (p.equipoPreguntaIdx !== 0 && p.equipoPreguntaIdx !== 1) return null;
  if (p.metaEquipoActual !== 0 && p.metaEquipoActual !== 1) return null;
  if (p.vueltasTotales < 1 || p.preguntaNumero < 1 || p.puntosEquipo1 < 0 || p.puntosEquipo2 < 0 || p.segundos < 0) return null;
  if (![null, "completa", "incompleta", "no", "pasada"].includes(p.calificacionActual)) return null;
  if (!Array.isArray(p.registros) || !p.registros.every(registroValido)) return null;
  if (p.veredictoArbitro !== null && !veredictoValido(p.veredictoArbitro)) return null;
  if (p.partidaId !== undefined && !esStr(p.partidaId)) return null;
  if (p.meta !== undefined && !(Array.isArray(p.meta) && p.meta.length === 8 && p.meta.every(esStr))) return null;
  if (p.metaG !== undefined && !(Array.isArray(p.metaG) && p.metaG.length === 2 && p.metaG.every((e: unknown) => Array.isArray(e) && e.length <= 6 && e.every(esStr)))) return null;
  if (p.meta === undefined && p.metaG === undefined) return null;
  return { ...p, integrantesEquipo1: camposDesdeGuardado(p.integrantesEquipo1), integrantesEquipo2: camposDesdeGuardado(p.integrantesEquipo2) } as PartidaGuardada;
}

export function sesionVencida(expiresAt: string | undefined, ahora = Date.now()): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) && t <= ahora;
}

export function borrarPartida(sessionId: string): void {
  try { localStorage.removeItem(claveDePartida(sessionId)); } catch { /* sin storage: no hay nada que borrar */ }
}

/** Lee el guardado de esa sesión. Si está corrupto o la sesión ya venció, lo borra y devuelve null. */
export function leerPartida(sessionId: string | undefined): PartidaGuardada | null {
  if (!sessionId) return null;
  try {
    const txt = localStorage.getItem(claveDePartida(sessionId));
    if (!txt) return null;
    const p = validarPartida(JSON.parse(txt));
    if (!p || sesionVencida(p.expiresAt)) { borrarPartida(sessionId); return null; }
    return p;
  } catch {
    borrarPartida(sessionId);
    return null;
  }
}

export function guardarPartida(sessionId: string, p: PartidaGuardada): void {
  try { localStorage.setItem(claveDePartida(sessionId), JSON.stringify(p)); } catch { /* lleno o bloqueado: se sigue jugando sin guardar */ }
}

/** Borra los guardados de OTRAS sesiones que ya vencieron (o están rotos), para no acumular basura. */
export function purgarPartidasVencidas(): void {
  try {
    const claves: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIJO_PARTIDA)) claves.push(k);
    }
    for (const k of claves) {
      try {
        const p = validarPartida(JSON.parse(localStorage.getItem(k) || "null"));
        if (!p || sesionVencida(p.expiresAt)) localStorage.removeItem(k);
      } catch { try { localStorage.removeItem(k); } catch { /* nada */ } }
    }
  } catch { /* nada */ }
}
