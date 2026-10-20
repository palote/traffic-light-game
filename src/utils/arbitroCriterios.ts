// Criterios de calificación de una sesión del Árbitro de Aprendizaje. Opcionales: hasta 3 líneas de texto
// libre que completan "Una respuesta es completa si…" — no es una rúbrica por niveles, valen para TODAS las
// preguntas de la sesión (no por pregunta), se escriben en el idioma de la sesión (no se traducen) y quedan
// fijos al crear la sesión. Sin criterios, todo funciona exactamente igual que antes de esta función.
//
// Ajuste posterior: en la configuración ya no se escriben a mano en 3 campos libres. Se eligen de una lista
// de sugeridos (CRITERIOS_SUGERIDOS, marcados con checkbox) más un campo "Agregar uno propio". Lo que termina
// guardándose en la sesión sigue siendo el mismo string[] de siempre — el servidor, los prompts y los
// informes no cambian ni se enteran de que un criterio vino de la lista o fue escrito por el docente.
import type { ModoRespuesta } from "./arbitroIntegrantes";
import type { IdiomaSesion } from "./idiomaSesion";

export const MAX_CRITERIOS = 3;
export const MAX_LARGO_CRITERIO = 150;

/** Lista válida de criterios (sin vacíos, hasta 3, largo acotado). [] si no hay ninguno. */
export function listaCriterios(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((x): x is string => typeof x === "string").map((s) => s.trim().slice(0, MAX_LARGO_CRITERIO)).filter(Boolean).slice(0, MAX_CRITERIOS);
}

export interface CriterioSugerido {
  es: string;
  en: string;
  /** Solo tiene sentido en modo escrito (la claridad de lo escrito no aplica a una respuesta oral). */
  soloEscrita?: boolean;
}

// Los 6 sugeridos. El texto se guarda en el idioma de la SESIÓN (ver criteriosDesdeSugeridos), no en el de
// la interfaz: la pantalla de configuración los muestra en el idioma de la interfaz para que el docente los
// entienda, pero lo que ve el alumno (juego, instrucciones, informes) queda en el idioma de la sesión.
export const CRITERIOS_SUGERIDOS: CriterioSugerido[] = [
  { es: "Responde todas las partes de la pregunta.", en: "Answers every part of the question." },
  { es: "Usa al menos un dato, ejemplo o cita del texto.", en: "Uses at least one fact, example or quote from the text." },
  { es: "Explica el porqué, no solo el qué.", en: "Explains why, not just what." },
  { es: "Usa el vocabulario de la materia con precisión.", en: "Uses subject vocabulary accurately." },
  { es: "Relaciona con otro concepto trabajado en clase.", en: "Connects to another concept from class." },
  { es: "Está escrita con claridad y en oraciones completas.", en: "Is written clearly, in complete sentences.", soloEscrita: true },
];

/**
 * Arma los criterios a guardar a partir de lo que marcó el docente: los sugeridos elegidos (en el idioma de
 * la SESIÓN, nunca el de la interfaz — por eso esta función no recibe el idioma de la interfaz) más el
 * propio, si escribió alguno. El sugerido "solo escrita" se descarta en modo oral aunque esté marcado (red
 * de seguridad; la pantalla ya lo desmarca sola al cambiar de modo). Pasa por listaCriterios, así que el
 * resultado nunca supera los 3 criterios ni los 150 caracteres cada uno, igual que antes de esta función.
 */
export function criteriosDesdeSugeridos(
  marcados: boolean[],
  criterioPropio: string,
  idiomaSesion: IdiomaSesion,
  modoRespuesta: ModoRespuesta,
): string[] {
  const idioma = idiomaSesion === "en" ? "en" : "es";
  const sugeridos = CRITERIOS_SUGERIDOS
    .filter((c, i) => marcados[i] && (!c.soloEscrita || modoRespuesta === "escrita"))
    .map((c) => c[idioma]);
  return listaCriterios([...sugeridos, criterioPropio]);
}
