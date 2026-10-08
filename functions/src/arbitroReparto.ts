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

// ── Reparto deducido de la calificación del árbitro ───────────────────────────
// En juego oral el árbitro decide SOLO "calificacionRecomendada" (completa / incompleta / no = incorrecta).
// "tieneRazon" y "grado" los calcula el CÓDIGO comparando esa calificación con la que puso el equipo que
// preguntó. Si el modelo manda "tieneRazon" o "grado", se ignoran.

export type Calificacion = "completa" | "incompleta" | "no";

const NIVEL_CALIFICACION: Record<Calificacion, number> = { no: 0, incompleta: 1, completa: 2 };

/** "completa" | "incompleta" | "no" (también acepta "incorrecta"); null si es otra cosa. */
export function normalizarCalificacion(v: unknown): Calificacion | null {
  const s = norm(v);
  if (s === "completa" || s === "incompleta" || s === "no") return s;
  if (s === "incorrecta") return "no";
  return null;
}

/**
 * Calificación que puso el equipo que preguntó. El front la manda dentro del texto de la Posición A:
 * «Rojos (calificó como incompleta): …». Si se conoce el nombre del equipo, se lee justo después de él
 * (un nombre que imite el formato no cambia nada); si no, se toma la primera aparición del formato.
 */
export function calificacionDePosicionA(posicionA: unknown, equipoPregunta?: unknown): Calificacion | null {
  if (typeof posicionA !== "string") return null;
  const marca = /\(\s*calific[óo] como\s+(incompleta|incorrecta|completa|no)\s*\)/i;
  const nombre = typeof equipoPregunta === "string" ? equipoPregunta.trim() : "";
  const texto = posicionA.trimStart();
  if (nombre && texto.toLowerCase().startsWith(nombre.toLowerCase())) {
    const m = new RegExp("^" + marca.source, "i").exec(texto.slice(nombre.length).trimStart());
    if (m) return normalizarCalificacion(m[1]);
  }
  const m = marca.exec(posicionA);
  return m ? normalizarCalificacion(m[1]) : null;
}

/**
 * La Posición A SIN la etiqueta «(calificó como …)». Es lo que ve el modelo: la calificación de quien preguntó la lee
 * solo el código (calificacionDePosicionA) y no entra al prompt, para que no sesgue la calificación del árbitro.
 * «Rojos (calificó como incompleta): faltó X» → «Rojos: faltó X». Se saca solo la etiqueta de ese lugar (justo después
 * del nombre del equipo, o la primera aparición si no se conoce); si no hay etiqueta, el texto queda igual.
 */
export function quitarEtiquetaCalificacion(posicionA: unknown, equipoPregunta?: unknown): string {
  if (typeof posicionA !== "string") return "";
  const marca = /\s*\(\s*calific[óo] como\s+(?:incompleta|incorrecta|completa|no)\s*\)/i;
  const nombre = typeof equipoPregunta === "string" ? equipoPregunta.trim() : "";
  const texto = posicionA.trimStart();
  if (nombre && texto.toLowerCase().startsWith(nombre.toLowerCase())) {
    const resto = texto.slice(nombre.length);
    const m = new RegExp("^" + marca.source, "i").exec(resto);
    if (m) return texto.slice(0, nombre.length) + resto.slice(m[0].length);
  }
  return posicionA.replace(marca, "");
}

/**
 * Frase con la que el CÓDIGO abre el veredicto, según el reparto (el modelo ya no dice quién tiene razón):
 *   razón total a un equipo        → «Tiene razón el equipo X.»
 *   razón parcial o «ambos»        → «Los dos equipos tienen parte de razón.»
 *   «ninguno» (fuera de tema)      → "" (el veredicto de «fuera de tema» es el fijo del prompt)
 */
export function fraseVeredicto(tieneRazon: TieneRazon, grado: Grado, nombrePregunta?: string, nombreResponde?: string, idioma: "es" | "en" = "es"): string {
  const en = idioma === "en";
  const P = (nombrePregunta || "").trim() || (en ? "that asked" : "que preguntó"), R = (nombreResponde || "").trim() || (en ? "that answered" : "que respondió");
  if (tieneRazon === "ambos" || ((tieneRazon === "pregunta" || tieneRazon === "responde") && grado === "parcial")) return en ? "Both teams are partly right." : "Los dos equipos tienen parte de razón.";
  if (tieneRazon === "pregunta") return en ? `Team ${P} is right.` : `Tiene razón el equipo ${P}.`;
  if (tieneRazon === "responde") return en ? `Team ${R} is right.` : `Tiene razón el equipo ${R}.`;
  return "";
}

/**
 * Tabla: calificación del árbitro contra la del equipo que preguntó.
 *   igual e incorrecta (no)            → pregunta, total
 *   igual e incompleta                 → pregunta, parcial
 *   igual y completa                   → responde, total   (la respuesta es completa)
 *   mejor en un nivel (no → incompleta) → responde, parcial
 *   completa cuando se había puesto menos → responde, total
 *   peor que la del que preguntó       → pregunta, total
 * Devuelve null si alguna de las dos calificaciones no es válida.
 */
export function razonPorCalificacion(califPregunta: unknown, califArbitro: unknown): { tieneRazon: TieneRazon; grado: Grado } | null {
  const p = normalizarCalificacion(califPregunta);
  const a = normalizarCalificacion(califArbitro);
  if (!p || !a) return null;
  const dif = NIVEL_CALIFICACION[a] - NIVEL_CALIFICACION[p];
  if (dif < 0) return { tieneRazon: "pregunta", grado: "total" };
  if (dif === 0) return a === "completa" ? { tieneRazon: "responde", grado: "total" } : { tieneRazon: "pregunta", grado: a === "incompleta" ? "parcial" : "total" };
  return { tieneRazon: "responde", grado: a === "completa" ? "total" : "parcial" };
}

const nombreDe = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Frase del código + evaluación del modelo (una sola línea). */
export function armarVeredicto(frase: string, evaluacion: unknown): string {
  const ev = typeof evaluacion === "string" ? evaluacion.replace(/\s+/g, " ").trim() : "";
  return [frase, ev].filter(Boolean).join(" ");
}

export interface ResolucionOral {
  fueraDeTema: boolean;
  calificacionPregunta: Calificacion | null;
  calificacionArbitro: Calificacion | null;
  tieneRazon: TieneRazon;
  grado: Grado;
  reparto: Reparto;
  /** Veredicto armado por el código: la frase («Tiene razón el equipo X») + la evaluación que escribió el modelo. */
  veredicto: string | null;
  resultado: "A" | "B" | "ambas_correctas" | "ambas_incorrectas" | "fuera_de_tema";
}

export type MotivoResolucionOral = "sin_calificacion_pregunta" | "calificacion_arbitro_invalida";

/**
 * Lo que decide el CÓDIGO en una ronda de juego oral, a partir de la salida del modelo ya parseada:
 *  - "fuera_de_tema": reparto 0/0 (sin disputa que repartir); el veredicto es el que escribió el modelo (fijo en el prompt);
 *  - si no: tabla de arriba + repartirPunto. "tieneRazon", "grado" y los puntajes que mande el modelo se ignoran.
 *    El veredicto lo arma el código: fraseVeredicto + la «evaluacion» del modelo (el modelo no dice quién tiene razón).
 * Devuelve { ok: false, motivo } si falta la calificación de quien preguntó o la del árbitro no es válida
 * (el llamador sigue el camino de «Reintentar»).
 *
 * La calificación de quien preguntó llega como dato aparte (`calificacionPregunta`: completa | incompleta |
 * incorrecta). Solo si falta o no es válida se lee del texto de la Posición A («(calificó como …)»), como hacían las
 * versiones anteriores del juego: así no se rompen las partidas que siguen abiertas con el front viejo.
 */
export function resolverRondaOral(salidaModelo: any, posicionA: unknown, equipoPregunta?: unknown, equipoResponde?: unknown, calificacionPregunta?: unknown, idioma: "es" | "en" = "es"):
  | { ok: true; valor: ResolucionOral }
  | { ok: false; motivo: MotivoResolucionOral } {
  const califPregunta = normalizarCalificacion(calificacionPregunta) ?? calificacionDePosicionA(posicionA, equipoPregunta);
  if (salidaModelo && salidaModelo.resultado === "fuera_de_tema") {
    return { ok: true, valor: { fueraDeTema: true, calificacionPregunta: califPregunta, calificacionArbitro: normalizarCalificacion(salidaModelo.calificacionRecomendada),
      tieneRazon: "ninguno", grado: "parcial", reparto: { puntosPregunta: 0, puntosResponde: 0 },
      veredicto: typeof salidaModelo.veredicto === "string" && salidaModelo.veredicto.trim() ? salidaModelo.veredicto.trim() : null, resultado: "fuera_de_tema" } };
  }
  if (!califPregunta) return { ok: false, motivo: "sin_calificacion_pregunta" };
  const califArbitro = normalizarCalificacion(salidaModelo?.calificacionRecomendada);
  const razon = razonPorCalificacion(califPregunta, califArbitro);
  if (!razon || !califArbitro) return { ok: false, motivo: "calificacion_arbitro_invalida" };
  const reparto = repartirPunto(razon.tieneRazon, razon.grado); // la misma función de siempre
  if (!reparto) return { ok: false, motivo: "calificacion_arbitro_invalida" };
  return { ok: true, valor: { fueraDeTema: false, calificacionPregunta: califPregunta, calificacionArbitro: califArbitro,
    tieneRazon: razon.tieneRazon, grado: razon.grado, reparto, resultado: resultadoDesdeTieneRazon(razon.tieneRazon) ?? "A",
    veredicto: armarVeredicto(fraseVeredicto(razon.tieneRazon, razon.grado, nombreDe(equipoPregunta), nombreDe(equipoResponde), idioma), salidaModelo?.evaluacion) } };
}
