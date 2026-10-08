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

// ── Errores del servidor con motivo ──────────────────────────────────────────
// Los errores del árbitro llevan en details.motivo una clave estable (por ejemplo
// "sesion_expirada"). El texto sale del diccionario (claves errorMotivo_<motivo> de la
// sección `arbitro`), así sigue el idioma de la pantalla. Si no hay motivo o el
// diccionario no lo tiene, se usa el respaldo: el mensaje en español del servidor.

export function motivoDeError(err: any): string | null {
  const m = err?.details?.motivo;
  return typeof m === "string" && m ? m : null;
}

export function esSesionExpirada(err: any): boolean {
  const m = motivoDeError(err);
  if (m) return m === "sesion_expirada";
  return /expirad/i.test(String(err?.message || "")); // respaldo: servidor viejo, sin motivo
}

export function textoErrorArbitro(err: any, ta: object, respaldo?: string): string {
  const m = motivoDeError(err);
  const texto = m ? (ta as Record<string, unknown>)[`errorMotivo_${m}`] : undefined;
  if (typeof texto === "string" && texto) return texto;
  return respaldo ?? String(err?.message || "");
}
