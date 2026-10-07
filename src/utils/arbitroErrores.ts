// Errores de las llamadas del árbitro que dependen de Gemini.
//
// El servidor responde `unavailable` en dos casos distintos:
//  - Gemini no está disponible (saldo, cuota, modelo, red…): se muestra `aiUnavailable`.
//  - Gemini respondió algo que no se pudo usar (no es JSON): el servidor lo marca con
//    details.motivo = "respuesta_no_clara" y el juego muestra `errorNoClearAnswer`.
// En ambos casos se muestra un texto propio según el código, nunca el mensaje del servidor.

export function esRespuestaNoClara(err: any): boolean {
  return err?.code === "functions/unavailable" && err?.details?.motivo === "respuesta_no_clara";
}

export function esIaNoDisponible(err: any): boolean {
  return err?.code === "functions/unavailable" && !esRespuestaNoClara(err);
}
