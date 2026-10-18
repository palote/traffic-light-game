// Preguntas de metacognición del Árbitro de Aprendizaje. Por defecto salen del diccionario del idioma de la sesión (4 preguntas);
// el docente puede personalizarlas al crear la sesión (de 1 a 6, guardadas tal cual las escribe). Ausentes o vacías = las 4 por defecto.
// Las respuestas se guardan con claves q1..qN (N = cantidad de preguntas). Funciones puras.
import type { TranslationKeys } from "../i18n";

type Tx = TranslationKeys["arbitro"];

export const MIN_PREGUNTAS_META = 1;
export const MAX_PREGUNTAS_META = 6;
export const MAX_LARGO_PREGUNTA = 300;

const llenarTema = (texto: string, tema: string) => texto.replace(/\{tema\}/g, tema);

/** Lista válida de preguntas personalizadas (sin vacías, hasta 6, largo acotado). [] si no hay ninguna. */
export function listaPreguntasMeta(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((x): x is string => typeof x === "string").map((s) => s.trim().slice(0, MAX_LARGO_PREGUNTA)).filter(Boolean).slice(0, MAX_PREGUNTAS_META);
}

/** Las 4 por defecto, con el marcador {tema} sin reemplazar. "jg" = las del juego; "doc" = las del informe .txt (la 3 es más corta). */
export function preguntasPorDefecto(tx: Tx, origen: "jg" | "doc" = "jg"): string[] {
  return origen === "jg" ? [tx.jgMetaQ1, tx.jgMetaQ2, tx.jgMetaQ3, tx.jgMetaQ4] : [tx.docMetaQ1, tx.docMetaQ2, tx.docMetaQ3, tx.docMetaQ4];
}

/** Preguntas a mostrar: las personalizadas si hay, si no las 4 por defecto. {tema} se reemplaza por el tema. La primera es obligatoria. */
export function preguntasMeta(tx: Tx, personalizadas: unknown, tema: string, origen: "jg" | "doc" = "jg"): { label: string; required: boolean }[] {
  const custom = listaPreguntasMeta(personalizadas);
  const textos = custom.length > 0 ? custom : preguntasPorDefecto(tx, origen);
  return textos.map((texto, i) => ({ label: llenarTema(texto, tema), required: i === 0 }));
}

/** Claves de las respuestas: ["q1", ..., "qN"]. */
export const clavesRespuestas = (n: number): string[] => Array.from({ length: n }, (_, i) => `q${i + 1}`);

/** ¿Lo que escribió el docente es igual a las 4 por defecto? (entonces no hace falta guardar nada en la sesión) */
export function esIgualALasPorDefecto(tx: Tx, lista: string[]): boolean {
  const d = preguntasPorDefecto(tx, "jg");
  return lista.length === d.length && lista.every((x, i) => x.trim() === d[i]);
}
