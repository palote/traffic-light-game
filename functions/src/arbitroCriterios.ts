// Criterios de calificación personalizados de una sesión del Árbitro de Aprendizaje (lado servidor).
// Mismo criterio que src/utils/arbitroCriterios.ts: hasta 3 líneas de texto libre, tal cual las escribe el
// docente, que valen para TODAS las preguntas de la sesión (no por pregunta). Ausente o vacío = sin
// criterios: todo funciona exactamente igual que antes de esta función.
export const MAX_CRITERIOS = 3;
export const MAX_LARGO_CRITERIO = 150;

export function normalizarCriterios(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim().slice(0, MAX_LARGO_CRITERIO))
    .filter(Boolean)
    .slice(0, MAX_CRITERIOS);
}

/** Formatea la lista de criterios como para insertarla en el prompt del árbitro o el de la revisión (lista
 * numerada). "" si no hay criterios — en ese caso los dos prompts quedan idénticos byte a byte a los de
 * antes de esta función (ver bloqueCriteriosDocente en arbitroPrompt.ts / arbitroPromptEn.ts). */
export function formatearCriteriosParaPrompt(criterios: string[]): string {
  return criterios.map((c, i) => `${i + 1}. ${c}`).join("\n");
}
