// Verifica los criterios de calificación del Árbitro de Aprendizaje (Etapa B, criterios de calificación):
//  1) Util (frontend y servidor): listaCriterios/normalizarCriterios limpian, acotan a 3 líneas de 150
//     caracteres, descartan vacíos; formatearCriteriosParaPrompt arma la lista numerada ("" si no hay).
//  2) Servidor (index.ts): crearSesionArbitro normaliza y guarda; getSesionArbitro y listarRondasSesion
//     devuelven los criterios de la sesión ([] en sesiones viejas sin el campo).
//  3) instruccionesPorDefecto (arbitroDocumentos.ts): agrega el bloque de criterios al final si hay, sin
//     renumerar los pasos; sin criterios (o sin pasar el argumento) queda igual que antes de esta función.
//  4) Cableado de la config (acordeón calcado del de metacognición, 3 campos fijos de 150 caracteres, ninguno
//     obligatorio) y de la creación de la sesión (payload incluye criteriosCalificacion).
//  5) Juego: CriteriosBox se usa en turno_pregunta (compacto), calificación y disputa; no se muestra nada si
//     la sesión no tiene criterios.
//  6) Panel: los criterios aparecen en el encabezado del docente (#panel-print-title) y en el del PDF del
//     curso (#panel-print-title-curso, con el idioma de la sesión).
//  7) "¿Cómo funciona?": el paso 3 (cfgHow3D) menciona los criterios del docente, y la clave es la MISMA que
//     usa la landing (ComoFuncionaES) — frase neutra, no condicionada a ninguna sesión puntual.
//  8) Claves es/en presentes para todo lo anterior.
// Uso (desde functions/):  npm run build && node scripts/verificar-criterios-calificacion.cjs
const fs = require("fs"), path = require("path"), ts = require("typescript");
const ROOT = path.join(__dirname, "../..");
let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.error("  ✘ " + msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`);
function cargarTs(rel, cache = {}) {
  const f = path.join(ROOT, rel); if (cache[f]) return cache[f].exports;
  const out = ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
  const m = { exports: {} }; cache[f] = m;
  const req = (r) => (r.startsWith(".") ? cargarTs(path.relative(ROOT, path.resolve(path.dirname(f), r)) + ".ts", cache) : require(r));
  new Function("module", "exports", "require", out)(m, m.exports, req); return m.exports;
}
const leer = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const F = cargarTs("src/utils/arbitroCriterios.ts"), S = cargarTs("functions/src/arbitroCriterios.ts");
const D = cargarTs("src/utils/arbitroDocumentos.ts");
const es = cargarTs("src/i18n/es.ts").es.arbitro, en = cargarTs("src/i18n/en.ts").en.arbitro;

// 1) util frontend y servidor
for (const U of [F, S]) {
  eq(U.listaCriterios ? U.listaCriterios(undefined) : U.normalizarCriterios(undefined), [], "ausente = []");
  const fn = U.listaCriterios || U.normalizarCriterios;
  eq(fn(null), [], "null = []");
  eq(fn("texto"), [], "no-array = []");
  eq(fn(["  usa un dato  ", "", "   ", "explica el porqué"]), ["usa un dato", "explica el porqué"], "recorta espacios y descarta vacíos");
  eq(fn([1, "ok", null]), ["ok"], "descarta valores que no son string");
  ok(fn(["a", "b", "c", "d", "e"]).length === 3, "máximo 3 criterios");
  ok(fn(["x".repeat(900)])[0].length === 150, "largo acotado a 150 caracteres");
}
ok(F.MAX_CRITERIOS === 3 && S.MAX_CRITERIOS === 3 && F.MAX_LARGO_CRITERIO === 150 && S.MAX_LARGO_CRITERIO === 150, "constantes MAX_CRITERIOS=3 y MAX_LARGO_CRITERIO=150 en frontend y servidor");
eq(S.formatearCriteriosParaPrompt([]), "", "formatear sin criterios = \"\"");
eq(S.formatearCriteriosParaPrompt(["usa un dato", "explica el porqué"]), "1. usa un dato\n2. explica el porqué", "formatear: lista numerada");

// 2) servidor: cableado en index.ts (regex, igual que verificar-preguntas-meta.cjs)
const idx = leer("functions/src/index.ts");
ok(/criteriosCalificacion: normalizarCriterios\(criteriosCalificacion\)/.test(idx), "crearSesionArbitro guarda los criterios normalizados");
ok(/criteriosCalificacion: normalizarCriterios\(data\.criteriosCalificacion\)/.test(idx), "getSesionArbitro los devuelve ([] en sesiones viejas)");
ok(/criteriosCalificacion: normalizarCriterios\(session\.criteriosCalificacion\)/.test(idx), "listarRondasSesion los devuelve para el panel");
ok(/const criterioTxt = formatearCriteriosParaPrompt\(normalizarCriterios\(session\.criteriosCalificacion\)\)/.test(idx), "runArbitro arma el texto de criterios para el prompt");
ok(/contexto: criterioTxt \? \{ criterio: criterioTxt \} : undefined/.test(idx), "runArbitro los pasa como contexto.criterio (sin área ni materia)");
ok(/criterios: formatearCriteriosParaPrompt\(normalizarCriterios\(session\.criteriosCalificacion\)\)/.test(idx), "revisarPartidaArbitro los pasa a construirPromptRevision");

// 3) instruccionesPorDefecto: bloque de criterios, sin renumerar pasos
const txEs = es;
const sinCriterios = D.instruccionesPorDefecto(txEs, "Egipto");
ok(!sinCriterios.includes(txEs.docInstrCriteriaTitle), "sin pasar criterios: no aparece el bloque (compatibilidad con el único call-site viejo)");
const conCriterios = D.instruccionesPorDefecto(txEs, "Egipto", "grupal", "oral", false, ["usa un dato del texto", "explica el porqué"]);
ok(conCriterios.includes(txEs.docInstrCriteriaTitle) && conCriterios.includes("1. usa un dato del texto") && conCriterios.includes("2. explica el porqué"), "con criterios: aparece el bloque, numerado");
ok(conCriterios.startsWith(sinCriterios), "el bloque de criterios va AL FINAL (se agrega después de todo lo de siempre, no corre la numeración de los pasos)");
ok(D.instruccionesPorDefecto(txEs, "Egipto", "grupal", "oral", false, []) === sinCriterios, "criterios vacíos ([]): idéntico a no pasar el argumento");
ok(D.instruccionesPorDefecto(txEs, "Egipto", "grupal", "oral", false, ["  ", ""]) === sinCriterios, "criterios solo vacíos/espacios: idéntico a sin criterios");

// 4) cableado de la config
const cfg = leer("src/pages/ArbitroConfigPage.tsx");
ok(/useState<string\[\]>\(\["", "", ""\]\)/.test(cfg), "config: 3 campos fijos, ninguno obligatorio (no hay mínimo/agregar/quitar)");
ok(/useState\(false\); \/\/ acorde[oó]n cerrado por defecto\n  const \[criterios, setCriterios\]|const \[criteriosAbierto, setCriteriosAbierto\] = useState\(false\)/.test(cfg), "config: acordeón de criterios cerrado por defecto");
ok(/aria-expanded=\{criteriosAbierto\}/.test(cfg) && /aria-controls="config-criterios-panel"/.test(cfg) && /id="config-criterios-panel"[^>]*hidden=\{!criteriosAbierto\}/.test(cfg), "acordeón: botón con aria-expanded/aria-controls y panel siempre presente (hidden)");
ok(/<button type="button" id="config-criterios-boton"/.test(cfg), "acordeón: es un <button> (operable con teclado)");
ok(/maxLength=\{MAX_LARGO_CRITERIO\}/.test(cfg), "cada campo limitado a MAX_LARGO_CRITERIO (150) caracteres");
ok(/<label htmlFor=\{idC\}/.test(cfg) && /fillArbitro\(ta\.cfgCriterioN/.test(cfg), "cada campo con su label (Criterio {n})");
ok(/const criteriosParaGuardar = \(\): string\[\] => listaCriterios\(criterios\)/.test(cfg), "lo que se guarda = listaCriterios(criterios) (filtra vacíos)");
ok(/criteriosCalificacion: criteriosParaGuardar\(\)/.test(cfg), "la creación de la sesión manda criteriosCalificacion");
ok(cfg.includes("instruccionesPorDefecto(arbitroDic(idiomaSesion), tema.trim(), modoMetacognicion, modoRespuesta, !!textoFuente.trim() && verTextoDuranteJuego, criteriosParaGuardar())"), "las instrucciones impresas también reciben los criterios");

// 5) juego
const juego = leer("src/pages/ArbitroJuegoPage.tsx");
ok(/const criteriosSesion = listaCriterios\(sesion\?\.criteriosCalificacion\)/.test(juego), "juego: lee los criterios de la sesión");
ok(/if \(criteriosSesion\.length === 0\) return null;/.test(juego), "CriteriosBox: no muestra nada sin criterios");
ok((juego.match(/<CriteriosBox/g) || []).length === 3, "CriteriosBox se usa en las 3 pantallas (turno_pregunta compacto, calificación, disputa)");
ok(/<CriteriosBox compacto \/>/.test(juego), "turno_pregunta: versión compacta, antes de responder");

// 6) panel
const panel = leer("src/pages/ArbitroPanelPage.tsx");
ok((panel.match(/listaCriterios\(rondasData\?\.criteriosCalificacion\)/g) || []).length >= 4, "panel: usa listaCriterios(rondasData?.criteriosCalificacion) en los dos encabezados (título + lista)");
ok(/ta\.panCriteriosLabel/.test(panel) && /txCurso\.panCriteriosLabel/.test(panel), "encabezado del docente usa ta (idioma del panel); el del PDF del curso usa txCurso (idioma de la sesión)");
ok(/criteriosCalificacion\?: string\[\];/.test(panel), "RondasData declara criteriosCalificacion");

// 7) "¿Cómo funciona?": clave compartida con la landing
const landing = leer("src/pages/ArbitroLandingPage.tsx");
ok(/descripcion: ta\.cfgHow3D \}/.test(cfg) || /descripcion: ta\.cfgHow3D,/.test(cfg), "config: paso 3 de '¿Cómo funciona?' usa cfgHow3D");
ok(/descripcion: ta\.cfgHow3D \}/.test(landing) || /descripcion: ta\.cfgHow3D,/.test(landing), "landing: el mismo paso 3 usa LA MISMA clave cfgHow3D (no una copia propia)");
ok(/criterios de calificaci[oó]n/.test(es.cfgHow3D) && /docente/.test(es.cfgHow3D), "es: cfgHow3D menciona los criterios del docente");
ok(/grading criteria/i.test(en.cfgHow3D) && /teacher/i.test(en.cfgHow3D), "en: cfgHow3D menciona los criterios del docente");

// 8) claves es/en
for (const k of ["cfgCriteriosTitle", "cfgCriteriosHint", "cfgCriterioN", "jgCriteriosTitle", "jgCriteriosCompactTitle", "panCriteriosLabel", "docInstrCriteriaTitle", "cfgHow3D"]) ok(es[k] && en[k], `texto ${k} en es y en`);

if (fallos) { console.error(`\nFALLÓ: ${fallos} de ${total} comprobaciones`); process.exit(1); }
console.log(`OK: ${total} comprobaciones (criterios de calificación: util, servidor, instrucciones impresas, config, juego, panel y "¿Cómo funciona?").`);
