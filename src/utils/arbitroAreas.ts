// Claves cortas de área del Árbitro. Es la gemela en el front de
// `normalizarAreaKey` de functions/src/index.ts: las dos tienen que aceptar los
// mismos nombres. Las sesiones viejas guardaron el nombre completo
// ("Ciencias Exactas y Naturales"); NO se migran en Firestore, se convierten al
// leer.

import { AREA_COLORS, DEFAULT_AREA_COLORS, type AreaColors } from "./arbitroPalette";

export type AreaKey = "exactas" | "sociales" | "lenguajes" | "arte";

// i18n-clave: etiquetas internas en español (las pantallas usan ta.areaNames)
export const AREA_LABELS_ES: Record<AreaKey, string> = {
  exactas: "Ciencias Exactas y Naturales",
  sociales: "Ciencias Sociales y Humanidades",
  lenguajes: "Comunicación y Lenguajes",
  arte: "Arte y Expresión",
};

/** Orden en que se muestran las áreas (portada, selectores). */
export const AREAS_ORDEN: readonly AreaKey[] = ["exactas", "sociales", "lenguajes", "arte"];

export const AREA_EMOJI: Record<AreaKey, string> = {
  exactas: "🔬",
  sociales: "🌍",
  lenguajes: "💬",
  arte: "🎨",
};

// i18n-clave: nombres con los que se reconoce el área (no se muestran)
const AREA_KEY_POR_NOMBRE: Record<string, AreaKey> = {
  exactas: "exactas",
  sociales: "sociales",
  lenguajes: "lenguajes",
  arte: "arte",
  // Nombres completos en español (sesiones viejas y config en español)
  "ciencias exactas y naturales": "exactas",
  "ciencias sociales y humanidades": "sociales",
  "comunicación y lenguajes": "lenguajes",
  "comunicacion y lenguajes": "lenguajes",
  "arte y expresión": "arte",
  "arte y expresion": "arte",
  // Nombres completos en inglés (config de Learning Referee)
  "exact and natural sciences": "exactas",
  "natural and exact sciences": "exactas",
  "social sciences and humanities": "sociales",
  "communication and languages": "lenguajes",
  "language and communication": "lenguajes",
  "arts and expression": "arte",
  "art and expression": "arte",
};

/** Convierte clave corta o nombre completo (español/inglés) en la clave corta. */
export function normalizarAreaKey(area: unknown): AreaKey | null {
  if (typeof area !== "string") return null;
  return AREA_KEY_POR_NOMBRE[area.trim().toLowerCase()] ?? null;
}

/** Etiqueta completa en español de un área (acepta clave o nombre viejo). */
export function etiquetaArea(area: unknown): string {
  const key = normalizarAreaKey(area);
  if (key) return AREA_LABELS_ES[key];
  return typeof area === "string" ? area : "";
}

/** Colores del área (acepta clave o nombre viejo); neutros si no se reconoce. */
export function coloresArea(area: unknown): AreaColors {
  const key = normalizarAreaKey(area);
  return key ? AREA_COLORS[key] : DEFAULT_AREA_COLORS;
}
