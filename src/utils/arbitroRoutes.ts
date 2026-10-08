// Rutas del Árbitro de Aprendizaje: /arbitro*, y las sesiones /sesion/*.
// En ellas el idioma NO sale del navegador: las pantallas del docente (config, panel,
// info) siguen en español, y las de los alumnos usan el idioma de la sesión
// (por defecto 'es'). El <html lang> y los textos de accesibilidad lo siguen.
export function esRutaArbitro(pathname: string): boolean {
  return pathname.startsWith("/arbitro") || pathname.startsWith("/sesion/");
}

// Pantallas de los alumnos: el link de la sesión y el juego. Solo en estas el idioma
// lo decide la sesión (campo `idioma` de getSesionArbitro).
export function esRutaAlumnoArbitro(pathname: string): boolean {
  return pathname.startsWith("/sesion/") || pathname.startsWith("/arbitro-juego/");
}
