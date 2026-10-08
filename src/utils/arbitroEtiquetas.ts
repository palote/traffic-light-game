// Etiquetas visibles de las calificaciones. El valor interno (`completa`, `incompleta`,
// `no`/`incorrecta`, `pasada`, `fuera_de_tema`) es la clave estable que se guarda y se
// manda al servidor; el texto sale del diccionario del idioma de la pantalla.
export interface TextosCalificacion {
  gradeCompleta: string;
  gradeIncompleta: string;
  gradeIncorrecta: string;
  passedLabel: string;
  offTopicLabel: string;
}

export function etiquetaCalificacion(clave: string | null | undefined, ta: TextosCalificacion): string {
  switch (clave) {
    case "completa": return ta.gradeCompleta;
    case "incompleta": return ta.gradeIncompleta;
    case "no":
    case "incorrecta": return ta.gradeIncorrecta;
    case "pasada": return ta.passedLabel;
    case "fuera_de_tema": return ta.offTopicLabel;
    default: return clave ?? "";
  }
}

// Puntos de cada calificación (para mostrar junto a la etiqueta).
export function puntosDeCalificacion(clave: string | null | undefined): number {
  return clave === "completa" ? 1 : clave === "incompleta" ? 0.5 : 0;
}
