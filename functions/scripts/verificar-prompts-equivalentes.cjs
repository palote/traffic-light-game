// Comprueba que cada prompt de Gemini en español y en inglés tiene las MISMAS secciones, las mismas variables, las mismas claves de
// salida (JSON) y los mismos valores fijos, y que los números (criterios) coinciden. Además comprueba que:
//  - en 'es' los prompts de consignas / una consigna / informe no cambian ni un carácter respecto del texto original (fixtures/prompts-es-etapa2.cjs);
//  - las tablas en inglés del servidor (materias, niveles, áreas) coinciden con src/i18n/en.ts;
//  - el prompt en inglés no trae letras del español (tildes, ñ, ¿, ¡).
// (El prompt del árbitro en 'es' lo cubre verificar-prompt-identico.cjs.)
// Uso (desde functions/):  npm run build && node scripts/verificar-prompts-equivalentes.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const P = require("../lib/arbitroPrompt.js");
const E = require("../lib/arbitroPromptEn.js");
const fx = require("./fixtures/prompts-es-etapa2.cjs");

const fallas = [];
const falla = (caso, msg) => fallas.push(`[${caso}] ${msg}`);
let comparados = 0;

// Secciones: encabezado en mayúsculas al principio de una línea («NOMBRE:» o «NOMBRE (…)»). Tabla ES → EN, explícita.
const SECCIONES = {
  "TEXTO BASE DE LA SESIÓN": "SESSION BASE TEXT", "PERTINENCIA": "RELEVANCE", "REGLA DE COMPLETITUD": "COMPLETENESS RULE",
  "EVALUÁ EL CONCEPTO, NO LAS PALABRAS": "EVALUATE THE CONCEPT, NOT THE WORDS", "CONTEXTO DEL JUEGO": "GAME CONTEXT",
  "QUIÉN ES QUIÉN": "WHO IS WHO", "CÓMO DECIDIR LA CALIFICACIÓN": "HOW TO DECIDE THE GRADE",
  "QUÉ CUENTA COMO RESPUESTA COMPLETA EN ESTA ÁREA": "WHAT COUNTS AS A COMPLETE ANSWER IN THIS AREA",
  "TEXTO BASE QUE LOS ALUMNOS VAN A LEER ANTES DEL JUEGO": "BASE TEXT THAT THE STUDENTS WILL READ BEFORE THE GAME", "MUY IMPORTANTE": "VERY IMPORTANT",
  "PREGUNTAS PASADAS": "SKIPPED QUESTIONS", "DATOS DE LA SESIÓN": "SESSION DATA", "DETALLE DE CONSULTAS": "QUERY DETAILS",
};
const REG_ENC = /(?:^|\n)((?:[A-ZÁÉÍÓÚÑ§][A-ZÁÉÍÓÚÑ0-9§]*,? ?){2,}?)(?= ?[:(])/g;
const encabezados = (s) => [...s.matchAll(REG_ENC)].map((m) => m[1].trim());
const claves = (s) => [...s.matchAll(/"([A-Za-z_]+)"\s*:/g)].map((m) => m[1]).sort();
const VALORES = ["A", "B", "ambas_correctas", "ambas_incorrectas", "fuera_de_tema", "completa", "incompleta", "no", "superficial", "adecuado", "profundo", "resultado"];
const valoresFijos = (s) => VALORES.map((v) => `${v}:${(s.match(new RegExp(`"${v}"`, "g")) || []).length > 0}`).sort();
const variables = (s) => (s.match(/§[A-Z0-9]+§/g) || []).sort();
const numeros = (s) => (s.replace(/§[A-Z0-9]+§/g, "").match(/\d+(?:[.,]\d+)?/g) || []).sort();
const viñetas = (s) => (s.match(/^- /gm) || []).length;
const lista = (a) => JSON.stringify(a);

function comparar(caso, es, en) {
  comparados++;
  const encEs = encabezados(es).map((h) => SECCIONES[h] ?? `?${h}`), encEn = encabezados(en);
  if (lista(encEs) !== lista(encEn)) falla(caso, `secciones distintas\n    ES→EN: ${lista(encEs)}\n    EN:    ${lista(encEn)}`);
  if (lista(variables(es)) !== lista(variables(en))) falla(caso, `variables distintas\n    ES: ${lista(variables(es))}\n    EN: ${lista(variables(en))}`);
  if (lista(claves(es)) !== lista(claves(en))) falla(caso, `claves de salida distintas\n    ES: ${lista(claves(es))}\n    EN: ${lista(claves(en))}`);
  if (lista(valoresFijos(es)) !== lista(valoresFijos(en))) falla(caso, `valores fijos del JSON distintos\n    ES: ${lista(valoresFijos(es))}\n    EN: ${lista(valoresFijos(en))}`);
  if (lista(numeros(es)) !== lista(numeros(en))) falla(caso, `números distintos\n    ES: ${lista(numeros(es))}\n    EN: ${lista(numeros(en))}`);
  if (viñetas(es) !== viñetas(en)) falla(caso, `cantidad de viñetas «- » distinta (ES ${viñetas(es)} · EN ${viñetas(en)})`);
  const tildes = en.match(/[áéíóúñ¿¡ÁÉÍÓÚÑ]/g);
  if (tildes) falla(caso, `el prompt en inglés tiene letras del español: ${[...new Set(tildes)].join("")}`);
}

const S = (n) => `§${n}§`;
const base = { materia: S("MAT"), nivel: S("NIV"), anio: S("ANIO"), tema: S("TEMA") };

// 1) Árbitro
for (const anio of [S("ANIO"), "2", "5", "8"]) for (const oral of [false, true]) for (const texto of [false, true]) for (const extra of [false, true]) {
  const p = { ...base, anio, desacuerdo: S("DES"), posicionA: S("PA"), posicionB: S("PB"), esJuegoOral: oral, textoFuente: texto ? S("TXT") : "",
    ...(extra ? { subtema: S("SUB"), ejercicio: S("EJ"), equipoPregunta: S("EQP"), equipoResponde: S("EQR"), contexto: { area: S("AREA"), materia: S("CMAT"), criterio: S("CRIT") } } : {}) };
  comparar(`árbitro anio=${anio} oral=${oral} texto=${texto} extra=${extra}`, P.buildArbitroPrompt({ ...p, idioma: "es" }), P.buildArbitroPrompt({ ...p, idioma: "en" }));
}
// 2) Pregunta propia
for (const texto of [false, true]) for (const sub of [false, true]) {
  const p = { ...base, pregunta: S("PREG"), textoFuente: texto ? S("TXT") : "", ...(sub ? { subtema: S("SUB") } : {}) };
  comparar(`pregunta propia texto=${texto} sub=${sub}`, P.buildPromptPreguntaPropia({ ...p, idioma: "es" }), P.buildPromptPreguntaPropia({ ...p, idioma: "en" }));
}
// 3) Consignas
for (const tipo of ["memoristica", "mixta", "capacidades"]) for (const texto of [false, true]) for (const sub of [false, true]) {
  const p = { ...base, n: 7, tipo, textoFuente: texto ? S("TXT") : "", ...(sub ? { subtema: S("SUB") } : {}) };
  const es = P.buildPromptConsignas({ ...p, idioma: "es" });
  comparar(`consignas tipo=${tipo} texto=${texto} sub=${sub}`, es, P.buildPromptConsignas({ ...p, idioma: "en" }));
  assert.strictEqual(es, fx.consignas({ ...p }), `consignas en 'es' cambió respecto del original (${tipo}, texto=${texto}, sub=${sub})`);
  assert.strictEqual(P.buildPromptConsignas(p), es, "sin idioma = español");
}
// 4) Una consigna
for (const sub of [false, true]) {
  const p = { ...base, ...(sub ? { subtema: S("SUB") } : {}) };
  const es = P.buildPromptConsigna({ ...p, idioma: "es" });
  comparar(`consigna sub=${sub}`, es, P.buildPromptConsigna({ ...p, idioma: "en" }));
  assert.strictEqual(es, fx.consigna(p), "consigna en 'es' cambió respecto del original");
}
// 5) Informe
const consultas = [{ desacuerdo: S("DES"), posicionA: S("PA"), posicionB: S("PB"), resultado: "A" }, { desacuerdo: S("DES"), posicionA: S("PA"), posicionB: S("PB"), resultado: "fuera_de_tema" }];
for (const pas of [[], [{ pregunta: S("PREG"), equipoPregunta: S("EQP") }]]) for (const sub of [false, true]) for (const area of [null, "exactas", "arte"]) {
  const session = { ...base, area, ...(sub ? { subtema: S("SUB") } : {}) };
  const es = P.buildPromptInforme({ session, consultas, rondasPasadas: pas, idioma: "es" });
  const en = P.buildPromptInforme({ session, consultas, rondasPasadas: pas, idioma: "en" });
  // El área sale de una tabla (no es una variable): se reemplaza por un marcador para comparar variables.
  comparar(`informe pasadas=${pas.length} sub=${sub} area=${area}`, es.replace(/Ciencias Exactas y Naturales|Arte y Expresión|No especificada/, S("AREAT")), en.replace(/Exact and Natural Sciences|Art and Expression|Not specified/, S("AREAT")));
  assert.strictEqual(es, fx.informe({ session, consultas, rondasPasadas: pas }), "informe en 'es' cambió respecto del original");
}

// 6) Tablas en inglés del servidor = src/i18n/en.ts
const cargar = (f, n) => { const out = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../../src/i18n", f), "utf8"), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText; const m = { exports: {} }; new Function("module", "exports", "require", out)(m, m.exports, require); return m.exports[n]; };
const en = cargar("en.ts", "en").arbitro;
for (const [k, v] of Object.entries(en.materiaNames)) if (E.MATERIA_EN[k] !== v) falla("tablas", `materia «${k}»: servidor «${E.MATERIA_EN[k]}» · en.ts «${v}»`);
for (const k of Object.keys(E.MATERIA_EN)) if (!(k in en.materiaNames)) falla("tablas", `materia «${k}» sobra en el servidor`);
for (const [k, v] of Object.entries(en.levelNames)) if (E.NIVEL_EN[k] !== v) falla("tablas", `nivel «${k}»: servidor «${E.NIVEL_EN[k]}» · en.ts «${v}»`);
for (const k of Object.keys(P.AREA_LABEL_ES)) if (E.AREA_LABEL_EN[k] !== en.areaNames[P.AREA_LABEL_ES[k]]) falla("tablas", `área «${k}»: servidor «${E.AREA_LABEL_EN[k]}» · en.ts «${en.areaNames[P.AREA_LABEL_ES[k]]}»`);

if (fallas.length) { console.error(`FALLÓ: ${fallas.length} diferencias entre los prompts ES y EN:\n` + fallas.join("\n")); process.exit(1); }
console.log(`OK: ${comparados} pares ES/EN con las mismas secciones, variables, claves de salida, valores fijos, números y viñetas · consignas, consigna e informe en 'es' idénticos al original · tablas del servidor = en.ts.`);
