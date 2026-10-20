// Verifica los criterios de calificación del Árbitro de Aprendizaje (Etapa B, criterios de calificación, y el
// ajuste posterior: sugeridos para marcar + modo de respuesta en tarjetas):
//  1) Util (frontend y servidor): listaCriterios/normalizarCriterios limpian, acotan a 3 líneas de 150
//     caracteres, descartan vacíos; formatearCriteriosParaPrompt arma la lista numerada ("" si no hay).
//  2) Servidor (index.ts): crearSesionArbitro normaliza y guarda; getSesionArbitro y listarRondasSesion
//     devuelven los criterios de la sesión ([] en sesiones viejas sin el campo). Sin cambios en esta etapa:
//     lo que se guarda sigue siendo el mismo string[] de siempre, venga de un sugerido o de uno propio.
//  3) instruccionesPorDefecto (arbitroDocumentos.ts): agrega el bloque de criterios al final si hay, sin
//     renumerar los pasos; sin criterios (o sin pasar el argumento) queda igual que antes de esta función.
//  4) CRITERIOS_SUGERIDOS y criteriosDesdeSugeridos (src/utils/arbitroCriterios.ts): los 6 sugeridos tienen
//     texto en es Y en; el 6to es "solo escrita" y se descarta en modo oral aunque venga marcado;
//     criteriosDesdeSugeridos nunca entrega más de 3 en total (sugeridos + propio), guarda el texto en el
//     idioma de la SESIÓN (no el de la interfaz — la función ni siquiera recibe ese dato), un propio vacío
//     se ignora y uno largo se recorta a 150, y todo pasa por listaCriterios sin cambios.
//  5) Cableado de la config: la lista de sugeridos se muestra como checkbox (no desplegable) más un campo
//     "agregar uno propio"; el 6to sugerido solo aparece en modo escrito y se desmarca solo al pasar a oral.
//  6) Modo de respuesta: tarjetas (no botones sueltos) con nombre + bajada + explicación, siempre visibles;
//     mismos valores internos ('oral' por defecto, 'escrita') y mismo lugar (primero en el paso 6).
//  7) Juego: CriteriosBox se usa en turno_pregunta (compacto), calificación y disputa; no se muestra nada si
//     la sesión no tiene criterios.
//  8) Panel: los criterios aparecen en el encabezado del docente (#panel-print-title) y en el del PDF del
//     curso (#panel-print-title-curso, con el idioma de la sesión).
//  9) "¿Cómo funciona?": el paso 3 (cfgHow3D) menciona los criterios del docente, y la clave es la MISMA que
//     usa la landing (ComoFuncionaES) — frase neutra, no condicionada a ninguna sesión puntual.
// 10) Claves es/en presentes para todo lo anterior.
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

// 4) CRITERIOS_SUGERIDOS y criteriosDesdeSugeridos
ok(Array.isArray(F.CRITERIOS_SUGERIDOS) && F.CRITERIOS_SUGERIDOS.length === 6, "6 sugeridos");
ok(F.CRITERIOS_SUGERIDOS.every((c) => typeof c.es === "string" && c.es.length > 0 && typeof c.en === "string" && c.en.length > 0), "los 6 sugeridos tienen texto en es Y en (misma cantidad de criterios en los dos idiomas)");
const soloEscritaIdx = F.CRITERIOS_SUGERIDOS.map((c, i) => c.soloEscrita ? i : -1).filter((i) => i >= 0);
eq(soloEscritaIdx, [5], "un único sugerido \"solo escrita\" (el 6to, índice 5: claridad de lo escrito)");

const NINGUNO = [false, false, false, false, false, false];
const marcar = (...idx) => F.CRITERIOS_SUGERIDOS.map((_, i) => idx.includes(i));
eq(F.criteriosDesdeSugeridos(NINGUNO, "", "es", "oral"), [], "nada marcado y sin propio = []");
eq(F.criteriosDesdeSugeridos(marcar(1, 2), "", "es", "oral"), [F.CRITERIOS_SUGERIDOS[1].es, F.CRITERIOS_SUGERIDOS[2].es], "sugeridos marcados: su texto, en orden");
eq(F.criteriosDesdeSugeridos(marcar(1, 2), "", "en", "oral"), [F.CRITERIOS_SUGERIDOS[1].en, F.CRITERIOS_SUGERIDOS[2].en], "mismo marcado, idioma de sesión 'en': texto en inglés (la función no recibe el idioma de la interfaz — no hay forma de confundirlos)");
eq(F.criteriosDesdeSugeridos(marcar(5), "", "escrita", "escrita"), [F.CRITERIOS_SUGERIDOS[5].es], "el 6to (solo escrita) SÍ se guarda cuando el modo es escrita");
eq(F.criteriosDesdeSugeridos(marcar(5), "", "es", "oral"), [], "el 6to (solo escrita) se descarta en modo oral aunque venga marcado (red de seguridad en la función, además del desmarcado solo en la pantalla)");
ok(F.criteriosDesdeSugeridos(marcar(0, 1, 2), "un criterio propio", "es", "oral").length === 3, "nunca más de 3 en total: 3 sugeridos + 1 propio se recorta a 3");
eq(F.criteriosDesdeSugeridos(NINGUNO, "   ", "es", "oral"), [], "un propio vacío (solo espacios) se ignora");
ok(F.criteriosDesdeSugeridos(NINGUNO, "x".repeat(900), "es", "oral")[0].length === 150, "un propio largo se recorta a 150 caracteres");
eq(F.criteriosDesdeSugeridos(marcar(0), "mi criterio propio", "es", "oral"), [F.CRITERIOS_SUGERIDOS[0].es, "mi criterio propio"], "un sugerido + el propio: los dos, el propio al final");

// 5) cableado de la config
const cfg = leer("src/pages/ArbitroConfigPage.tsx");
ok(/import \{ MAX_LARGO_CRITERIO, MAX_CRITERIOS, CRITERIOS_SUGERIDOS, criteriosDesdeSugeridos \} from "\.\.\/utils\/arbitroCriterios"/.test(cfg), "importa CRITERIOS_SUGERIDOS y criteriosDesdeSugeridos (ya no listaCriterios directo)");
ok(/const \[criteriosSugeridosMarcados, setCriteriosSugeridosMarcados\] = useState<boolean\[\]>\(\(\) => CRITERIOS_SUGERIDOS\.map\(\(\) => false\)\)/.test(cfg), "config: ningún sugerido marcado de entrada");
ok(/const \[criterioPropio, setCriterioPropio\] = useState\(""\)/.test(cfg), "config: campo propio arranca vacío");
ok(/if \(c\.soloEscrita && modoRespuesta !== "escrita"\) return null;/.test(cfg), "el 6to sugerido no se ofrece en modo oral (no se renderiza)");
ok(/if \(modoRespuesta === "escrita"\) return;\s*\n\s*setCriteriosSugeridosMarcados\(prev => prev\.map\(\(marcado, i\) => \(marcado && CRITERIOS_SUGERIDOS\[i\]\.soloEscrita\) \? false : marcado\)\)/.test(cfg), "al pasar a oral, se desmarca solo si estaba marcado");
ok(/type="checkbox"/.test(cfg), "sugeridos: checkbox (no desplegable)");
ok(/<label htmlFor="config-criterio-propio"[^>]*>\{ta\.cfgCriterioPropio\}<\/label>/.test(cfg), "campo propio con su label (\"Agregar uno propio\")");
ok(/maxLength=\{MAX_LARGO_CRITERIO\}/.test(cfg), "campo propio limitado a MAX_LARGO_CRITERIO (150) caracteres");
ok(/const bloqueado = !marcado && totalMarcados >= MAX_CRITERIOS;/.test(cfg), "checkboxes no marcados se bloquean al llegar a MAX_CRITERIOS (3) en total");
ok(/const criteriosParaGuardar = \(\): string\[\] => criteriosDesdeSugeridos\(criteriosSugeridosMarcados, criterioPropio, idiomaSesion, modoRespuesta\)/.test(cfg), "lo que se guarda = criteriosDesdeSugeridos(…, idiomaSesion, modoRespuesta) — en el idioma de la SESIÓN");
ok(/criteriosCalificacion: criteriosParaGuardar\(\)/.test(cfg), "la creación de la sesión manda criteriosCalificacion");
ok(cfg.includes("instruccionesPorDefecto(arbitroDic(idiomaSesion), tema.trim(), modoMetacognicion, modoRespuesta, !!textoFuente.trim() && verTextoDuranteJuego, criteriosParaGuardar())"), "las instrucciones impresas también reciben los criterios");

// 6) modo de respuesta: tarjetas, mismos valores internos, oral por defecto
ok(/const \[modoRespuesta, setModoRespuesta\] = useState<ModoRespuesta>\("oral"\)/.test(cfg), "oral sigue siendo el valor por defecto");
ok(/\{ id: "oral" as const, titulo: ta\.cfgAnswerOralTitle, resumen: ta\.cfgAnswerOralSummary, hint: ta\.cfgAnswerOralHint,/.test(cfg) && /\{ id: "escrita" as const, titulo: ta\.cfgAnswerWrittenTitle, resumen: ta\.cfgAnswerWrittenSummary, hint: ta\.cfgAnswerWrittenHint,/.test(cfg), "las tarjetas guardan 'oral'/'escrita' como valor interno (mismos de siempre)");
ok(/onClick=\{\(\) => setModoRespuesta\(m\.id\)\} aria-pressed=\{modoRespuesta === m\.id\}/.test(cfg), "cada tarjeta es seleccionable (aria-pressed) y setea modoRespuesta");
ok(/\{m\.titulo\}/.test(cfg) && /\{m\.resumen\}/.test(cfg) && /\{m\.hint\}/.test(cfg), "cada tarjeta muestra título, resumen de una línea y (al abrir 'Más detalle') la explicación completa");

// 7) juego
const juego = leer("src/pages/ArbitroJuegoPage.tsx");
ok(/const criteriosSesion = listaCriterios\(sesion\?\.criteriosCalificacion\)/.test(juego), "juego: lee los criterios de la sesión");
ok(/if \(criteriosSesion\.length === 0\) return null;/.test(juego), "CriteriosBox: no muestra nada sin criterios");
ok((juego.match(/<CriteriosBox/g) || []).length === 3, "CriteriosBox se usa en las 3 pantallas (turno_pregunta compacto, calificación, disputa)");
ok(/<CriteriosBox compacto \/>/.test(juego), "turno_pregunta: versión compacta, antes de responder");

// 8) panel
const panel = leer("src/pages/ArbitroPanelPage.tsx");
ok((panel.match(/listaCriterios\(rondasData\?\.criteriosCalificacion\)/g) || []).length >= 4, "panel: usa listaCriterios(rondasData?.criteriosCalificacion) en los dos encabezados (título + lista)");
ok(/ta\.panCriteriosLabel/.test(panel) && /txCurso\.panCriteriosLabel/.test(panel), "encabezado del docente usa ta (idioma del panel); el del PDF del curso usa txCurso (idioma de la sesión)");
ok(/criteriosCalificacion\?: string\[\];/.test(panel), "RondasData declara criteriosCalificacion");

// 9) "¿Cómo funciona?": clave compartida con la landing
const landing = leer("src/pages/ArbitroLandingPage.tsx");
ok(/descripcion: ta\.cfgHow3D \}/.test(cfg) || /descripcion: ta\.cfgHow3D,/.test(cfg), "config: paso 3 de '¿Cómo funciona?' usa cfgHow3D");
ok(/descripcion: ta\.cfgHow3D \}/.test(landing) || /descripcion: ta\.cfgHow3D,/.test(landing), "landing: el mismo paso 3 usa LA MISMA clave cfgHow3D (no una copia propia)");
ok(/criterios de calificaci[oó]n/.test(es.cfgHow3D) && /docente/.test(es.cfgHow3D), "es: cfgHow3D menciona los criterios del docente");
ok(/grading criteria/i.test(en.cfgHow3D) && /teacher/i.test(en.cfgHow3D), "en: cfgHow3D menciona los criterios del docente");

// 10) claves es/en
for (const k of ["cfgCriteriosTitle", "cfgCriteriosHint", "cfgCriterioPropio", "cfgAnswerMode", "cfgAnswerOralTitle", "cfgAnswerWrittenTitle", "cfgAnswerOralSummary", "cfgAnswerWrittenSummary", "cfgAnswerMoreDetail", "cfgAnswerOralHint", "cfgAnswerWrittenHint", "cfgAnswerWrittenShortTimeWarning", "jgCriteriosTitle", "jgCriteriosCompactTitle", "panCriteriosLabel", "docInstrCriteriaTitle", "cfgHow3D"]) ok(es[k] && en[k], `texto ${k} en es y en`);
ok(!("cfgCriterioN" in es) && !("cfgCriterioN" in en), "cfgCriterioN ya no existe (los campos fijos de texto libre se reemplazaron por sugeridos + propio)");

if (fallos) { console.error(`\nFALLÓ: ${fallos} de ${total} comprobaciones`); process.exit(1); }
console.log(`OK: ${total} comprobaciones (criterios de calificación: util, servidor, sugeridos, instrucciones impresas, config, modo de respuesta, juego, panel y "¿Cómo funciona?").`);
