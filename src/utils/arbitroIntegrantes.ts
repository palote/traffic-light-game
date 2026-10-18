// Integrantes de un equipo del Árbitro de Aprendizaje.
// Formato actual: un array de nombres (un elemento por alumno). Formato viejo: un único string ("Juan, María, Pedro").
// Todo lo que lee nombres pasa por acá, así las partidas guardadas y los informes ya creados siguen funcionando.
// Funciones puras, sin dependencias.

export const MAX_INTEGRANTES = 8;
export const MIN_CAMPOS = 2; // el armado de equipos arranca con 2 campos por equipo

export type ModoMetacognicion = "grupal" | "individual";

/** Cualquier valor distinto de "individual" cuenta como "grupal" (las sesiones viejas no traen el campo). */
export function normalizarModoMetacognicion(valor: unknown): ModoMetacognicion {
  return valor === "individual" ? "individual" : "grupal";
}

// «Modo de respuesta» del juego oral: 'oral' (por defecto, como siempre) o 'escrita' (cada equipo escribe su
// respuesta en cada ronda y el informe las incluye todas, no solo las disputas). Mismo criterio que arriba.
export type ModoRespuesta = "oral" | "escrita";

/** Cualquier valor distinto de "escrita" cuenta como "oral" (las sesiones viejas no traen el campo). */
export function normalizarModoRespuesta(valor: unknown): ModoRespuesta {
  return valor === "escrita" ? "escrita" : "oral";
}

/** Nombres no vacíos, sin espacios sobrantes. Acepta el array nuevo o el string viejo (se separa por comas, «;» o saltos de línea). */
export function listaIntegrantes(valor: unknown): string[] {
  const crudos: unknown[] = Array.isArray(valor) ? valor : typeof valor === "string" ? valor.split(/[,;\n]+/) : [];
  return crudos.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
}

/** Texto para mostrar: "Juan, María, Pedro". */
export function textoIntegrantes(valor: unknown): string {
  return listaIntegrantes(valor).join(", ");
}

/** Campos del formulario a partir de lo guardado (array, string viejo o nada). Nunca devuelve menos de 1 campo; vacío → 2 campos. */
export function camposDesdeGuardado(valor: unknown): string[] {
  const campos = Array.isArray(valor) ? valor.filter((x): x is string => typeof x === "string") : listaIntegrantes(valor);
  const recortados = campos.slice(0, MAX_INTEGRANTES);
  return recortados.length === 0 ? Array(MIN_CAMPOS).fill("") : recortados;
}

/** ¿Hay al menos un alumno con nombre? */
export const hayIntegrantes = (valor: unknown): boolean => listaIntegrantes(valor).length > 0;
