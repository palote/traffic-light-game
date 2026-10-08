// Pruebas de la etapa 3 del inglés (sin Firebase ni Gemini reales: todo simulado).
//   1) Documentos exportados (src/utils/arbitroDocumentos.ts): en 'es' idénticos, carácter por carácter, a los de antes de la etapa 3
//      (fixtures/documentos-es-original.cjs); en 'en' sin letras del español, con plurales y números/fechas del idioma.
//   2) Frase del veredicto que arma el código: «Tiene razón el equipo X» / «Team X is right» según el idioma de la sesión.
//   3) Idioma de la salida del modelo: detectarIdioma / advertirIdiomaSalida (solo advierte, no bloquea) y de punta a punta:
//      una sesión 'en' cuyo modelo responde en español devuelve igual la respuesta y deja una advertencia en el log.
//   4) De punta a punta: consignas y una consigna según el idioma de la sesión.
//   5) Ya no quedan marcas «i18n-etapa3» en el código.
// Uso (desde functions/):  npm run build && node scripts/verificar-etapa3.cjs
const Module = require("module");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const ROOT = path.join(__dirname, "../..");
const filas = [];
const t = (caso, esperado, obtenido) => { filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) }); assert.strictEqual(String(obtenido), String(esperado), caso); };
const ok = (caso, cond, detalle) => { filas.push({ caso, esperado: "ok", obtenido: cond ? "ok" : "FALLA" }); assert.ok(cond, caso + (detalle ? " — " + detalle : "")); };

// Carga un .ts del front (transpilado) resolviendo los import relativos a otros .ts; los import de tipo se borran solos.
function cargarTs(rel, cache = {}) {
  const f = path.join(ROOT, rel); if (cache[f]) return cache[f].exports;
  const out = ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
  const m = { exports: {} }; cache[f] = m;
  const req = (r) => (r.startsWith(".") ? cargarTs(path.relative(ROOT, path.resolve(path.dirname(f), r)) + ".ts", cache) : require(r));
  new Function("module", "exports", "require", out)(m, m.exports, req); return m.exports;
}
const es = cargarTs("src/i18n/es.ts").es.arbitro, en = cargarTs("src/i18n/en.ts").en.arbitro;
const docs = cargarTs("src/utils/arbitroDocumentos.ts");
const originalEs = require("./fixtures/documentos-es-original.cjs");
const { formatearPuntos } = cargarTs("src/utils/formatoPuntos.ts");

// ── 1) Documentos exportados ──
const casos = [
  { materia: "Historia", tema: "Egipto antiguo", nivel: "Secundaria", anio: "3", instrucciones: "INSTR", ejercicio: "1) ¿Quién?", informe: "INFORME", link: "https://x.test/s/1" },
  { materia: "Plástica / Artes Visuales", tema: "Color", nivel: "Primaria", anio: "1", instrucciones: "I", ejercicio: "", informe: "R", link: "https://x.test/s/2" },
];
const equiposDe = (n) => [{ nombre: "Rojos", integrantes: "Ana, Luis", puntos: n }, { nombre: "Azules", integrantes: "Eva", puntos: 1.25 }];
const metas = [["Aprendimos A", "", "Disputa", "Explicar"], [undefined, "Dudamos", "  ", "Mostrar"]];
for (const c of casos) for (const puntos of [0, 1, 2.5]) {
  const locale = "es-AR", fmt = (v) => formatearPuntos(v, "es");
  const orig = originalEs(es, { materia: c.materia, tema: c.tema, nivel: c.nivel, anio: c.anio, instrucciones: c.instrucciones, ejercicio: c.ejercicio, informe: c.informe, linkSesion: c.link, locale, fmt,
    sesion: { materia: c.materia, tema: c.tema }, equipos: equiposDe(puntos), nombreEquipo1: "Rojos", nombreEquipo2: "Azules", integrantesEquipo1: "Ana, Luis", integrantesEquipo2: "Eva", metas });
  const fecha = new Date().toLocaleDateString(locale);
  t(`es · instrucciones por defecto (${c.materia})`, orig.instrucciones, docs.instruccionesPorDefecto(es, c.tema));
  t(`es · informe por defecto (${c.materia})`, orig.informe, docs.informePorDefecto(es, c.tema));
  t(`es · contenido Classroom/impresión (${c.materia})`, orig.contenido, docs.contenidoCompleto(es, c));
  t(`es · título de la tarea de Classroom (${c.materia})`, orig.clasroomTitle, docs.tituloClassroom(es, c.materia, c.tema));
  t(`es · informe de la partida (${c.materia}, ${puntos} pts)`, orig.sesion, docs.textoInformePartida(es, { materia: c.materia, tema: c.tema, fecha, formatoPuntos: fmt, equipos: equiposDe(puntos),
    reflexiones: [{ nombre: "Rojos", integrantes: "Ana, Luis", respuestas: metas[0] }, { nombre: "Azules", integrantes: "Eva", respuestas: metas[1] }] }));
}
const SPANISH_LETTERS = /[áéíóúñ¿¡ÁÉÍÓÚÑ]/;
for (const c of casos) {
  const c_en = { ...c, instrucciones: docs.instruccionesPorDefecto(en, c.tema), informe: docs.informePorDefecto(en, c.tema), ejercicio: c.ejercicio ? "1) Who?" : "" };
  const salidas = { instrucciones: c_en.instrucciones, informe: c_en.informe, contenido: docs.contenidoCompleto(en, c_en), titulo: docs.tituloClassroom(en, c.materia, c.tema) };
  for (const [k, v] of Object.entries(salidas)) ok(`en · ${k} (${c.materia}) sin letras del español`, !SPANISH_LETTERS.test(v), v.match(SPANISH_LETTERS) ? "«" + v.match(SPANISH_LETTERS)[0] + "»" : "");
  ok(`en · contenido (${c.materia}) usa los nombres en inglés`, salidas.contenido.includes(en.materiaNames[c.materia]) && salidas.contenido.includes(en.levelNames[c.nivel]) && salidas.contenido.startsWith("⚖️ Learning Referee"));
  ok(`en · instrucciones traen el paso 5 en inglés`, salidas.instrucciones.includes(en.rulesStep5Template));
}
const fmtEn = (v) => formatearPuntos(v, "en");
const infEn = docs.textoInformePartida(en, { materia: "Historia", tema: "Egipto", fecha: new Date(2026, 9, 8).toLocaleDateString("en-US"), formatoPuntos: fmtEn, equipos: equiposDe(1),
  reflexiones: [{ nombre: "Rojos", integrantes: "Ana, Luis", respuestas: metas[0] }, { nombre: "Azules", integrantes: "Eva", respuestas: metas[1] }] });
ok("en · informe de la partida sin letras del español", !SPANISH_LETTERS.test(infEn), infEn.match(SPANISH_LETTERS) ? infEn.match(SPANISH_LETTERS)[0] : "");
ok("en · fecha en formato de EE. UU.", infEn.includes("Date: 10/8/2026"));
ok("en · plural: «1 point» y «1.25 points»", infEn.includes("Final score: 1 point\n") && infEn.includes("Final score: 1.25 points"), infEn);
ok("en · materia traducida en el título del informe", infEn.startsWith("SESSION REPORT — History · Egipto"));
ok("en · reflexiones numeradas con las preguntas en inglés", infEn.includes("1. What did you learn today about \"Egipto\"?") && infEn.includes("REFLECTIONS OF ROJOS (Ana, Luis)") && infEn.endsWith("Learning Referee · eljuegodelsemaforo.com"));
t("es · nombre del archivo del informe", "informe-arbitro", es.docFileName); t("en · nombre del archivo del informe", "referee-report", en.docFileName);
t("textos enviados al modelo · es", 'Pregunta: "¿Q?"\n\nRespuesta de Azules: "R"', es.modelConflict.replace("{pregunta}", "¿Q?").replace("{equipo}", "Azules").replace("{respuesta}", "R"));
t("textos enviados al modelo · en", 'Question: "Q?"\n\nAnswer from Blue: "A"', en.modelConflict.replace("{pregunta}", "Q?").replace("{equipo}", "Blue").replace("{respuesta}", "A"));

// ── Firebase y Gemini simulados ──
const store = new Map(); let consultas = [];
const vacio = { empty: true, docs: [], exists: false, data: () => ({}) };
const docRef = (id) => ({ get: async () => ({ exists: store.has(id), data: () => store.get(id), ref: { update: async () => {} } }), set: async (d) => { store.set(id, d); }, update: async () => {},
  collection: () => ({ add: async (d) => { consultas.push(d); return { id: "c" + consultas.length }; }, get: async () => vacio, orderBy() { return this; } }) });
const fakeDb = { collection: () => ({ doc: docRef }) };
const fakeAdmin = { apps: [{}], initializeApp() {}, firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => n }, Timestamp: {} }), auth: () => ({}), storage: () => ({}) };
let respuestaGemini = ""; let ultimoPrompt = "";
class FakeAI { getGenerativeModel() { return { generateContent: async (c) => { ultimoPrompt = JSON.stringify(c); return { response: { text: () => respuestaGemini } }; } }; } }
const load = Module._load;
Module._load = function (r, ...a) { if (r === "firebase-admin") return fakeAdmin; if (r.startsWith("firebase-admin/")) return { getFirestore: () => fakeDb }; if (r === "@google/generative-ai") return { GoogleGenerativeAI: FakeAI }; return load.call(this, r, ...a); };
process.env.GCLOUD_PROJECT = "demo"; process.env.GEMINI_KEY = "k"; process.env.CLAUDE_KEY = "x";
const advertencias = []; console.warn = (m) => advertencias.push(String(m)); const consolaError = console.error; console.error = () => {};
const fns = require("../lib/index.js");
const { detectarIdioma, advertirIdiomaSalida } = require("../lib/arbitroIdioma.js");
const { fraseVeredicto, resolverRondaOral } = require("../lib/arbitroReparto.js");
const correr = async (fn, data, auth) => { try { return { ok: true, r: await fn.run({ auth, data, rawRequest: {}, acceptsStreaming: false }) }; } catch (e) { return { ok: false, code: e.code, details: e.details }; } };
const manana = () => new Date(Date.now() + 3600e3).toISOString();
const BASE = { docenteUid: "u", materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto", textoFuente: "Texto base.", expiresAt: manana() };

(async () => {
  // ── 2) Frase del veredicto ──
  t("fraseVeredicto es · pregunta total", "Tiene razón el equipo Rojos.", fraseVeredicto("pregunta", "total", "Rojos", "Azules"));
  t("fraseVeredicto en · pregunta total", "Team Rojos is right.", fraseVeredicto("pregunta", "total", "Rojos", "Azules", "en"));
  t("fraseVeredicto en · responde total", "Team Azules is right.", fraseVeredicto("responde", "total", "Rojos", "Azules", "en"));
  t("fraseVeredicto es · parcial", "Los dos equipos tienen parte de razón.", fraseVeredicto("pregunta", "parcial", "Rojos", "Azules"));
  t("fraseVeredicto en · parcial", "Both teams are partly right.", fraseVeredicto("responde", "parcial", "Rojos", "Azules", "en"));
  t("fraseVeredicto en · ambos", "Both teams are partly right.", fraseVeredicto("ambos", "total", "Rojos", "Azules", "en"));
  t("fraseVeredicto en · sin nombre", "Team that asked is right.", fraseVeredicto("pregunta", "total", "", "", "en"));
  const salida = { resultado: "A", calificacionRecomendada: "no", evaluacion: "The answer has a factual error." };
  const rEn = resolverRondaOral(salida, "Rojos: x", "Rojos", "Azules", "incorrecta", "en");
  t("resolverRondaOral en · veredicto armado por el código", "Team Rojos is right. The answer has a factual error.", rEn.valor.veredicto);
  t("resolverRondaOral en · el reparto no cambia (1/0)", "1/0", `${rEn.valor.reparto.puntosPregunta}/${rEn.valor.reparto.puntosResponde}`);
  const rEs = resolverRondaOral(salida, "Rojos: x", "Rojos", "Azules", "incorrecta");
  t("resolverRondaOral sin idioma · veredicto en español", "Tiene razón el equipo Rojos. The answer has a factual error.", rEs.valor.veredicto);

  // ── 3) Idioma de la salida ──
  const ES_TXT = "La respuesta es correcta porque el equipo explicó que el Nilo crecía cada año y por eso los campos eran fértiles.";
  const EN_TXT = "The answer is correct because the team explained that the Nile rose every year and that is why the fields were fertile.";
  t("detectarIdioma · español", "es", detectarIdioma(ES_TXT)); t("detectarIdioma · inglés", "en", detectarIdioma(EN_TXT));
  t("detectarIdioma · texto corto → null", "null", detectarIdioma("Keops")); t("detectarIdioma · no es texto → null", "null", detectarIdioma(undefined));
  t("detectarIdioma · números y nombres → null", "null", detectarIdioma("Keops Kefrén Micerinos 2560 2540 2510"));
  advertencias.length = 0;
  t("advertirIdiomaSalida · coincide → sin campos", "", advertirIdiomaSalida("x", "en", { a: EN_TXT }).join(","));
  t("advertirIdiomaSalida · coincide → sin advertencia", 0, advertencias.length);
  t("advertirIdiomaSalida · no coincide → campo", "a", advertirIdiomaSalida("x", "en", { a: ES_TXT, b: EN_TXT, c: "corto" }).join(","));
  const w = JSON.parse(advertencias[0]);
  t("advertencia · evento", "salida_modelo_idioma_distinto", w.evento); t("advertencia · idioma esperado", "en", w.esperado);
  // Punta a punta: sesión 'en', el modelo responde en español → la respuesta llega igual y queda la advertencia
  store.set("S_EN", { ...BASE, idioma: "en" }); store.set("S_ES", { ...BASE, idioma: "es" });
  const oral = (id) => ({ sessionId: id, modo: "juego_oral", conflicto: "Question: x", posicionA: "Rojos: a", posicionB: "Azules: b", equipoPregunta: "Rojos", equipoResponde: "Azules", calificacionPregunta: "incorrecta" });
  const json = (o) => JSON.stringify({ resultado: "A", elementosClave: "e", calificacionRecomendada: "no", evaluacion: ES_TXT, explicacion: ES_TXT, paraSeguirPensando: "¿Por qué el Nilo era importante para los campos de Egipto?", ...o });
  advertencias.length = 0; respuestaGemini = json({});
  let x = await correr(fns.requestVeredicto, oral("S_EN"));
  ok("sesión 'en' + modelo en español · NO bloquea (responde)", x.ok && x.r.puntosPregunta === 1, JSON.stringify(x).slice(0, 120));
  ok("sesión 'en' + modelo en español · deja una advertencia", advertencias.some((a) => a.includes("salida_modelo_idioma_distinto") && a.includes("runArbitro")));
  ok("sesión 'en' · el veredicto del código está en inglés", /^Team Rojos is right\./.test(x.r.veredicto), x.r.veredicto);
  advertencias.length = 0;
  x = await correr(fns.requestVeredicto, oral("S_ES"));
  ok("sesión 'es' + modelo en español · sin advertencia", x.ok && advertencias.length === 0);
  ok("sesión 'es' · el veredicto del código está en español", /^Tiene razón el equipo Rojos\./.test(x.r.veredicto), x.r.veredicto);
  advertencias.length = 0; respuestaGemini = json({ evaluacion: EN_TXT, explicacion: EN_TXT, paraSeguirPensando: "Why was the Nile so important for the fields of ancient Egypt?" });
  x = await correr(fns.requestVeredicto, oral("S_EN"));
  ok("sesión 'en' + modelo en inglés · sin advertencia", x.ok && advertencias.length === 0, advertencias[0]);

  // ── 4) Consignas según el idioma de la sesión ──
  const docente = { uid: "u1" };
  const datos = { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto", cantidad: 4, tipoPreguntas: "mixta" };
  respuestaGemini = "1. Pregunta uno\n2. Pregunta dos"; advertencias.length = 0;
  x = await correr(fns.generarConsignasArbitro, { ...datos, idioma: "en" }, docente);
  ok("generarConsignasArbitro · idioma 'en' manda el prompt en inglés", x.ok && ultimoPrompt.includes("You are an expert teacher of History for Secondary 3") && !ultimoPrompt.includes("Sos un docente"), ultimoPrompt.slice(0, 120));
  x = await correr(fns.generarConsignasArbitro, { ...datos, idioma: "es" }, docente);
  ok("generarConsignasArbitro · idioma 'es' manda el prompt en español", x.ok && ultimoPrompt.includes("Sos un docente experto en Historia para Secundaria 3 en Argentina"));
  x = await correr(fns.generarConsignasArbitro, datos, docente);
  ok("generarConsignasArbitro · sin idioma = español", x.ok && ultimoPrompt.includes("Sos un docente experto"));
  advertencias.length = 0; respuestaGemini = "1. ¿Por qué el Nilo era tan importante para los campos de Egipto en la antigüedad?\n2. ¿Cuál fue la causa principal de la construcción de las pirámides?";
  x = await correr(fns.generarConsignasArbitro, { ...datos, idioma: "en" }, docente);
  ok("generarConsignasArbitro · 'en' con preguntas en español · devuelve igual y advierte", x.ok && x.r.consignas.startsWith("1.") && advertencias.some((a) => a.includes("generarConsignasArbitro")));
  respuestaGemini = "¿Por qué crecía el Nilo?";
  x = await correr(fns.requestConsigna, { sessionId: "S_EN" }, docente);
  ok("requestConsigna · sesión 'en' manda el prompt en inglés", x.ok && ultimoPrompt.includes("Generate ONE SINGLE debate question for History students, Secondary 3"), ultimoPrompt.slice(0, 160));
  x = await correr(fns.requestConsigna, { sessionId: "S_ES" }, docente);
  ok("requestConsigna · sesión 'es' manda el prompt en español", x.ok && ultimoPrompt.includes("Generá UNA SOLA pregunta de debate para alumnos de Historia, Secundaria 3"));


  // ── 6) Casos de prueba del árbitro (casos-prueba-arbitro.json) y su script ──
  const { validarCasos, RUTA_CASOS } = require("./probar-casos-arbitro.cjs");
  const Pm = require("../lib/arbitroPromptEn.js");
  const datosCasos = JSON.parse(fs.readFileSync(RUTA_CASOS, "utf8"));
  t("casos-prueba-arbitro.json · sin errores de formato (12 casos, 4/4/4, en + es)", "", validarCasos(datosCasos, { detectarIdioma, MATERIA_EN: Pm.MATERIA_EN, NIVEL_EN: Pm.NIVEL_EN }).join(" | "));
  const malo = JSON.parse(JSON.stringify(datosCasos)); malo.casos[0].en.respuesta = "El Nilo dejaba limo fértil."; malo.casos[4].esperada = "completa";
  ok("la validación de los casos detecta errores (español en la versión en inglés; 5 «completa»)", validarCasos(malo, { detectarIdioma, MATERIA_EN: Pm.MATERIA_EN, NIVEL_EN: Pm.NIVEL_EN }).length >= 3);
  const { spawnSync } = require("child_process");
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "casos-"));
  const corrida = (env) => spawnSync(process.execPath, ["-r", path.join(__dirname, "fixtures/mock-gemini.cjs"), path.join(__dirname, "probar-casos-arbitro.cjs")], { env: { ...process.env, CASOS_SALIDA: tmp, GEMINI_API_KEY: "", GEMINI_KEY: "", ...env }, encoding: "utf8" });
  let r = corrida({});
  ok("sin GEMINI_API_KEY el script no llama al modelo, valida y termina bien", r.status === 0 && /No hay GEMINI_API_KEY/.test(r.stdout) && !fs.existsSync(path.join(tmp, "casos-prueba-arbitro.md")), r.stdout + r.stderr);
  r = corrida({ GEMINI_API_KEY: "clave-falsa" });
  ok("con clave (modelo simulado «siempre completa») envía los 24 casos y coinciden los 8 «completa»", r.status === 0 && /Coinciden con la calificación esperada: 8\/24 \(en: 4\/12 · es: 4\/12\)/.test(r.stdout), r.stdout.slice(-300) + r.stderr);
  ok("escribe el informe .md y .json sin la clave", fs.existsSync(path.join(tmp, "casos-prueba-arbitro.md")) && !fs.readFileSync(path.join(tmp, "casos-prueba-arbitro.json"), "utf8").includes("clave-falsa") && !r.stdout.includes("clave-falsa"));
  fs.rmSync(tmp, { recursive: true, force: true });

  // ── 5) Sin marcas pendientes ──
  const pendientes = [];
  (function recorrer(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/node_modules|lib|\.git/.test(e.name)) recorrer(p); } else if (/\.(ts|tsx)$/.test(e.name) && fs.readFileSync(p, "utf8").includes("i18n-etapa3")) pendientes.push(path.relative(ROOT, p)); } })(path.join(ROOT, "src"));
  (function recorrer(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isFile() && e.name.endsWith(".ts") && fs.readFileSync(p, "utf8").includes("i18n-etapa3")) pendientes.push(path.relative(ROOT, p)); } })(path.join(ROOT, "functions/src"));
  t("no quedan marcas «i18n-etapa3» en src/ ni functions/src/", "", pendientes.join(", "));

  console.table(filas.map((f, i) => ({ "#": i + 1, caso: f.caso.slice(0, 110), esperado: f.esperado.slice(0, 40).replace(/\n/g, "⏎"), obtenido: f.obtenido.slice(0, 40).replace(/\n/g, "⏎") })));
  console.log(`OK: ${filas.length} comprobaciones de la etapa 3.`);
})().catch((e) => { consolaError(e && e.stack ? String(e.message) : e); process.exit(1); });
