// Integrantes y modo de metacognición del Árbitro de Aprendizaje (lado servidor).
// Mismo criterio que src/utils/arbitroIntegrantes.ts: los nombres son un array (un elemento por alumno); el formato viejo era un
// único string. El servidor siempre guarda el array y recorta tamaños; no inventa ni lee nada más de los alumnos.

export const MAX_INTEGRANTES = 12;
export const MAX_NOMBRE = 40;
export const MAX_RESPUESTA = 4000;
export const CLAVES_RESPUESTA = ["q1", "q2", "q3", "q4", "q5", "q6"]; // hasta 6 preguntas de metacognición

export type ModoMetacognicion = "grupal" | "individual";

/** Cualquier valor distinto de "individual" cuenta como "grupal" (las sesiones viejas no tienen el campo). */
export function normalizarModoMetacognicion(valor: unknown): ModoMetacognicion {
  return valor === "individual" ? "individual" : "grupal";
}

// «Modo de respuesta» del juego oral: 'oral' (por defecto, como siempre) o 'escrita' (cada equipo escribe su
// respuesta y el informe las incluye todas, no solo las disputas). Mismo criterio que arriba.
export type ModoRespuesta = "oral" | "escrita";

/** Cualquier valor distinto de "escrita" cuenta como "oral" (las sesiones viejas no tienen el campo). */
export function normalizarModoRespuesta(valor: unknown): ModoRespuesta {
  return valor === "escrita" ? "escrita" : "oral";
}

// «Texto durante el juego»: sin el texto (por defecto — leen el texto base antes de jugar, pero no lo tienen
// disponible en pantalla ni impreso durante la ronda) o con el texto impreso (lo tienen a mano para citarlo
// mientras juegan). Solo tiene sentido si hay texto base cargado; sin texto base, se guarda igual como `false`.
export function normalizarVerTextoDuranteJuego(valor: unknown): boolean {
  return valor === true;
}

/**
 * Para el panel (encabezado del informe del docente y PDF del curso): a diferencia de
 * normalizarVerTextoDuranteJuego (siempre boolean, para guardar/jugar), acá hace falta distinguir una sesión
 * VIEJA que no tiene el campo (no mostrar nada) de una sesión nueva que eligió explícitamente "sin el texto"
 * (false — sí hay que decir "Jugado sin el texto", porque cambia cómo se leen los resultados).
 */
export function verTextoDuranteJuegoOIndefinido(valor: unknown): boolean | undefined {
  return typeof valor === "boolean" ? valor : undefined;
}

export function listaIntegrantes(valor: unknown): string[] {
  const crudos: unknown[] = Array.isArray(valor) ? valor : typeof valor === "string" ? valor.split(/[,;\n]+/) : [];
  return crudos
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim().slice(0, MAX_NOMBRE))
    .filter(Boolean)
    .slice(0, MAX_INTEGRANTES);
}

const texto = (x: unknown): string => (typeof x === "string" ? x.slice(0, MAX_RESPUESTA) : "");

/**
 * Normaliza un equipo del informe competitivo: `integrantes` siempre array y, si vino, `individuales` limpio
 * ([{ alumno, respuestas: {q1..q4} }], solo los que tienen nombre). El resto de los campos queda como llegó.
 */
export function sanearEquipoInforme(eq: any): Record<string, any> {
  const base: Record<string, any> = eq && typeof eq === "object" ? { ...eq } : {};
  base.integrantes = listaIntegrantes(base.integrantes);
  // Reflexión grupal: solo claves q1..q6 con texto (acotado).
  if (base.respuestas && typeof base.respuestas === "object") {
    base.respuestas = Object.fromEntries(CLAVES_RESPUESTA.filter((k) => typeof base.respuestas[k] === "string").map((k) => [k, texto(base.respuestas[k])]));
  }
  if (Array.isArray(base.individuales)) {
    base.individuales = base.individuales
      .slice(0, MAX_INTEGRANTES)
      .map((x: any) => ({
        alumno: typeof x?.alumno === "string" ? x.alumno.trim().slice(0, MAX_NOMBRE) : "",
        // q1..q4 siempre (formato de siempre); q5 y q6 solo si la sesión tiene más de 4 preguntas.
        respuestas: Object.fromEntries(CLAVES_RESPUESTA.filter((k, i) => i < 4 || typeof x?.respuestas?.[k] === "string").map((k) => [k, texto(x?.respuestas?.[k])])),
      }))
      .filter((x: { alumno: string }) => x.alumno);
  } else {
    delete base.individuales;
  }
  return base;
}
