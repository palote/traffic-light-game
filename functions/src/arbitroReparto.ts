// Reparto del punto de una ronda del juego oral. Lo calcula el CÓDIGO, no el modelo:
// el modelo solo dice quién tiene razón ("tieneRazon") y en qué grado ("grado").
// Los seis repartos posibles, en el orden pregunta/responde, son siempre los mismos.

export type TieneRazon = "pregunta" | "responde" | "ambos" | "ninguno";
export type Grado = "total" | "parcial";

export interface Reparto {
  puntosPregunta: number;
  puntosResponde: number;
}

const TIENE_RAZON: readonly TieneRazon[] = ["pregunta", "responde", "ambos", "ninguno"];
const GRADOS: readonly Grado[] = ["total", "parcial"];

const norm = (v: unknown): string => (typeof v === "string" ? v.trim().toLowerCase() : "");

/**
 * Traduce {tieneRazon, grado} al reparto (pregunta/responde):
 *   pregunta total → 1/0 · pregunta parcial → 0,75/0,25 · ambos → 0,5/0,5
 *   responde parcial → 0,25/0,75 · responde total → 0/1 · ninguno → 0/0
 * Devuelve null si algún valor está fuera de las opciones (el llamador sigue el camino de «Reintentar»).
 * Para "ambos" y "ninguno" el grado no cambia nada; si viene, igual tiene que ser válido.
 */
export function repartirPunto(tieneRazon: unknown, grado: unknown): Reparto | null {
  const razon = norm(tieneRazon) as TieneRazon;
  if (!TIENE_RAZON.includes(razon)) return null;
  const g = norm(grado) as Grado;
  const gradoPresente = grado !== undefined && grado !== null && grado !== "";
  if (gradoPresente && !GRADOS.includes(g)) return null;

  if (razon === "ambos") return { puntosPregunta: 0.5, puntosResponde: 0.5 };
  if (razon === "ninguno") return { puntosPregunta: 0, puntosResponde: 0 };
  if (!gradoPresente) return null; // para "pregunta" y "responde" el grado es obligatorio
  if (razon === "pregunta") return g === "total" ? { puntosPregunta: 1, puntosResponde: 0 } : { puntosPregunta: 0.75, puntosResponde: 0.25 };
  return g === "total" ? { puntosPregunta: 0, puntosResponde: 1 } : { puntosPregunta: 0.25, puntosResponde: 0.75 };
}

/** "resultado" coherente con tieneRazon (A = quien preguntó, B = quien respondió). */
export function resultadoDesdeTieneRazon(tieneRazon: unknown): "A" | "B" | "ambas_correctas" | "ambas_incorrectas" | null {
  switch (norm(tieneRazon)) {
    case "pregunta": return "A";
    case "responde": return "B";
    case "ambos": return "ambas_correctas";
    case "ninguno": return "ambas_incorrectas";
    default: return null;
  }
}
