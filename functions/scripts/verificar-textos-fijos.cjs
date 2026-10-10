// Busca textos en español escritos directamente en el código de las pantallas de los árbitros.
// Falla si encuentra alguno. Uso: node functions/scripts/verificar-textos-fijos.cjs [--lista]
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..", "..");
let ts; try { ts = require(path.join(root, "node_modules", "typescript")); } catch { ts = require(path.join(root, "functions", "node_modules", "typescript")); }
const ARCHIVOS = [
  "src/pages/ArbitroSesionPage.tsx","src/pages/ArbitroJuegoPage.tsx","src/pages/ArbitroConfigPage.tsx",
  "src/pages/ArbitroPanelPage.tsx","src/pages/ArbitroLandingPage.tsx","src/pages/ArbitrosInfoPage.tsx",
  "src/utils/arbitroAreas.ts","src/utils/arbitroPalette.ts","src/utils/arbitroPartida.ts","src/utils/arbitroErrores.ts",
  "src/components/PWAMiniBadge.tsx","src/utils/arbitroA11y.tsx","src/utils/arbitroDocumentos.ts",
  "src/pages/DashboardPage.tsx", "src/components/DashboardBanners.tsx",
];
const PALABRAS = /\b(el|la|los|las|de|del|con|para|por|sin|que|una|uno|y|o|tu|tus|su|sus|este|esta|esto|ya|más|mas|aún|todavía|equipo|equipos|ronda|rondas|puntos?|pregunta|respuesta|sesión|sesion|docente|alumnos?|cargando|volver|guardar|enviar|siguiente|anterior|elegí|escribí|completá|verificá|intentá|esperá|probá|tocá|ingresá|nombre|materia|nivel|árbitro|arbitro|juego|partida|resultados?|ganador|empate|error|usuario|clase|grupo|curso)\b/i;
const ACENTOS = /[áéíóúñÁÉÍÓÚÑ¿¡]/;
const ATTRS = new Set(["aria-label","title","alt","placeholder","label","aria-description","aria-placeholder"]);
function esEspanol(t) {
  const s = t.trim(); if (s.length < 2) return false;
  if (s.includes("{") && s.includes(";") && /[\w-]+\s*:\s*[^;]+;/.test(s)) return false; // bloque de CSS
  if (/^[\w.\-/:#@${}()\[\]]+$/.test(s) && !ACENTOS.test(s)) return false; // identificadores, claves, urls
  if (ACENTOS.test(s)) return true;
  return s.split(/\s+/).length >= 2 && PALABRAS.test(s);
}
const hallazgos = [];
for (const rel of ARCHIVOS) {
  const f = path.join(root, rel); if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  // Lo que va a la etapa 3 (prompt, informe exportado) se marca con «i18n-etapa3» (o «i18n-clave» para claves internas): en una línea
  // sola vale para la sentencia/propiedad que sigue; al final de una línea, para esa línea.
  const lineas = src.split("\n");
  const excluidas = new Set();
  lineas.forEach((l, i) => { if (/i18n-(?:etapa3|clave)/.test(l)) excluidas.add(i + 1); });
  lineas.forEach((l, i) => {
    if (!/^\s*(?:\/\/|\{\/\*).*i18n-(?:etapa3|clave)/.test(l)) return;
    const objetivo = i + 2; let mejor = null;
    const buscar = (n) => {
      const ini = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
      if (ini === objetivo && (ts.isStatement(n) || ts.isPropertyAssignment(n) || ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n))) {
        if (!mejor || n.getEnd() > mejor.getEnd()) mejor = n;
      }
      ts.forEachChild(n, buscar);
    };
    buscar(sf);
    if (mejor) { const a = sf.getLineAndCharacterOfPosition(mejor.getStart()).line + 1, b = sf.getLineAndCharacterOfPosition(mejor.getEnd()).line + 1; for (let k = a; k <= b; k++) excluidas.add(k); }
  });
  const marca = (node, texto) => { if (excluidas.has(sf.getLineAndCharacterOfPosition(node.getStart()).line + 1)) return; const { line } = sf.getLineAndCharacterOfPosition(node.getStart()); hallazgos.push(`${rel}:${line + 1}  ${JSON.stringify(texto.trim().slice(0, 80))}`); };
  const enConsola = (n) => { for (let p = n.parent; p; p = p.parent) { if (ts.isCallExpression(p)) { const e = p.expression.getText(); if (/^console\.|^throw|^new Error|^Error$/.test(e)) return true; } if (ts.isNewExpression(p) && /^Error$/.test(p.expression.getText())) return true; } return false; };
  const enImport = (n) => ts.isImportDeclaration(n.parent) || ts.isExportDeclaration(n.parent);
  const visit = (n) => {
    if (ts.isJsxText(n)) { if (esEspanol(n.getText().replace(/\s+/g, " "))) marca(n, n.getText().replace(/\s+/g, " ")); }
    else if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !enImport(n) && !enConsola(n)) { if (!ts.isLiteralTypeNode(n.parent) && esEspanol(n.text)) marca(n, n.text); }
    else if (ts.isTemplateExpression(n) && !enConsola(n)) { const t = n.head.text + n.templateSpans.map((s) => "{}" + s.literal.text).join(""); if (esEspanol(t)) marca(n, t); }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
// ── Portada (DashboardPage) y banners: todo texto elegido por idioma debe tener es, en y pt ──
for (const rel of ["src/pages/DashboardPage.tsx", "src/components/DashboardBanners.tsx"]) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  const lineas = src.split("\n");
  lineas.forEach((l, i) => {
    if (/^\s*(\/\/|\*)/.test(l)) return;
    // ternario `language === "es" ? … : …`: la expresión (hasta ~320 caracteres) tiene que nombrar "pt"
    if (/\blanguage === "es"/.test(l) && !/"(es-AR|pt-BR)"/.test(l)) {
      const ventana = lineas.slice(i, i + 4).join(" ").slice(0, 320);
      if (!/language === "pt"|language === 'pt'/.test(ventana)) hallazgos.push(`${rel}:${i + 1}  ternario es/en sin versión en portugués: ${l.trim().slice(0, 80)}`);
    }
  });
  // diccionarios es/en/pt propios: misma cantidad de bloques por idioma
  const n = (c) => (src.match(new RegExp("^\\s*" + c + ": \\{", "gm")) || []).length;
  if (!(n("es") === n("en") && n("en") === n("pt"))) hallazgos.push(`${rel}  los diccionarios por idioma no tienen la misma cantidad de bloques es/en/pt (${n("es")}/${n("en")}/${n("pt")})`);
}
const unicos = [...new Set(hallazgos)];
if (unicos.length) { console.log(`Textos en español escritos en el código: ${unicos.length}`); if (process.argv.includes("--lista") || unicos.length <= 80) unicos.forEach((h) => console.log("  " + h)); process.exit(1); }
console.log("OK: no hay textos en español escritos directamente en las pantallas de los árbitros ni en la portada.");
