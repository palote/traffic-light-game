// Calificación que puso el equipo que preguntó, tal como viaja al servidor.
// Es un dato aparte (campo `calificacionPregunta`), no parte del texto de la Posición A.
// En el juego la calificación interna es "completa" | "incompleta" | "no"; al servidor
// va "incorrecta" donde el juego dice "no".
export type CalificacionPregunta = "completa" | "incompleta" | "incorrecta";

export function calificacionPreguntaParaServidor(calificacion: string | null | undefined): CalificacionPregunta | null {
  if (calificacion === "completa" || calificacion === "incompleta") return calificacion;
  if (calificacion === "no" || calificacion === "incorrecta") return "incorrecta";
  return null; // "pasada", "fuera_de_tema", vacío…: no es una calificación de la pregunta
}
