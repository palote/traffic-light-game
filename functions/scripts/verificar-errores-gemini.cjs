// Prueba del manejo de errores de Gemini (sin red, sin Firebase real, con Gemini simulado).
//   - 402, 429, 404, 5xx, red y timeout  -> HttpsError "unavailable" con el mensaje exacto
//   - el log lleva solo {estado, mensaje} y una etiqueta de tipo; nunca el prompt ni el texto del alumno
//   - los HttpsError propios (login, permisos, sesión inexistente/vencida) pasan sin reclasificar
//   - una respuesta que no es JSON sigue el camino de siempre (no es un error de servicio)
// Uso (desde functions/):  npm run build && node scripts/verificar-errores-gemini.cjs
const Module = require("module");
const assert = require("assert");

const DUENO = "uid-dueno", OTRO = "uid-otro";
const MENSAJE_EXACTO = "El servicio de IA no está disponible en este momento, probá de nuevo en unos minutos.";
const SECRETO_ALUMNO = "TEXTO-SECRETO-DEL-ALUMNO-9f3";
const URL_G = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent";

const sesion = (extra = {}) => ({ docenteUid: DUENO, materia: "Historia", nivel: "Secundaria", anio: "3°", tema: "Egipto",
  expiresAt: new Date(Date.now() + 3600e3).toISOString(), ...extra });
const SESIONES = { S1: sesion(), VENCIDA: sesion({ expiresAt: new Date(Date.now() - 3600e3).toISOString() }) };
const consultasDocs = [{ data: () => ({ resultado: "A", materia: "Historia", timestamp: new Date().toISOString(), desacuerdo: "d", posicionA: "a", posicionB: "b" }) }];
let consultasAgregadas = 0;
const vacio = { empty: true, docs: [], exists: false, data: () => ({}) };
const docRef = (id) => ({
  get: async () => SESIONES[id] ? { exists: true, data: () => SESIONES[id] } : { exists: false, data: () => undefined },
  update: async () => {}, set: async () => {},
  collection: (sub) => ({
    orderBy: () => ({ get: async () => ({ empty: false, docs: consultasDocs }) }),
    get: async () => sub === "consultas" ? { empty: false, docs: consultasDocs } : vacio,
    add: async () => { consultasAgregadas++; },
  }),
});
const fakeDb = { collection: () => ({ doc: docRef, where: () => ({ get: async () => vacio, orderBy: () => ({ get: async () => vacio, limit: () => ({ get: async () => vacio }) }) }) }) };
const fakeAdmin = { apps: [{}], initializeApp() {}, firestore: Object.assign(() => fakeDb, { FieldValue: {}, Timestamp: {} }), auth: () => ({}), storage: () => ({}) };

// ── Gemini simulado: lo que haga falta en cada caso ──
let comportamientoGemini = null; // () => string (texto) | lanza
let promptsRecibidos = [];
class FakeGoogleGenerativeAI {
  constructor() {}
  getGenerativeModel(o) { this.modelo = o.model; return { generateContent: async (c) => {
    promptsRecibidos.push(typeof c === "string" ? c : JSON.stringify(c));
    const t = await comportamientoGemini();
    return { response: { text: () => t } };
  } }; }
}
class FetchError extends Error { constructor(status, statusText, msg) {
  super(`Error fetching from ${URL_G}: [${status} ${statusText}] ${msg}`); this.status = status; this.statusText = statusText; } }

const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === "firebase-admin") return fakeAdmin;
  if (request.startsWith("firebase-admin/")) return { getFirestore: () => fakeDb };
  if (request === "@google/generative-ai") return { GoogleGenerativeAI: FakeGoogleGenerativeAI };
  return load.call(this, request, ...rest);
};
process.env.GCLOUD_PROJECT = "demo"; process.env.GEMINI_KEY = "AIzaFAKEFAKEFAKEFAKEFAKEFAKEFAKE12345"; process.env.CLAUDE_KEY = "x";

// ── Captura de logs (logger de firebase-functions y console) ──
const ff = require("firebase-functions");
const logs = [];
ff.logger.error = (...a) => logs.push({ via: "logger.error", args: a });
const ce = console.error; console.error = (...a) => logs.push({ via: "console.error", args: a });
console.warn = () => {}; // silencio avisos propios de firebase-functions

const fns = require("../lib/index.js");
const au = (uid) => ({ uid, token: {} });
async function llamar(fn, auth, data) {
  try { const r = await fns[fn].run({ auth, data, rawRequest: {}, acceptsStreaming: false }); return { ok: true, r }; }
  catch (e) { return { ok: false, code: e.code, message: e.message, details: e.details }; }
}
const datosVeredicto = { sessionId: "S1", conflicto: `Pregunta de prueba ${SECRETO_ALUMNO}`, posicionA: `A dice ${SECRETO_ALUMNO}`, posicionB: `B dice ${SECRETO_ALUMNO}`, modo: "juego_oral" };
const filas = [];
const fila = (caso, esperado, obtenido) => { filas.push({ caso, esperado, obtenido }); assert.strictEqual(obtenido, esperado, `${caso}: esperado ${esperado}, dio ${obtenido}`); };
const logsGemini = () => logs.filter((l) => l.via === "logger.error");

(async () => {
  // 1) Errores de Gemini -> unavailable con mensaje exacto + log seguro
  const errores = [
    ["402 saldo", new FetchError(402, "Payment Required", "Billing account problem"), 402, "saldo/402"],
    ["429 cuota", new FetchError(429, "Too Many Requests", "Quota exceeded"), 429, "cuota/429"],
    ["404 modelo", new FetchError(404, "Not Found", "models/xyz is not found"), 404, "modelo no encontrado/404"],
    ["503 otro", new FetchError(503, "Service Unavailable", "The model is overloaded"), 503, "otro"],
    ["red (fetch failed)", Object.assign(new Error(`Error fetching from ${URL_G}: fetch failed`), {}), null, "otro"],
    ["timeout (abort)", Object.assign(new Error(`Request aborted when fetching ${URL_G}: The operation was aborted`), { name: "GoogleGenerativeAIAbortError" }), null, "otro"],
  ];
  for (const fnNombre of ["requestVeredicto", "arbitrarDesacuerdo"]) {
    for (const [nombre, err, estado, etiqueta] of errores) {
      logs.length = 0; comportamientoGemini = async () => { throw err; };
      const datos = fnNombre === "requestVeredicto" ? datosVeredicto : { sessionId: "S1", desacuerdo: datosVeredicto.conflicto, posicionA: datosVeredicto.posicionA, posicionB: datosVeredicto.posicionB };
      const r = await llamar(fnNombre, undefined, datos);
      fila(`${fnNombre} · ${nombre} · código`, "unavailable", r.code);
      fila(`${fnNombre} · ${nombre} · mensaje exacto`, MENSAJE_EXACTO, r.message);
      assert.ok(!(r.details && r.details.motivo), "no debe llevar el motivo de 'respuesta no clara'");
      const l = logsGemini();
      assert.strictEqual(l.length, 1, "debe haber un solo logger.error");
      assert.ok(l[0].args[0].includes(`[${etiqueta}]`), `etiqueta esperada [${etiqueta}], log: ${l[0].args[0]}`);
      assert.deepStrictEqual(Object.keys(l[0].args[1]).sort(), ["estado", "mensaje"], "el log lleva solo estado y mensaje");
      assert.strictEqual(l[0].args[1].estado, estado);
      assert.ok(!/generativelanguage|Error fetching from/.test(l[0].args[1].mensaje), "el mensaje no debe traer la URL del SDK");
    }
  }
  // Otras funciones que llaman a Gemini
  comportamientoGemini = async () => { throw new FetchError(429, "Too Many Requests", "Quota exceeded"); };
  fila("generarConsignasArbitro · 429", "unavailable", (await llamar("generarConsignasArbitro", au(DUENO), { materia: "H", nivel: "S", anio: "3", tema: "T" })).code);
  fila("requestConsigna · 429", "unavailable", (await llamar("requestConsigna", au(DUENO), { sessionId: "S1" })).code);
  const mi = await llamar("generarInformeSesion", au(DUENO), { sessionId: "S1", forceRegenerar: true });
  fila("generarInformeSesion · 429 · código", "unavailable", mi.code); fila("generarInformeSesion · 429 · mensaje exacto", MENSAJE_EXACTO, mi.message);
  fila("generatePlanificacion · 429", "unavailable", (await llamar("generatePlanificacion", undefined, { materia: "Hist", eje: "Egipto", nivel: "Sec", duracion: "Anual", modalidad: "Presencial" })).code);

  // 2) El prompt y el texto del alumno no están en NINGÚN log
  const todo = JSON.stringify(logs);
  assert.ok(!todo.includes(SECRETO_ALUMNO), "el log contiene texto del alumno");
  assert.ok(!todo.includes("Sos un árbitro") && !todo.includes("TEXTO BASE") && !todo.includes("Posición A:"), "el log contiene el prompt");
  assert.ok(promptsRecibidos.some((p) => p.includes(SECRETO_ALUMNO)), "(control) el prompt sí llegó a Gemini con el texto del alumno");
  assert.ok(!todo.includes("AIzaFAKE"), "el log contiene la clave");
  fila("el log no contiene prompt, texto del alumno ni clave", "ok", "ok");

  // 3) HttpsError propios: pasan sin tocar, aunque Gemini esté caído
  comportamientoGemini = async () => { throw new FetchError(402, "Payment Required", "x"); };
  logs.length = 0;
  fila("requestVeredicto sesión inexistente (Gemini caído)", "not-found", (await llamar("requestVeredicto", undefined, { ...datosVeredicto, sessionId: "NOPE" })).code);
  fila("requestVeredicto sesión vencida (Gemini caído)", "failed-precondition", (await llamar("requestVeredicto", undefined, { ...datosVeredicto, sessionId: "VENCIDA" })).code);
  fila("requestVeredicto faltan datos (Gemini caído)", "invalid-argument", (await llamar("requestVeredicto", undefined, { sessionId: "S1" })).code);
  fila("generarConsignasArbitro sin login (Gemini caído)", "unauthenticated", (await llamar("generarConsignasArbitro", undefined, { materia: "H", nivel: "S", anio: "3", tema: "T" })).code);
  fila("requestConsigna sin login (Gemini caído)", "unauthenticated", (await llamar("requestConsigna", undefined, { sessionId: "S1" })).code);
  fila("generarInformeSesion sin login (Gemini caído)", "unauthenticated", (await llamar("generarInformeSesion", undefined, { sessionId: "S1" })).code);
  fila("generarInformeSesion docente ajeno (Gemini caído)", "permission-denied", (await llamar("generarInformeSesion", au(OTRO), { sessionId: "S1" })).code);
  assert.strictEqual(logsGemini().length, 0, "los errores propios no deben registrarse como errores de Gemini");
  fila("errores propios: sin log de Gemini", "ok", "ok");

  // 4) Respuesta que NO es JSON: camino de siempre
  comportamientoGemini = async () => "esto no es json, es texto suelto";
  logs.length = 0; consultasAgregadas = 0;
  const nj = await llamar("requestVeredicto", undefined, datosVeredicto);
  fila("respuesta no JSON · código", "unavailable", nj.code);
  fila("respuesta no JSON · mensaje de siempre", "El árbitro no pudo dar una respuesta clara. Probá de nuevo.", nj.message);
  fila("respuesta no JSON · marcada como respuesta_no_clara", "respuesta_no_clara", nj.details && nj.details.motivo);
  fila("respuesta no JSON · no se registra la consulta", "0", String(consultasAgregadas));
  fila("respuesta no JSON · no es 'error de servicio' (sin logger.error)", "0", String(logsGemini().length));
  comportamientoGemini = async () => JSON.stringify({ resultado: "A", calificacionRecomendada: "completa", veredicto: "v", explicacion: "e" }); // oral sin tieneRazon/grado
  const sr = await llamar("requestVeredicto", undefined, datosVeredicto);
  fila("juego oral sin tieneRazon/grado · mismo camino", "respuesta_no_clara", sr.details && sr.details.motivo);
  // JSON válido sigue andando
  comportamientoGemini = async () => JSON.stringify({ resultado: "B", calificacionRecomendada: "completa", tieneRazon: "responde", grado: "parcial", veredicto: "v", explicacion: "e", paraSeguirPensando: "p" });
  consultasAgregadas = 0;
  const okr = await llamar("requestVeredicto", undefined, datosVeredicto);
  fila("JSON válido · devuelve el veredicto", "B", okr.ok && okr.r.resultado); fila("JSON válido · reparto calculado por el código (responde parcial → 0,25/0,75)", "0.25/0.75", okr.ok && `${okr.r.puntosPregunta}/${okr.r.puntosResponde}`); fila("JSON válido · se registra la consulta", "1", String(consultasAgregadas));
  // Informe con respuesta no JSON: informe de respaldo, como siempre
  comportamientoGemini = async () => "texto que no es json";
  const inf = await llamar("generarInformeSesion", au(DUENO), { sessionId: "S1", forceRegenerar: true });
  fila("generarInformeSesion · respuesta no JSON · informe de respaldo", "No se pudo generar el análisis completo.", inf.ok && inf.r.resumenEjecutivo);

  console.error = ce;
  console.table(filas);
  console.log(`OK: ${filas.length} comprobaciones.`);
  process.exit(0);
})().catch((e) => { console.error = ce; console.error("FALLÓ:", e.message); process.exit(1); });
