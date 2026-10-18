// Registro de rondas del Árbitro (juego oral) y corrección del docente.
// Módulo puro (sin Firestore): valida lo que manda el cliente, arma el documento de la ronda, aplica una
// corrección de reparto y calcula los totales. Lo usan registrarRonda / listarRondasSesion / corregirRonda
// (index.ts) y se prueba con scripts/verificar-rondas.cjs.
import { HttpsError } from "firebase-functions/v2/https";
import { repartirPunto, type Grado, type Reparto, type TieneRazon } from "./arbitroReparto";

export const CALIFICACIONES_RONDA = ["completa", "incompleta", "no", "pasada", "fuera_de_tema"] as const;
export type CalificacionRonda = typeof CALIFICACIONES_RONDA[number];

// Las 6 opciones de reparto que el docente puede elegir al corregir (mismas que usa el árbitro).
export const OPCIONES_REPARTO: ReadonlyArray<{ tieneRazon: TieneRazon; grado: Grado }> = [
  { tieneRazon: "pregunta", grado: "total" },
  { tieneRazon: "pregunta", grado: "parcial" },
  { tieneRazon: "ambos", grado: "parcial" },
  { tieneRazon: "responde", grado: "parcial" },
  { tieneRazon: "responde", grado: "total" },
  { tieneRazon: "ninguno", grado: "parcial" },
];

export interface RepartoDetallado extends Reparto { tieneRazon: TieneRazon; grado: Grado }

export const ID_RE = /^[A-Za-z0-9_-]{8,40}$/;
const ID_CONSULTA_RE = /^[A-Za-z0-9]{10,40}$/;

const texto = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

// Como `texto`, pero conserva los saltos de línea (la respuesta escrita puede venir en varias líneas:
// listas, pasos, tablas armadas a mano). Solo colapsa los espacios/tabs DENTRO de cada línea y el
// exceso de líneas en blanco seguidas, y recorta los bordes.
// Exportada: la reusa guardarNotaPartidaArbitro (index.ts) para normalizar la nota general del docente por
// partida (Etapa 3), con el mismo criterio que la respuesta escrita.
export const textoMultilinea = (v: unknown, max: number): string =>
  typeof v === "string"
    ? v
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((linea) => linea.replace(/[^\S\n]+/g, " ").trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, max)
    : "";

// Largo máximo de la respuesta escrita de un equipo (modo de respuesta «escrita», o lo que se tipeó al
// disputar en modo oral). Sin disputa y en modo oral queda en "": la respuesta sigue siendo oral.
const MAX_RESPUESTA_RONDA = 1500;

export interface EntradaRonda {
  partidaId: string;
  ronda: number;
  equipoPregunta: string;
  equipoResponde: string;
  pregunta: string;
  respuesta: string;
  calificacion: CalificacionRonda;
  consultaId: string | null;
  tiempoSegundos: number | null;
}

/** Valida lo que manda el cliente. Solo se aceptan nombres de equipo: ningún dato personal de los alumnos. */
export function validarEntradaRonda(data: any): EntradaRonda {
  const mal = (m: string) => new HttpsError("invalid-argument", m);
  if (!data || typeof data !== "object") throw mal("Faltan los datos de la ronda.");
  if (typeof data.partidaId !== "string" || !ID_RE.test(data.partidaId)) throw mal("partidaId inválido.");
  const ronda = data.ronda;
  if (!Number.isInteger(ronda) || ronda < 1 || ronda > 500) throw mal("Número de ronda inválido.");
  const equipoPregunta = texto(data.equipoPregunta, 60);
  const equipoResponde = texto(data.equipoResponde, 60);
  if (!equipoPregunta || !equipoResponde) throw mal("Faltan los nombres de los equipos.");
  const pregunta = texto(data.pregunta, 600);
  if (!pregunta) throw mal("Falta la pregunta.");
  // Respuesta escrita del equipo (modo «escrita», o lo que se tipeó al disputar en modo oral). Opcional:
  // las sesiones en modo oral sin disputa no mandan nada y queda "".
  const respuesta = textoMultilinea(data.respuesta, MAX_RESPUESTA_RONDA);
  if (!CALIFICACIONES_RONDA.includes(data.calificacion)) throw mal("Calificación inválida.");
  let consultaId: string | null = null;
  if (data.consultaId !== undefined && data.consultaId !== null && data.consultaId !== "") {
    if (typeof data.consultaId !== "string" || !ID_CONSULTA_RE.test(data.consultaId)) throw mal("consultaId inválido.");
    consultaId = data.consultaId;
  }
  const t = data.tiempoSegundos;
  const tiempoSegundos = typeof t === "number" && Number.isFinite(t) && t >= 0 && t <= 36000 ? Math.round(t) : null;
  return { partidaId: data.partidaId, ronda, equipoPregunta, equipoResponde, pregunta, respuesta, calificacion: data.calificacion, consultaId, tiempoSegundos };
}

/** Id determinístico: reintentar el registro de la misma ronda de la misma partida no duplica nada. */
export const idDeRonda = (partidaId: string, ronda: number) => `${partidaId}_${String(ronda).padStart(3, "0")}`;

/** Puntos de una ronda SIN disputa: la calificación confirmada por el equipo que preguntó. Los recibe el que respondió. */
export function repartoSinDisputa(calificacion: CalificacionRonda): Reparto {
  const r = calificacion === "completa" ? 1 : calificacion === "incompleta" ? 0.5 : 0;
  return { puntosPregunta: 0, puntosResponde: r };
}

/**
 * Arma el documento de la ronda. Si hubo disputa, el veredicto y el reparto salen de la CONSULTA guardada por el servidor
 * (no de lo que diga el cliente): `consulta` es el documento sesiones_arbitro/{id}/consultas/{consultaId}.
 */
export function construirRonda(entrada: EntradaRonda, consulta: Record<string, any> | null, ahoraISO: string): Record<string, any> {
  const base: Record<string, any> = {
    partidaId: entrada.partidaId,
    ronda: entrada.ronda,
    equipoPregunta: entrada.equipoPregunta,
    equipoResponde: entrada.equipoResponde,
    pregunta: entrada.pregunta,
    respuesta: entrada.respuesta,
    calificacion: entrada.calificacion,
    tiempoSegundos: entrada.tiempoSegundos,
    estado: entrada.calificacion === "pasada" ? "pasada" : entrada.calificacion === "fuera_de_tema" ? "fuera_de_tema" : "jugada",
    creadoEn: ahoraISO,
    disputa: null,
    correccion: null,
  };
  if (entrada.consultaId) {
    if (!consulta) throw new HttpsError("invalid-argument", "La consulta al árbitro de esta ronda no existe.");
    const fueraDeTema = consulta.resultado === "fuera_de_tema";
    const original = fueraDeTema
      ? { tieneRazon: "ninguno" as TieneRazon, grado: "parcial" as Grado, puntosPregunta: 0, puntosResponde: 0 }
      : detalleDeConsulta(consulta);
    if (!original) throw new HttpsError("invalid-argument", "La consulta no tiene un reparto válido (¿no era una ronda del juego oral?).");
    base.fueAlArbitro = true;
    base.reparto = { puntosPregunta: original.puntosPregunta, puntosResponde: original.puntosResponde, tieneRazon: original.tieneRazon, grado: original.grado };
    base.disputa = {
      consultaId: entrada.consultaId,
      planteo: texto(consulta.desacuerdo, 1500),
      posicionPregunta: texto(consulta.posicionA, 1200),
      // posicionB es, en modo escrito, la respuesta ya confirmada (sin re-tipear): misma regla que `respuesta`,
      // conserva los saltos de línea.
      posicionResponde: textoMultilinea(consulta.posicionB, 1200),
      resultado: String(consulta.resultado ?? ""),
      veredicto: texto(consulta.veredicto, 600),
      explicacion: texto(consulta.explicacion, 1200),
      paraSeguirPensando: texto(consulta.paraSeguirPensando, 600),
      repartoOriginal: original,
    };
  } else {
    base.fueAlArbitro = false;
    const r = entrada.calificacion === "pasada" || entrada.calificacion === "fuera_de_tema" ? { puntosPregunta: 0, puntosResponde: 0 } : repartoSinDisputa(entrada.calificacion);
    base.reparto = { ...r, tieneRazon: null, grado: null };
  }
  return base;
}

/** Reparto original del árbitro guardado en la consulta (tieneRazon + grado + puntos), o null si no es válido. */
export function detalleDeConsulta(consulta: Record<string, any>): RepartoDetallado | null {
  const r = repartirPunto(consulta.tieneRazon, consulta.grado);
  if (!r) return null;
  const tieneRazon = String(consulta.tieneRazon).trim().toLowerCase() as TieneRazon;
  const g = consulta.grado === undefined || consulta.grado === null || consulta.grado === "" ? "parcial" : String(consulta.grado).trim().toLowerCase();
  return { tieneRazon, grado: (tieneRazon === "ambos" || tieneRazon === "ninguno" ? "parcial" : g) as Grado, ...r };
}

export type ResultadoCorreccion = { cambio: "corregida" | "restaurada" | "sin_cambios"; patch: Record<string, any> };

/**
 * Cambia el reparto de una ronda con veredicto a una de las 6 opciones. Guarda el reparto original del árbitro, el nuevo y la
 * fecha. Si la opción elegida coincide con la del árbitro, la ronda vuelve a su estado original (se quita la marca de corregida).
 */
export function aplicarCorreccion(ronda: Record<string, any>, tieneRazon: unknown, grado: unknown, docenteUid: string, ahoraISO: string): ResultadoCorreccion {
  if (!ronda?.disputa?.repartoOriginal) {
    throw new HttpsError("failed-precondition", "Solo se pueden corregir rondas que fueron al árbitro.");
  }
  const nuevo = repartirPunto(tieneRazon, grado);
  const t = String(tieneRazon ?? "").trim().toLowerCase() as TieneRazon;
  const opcion = OPCIONES_REPARTO.find((o) => o.tieneRazon === t && (o.grado === String(grado ?? "").trim().toLowerCase() || t === "ambos" || t === "ninguno"));
  if (!nuevo || !opcion) throw new HttpsError("invalid-argument", "El reparto elegido no es una de las 6 opciones.");
  const original: RepartoDetallado = ronda.disputa.repartoOriginal;
  const repartoNuevo: RepartoDetallado = { tieneRazon: opcion.tieneRazon, grado: opcion.grado, ...nuevo };
  const actual: RepartoDetallado = ronda.reparto;
  const igual = (a: RepartoDetallado, b: RepartoDetallado) => a.tieneRazon === b.tieneRazon && a.grado === b.grado;
  if (igual(repartoNuevo, original)) {
    if (!ronda.correccion) return { cambio: "sin_cambios", patch: {} };
    return { cambio: "restaurada", patch: { reparto: { ...original }, correccion: null } };
  }
  if (actual && igual(repartoNuevo, actual) && ronda.correccion) return { cambio: "sin_cambios", patch: {} };
  return {
    cambio: "corregida",
    patch: { reparto: { ...repartoNuevo }, correccion: { repartoOriginal: { ...original }, repartoNuevo: { ...repartoNuevo }, fecha: ahoraISO, docenteUid } },
  };
}

// ── Totales ──────────────────────────────────────────────────────────────────

export interface TotalEquipo { nombre: string; puntosAlumnos: number; puntosFinales: number }
export interface TotalPartida { partidaId: string; equipos: TotalEquipo[]; rondasCorregidas: number; creadoEn: string }

/**
 * Totales por partida. «puntosAlumnos» es el marcador que vieron los alumnos; «puntosFinales» lo recalcula con las correcciones del
 * docente. Si ya se envió el informe de la partida (con partidaId), el marcador de los alumnos es el que figura ahí y las correcciones
 * se suman como diferencia; si no, se arma a partir de los repartos originales de las rondas.
 */
export function calcularTotales(rondas: Array<Record<string, any>>, informes: Array<Record<string, any>>): TotalPartida[] {
  const porPartida = new Map<string, Array<Record<string, any>>>();
  for (const r of rondas) {
    if (!r?.partidaId) continue;
    if (!porPartida.has(r.partidaId)) porPartida.set(r.partidaId, []);
    porPartida.get(r.partidaId)!.push(r);
  }
  const informePorPartida = new Map<string, Record<string, any>>();
  for (const i of informes) if (i?.partidaId) informePorPartida.set(i.partidaId, i);

  const out: TotalPartida[] = [];
  for (const [partidaId, rs] of porPartida) {
    const alumnos = new Map<string, number>();
    const finales = new Map<string, number>();
    const sumar = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
    for (const r of rs) {
      const orig = r.correccion?.repartoOriginal ?? r.reparto;
      sumar(alumnos, r.equipoPregunta, orig.puntosPregunta); sumar(alumnos, r.equipoResponde, orig.puntosResponde);
      sumar(finales, r.equipoPregunta, r.reparto.puntosPregunta); sumar(finales, r.equipoResponde, r.reparto.puntosResponde);
    }
    const inf = informePorPartida.get(partidaId);
    const equipos: TotalEquipo[] = [];
    if (inf && Array.isArray(inf.equipos)) {
      for (const e of inf.equipos) {
        const base = typeof e.puntos === "number" ? e.puntos : 0;
        const delta = (finales.get(e.nombre) ?? 0) - (alumnos.get(e.nombre) ?? 0);
        equipos.push({ nombre: e.nombre, puntosAlumnos: base, puntosFinales: base + delta });
      }
    } else {
      for (const nombre of new Set([...alumnos.keys(), ...finales.keys()])) equipos.push({ nombre, puntosAlumnos: alumnos.get(nombre) ?? 0, puntosFinales: finales.get(nombre) ?? 0 });
    }
    // Fecha de la partida = la del primer round registrado (no la fecha en la que se imprime el informe).
    const creadoEn = rs.reduce((min, r) => (typeof r.creadoEn === "string" && (!min || r.creadoEn < min) ? r.creadoEn : min), "" as string);
    out.push({ partidaId, equipos, rondasCorregidas: rs.filter((r) => !!r.correccion).length, creadoEn });
  }
  return out;
}
