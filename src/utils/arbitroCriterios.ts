// Criterios de calificación de una sesión del Árbitro de Aprendizaje. Opcionales: hasta 3 líneas de texto
// libre que completan "Una respuesta es completa si…" — no es una rúbrica por niveles, valen para TODAS las
// preguntas de la sesión (no por pregunta), se escriben en el idioma de la sesión (no se traducen) y quedan
// fijos al crear la sesión. Sin criterios, todo funciona exactamente igual que antes de esta función. Calco
// de arbitroMetaPreguntas.ts, pero sin "por defecto": acá vacío es vacío, no hay ninguno genérico al que caer.
export const MAX_CRITERIOS = 3;
export const MAX_LARGO_CRITERIO = 150;

/** Lista válida de criterios (sin vacíos, hasta 3, largo acotado). [] si no hay ninguno. */
export function listaCriterios(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((x): x is string => typeof x === "string").map((s) => s.trim().slice(0, MAX_LARGO_CRITERIO)).filter(Boolean).slice(0, MAX_CRITERIOS);
}
