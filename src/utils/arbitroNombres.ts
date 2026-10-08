// Nombres visibles de áreas, materias y niveles. Lo que se guarda y se manda al servidor
// sigue siendo el nombre en español (es la clave estable); el texto que se muestra sale del
// diccionario del idioma de la pantalla. Si no hay traducción, se muestra tal cual.
export function nombreVisible(mapa: Record<string, string> | undefined, clave: string | undefined | null): string {
  if (!clave) return "";
  return mapa?.[clave] ?? clave;
}
