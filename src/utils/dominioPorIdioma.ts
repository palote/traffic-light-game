// Dominio que se nombra en los documentos exportados, según el idioma del documento
// (es → eljuegodelsemaforo.com, en → thetrafficlightgame.com). El resto de los idiomas usa el español.
export function dominioPorIdioma(idioma: string | null | undefined): string {
  return idioma === "en" ? "thetrafficlightgame.com" : "eljuegodelsemaforo.com";
}

/** Pie de página de los documentos de los generadores (rúbricas, secuencias, correcciones). */
export function piePaginaGenerador(idioma: string | null | undefined): string {
  return idioma === "en"
    ? `Made with The Traffic Light Game · ${dominioPorIdioma(idioma)}`
    : `Generado con El Juego del Semáforo · ${dominioPorIdioma(idioma)}`;
}
