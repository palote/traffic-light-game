// Pruebas del backend de la etapa 1 del inglés (sin Firebase ni Gemini reales: todo simulado).
//   1) Idioma de la sesión: crearSesionArbitro lo guarda ('es' | 'en'; cualquier otra cosa o nada = 'es') y
//      getSesionArbitro lo devuelve (las sesiones viejas, sin el campo, cuentan como 'es').
//   2) La calificación como dato aparte: requestVeredicto y arbitrarDesacuerdo reciben `calificacionPregunta`
//      (completa | incompleta | incorrecta). El backend usa ese campo y, SOLO si falta o no es válido, lee la calificación
//      del texto de la Posición A («(calificó como …)»), como hasta ahora, para no romper partidas en curso.
//   3) El idioma elige el prompt: 'es' (o sin idioma) envía el de siempre; 'en' envía la versión en inglés (etapa 3).
//   4) Errores: cada HttpsError del árbitro lleva details.motivo, y cada motivo tiene su texto en es.ts y en.ts.
// Uso (desde functions/):  npm run build && node scripts/verificar-etapa1-backend.cjs
const Module = require("module");
const assert = require("assert");
const fs = require("fs");
const path = require("path");

// ── Firebase y Gemini simulados ──
const store = new Map(); // id de sesión → datos
let consultas = [];
const vacio = { empty: true, docs: [], exists: false, data: () => ({}) };
const docRef = (id) => ({
  get: async () => ({ exists: store.has(id), data: () => store.get(id), ref: { update: async () => {} } }),
  set: async (d) => { store.set(id, d); },
  update: async () => {},
  collection: () => ({ add: async (d) => { consultas.push(d); return { id: "c" + consultas.length }; }, get: async () => vacio, orderBy() { return this; } }),
});
const fakeDb = { collection: () => ({ doc: docRef }) };
const fakeAdmin = { apps: [{}], initializeApp() {}, firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => n }, Timestamp: {} }), auth: () => ({}), storage: () => ({}) };
let respuestaGemini = ""; let ultimoPrompt = "";
class FakeAI { getGenerativeModel() { return { generateContent: async (c) => { ultimoPrompt = JSON.stringify(c); return { response: { text: () => respuestaGemini } }; } }; } }
const load = Module._load;
Module._load = function (r, ...a) { if (r === "firebase-admin") return fakeAdmin; if (r.startsWith("firebase-admin/")) return { getFirestore: () => fakeDb }; if (r === "@google/generative-ai") return { GoogleGenerativeAI: FakeAI }; return load.call(this, r, ...a); };
process.env.GCLOUD_PROJECT = "demo"; process.env.GEMINI_KEY = "k"; process.env.CLAUDE_KEY = "x";
console.warn = () => {}; const ce = console.error; console.error = () => {};
const fns = require("../lib/index.js");
const { normalizarIdiomaSesion } = require("../lib/arbitroIdioma.js");
const { buildArbitroPrompt, buildPromptPreguntaPropia } = require("../lib/arbitroPrompt.js");

const manana = () => new Date(Date.now() + 3600e3).toISOString();
const ayer = () => new Date(Date.now() - 3600e3).toISOString();
const BASE = { docenteUid: "u", materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto", textoFuente: "Texto base.", expiresAt: manana() };
const correr = async (fn, data, auth) => { try { return { ok: true, r: await fn.run({ auth, data, rawRequest: {}, acceptsStreaming: false }) }; } catch (e) { return { ok: false, code: e.code, details: e.details, message: e.message }; } };
const veredicto = (data) => correr(fns.requestVeredicto, data);
const json = (o) => JSON.stringify({ resultado: "A", elementosClave: "e", evaluacion: "Evaluación de la respuesta.", explicacion: "e", paraSeguirPensando: "p", ...o });
const oral = (extra = {}, sessionId = "S1") => ({ sessionId, modo: "juego_oral", conflicto: "Pregunta: x", posicionA: "Rojos: …", posicionB: "Azules (no acepta la calificación): …", equipoPregunta: "Rojos", equipoResponde: "Azules", ...extra });

(async () => {
  const filas = [];
  const t = (caso, esperado, obtenido) => { filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) }); assert.strictEqual(String(obtenido), String(esperado), caso); };

  // ── 1) Idioma de la sesión ──
  for (const [entrada, esperado] of [["en", "en"], ["es", "es"], [undefined, "es"], [null, "es"], ["fr", "es"], ["EN", "es"], ["", "es"], [1, "es"], [{}, "es"]])
    t(`normalizarIdiomaSesion(${JSON.stringify(entrada)})`, esperado, normalizarIdiomaSesion(entrada));
  const base = { materia: "Historia", nivel: "Secundaria", anio: "3°", tema: "Egipto" };
  for (const [enviado, guardado] of [["en", "en"], ["es", "es"], [undefined, "es"], ["fr", "es"]]) {
    const c = await correr(fns.crearSesionArbitro, { ...base, ...(enviado === undefined ? {} : { idioma: enviado }) }, { uid: "u1" });
    assert.ok(c.ok, "crearSesionArbitro falló: " + c.code);
    t(`crearSesionArbitro idioma=${JSON.stringify(enviado)} → se guarda`, guardado, store.get(c.r.id).idioma);
    const g = await correr(fns.getSesionArbitro, { sessionId: c.r.id });
    t(`getSesionArbitro devuelve el idioma (${guardado})`, guardado, g.r.idioma);
  }
  store.set("VIEJA", { ...BASE }); // sin el campo `idioma`
  t("getSesionArbitro · sesión vieja sin idioma → 'es'", "es", (await correr(fns.getSesionArbitro, { sessionId: "VIEJA" })).r.idioma);
  store.set("RARA", { ...BASE, idioma: "fr" });
  t("getSesionArbitro · idioma inválido guardado → 'es'", "es", (await correr(fns.getSesionArbitro, { sessionId: "RARA" })).r.idioma);

  // ── 2) La calificación como dato aparte ──
  store.set("S1", { ...BASE });
  const fila = (x) => `${x.r.tieneRazon}/${x.r.grado}/${x.r.puntosPregunta}/${x.r.puntosResponde}`;
  // a) Campo nuevo y Posición A SIN etiqueta (el front nuevo)
  respuestaGemini = json({ calificacionRecomendada: "incompleta" });
  let x = await veredicto(oral({ calificacionPregunta: "incompleta" }));
  assert.ok(x.ok, "con el campo nuevo debe funcionar: " + x.code);
  t("campo nuevo 'incompleta' (sin etiqueta) → pregunta/parcial 0,75/0,25", "pregunta/parcial/0.75/0.25", fila(x));
  respuestaGemini = json({ calificacionRecomendada: "no" });
  consultas = [];
  x = await veredicto(oral({ calificacionPregunta: "incorrecta" }));
  t("campo nuevo 'incorrecta' ≡ 'no' → pregunta/total 1/0", "pregunta/total/1/0", fila(x));
  t("se guarda la calificación de quien preguntó normalizada ('no')", "no", consultas[0].calificacionPregunta);
  t("la respuesta trae calificacionPregunta", "no", x.r.calificacionPregunta);
  for (const [campo, modelo, esp] of [["completa", "completa", "responde/total/0/1"], ["completa", "incompleta", "pregunta/total/1/0"], ["incompleta", "completa", "responde/total/0/1"], ["incorrecta", "incompleta", "responde/parcial/0.25/0.75"]]) {
    respuestaGemini = json({ calificacionRecomendada: modelo });
    x = await veredicto(oral({ calificacionPregunta: campo }));
    t(`campo '${campo}' contra árbitro '${modelo}'`, esp, fila(x));
  }
  // b) El campo manda sobre la etiqueta del texto (aunque no coincidan)
  respuestaGemini = json({ calificacionRecomendada: "incompleta" });
  x = await veredicto(oral({ calificacionPregunta: "completa", posicionA: "Rojos (calificó como no): …" }));
  t("campo 'completa' + etiqueta 'no' → se usa el campo (pregunta/total)", "pregunta/total/1/0", fila(x));
  // c) Sin campo: se lee la etiqueta de la Posición A, como hasta ahora (partidas en curso con el front viejo)
  x = await veredicto(oral({ posicionA: "Rojos (calificó como incompleta): …" }));
  assert.ok(x.ok, "el respaldo con la etiqueta debe funcionar");
  t("sin campo + etiqueta 'incompleta' (front viejo) → pregunta/parcial", "pregunta/parcial/0.75/0.25", fila(x));
  x = await veredicto(oral({ posicionA: "Rojos (calificó como no): …" }));
  t("sin campo + etiqueta 'no' contra árbitro 'incompleta' → responde/parcial", "responde/parcial/0.25/0.75", fila(x));
  // d) Campo inválido: se trata como si faltara
  respuestaGemini = json({ calificacionRecomendada: "no" });
  for (const malo of ["regular", "pasada", "", 7, null]) {
    x = await veredicto(oral({ calificacionPregunta: malo, posicionA: "Rojos (calificó como no): …" }));
    t(`campo inválido ${JSON.stringify(malo)} + etiqueta → se usa la etiqueta`, "pregunta/total/1/0", fila(x));
  }
  // e) Ni campo ni etiqueta (o campo inválido sin etiqueta): «Reintentar» y no se registra la consulta
  consultas = [];
  for (const [nombre, datos] of [["sin campo ni etiqueta", oral()], ["campo inválido sin etiqueta", oral({ calificacionPregunta: "regular" })]]) {
    x = await veredicto(datos);
    t(`${nombre} · código`, "unavailable", x.code); t(`${nombre} · motivo`, "respuesta_no_clara", x.details && x.details.motivo);
  }
  t("esos casos no registran la consulta", 0, consultas.length);
  // f) Fuera de tema no necesita calificación de quien preguntó
  respuestaGemini = JSON.stringify({ resultado: "fuera_de_tema", calificacionRecomendada: "no", veredicto: "Este desacuerdo no corresponde al tema de la sesión.", explicacion: "e", paraSeguirPensando: "p" });
  x = await veredicto(oral());
  t("fuera de tema sin calificación de quien preguntó → 0/0", "true/0/0", `${x.ok}/${x.r && x.r.puntosPregunta}/${x.r && x.r.puntosResponde}`);
  // g) arbitrarDesacuerdo acepta el mismo campo (camino sin juego oral: no reparte, no falla)
  respuestaGemini = json({ resultado: "A" });
  const ad = await correr(fns.arbitrarDesacuerdo, { sessionId: "S1", desacuerdo: "x", posicionA: "a", posicionB: "b", calificacionPregunta: "incompleta" });
  assert.ok(ad.ok, "arbitrarDesacuerdo con el campo nuevo falló: " + ad.code);
  t("arbitrarDesacuerdo acepta calificacionPregunta", "A", ad.r.resultado);
  // h) El prompt NO lleva la calificación de quien preguntó, venga por el campo o por la etiqueta
  respuestaGemini = json({ calificacionRecomendada: "incompleta" });
  for (const datos of [oral({ calificacionPregunta: "completa" }), oral({ posicionA: "Rojos (calificó como completa): …" })]) {
    await veredicto(datos);
    assert.ok(ultimoPrompt.includes("Posición A: Rojos: …"), "la Posición A llega sin etiqueta");
    assert.ok(!/calific[óo] como/i.test(ultimoPrompt), "el prompt no debe traer «(calificó como …)»");
  }
  filas.push({ caso: "el prompt no trae la calificación de quien preguntó (campo o etiqueta)", esperado: "ok", obtenido: "ok" });

  // ── 3) El idioma elige el prompt: 'es' (o sin idioma) = el de siempre; 'en' = la versión en inglés (etapa 3) ──
  const p = { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto", desacuerdo: "d", posicionA: "Rojos: a", posicionB: "Azules: b", textoFuente: "Texto." };
  for (const [nombre, extra] of [["no oral", {}], ["juego oral", { esJuegoOral: true, equipoPregunta: "Rojos", equipoResponde: "Azules" }]]) {
    for (const idioma of ["es", undefined, "fr"]) assert.strictEqual(buildArbitroPrompt({ ...p, ...extra, idioma }), buildArbitroPrompt({ ...p, ...extra }), `buildArbitroPrompt ${nombre} idioma=${idioma}`);
    const en = buildArbitroPrompt({ ...p, ...extra, idioma: "en" });
    assert.ok(en.startsWith("You are an expert pedagogical referee in History") && en.includes("Position A:") && !en.includes("Sos un árbitro"), `buildArbitroPrompt ${nombre} idioma=en debe ser la versión en inglés`);
  }
  const q = { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto", pregunta: "¿Quién fue Keops?", textoFuente: "Texto." };
  assert.strictEqual(buildPromptPreguntaPropia({ ...q, idioma: "es" }), buildPromptPreguntaPropia(q), "buildPromptPreguntaPropia idioma=es");
  assert.ok(buildPromptPreguntaPropia({ ...q, idioma: "en" }).startsWith("You are a relevance checker"), "buildPromptPreguntaPropia idioma=en");
  filas.push({ caso: "buildArbitroPrompt y buildPromptPreguntaPropia: 'es' / sin idioma = el original; 'en' = versión en inglés", esperado: "ok", obtenido: "ok" });
  // De punta a punta: la sesión 'es' manda a Gemini el prompt en español y la 'en' el prompt en inglés
  store.set("S_ES", { ...BASE, idioma: "es", textoFuente: "Texto base." }); store.set("S_EN", { ...BASE, idioma: "en", textoFuente: "Texto base." });
  const prompts = {};
  for (const [id, clave] of [["S_ES", "es"], ["S_EN", "en"]]) { respuestaGemini = json({ calificacionRecomendada: "incompleta" }); await veredicto(oral({ calificacionPregunta: "incompleta" }, id)); prompts[clave] = ultimoPrompt; }
  assert.ok(prompts.es.includes("Sos un árbitro pedagógico") && !prompts.es.includes("You are an expert"), "la sesión 'es' debe mandar el prompt en español");
  assert.ok(prompts.en.includes("You are an expert pedagogical referee") && !prompts.en.includes("Sos un árbitro"), "la sesión 'en' debe mandar el prompt en inglés");
  store.set("S_ES", { ...store.get("S_ES"), permitirPreguntasPropias: true }); store.set("S_EN", { ...store.get("S_EN"), permitirPreguntasPropias: true });
  const pp = {};
  for (const [id, clave] of [["S_ES", "es"], ["S_EN", "en"]]) { respuestaGemini = '{"pertinente": true, "motivo": "ok"}'; const v = await correr(fns.validarPreguntaPropia, { sessionId: id, pregunta: "¿Quién fue Keops?" }); assert.ok(v.ok, "validarPreguntaPropia falló: " + v.code); pp[clave] = ultimoPrompt; }
  assert.ok(pp.es.includes("Sos un verificador") && pp.en.includes("You are a relevance checker"), "la validación debe usar el prompt del idioma de la sesión");
  filas.push({ caso: "veredicto y validación de preguntas propias: la sesión 'es' envía el prompt en español y la 'en' el prompt en inglés", esperado: "ok", obtenido: "ok" });

  // ── 4) Errores con details.motivo ──
  const con = async (nombre, fn, data, auth, codigo, motivo) => { const r = await correr(fn, data, auth); t(`${nombre} · código`, codigo, r.code); t(`${nombre} · motivo`, motivo, r.details && r.details.motivo); };
  store.set("VENCIDA", { ...BASE, expiresAt: ayer() });
  store.set("SIN_PROPIAS", { ...BASE, permitirPreguntasPropias: false });
  await con("crearSesionArbitro sin campos (ya no se vuelve «internal»)", fns.crearSesionArbitro, { materia: "x" }, undefined, "invalid-argument", "datos_incompletos");
  await con("getSesionArbitro sin sessionId", fns.getSesionArbitro, {}, undefined, "invalid-argument", "datos_incompletos");
  await con("getSesionArbitro inexistente", fns.getSesionArbitro, { sessionId: "NO" }, undefined, "not-found", "sesion_no_encontrada");
  await con("getSesionArbitro vencida", fns.getSesionArbitro, { sessionId: "VENCIDA" }, undefined, "deadline-exceeded", "sesion_expirada");
  await con("requestVeredicto vencida", fns.requestVeredicto, oral({}, "VENCIDA"), undefined, "failed-precondition", "sesion_expirada");
  await con("requestVeredicto inexistente", fns.requestVeredicto, oral({}, "NO"), undefined, "not-found", "sesion_no_encontrada");
  await con("requestVeredicto sin datos", fns.requestVeredicto, { sessionId: "S1" }, undefined, "invalid-argument", "datos_incompletos");
  await con("arbitrarDesacuerdo sin datos", fns.arbitrarDesacuerdo, { sessionId: "S1" }, undefined, "invalid-argument", "datos_incompletos");
  await con("generarConsignasArbitro sin login", fns.generarConsignasArbitro, {}, undefined, "unauthenticated", "login_requerido");
  await con("requestConsigna sin login", fns.requestConsigna, { sessionId: "S1" }, undefined, "unauthenticated", "login_requerido");
  await con("validarPreguntaPropia · pregunta muy corta", fns.validarPreguntaPropia, { sessionId: "S1", pregunta: "ab" }, undefined, "invalid-argument", "pregunta_longitud");
  await con("validarPreguntaPropia · sesión sin preguntas propias", fns.validarPreguntaPropia, { sessionId: "SIN_PROPIAS", pregunta: "¿Quién fue Keops?" }, undefined, "failed-precondition", "preguntas_propias_desactivadas");
  await con("validarPreguntaPropia · sesión vencida", fns.validarPreguntaPropia, { sessionId: "VENCIDA", pregunta: "¿Quién fue Keops?" }, undefined, "failed-precondition", "sesion_expirada");
  await con("listarTodasSesionesAdmin sin ser admin", fns.listarTodasSesionesAdmin, {}, { uid: "otro" }, "permission-denied", "solo_admin");
  await con("generarInformeSesion sin login", fns.generarInformeSesion, { sessionId: "S1" }, undefined, "unauthenticated", "login_requerido");
  await con("generarInformeSesion de otro docente", fns.generarInformeSesion, { sessionId: "S1" }, { uid: "otro" }, "permission-denied", "sesion_de_otro_docente");

  // Todos los HttpsError de las funciones del árbitro llevan motivo, y cada motivo tiene texto en es.ts y en.ts
  const fuente = fs.readFileSync(path.join(__dirname, "../src/index.ts"), "utf8").replace(/\r\n/g, "\n");
  const nombres = ["crearSesionArbitro", "getSesionArbitro", "arbitrarDesacuerdo", "requestVeredicto", "generarConsignasArbitro", "requestConsigna",
    "generarInformeSesion", "guardarInformeArbitro", "getInformesMetacognicion", "registrarRonda", "listarRondasSesion", "corregirRonda", "validarPreguntaPropia", "listarTodasSesionesAdmin"];
  const cortes = [...fuente.matchAll(/^(?:export const (\w+) = onCall\(|(?:async )?function (\w+)\()/gm)];
  const segmentos = {};
  cortes.forEach((m, i) => { segmentos[m[1] || m[2]] = fuente.slice(m.index, i + 1 < cortes.length ? cortes[i + 1].index : fuente.length); });
  const motivos = new Set(); let total = 0;
  for (const n of [...nombres, "runArbitro", "exigirDocenteDeSesion"]) {
    const seg = segmentos[n]; assert.ok(seg, "no encontré la función " + n);
    const lanzados = (seg.match(/new HttpsError\(/g) || []).length;
    const conMotivo = (seg.match(/\{ motivo: "(\w+)" \}/g) || []).length;
    assert.strictEqual(conMotivo, lanzados, `${n}: ${lanzados - conMotivo} HttpsError sin details.motivo`);
    for (const m of seg.matchAll(/\{ motivo: "(\w+)" \}/g)) motivos.add(m[1]);
    total += lanzados;
  }
  const dic = (f) => fs.readFileSync(path.join(__dirname, "../../src/i18n/" + f), "utf8");
  for (const m of motivos) for (const f of ["es.ts", "en.ts"]) {
    // «respuesta_no_clara» ya tiene su texto propio (errorNoClearAnswer); el resto, errorMotivo_<motivo>
    if (m === "respuesta_no_clara") continue;
    assert.ok(dic(f).includes(`errorMotivo_${m}:`), `falta errorMotivo_${m} en ${f}`);
  }
  filas.push({ caso: `${total} HttpsError del árbitro con details.motivo; ${motivos.size} motivos con texto en es.ts y en.ts`, esperado: "ok", obtenido: "ok" });

  console.error = ce; console.table(filas); console.log(`OK: ${filas.length} comprobaciones del backend de la etapa 1.`); process.exit(0);
})().catch((e) => { console.error = ce; console.error("FALLÓ:", e.message); process.exit(1); });
