// Verifica que TODA área, materia y nivel del catálogo del árbitro tenga nombre en español e inglés, y que las pantallas
// los muestren a través del diccionario (nombreVisible) y no como valor crudo.
// Catálogos que lee: AREAS (ArbitroConfigPage), AREAS de ArbitroLandingPage, AREA_LABELS_ES (utils/arbitroAreas),
// MATERIA_EN / NIVEL_EN / AREA_LABEL_EN (functions/src/arbitroPromptEn.ts) y los diccionarios areaNames/materiaNames/levelNames de es.ts y en.ts.
// Uso (desde functions/):  node scripts/verificar-catalogo-nombres.cjs
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const SRC = path.join(__dirname, "../../src");
const FN = path.join(__dirname, "../src");
const leer = (base, f) => fs.readFileSync(path.join(base, f), "utf8");
let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.error("  ✘ " + msg); } };

function cargar(f, nombre) {
  const out = ts.transpileModule(leer(SRC, f), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
  const m = { exports: {} }; new Function("module", "exports", "require", out)(m, m.exports, require); return m.exports[nombre];
}
const buscar = (o, k) => { for (const x of Object.keys(o)) { if (x === k) return o[x]; if (o[x] && typeof o[x] === "object") { const r = buscar(o[x], k); if (r !== undefined) return r; } } };
const es = cargar("i18n/es.ts", "es"), en = cargar("i18n/en.ts", "en");
const dic = { es: { areas: buscar(es, "areaNames"), materias: buscar(es, "materiaNames"), niveles: buscar(es, "levelNames") }, en: { areas: buscar(en, "areaNames"), materias: buscar(en, "materiaNames"), niveles: buscar(en, "levelNames") } };
for (const i of ["es", "en"]) for (const k of ["areas", "materias", "niveles"]) ok(dic[i][k] && Object.keys(dic[i][k]).length > 0, `${i}: falta el diccionario de ${k}`);

// ── Lectura de los catálogos con el AST (no con regex sobre el texto) ──
const ast = (base, f) => ts.createSourceFile(f, leer(base, f), ts.ScriptTarget.ES2020, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const clave = (n) => (ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : null);
function objeto(sf, nombre) { let r = null; (function v(n) { if (ts.isVariableDeclaration(n) && n.name.getText() === nombre && n.initializer) { let i = n.initializer; while (ts.isAsExpression(i) || ts.isParenthesizedExpression(i)) i = i.expression; r = i; } ts.forEachChild(n, v); })(sf); return r; }
const prop = (o, k) => o.properties.find((p) => ts.isPropertyAssignment(p) && clave(p.name) === k);

// Config: AREAS → { área: { materias: { materia: {niveles} } } }
const cfg = ast(SRC, "pages/ArbitroConfigPage.tsx"), AREAS_CFG = objeto(cfg, "AREAS");
const areasCfg = [], materiasCfg = new Set(), nivelesCfg = new Set();
for (const a of AREAS_CFG.properties) {
  areasCfg.push(clave(a.name));
  const m = prop(a.initializer, "materias");
  for (const mm of m.initializer.properties) {
    materiasCfg.add(clave(mm.name));
    const nv = prop(mm.initializer, "niveles");
    if (nv) nv.initializer.elements.forEach((e) => nivelesCfg.add(e.text));
  }
}
ok(areasCfg.length === 4 && materiasCfg.size >= 25, `Config: se esperaban 4 áreas y 25+ materias, hay ${areasCfg.length} y ${materiasCfg.size}`);

// Landing: AREAS → { key: { nombre, materias: [] } }
const lan = ast(SRC, "pages/ArbitroLandingPage.tsx"), AREAS_LAN = objeto(lan, "AREAS") || objeto(lan, "AREA_CONFIG");
const areasLan = [], materiasLan = new Set();
if (AREAS_LAN) for (const a of AREAS_LAN.properties) {
  const n = prop(a.initializer, "nombre"); if (n) areasLan.push(n.initializer.text);
  const m = prop(a.initializer, "materias"); if (m) m.initializer.elements.forEach((e) => materiasLan.add(e.text));
}
ok(areasLan.length === 4 && materiasLan.size >= 20, `Landing: no se pudieron leer las 4 áreas / las materias (leí ${areasLan.length} / ${materiasLan.size})`);

// utils/arbitroAreas: AREA_LABELS_ES
const lab = objeto(ast(SRC, "utils/arbitroAreas.ts"), "AREA_LABELS_ES");
const areasLab = lab.properties.map((p) => p.initializer.text);
const areaPorKey = Object.fromEntries(lab.properties.map((p) => [clave(p.name), p.initializer.text])); // exactas → «Ciencias Exactas y Naturales»
ok(areasLab.length === 4, "AREA_LABELS_ES debe tener 4 áreas");

// Servidor (prompts en inglés)
const srv = ast(FN, "arbitroPromptEn.ts");
const dicObj = (n) => { const o = objeto(srv, n); return o ? Object.fromEntries(o.properties.map((p) => [clave(p.name), p.initializer.text])) : null; };
const MATERIA_EN = dicObj("MATERIA_EN"), NIVEL_EN = dicObj("NIVEL_EN"), AREA_LABEL_EN = dicObj("AREA_LABEL_EN");
ok(MATERIA_EN && NIVEL_EN && AREA_LABEL_EN, "no se pudieron leer MATERIA_EN / NIVEL_EN / AREA_LABEL_EN del servidor");

// ── 1. Cada área / materia / nivel tiene versión en los dos idiomas ──
const todasAreas = new Set([...areasCfg, ...areasLan, ...areasLab]);
const todasMaterias = new Set([...materiasCfg, ...materiasLan]);
const todosNiveles = new Set([...nivelesCfg]);
const revisar = (tipo, nombres, k) => {
  for (const n of nombres) {
    ok(typeof dic.es[k][n] === "string" && dic.es[k][n].trim() !== "", `${tipo} «${n}»: falta en es.ts (${k})`);
    ok(typeof dic.en[k][n] === "string" && dic.en[k][n].trim() !== "", `${tipo} «${n}»: falta en en.ts (${k})`);
    if (dic.en[k][n]) ok(dic.en[k][n] !== n, `${tipo} «${n}»: la versión en inglés es igual al español`);
    if (dic.es[k][n]) ok(dic.es[k][n] === n, `${tipo} «${n}»: la versión en español debe ser el mismo nombre (es la clave estable)`);
  }
};
revisar("área", todasAreas, "areas"); revisar("materia", todasMaterias, "materias"); revisar("nivel", todosNiveles, "niveles");
// Los diccionarios no tienen claves de más (nombres que ningún catálogo usa) ni de menos entre idiomas
for (const k of ["areas", "materias", "niveles"]) ok(JSON.stringify(Object.keys(dic.es[k]).sort()) === JSON.stringify(Object.keys(dic.en[k]).sort()), `es y en tienen distintas claves en ${k}`);
// Nombres que ya no están en ningún catálogo pero siguen en los diccionarios a propósito: las sesiones viejas los guardaron.
const LEGADO = { materias: ["Lengua"] };
for (const [tipo, k, set] of [["área", "areas", todasAreas], ["materia", "materias", todasMaterias], ["nivel", "niveles", todosNiveles]])
  for (const n of Object.keys(dic.es[k])) ok(set.has(n) || (LEGADO[k] || []).includes(n), `${tipo} «${n}» está en el diccionario pero ningún catálogo la usa (¿sobra, o falta en el catálogo?)`);

// ── 2. El servidor (prompts en inglés) usa los mismos nombres que la pantalla ──
if (MATERIA_EN) for (const n of todasMaterias) ok(MATERIA_EN[n] === dic.en.materias[n], `materia «${n}»: servidor «${MATERIA_EN[n]}» ≠ pantalla «${dic.en.materias[n]}»`);
if (NIVEL_EN) for (const n of todosNiveles) ok(NIVEL_EN[n] === dic.en.niveles[n], `nivel «${n}»: servidor «${NIVEL_EN[n]}» ≠ pantalla «${dic.en.niveles[n]}»`);
if (AREA_LABEL_EN) for (const [key, n] of Object.entries(areaPorKey)) ok(AREA_LABEL_EN[key] === dic.en.areas[n], `área «${n}» (${key}): servidor «${AREA_LABEL_EN[key]}» ≠ pantalla «${dic.en.areas[n]}»`);
if (MATERIA_EN) for (const n of LEGADO.materias) ok(MATERIA_EN[n] === dic.en.materias[n], `materia heredada «${n}»: servidor ≠ pantalla`);

// ── 3. Las pantallas no muestran el valor crudo ──
// Una materia/nivel/área que viene de la sesión (o del estado) solo se muestra con nombreVisible(...). Prohibido: {materia}, {sesion.materia},
// {sesion?.nivel}, etc. como texto, y ${...materia} dentro de plantillas de texto visibles (nombres de archivo).
const PANTALLAS = ["pages/ArbitroConfigPage.tsx", "pages/ArbitroLandingPage.tsx", "pages/ArbitrosInfoPage.tsx", "pages/ArbitroPanelPage.tsx", "pages/ArbitroSesionPage.tsx", "pages/ArbitroJuegoPage.tsx"];
const CRUDO = /\{\s*(?:[\w$]+\??\.)*(materia|nivel|area|materiaV|nivelV)\s*\}/; // {materia}, {sesion?.materia}…  (materiaV/nivelV ya son nombres visibles: se excluyen abajo)
const PLANTILLA = /\$\{\s*(?:[\w$]+\??\.)*(materia|nivel|area)\s*\}/;
for (const f of PANTALLAS) {
  leer(SRC, f).split("\n").forEach((linea, i) => {
    const l = linea.replace(/\/\/.*$/, "");
    const m = l.match(CRUDO);
    if (m && !/^(materiaV|nivelV)$/.test(m[1]) && !/\b(materia|nivel|area)=\{/.test(l) && !/const\s*\{|useParams/.test(l)) ok(false, `${f}:${i + 1}: muestra «${m[1]}» sin nombreVisible → ${linea.trim().slice(0, 90)}`);
    const p = l.match(PLANTILLA);
    if (p && !/nombreVisible|materiaDe|nivelDe/.test(l) && !/key=|`\/|query|fetch|url/i.test(l)) ok(false, `${f}:${i + 1}: plantilla con «${p[1]}» sin nombreVisible → ${linea.trim().slice(0, 90)}`);
  });
}
// Header de la pantalla del alumno traduce la materia que recibe
const juego = leer(SRC, "pages/ArbitroJuegoPage.tsx");
ok(/function Header\([^)]*\)[\s\S]{0,700}nombreVisible\(t\.materiaNames, materia\)/.test(juego), "ArbitroJuegoPage: Header debe mostrar nombreVisible(t.materiaNames, materia)");

// ── Una sola fuente de áreas en todo src/ ──
// Ninguna pantalla (portada incluida) puede tener una lista propia de áreas con nombres en español ni con
// `key: "exactas"` y similares: tienen que salir de utils/arbitroAreas (AREAS_ORDEN, AREA_LABELS_ES, AREA_EMOJI) y mostrarse con
// nombreVisible(areaNames, …). Excepciones documentadas: las dos pantallas cuyo catálogo ya se valida arriba (Config y Landing) y el
// propio utils/arbitroAreas. Los diccionarios (src/i18n) y las claves de color (AREA_COLORS) no cuentan.
const NOMBRES_AREA = new Set(areasLab);
const CLAVES_AREA = new Set(Object.keys(areaPorKey));
const PERMITIDOS = new Set(["pages/ArbitroConfigPage.tsx", "pages/ArbitroLandingPage.tsx", "utils/arbitroAreas.ts"]);
const listar = (d) => fs.readdirSync(path.join(SRC, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? (d + "/" + e.name === "i18n" ? [] : listar((d ? d + "/" : "") + e.name)) : (/\.tsx?$/.test(e.name) ? [(d ? d + "/" : "") + e.name] : []));
const todos = listar("").filter((f) => !f.startsWith("i18n/"));
let propias = 0;
for (const f of todos) {
  if (PERMITIDOS.has(f)) continue;
  const sf = ts.createSourceFile(f, leer(SRC, f), ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const v = (n) => {
    if (ts.isStringLiteralLike(n) && NOMBRES_AREA.has(n.text)) { propias++; ok(false, `${f}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}: nombre de área en español escrito a mano («${n.text}»): usar AREA_LABELS_ES de utils/arbitroAreas`); }
    if (ts.isPropertyAssignment(n) && /^(key|areaKey|areaId)$/.test(n.name.getText().replace(/["']/g, "")) && ts.isStringLiteralLike(n.initializer) && CLAVES_AREA.has(n.initializer.text)) { propias++; ok(false, `${f}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}: lista propia de áreas (key: "${n.initializer.text}"): usar AREAS_ORDEN de utils/arbitroAreas`); }
    ts.forEachChild(n, v);
  };
  v(sf);
}
ok(todos.length > 50, "el recorrido de src/ debería ver todos los archivos");
// La portada usa la fuente común y los diccionarios
const portada = leer(SRC, "pages/DashboardPage.tsx");
ok(/AREAS_ORDEN\.map/.test(portada) && /nombreVisible\(ta\.areaNames, AREA_LABELS_ES\[key\]\)/.test(portada), "DashboardPage: las tarjetas de área deben salir de AREAS_ORDEN + AREA_LABELS_ES + nombreVisible(ta.areaNames, …)");
// Descripciones de las tarjetas de la portada: las cuatro áreas, en es/en/pt
for (const [idioma, nombre] of [["es", "es"], ["en", "en"], ["pt", "pt"]]) {
  const dic = cargar("i18n/" + nombre + ".ts", nombre);
  const d = dic.dashboard && dic.dashboard.arbAreaDescs;
  for (const k of CLAVES_AREA) ok(d && typeof d[k] === "string" && d[k].trim().length > 3, `dashboard.arbAreaDescs.${k} falta en ${idioma}.ts`);
}

console.log(fallos ? `\nFALLÓ: ${fallos} de ${total} comprobaciones` : `OK: ${total} comprobaciones (${todasAreas.size} áreas, ${todasMaterias.size} materias y ${todosNiveles.size} niveles con nombre en español e inglés; servidor y pantalla coinciden; las pantallas los muestran con nombreVisible).`);
process.exit(fallos ? 1 : 0);
