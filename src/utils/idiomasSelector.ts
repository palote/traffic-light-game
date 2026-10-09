// Lógica pura del selector de idioma con lista limitada (el árbitro solo ofrece es/en).
export type IdiomaSel = 'es' | 'en' | 'pt';
export const TODOS_LOS_IDIOMAS: readonly IdiomaSel[] = ['es', 'en', 'pt'];

/** Lista efectiva: la pasada, o los tres si viene vacía o sin definir. */
export function idiomasPermitidos(idiomas?: readonly IdiomaSel[]): readonly IdiomaSel[] {
  return idiomas && idiomas.length > 0 ? idiomas : TODOS_LOS_IDIOMAS;
}

/** Idioma que muestra el selector: el guardado si está permitido; si no (p. ej. 'pt' en el árbitro), el primero de la lista. */
export function idiomaMostrado(guardado: IdiomaSel, idiomas?: readonly IdiomaSel[]): IdiomaSel {
  const p = idiomasPermitidos(idiomas);
  return p.includes(guardado) ? guardado : p[0];
}

/** Siguiente idioma al pulsar el botón compacto, siempre dentro de la lista. */
export function siguienteIdioma(guardado: IdiomaSel, idiomas?: readonly IdiomaSel[]): IdiomaSel {
  const p = idiomasPermitidos(idiomas);
  const actual = idiomaMostrado(guardado, idiomas);
  return p[(p.indexOf(actual) + 1) % p.length];
}
