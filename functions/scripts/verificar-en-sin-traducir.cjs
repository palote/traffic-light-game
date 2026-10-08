// Revisa en.ts: toma los valores de en.ts IDÉNTICOS a los de es.ts (los que informa verificar-claves-es-en.cjs) y los separa en
//   (a) legítimos: números, símbolos, emojis, marcas, nombres propios, siglas, URLs, palabras que se escriben igual en inglés;
//   (b) probables sin traducir: contienen tildes, «ñ», «¿», «¡» o palabras comunes del español.
// Falla (exit 1) si queda algún (b) que no esté en EXCEPCIONES (lista explícita y comentada, más abajo).
// Uso (desde functions/):  node scripts/verificar-en-sin-traducir.cjs        (agregá --todo para listar también los (a))
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const DIR = path.join(__dirname, "../../src/i18n");
function cargar(f, nombre) {
  const src = fs.readFileSync(path.join(DIR, f), "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
  const m = { exports: {} }; new Function("module", "exports", "require", out)(m, m.exports, require); return m.exports[nombre];
}
const es = cargar("es.ts", "es"), en = cargar("en.ts", "en");

// Excepciones explícitas: clave → motivo. Solo textos que DEBEN quedar iguales aunque parezcan español.
const EXCEPCIONES = {
  "arbitro.cfgLangEs": "nombre del idioma en su propia lengua: el selector muestra «Español» / «English» en los dos idiomas",
};

const TILDES = /[áéíóúñüÁÉÍÓÚÑÜ¿¡]/;
const PALABRAS_ES = new Set(("de del la las el los lo un una unos unas y o u e en con sin por para que qué como cómo cuál cuáles cuándo dónde quién " +
  "se su sus tu tus mi mis nos al es son está están ser fue hay no sí si más menos muy ya pero también todo todos todas cada otro otra otros otras " +
  "este esta estos estas ese esa eso aquí ahí ver volver guardar cancelar aceptar siguiente anterior inicio empezar comenzar elegir usar crear " +
  "equipo equipos pregunta preguntas respuesta respuestas ronda rondas puntos sesión alumnos docente cerrar abrir enviar copiar descargar " +
  "nuevo nueva nuevos nuevas tema materia nivel año idioma texto título informe jugar partida").split(/\s+/));
// Palabras que existen en los dos idiomas con la misma forma y no cuentan como señal de español.
const COMPARTIDAS = new Set(["no", "a", "e", "o", "u", "ser", "I", "me", "he", "es", "con", "mi", "si", "sin", "ver", "este", "tema", "total", "color", "normal", "error", "final", "digital", "social", "general", "local", "manual", "tablet", "online", "email", "web", "chat", "link", "admin", "PDF", "ok", "OK"]);

const SIN_LETRAS = /^[^\p{L}]*$/u; // solo números, símbolos, emojis, espacios, {marcadores} no cuentan como letras: se quitan antes
const quitarMarcadores = (s) => s.replace(/\{\w+\}/g, " ");
const esURL = (s) => /^(https?:\/\/|www\.|[\w.-]+\.(com|org|net|edu|ar|io|app)\b)/i.test(s.trim()) || /@[\w.-]+\.\w+/.test(s);
const palabras = (s) => (s.match(/[\p{L}][\p{L}'’]*/gu) || []);
const esSigla = (w) => w.length >= 2 && w === w.toUpperCase() && /^[A-ZÁÉÍÓÚÑ0-9]+$/.test(w);

function clasificar(valor) {
  const s = quitarMarcadores(String(valor));
  if (SIN_LETRAS.test(s)) return { tipo: "a", motivo: "números/símbolos/emojis" };
  if (esURL(s)) return { tipo: "a", motivo: "URL/correo" };
  const ws = palabras(s);
  if (TILDES.test(s)) return { tipo: "b", motivo: "tilde/ñ/¿/¡" };
  const señales = ws.filter((w) => PALABRAS_ES.has(w.toLowerCase()) && !COMPARTIDAS.has(w.toLowerCase()));
  if (señales.length) return { tipo: "b", motivo: "palabras comunes: " + [...new Set(señales)].slice(0, 4).join(", ") };
  if (ws.every((w) => esSigla(w))) return { tipo: "a", motivo: "sigla" };
  if (ws.length <= 3 && ws.every((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w))) return { tipo: "a", motivo: "marca/nombre propio" };
  return { tipo: "a", motivo: "sin señales de español" };
}

const a = [], b = [];
function recorrer(x, y, ruta) {
  for (const k of Object.keys(x)) {
    if (!(k in y)) continue;
    const q = ruta ? ruta + "." + k : k, vx = x[k], vy = y[k];
    if (vx && typeof vx === "object" && !Array.isArray(vx)) { recorrer(vx, vy, q); continue; }
    if (Array.isArray(vx)) { vx.forEach((it, i) => { if (typeof it === "string" && it === vy[i]) (clasificar(it).tipo === "b" ? b : a).push({ q: `${q}[${i}]`, v: it, ...clasificar(it) }); }); continue; }
    if (typeof vx === "function") { // las funciones se comparan con lo que devuelven para entradas de prueba
      let r1, r2; try { r1 = vx(1, 2, 3); r2 = vy(1, 2, 3); } catch { continue; }
      if (typeof r1 === "string" && r1 === r2) (clasificar(r1).tipo === "b" ? b : a).push({ q: q + "()", v: r1, ...clasificar(r1) });
      continue;
    }
    if (typeof vx === "string" && vx === vy) { const c = clasificar(vx); (c.tipo === "b" ? b : a).push({ q, v: vx, ...c }); }
  }
}
recorrer(es, en, "");
const corto = (s) => (s.length > 70 ? s.slice(0, 67) + "…" : s);
console.log(`Valores de en.ts idénticos a es.ts: ${a.length + b.length}  ·  (a) legítimos: ${a.length}  ·  (b) probables sin traducir: ${b.length}`);
if (process.argv.includes("--todo")) for (const x of a) console.log(`  (a) ${x.q}: «${corto(x.v)}»  [${x.motivo}]`);
const pendientes = b.filter((x) => !(x.q in EXCEPCIONES));
const usadas = b.filter((x) => x.q in EXCEPCIONES).length;
if (usadas) console.log(`(b) permitidos por EXCEPCIONES: ${usadas}`);
const sobran = Object.keys(EXCEPCIONES).filter((k) => !b.some((x) => x.q === k));
if (sobran.length) console.log(`Aviso: EXCEPCIONES que ya no hacen falta: ${sobran.join(", ")}`);
if (pendientes.length) {
  console.error(`\nFALLÓ: ${pendientes.length} textos de en.ts siguen iguales al español y parecen sin traducir:`);
  for (const x of pendientes) console.error(`  ${x.q}: «${corto(x.v)}»  [${x.motivo}]`);
  process.exit(1);
}
console.log("OK: no quedan textos de en.ts sin traducir fuera de la lista de excepciones.");
