// Compara las claves de src/i18n/es.ts y src/i18n/en.ts (todas las secciones: arbitro, setup, dashboard, s13_*, el resto)
// e informa las que faltan en cualquiera de las dos. También avisa si una clave es texto en un idioma y objeto en el otro,
// y si los {marcadores} de un texto no son los mismos en español y en inglés. Falla (exit 1) si hay diferencias.
// Uso (desde functions/):  node scripts/verificar-claves-es-en.cjs
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
const esObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const marcadores = (s) => (typeof s === "string" ? [...new Set(s.match(/\{\w+\}/g) || [])].sort().join(",") : "");
const faltanEnEn = [], faltanEnEs = [], tipos = [], marc = [], largos = [];
function comparar(a, b, ruta) {
  for (const k of Object.keys(a)) {
    const q = ruta ? ruta + "." + k : k;
    if (!(k in b)) { faltanEnEn.push(q); continue; }
    if (esObj(a[k]) !== esObj(b[k]) || Array.isArray(a[k]) !== Array.isArray(b[k])) { tipos.push(q); continue; }
    if (esObj(a[k])) comparar(a[k], b[k], q);
    else if (Array.isArray(a[k])) { if (a[k].length !== b[k].length) largos.push(`${q} (es: ${a[k].length}, en: ${b[k].length})`); }
    else if (marcadores(a[k]) !== marcadores(b[k])) marc.push(`${q}  es:[${marcadores(a[k])}] en:[${marcadores(b[k])}]`);
  }
  for (const k of Object.keys(b)) if (!(k in a)) faltanEnEs.push(ruta ? ruta + "." + k : k);
}
comparar(es, en, "");
const seccion = (q) => (/^s13_/.test(q) ? "s13_*" : q.includes(".") ? q.split(".")[0] : "(raíz)");
const resumen = (lista) => { const g = {}; for (const q of lista) (g[seccion(q)] = g[seccion(q)] || []).push(q); return g; };
const mostrar = (titulo, lista) => { if (!lista.length) return; console.log(`\n${titulo} (${lista.length}):`); const g = resumen(lista); for (const [s, l] of Object.entries(g)) console.log(`  [${s}] ${l.length}: ${l.slice(0, 40).join(", ")}${l.length > 40 ? ", …" : ""}`); };
const cuenta = (o) => Object.values(o).reduce((n, v) => n + (esObj(v) ? cuenta(v) : 1), 0);
console.log(`es.ts: ${cuenta(es)} textos · en.ts: ${cuenta(en)} textos`);
mostrar("Faltan en en.ts (están en es.ts)", faltanEnEn); mostrar("Faltan en es.ts (están en en.ts)", faltanEnEs);
mostrar("Texto en un idioma y objeto/lista en el otro", tipos); mostrar("Listas de distinto largo", largos);
mostrar("{Marcadores} distintos entre es y en", marc);
// Portugués: solo la sección `dashboard` (la portada) está traducida a las tres lenguas; pt.ts no tiene sección `arbitro`.
// Toda clave de es.dashboard tiene que existir en pt.dashboard, del mismo tipo y con los mismos {marcadores}.
const pt = cargar("pt.ts", "pt");
const faltanEnPt = [], tiposPt = [], marcPt = [];
(function compararPt(a, b, ruta) {
  for (const k of Object.keys(a)) {
    const q = ruta + "." + k;
    if (!b || !(k in b)) { faltanEnPt.push(q); continue; }
    if (esObj(a[k]) !== esObj(b[k]) || Array.isArray(a[k]) !== Array.isArray(b[k])) { tiposPt.push(q); continue; }
    if (esObj(a[k])) compararPt(a[k], b[k], q);
    else if (!Array.isArray(a[k]) && marcadores(a[k]) !== marcadores(b[k])) marcPt.push(q);
  }
})(es.dashboard, pt.dashboard, "dashboard");
mostrar("Faltan en pt.ts (están en es.ts, sección dashboard)", faltanEnPt); mostrar("Tipo distinto en pt.ts (dashboard)", tiposPt); mostrar("{Marcadores} distintos en pt.ts (dashboard)", marcPt);
const totalPt = faltanEnPt.length + tiposPt.length + marcPt.length;
if (totalPt) { console.error(`\nFALLÓ: ${totalPt} diferencias entre es.ts y pt.ts en la sección dashboard.`); process.exit(1); }
const total = faltanEnEn.length + faltanEnEs.length + tipos.length + largos.length + marc.length;
if (total) { console.error(`\nFALLÓ: ${total} diferencias entre es.ts y en.ts.`); process.exit(1); }
console.log("OK: es.ts y en.ts tienen exactamente las mismas claves (y los mismos {marcadores}); pt.ts tiene todas las de dashboard.");
