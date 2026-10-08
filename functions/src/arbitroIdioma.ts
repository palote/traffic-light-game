// Idioma de una sesión del árbitro.
// Solo hay dos valores: 'es' y 'en'. Una sesión creada antes de que existiera el
// campo (o con cualquier otro valor) cuenta como 'es'.
export type IdiomaSesion = "es" | "en";

export function normalizarIdiomaSesion(valor: unknown): IdiomaSesion {
  return valor === "en" ? "en" : "es";
}

// ── ¿La salida del modelo está en el idioma de la sesión? ─────────────────────────────────────────────────────────────────────────
// Heurística simple (cuenta palabras funcionales de cada idioma): no bloquea nada, solo sirve para registrar una advertencia
// cuando el modelo contestó en otro idioma. Con textos muy cortos o con pocas palabras funcionales devuelve null (no se sabe).
const PALABRAS_ES = new Set(("el la los las de del que y en un una por con para es se no lo como más pero su sus al este esta son fue está " +
  "también porque cuando entre sobre muy ya hay si les le qué cómo cuál por qué").split(/\s+/));
const PALABRAS_EN = new Set(("the of and to in is that it for as with are was on be by this from or an have not but they which their can " +
  "what how why does do did has had will would should could more also because when between about very there").split(/\s+/));

export function detectarIdioma(texto: unknown): IdiomaSesion | null {
  if (typeof texto !== "string") return null;
  const palabras = texto.toLowerCase().match(/[a-záéíóúñü]+/g) || [];
  if (palabras.length < 6) return null;
  let es = 0, en = 0;
  for (const p of palabras) { if (PALABRAS_ES.has(p)) es++; if (PALABRAS_EN.has(p)) en++; }
  es += (texto.match(/[áéíóúñ¿¡]/gi) || []).length > 0 ? 1 : 0; // una tilde o «ñ» inclina hacia el español
  if (es + en < 3) return null;
  if (es >= 2 * en) return "es";
  if (en >= 2 * es) return "en";
  return null;
}

/**
 * Registra una advertencia (console.warn, JSON) si algún texto de la salida del modelo no parece estar en el idioma esperado.
 * NO bloquea ni cambia la respuesta. Devuelve los nombres de los campos que no coinciden (útil para pruebas).
 */
export function advertirIdiomaSalida(funcion: string, esperado: IdiomaSesion, textos: Record<string, unknown>, extra?: Record<string, unknown>): string[] {
  const distintos: string[] = [];
  for (const [campo, valor] of Object.entries(textos)) {
    const d = detectarIdioma(valor);
    if (d && d !== esperado) distintos.push(campo);
  }
  if (distintos.length) console.warn(JSON.stringify({ evento: "salida_modelo_idioma_distinto", funcion, esperado, campos: distintos, ...extra }));
  return distintos;
}
