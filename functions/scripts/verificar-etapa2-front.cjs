// Etapa 2 del inglés: textos de las pantallas de los árbitros.
//  · todas las claves del diccionario que usan las pantallas existen en es y en
//  · plurales, etiquetas de calificación, nombres de áreas/materias/niveles
//  · el inglés no tiene tildes ni «ñ» sueltas (texto sin traducir), salvo la lista de excepciones
// Uso (desde functions/):  node scripts/verificar-etapa2-front.cjs
const fs = require("fs"), path = require("path"), assert = require("assert");
const ts = require("typescript");
const SRC = path.join(__dirname, "../../src");
const cargar = (rel, nombre) => {
  const src = fs.readFileSync(path.join(SRC, rel), "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
  const m = { exports: {} }; new Function("module", "exports", "require", out)(m, m.exports, require); return nombre ? m.exports[nombre] : m.exports;
};
const es = cargar("i18n/es.ts", "es").arbitro, en = cargar("i18n/en.ts", "en").arbitro;
const etiquetas = cargar("utils/arbitroEtiquetas.ts");
const nombres = cargar("utils/arbitroNombres.ts");
const filas = [];
const t = (caso, esperado, obtenido) => { filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) }); assert.strictEqual(String(obtenido), String(esperado), caso); };

// 1) Claves usadas por las pantallas
const PAGINAS = ["ArbitroSesionPage", "ArbitroJuegoPage", "ArbitroConfigPage", "ArbitroPanelPage", "ArbitroLandingPage", "ArbitrosInfoPage"];
const usadas = new Set();
for (const p of PAGINAS) {
  const s = fs.readFileSync(path.join(SRC, "pages", p + ".tsx"), "utf8");
  for (const m of s.matchAll(/\b(?:ta|t)\.([A-Za-z_][A-Za-z0-9_]*)/g)) usadas.add(m[1]);
}
for (const area of ["exactas", "sociales", "lenguajes", "arte"]) for (const pre of ["landDesc_", "landEx_", "infMaterias_", "infWhat_"]) usadas.add(pre + area);
const faltan = [...usadas].filter((k) => !(k in es) || !(k in en));
// «t» también aparece como parámetro de funciones auxiliares y claves de Veredicto (t.val, t.label…): se ignoran las que no son del diccionario en ninguna de las dos
const noDic = new Set(["val", "label", "key", "id", "partidaId"]);
const faltanReales = faltan.filter((k) => !noDic.has(k) && !k.endsWith("_"));
assert.deepStrictEqual(faltanReales, [], "claves usadas por las pantallas que faltan en es o en en: " + faltanReales.join(", "));
filas.push({ caso: `claves usadas por las 6 pantallas (${usadas.size}) existen en es y en`, esperado: "ok", obtenido: "ok" });

// 2) Plurales y puntos
t("pointsText es 1", "1 punto", es.pointsText("1", 1)); t("pointsText es 0,5", "0,5 puntos", es.pointsText("0,5", 0.5)); t("pointsText es 0", "0 puntos", es.pointsText("0", 0)); t("pointsText es 2", "2 puntos", es.pointsText("2", 2));
t("pointsText en 1", "1 point", en.pointsText("1", 1)); t("pointsText en 0.5", "0.5 points", en.pointsText("0.5", 0.5)); t("pointsText en 0", "0 points", en.pointsText("0", 0)); t("pointsText en 2", "2 points", en.pointsText("2", 2));
t("jgSumInPlay es 1", "Suma: 1 punto de 1 en juego", es.jgSumInPlay("1", 1)); t("jgSumInPlay en 1", "Total: 1 point of 1 at stake", en.jgSumInPlay("1", 1)); t("jgSumInPlay en 0.75", "Total: 0.75 points of 1 at stake", en.jgSumInPlay("0.75", 0.75));
t("panGamesCount es 1", "🎮 1 partida", es.panGamesCount(1)); t("panGamesCount es 3", "🎮 3 partidas", es.panGamesCount(3)); t("panGamesCount en 1", "🎮 1 game", en.panGamesCount(1)); t("panGamesCount en 3", "🎮 3 games", en.panGamesCount(3));
t("panReflectionsTitle en 0", "Team reflections", en.panReflectionsTitle(0)); t("panReflectionsTitle en 1", "Team reflections (1 game)", en.panReflectionsTitle(1)); t("panReflectionsTitle en 2", "Team reflections (2 games)", en.panReflectionsTitle(2));
t("panReflectionsTitle es 1", "Reflexiones de los equipos (1 partida)", es.panReflectionsTitle(1)); t("panReflectionsTitle es 2", "Reflexiones de los equipos (2 partidas)", es.panReflectionsTitle(2));
t("cfgCharCount en", "1,200 / 8,000 chars", en.cfgCharCount("1,200")); t("cfgCharCount es", "1.200 / 8.000 car.", es.cfgCharCount("1.200"));
t("gradeLabel en", "Grade 3", en.gradeLabel("3°")); t("gradeLabel es", "3° año", es.gradeLabel("3°"));

// 3) Etiquetas de calificación: salen del diccionario a partir de la clave estable
for (const [dic, nom, esp] of [[es, "es", { completa: "Completa", incompleta: "Incompleta", no: "Incorrecta", incorrecta: "Incorrecta", pasada: "Pasada", fuera_de_tema: "Fuera de tema" }], [en, "en", { completa: "Complete", incompleta: "Incomplete", no: "Incorrect", incorrecta: "Incorrect", pasada: "Skipped", fuera_de_tema: "Off topic" }]])
  for (const [clave, texto] of Object.entries(esp)) t(`etiquetaCalificacion(${clave}) en ${nom}`, texto, etiquetas.etiquetaCalificacion(clave, dic));
t("etiquetaCalificacion(null)", "", etiquetas.etiquetaCalificacion(null, en)); t("puntosDeCalificacion", "1/0.5/0/0", ["completa", "incompleta", "no", "pasada"].map(etiquetas.puntosDeCalificacion).join("/"));

// 4) Áreas, materias y niveles: toda materia del código tiene nombre en inglés
const cfg = fs.readFileSync(path.join(SRC, "pages/ArbitroConfigPage.tsx"), "utf8");
const bloque = cfg.slice(cfg.indexOf("const AREAS: Record<string, AreaConfig>"), cfg.indexOf("const AREA_BY_KEY"));
const nombresArea = [...bloque.matchAll(/^  "([^"]+)": \{/gm)].map((m) => m[1]);
const nombresMateria = [...bloque.matchAll(/^      "([^"]+)": \{ emoji/gm)].map((m) => m[1]);
assert.strictEqual(nombresArea.length, 4); assert.ok(nombresMateria.length >= 30, "materias leídas: " + nombresMateria.length);
for (const a of nombresArea) assert.ok(en.areaNames[a] && en.areaNames[a] !== a && es.areaNames[a] === a, "área sin traducir: " + a);
for (const m of nombresMateria) assert.ok(en.materiaNames[m] && es.materiaNames[m] === m, "materia sin traducir: " + m);
for (const l of ["Plástica", "Lengua"]) assert.ok(en.materiaNames[l], "materia de la landing sin traducir: " + l);
t("nivel visible en", "Secondary", nombres.nombreVisible(en.levelNames, "Secundaria")); t("nivel visible es", "Secundaria", nombres.nombreVisible(es.levelNames, "Secundaria"));
t("nombreVisible con clave desconocida", "Otra", nombres.nombreVisible(en.materiaNames, "Otra")); t("nombreVisible(undefined)", "", nombres.nombreVisible(en.materiaNames, undefined));
filas.push({ caso: `${nombresArea.length} áreas y ${nombresMateria.length} materias con nombre en inglés`, esperado: "ok", obtenido: "ok" });

// 5) El inglés no debe tener texto sin traducir (tildes, «ñ», ¿ ¡)
const EXCEPCIONES = new Set(["cfgLangEs", "areaNames", "materiaNames", "levelNames"]); // autónimo «Español»; los nombres son claves en español
const sospechosas = [];
const recorrer = (o, ruta) => { for (const [k, v] of Object.entries(o)) { const q = ruta ? ruta + "." + k : k; if (!ruta && EXCEPCIONES.has(k)) continue; if (v && typeof v === "object") recorrer(v, q); else if (typeof v === "function") { if (/[áéíóúñ¿¡]/i.test(v.toString().replace(/\/\/.*$/gm, "").replace(/\bn\b/g, ""))) sospechosas.push(q + "()"); } else if (typeof v === "string" && /[áéíóúñÁÉÍÓÚÑ¿¡]/.test(v)) sospechosas.push(q); } };
recorrer(en, "");
assert.deepStrictEqual(sospechosas, [], "textos en inglés con caracteres del español: " + sospechosas.join(", "));
filas.push({ caso: "en.arbitro sin tildes, «ñ» ni signos ¿ ¡", esperado: "ok", obtenido: "ok" });

// 6) Las pantallas ya no tienen la etiqueta cruda en pantalla ni el '{ta.' perdido
for (const p of PAGINAS) { const s = fs.readFileSync(path.join(SRC, "pages", p + ".tsx"), "utf8"); assert.ok(!/ultimoRegistro\.calificacion\}<\/strong>/.test(s), p + ": muestra la clave interna de la calificación"); }
filas.push({ caso: "ninguna pantalla muestra la clave interna de la calificación", esperado: "ok", obtenido: "ok" });

console.table(filas); console.log(`OK: ${filas.length} comprobaciones del front de la etapa 2.`);
