// Preguntas de metacognición personalizadas de una sesión del Árbitro de Aprendizaje (lado servidor).
// Mismo criterio que src/utils/arbitroMetaPreguntas.ts: lista de 1 a 6 textos tal cual los escribe el docente;
// ausente o vacía = se usan las 4 por defecto del diccionario (sesiones viejas). Son textos del docente, no de los alumnos.
export const MAX_PREGUNTAS_META = 6;
export const MAX_LARGO_PREGUNTA = 300;

export function normalizarPreguntasMeta(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim().slice(0, MAX_LARGO_PREGUNTA))
    .filter(Boolean)
    .slice(0, MAX_PREGUNTAS_META);
}
