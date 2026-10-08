// Paleta única del Árbitro de Aprendizaje.
// Todos los colores de texto/botones con texto blanco salen de acá, ya con
// contraste >= 4,5:1 sobre blanco (WCAG 1.4.3). No escribir estos hex a mano
// en las páginas: importar PALETA.

export const PALETA = {
  /** Texto secundario, placeholders, botones deshabilitados (antes #94a3b8). 4,76:1 sobre blanco. */
  gris: "#64748b",
  /** Gris oscuro para texto chico sobre fondos con tinte (el gris de arriba da 4,4:1 ahí). 7,6:1. */
  grisOscuro: "#475569",
  /** Verde para texto y botones con texto blanco (antes #16a34a y #22c55e). 5,02:1. */
  verde: "#15803d",
  /** Ámbar para texto y avisos (antes #d97706). 5,02:1. */
  ambar: "#b45309",
  /** Naranja para texto y botones con texto blanco (antes #f97316). 5,18:1. */
  naranja: "#c2410c",
  /** Naranja más oscuro, para el segundo punto de un degradé con texto blanco. */
  naranjaOscuro: "#9a3412",
  /** Rojo (se mantiene). 4,83:1. */
  rojo: "#dc2626",
  /** Texto principal oscuro: también el de los nombres de equipo. */
  texto: "#1e293b",
} as const;

// ── Colores de equipo ───────────────────────────────────────────────────────
// Todos tienen >= 4,5:1 sobre blanco; el nombre del equipo igualmente se
// muestra en texto oscuro con un punto del color (ver TeamName en la página
// del juego), así que el color solo identifica, no transmite texto.
export const EQUIPO_COLORES = [
  { id: "red", hex: "#dc2626" },
  { id: "blue", hex: "#2563eb" },
  { id: "green", hex: "#15803d" },
  { id: "amber", hex: "#b45309" },
  { id: "violet", hex: "#7c3aed" },
  { id: "pink", hex: "#be185d" },
  { id: "teal", hex: "#0f766e" },
  { id: "orange", hex: "#c2410c" },
] as const;

export type EquipoColorId = (typeof EQUIPO_COLORES)[number]["id"];

export const EQUIPO_COLOR_1 = EQUIPO_COLORES[0].hex; // rojo
export const EQUIPO_COLOR_2 = EQUIPO_COLORES[1].hex; // azul

// ── Colores por área ────────────────────────────────────────────────────────
// Indexados por la clave corta del área (exactas, sociales, lenguajes, arte).
// `primary` se usa como color de TEXTO y de botones con texto blanco, por eso es
// una variante más oscura del color de marca (>= 4,5:1 sobre blanco y sobre
// `light`). Los degradés de encabezado llevan texto blanco: sus dos extremos
// están oscurecidos para dar >= 4,5:1 en todo el recorrido (Exactas 4,79:1,
// Lenguajes 4,81:1, Arte 4,82:1, Sociales 5,02:1; ver tools/grad_calc.mjs).
import type { AreaKey } from "./arbitroAreas";

export interface AreaColors {
  gradient: string;
  light: string;
  border: string;
  primary: string;
}

export const AREA_COLORS: Record<AreaKey, AreaColors> = {
  exactas: {
    gradient: "linear-gradient(135deg, #0a79ab 0%, #0b8076 100%)",
    light: "#f0f9ff",
    border: "#bae6fd",
    primary: "#0369a1",
  },
  sociales: {
    gradient: `linear-gradient(135deg, ${PALETA.naranja} 0%, ${PALETA.ambar} 100%)`,
    light: "#fff7ed",
    border: "#fed7aa",
    primary: PALETA.naranja,
  },
  lenguajes: {
    gradient: "linear-gradient(135deg, #8155e4 0%, #c63c81 100%)",
    light: "#faf5ff",
    border: "#e9d5ff",
    primary: "#7c3aed",
  },
  arte: {
    gradient: `linear-gradient(135deg, #d13650 0%, ${PALETA.naranja} 100%)`,
    light: "#fff1f2",
    border: "#fecdd3",
    primary: "#be123c",
  },
};

export const DEFAULT_AREA_COLORS: AreaColors = {
  gradient: "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)",
  light: "#f0f7ff",
  border: "#bfdbfe",
  primary: "#3730a3",
};
