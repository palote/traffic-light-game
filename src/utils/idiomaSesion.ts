// Idioma de una sesión del árbitro ('es' | 'en'). Es el mismo criterio que usa el
// backend (functions/src/arbitroIdioma.ts): una sesión vieja, sin el campo, o con
// cualquier otro valor, cuenta como 'es'.
export type IdiomaSesion = "es" | "en";

export function normalizarIdiomaSesion(valor: unknown): IdiomaSesion {
  return valor === "en" ? "en" : "es";
}

// Idioma sugerido para una sesión nueva: el de la interfaz si es inglés; si no, español.
export function idiomaSesionPorDefecto(idiomaInterfaz: string): IdiomaSesion {
  return idiomaInterfaz === "en" ? "en" : "es";
}

// Configuración regional (fechas y números) según el idioma: 'es-AR' o 'en-US'.
export function localeDeIdioma(idioma: string | null | undefined): "es-AR" | "en-US" {
  return idioma === "en" ? "en-US" : "es-AR";
}
