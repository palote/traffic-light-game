// Rutas del Árbitro de Aprendizaje: /arbitro*, y las sesiones /sesion/*.
// Son páginas en español sin importar el idioma del navegador, así que el
// <html lang> y los textos de accesibilidad se fijan en "es" en ellas.
export function esRutaArbitro(pathname: string): boolean {
  return pathname.startsWith("/arbitro") || pathname.startsWith("/sesion/");
}
