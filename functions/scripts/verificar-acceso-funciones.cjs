// Prueba de acceso (sin Firebase real ni Gemini): carga functions/lib/index.js con
// firebase-admin simulado y llama a las funciones como lo haría un cliente.
//   - generarConsignasArbitro / requestConsigna: sin login -> "unauthenticated"
//   - generarInformeSesion: sin login -> "unauthenticated"; docente ajeno -> "permission-denied";
//     dueño -> pasa la autorización (corta después, sin consultas); admin -> pasa.
// Uso (desde functions/):  npm run build && node scripts/verificar-acceso-funciones.cjs
const Module = require("module");
const assert = require("assert");

const DUENO = "uid-dueno", OTRO = "uid-otro", ADMIN = "P2lU12xoCxMkZ0AdZdMoGGksJ5o1";
const SESION = { docenteUid: DUENO, materia: "Historia", nivel: "Secundaria", anio: "3°", tema: "Egipto", expiresAt: new Date(Date.now() + 3600e3).toISOString() };
const vacio = { empty: true, docs: [], exists: false, data: () => ({}) };
const docRef = (existe) => ({ get: async () => existe ? { exists: true, data: () => SESION } : { exists: false, data: () => undefined },
  collection: () => ({ orderBy: () => ({ get: async () => vacio }), get: async () => vacio }), set: async () => {}, update: async () => {} });
const fakeDb = { collection: () => ({ doc: (id) => docRef(id === "S1"), where: () => ({ get: async () => vacio, orderBy: () => ({ get: async () => vacio, limit: () => ({ get: async () => vacio }) }) }) }) };
const fakeAdmin = { apps: [{}], initializeApp() {}, firestore: Object.assign(() => fakeDb, { FieldValue: { serverTimestamp: () => "ts", increment: (n) => n, arrayUnion: (...a) => a }, Timestamp: { now: () => ({}), fromDate: (d) => d } }),
  auth: () => ({}), storage: () => ({}) };

const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === "firebase-admin" || request.startsWith("firebase-admin/")) return request === "firebase-admin" ? fakeAdmin : { getFirestore: () => fakeDb, FieldValue: fakeAdmin.firestore.FieldValue, Timestamp: fakeAdmin.firestore.Timestamp };
  return load.call(this, request, ...rest);
};
process.env.GCLOUD_PROJECT = "demo"; process.env.GEMINI_KEY = "x"; process.env.CLAUDE_KEY = "x";
const fns = require("../lib/index.js");

async function codigo(fn, auth, data) {
  try { await fns[fn].run({ auth, data, rawRequest: {}, acceptsStreaming: false }); return "ok"; }
  catch (e) { return e.code || ("ERR:" + e.message); }
}
const au = (uid) => ({ uid, token: {} });

(async () => {
  const filas = [];
  const t = async (nombre, fn, auth, data, esperado) => { const r = await codigo(fn, auth, data); filas.push([nombre, esperado, r]); assert.strictEqual(r, esperado, `${nombre}: esperado ${esperado}, dio ${r}`); };

  await t("generarConsignasArbitro sin login", "generarConsignasArbitro", undefined, { materia: "H", nivel: "S", anio: "3", tema: "T" }, "unauthenticated");
  await t("generarConsignasArbitro con login (pasa el login; faltan datos)", "generarConsignasArbitro", au(DUENO), {}, "invalid-argument");
  await t("requestConsigna sin login", "requestConsigna", undefined, { sessionId: "S1" }, "unauthenticated");
  await t("requestConsigna con login (pasa el login; falta sessionId)", "requestConsigna", au(DUENO), {}, "invalid-argument");
  await t("generarInformeSesion sin login", "generarInformeSesion", undefined, { sessionId: "S1" }, "unauthenticated");
  await t("generarInformeSesion docente ajeno", "generarInformeSesion", au(OTRO), { sessionId: "S1" }, "permission-denied");
  await t("generarInformeSesion sesión inexistente", "generarInformeSesion", au(DUENO), { sessionId: "NOPE" }, "not-found");
  await t("generarInformeSesion dueño (autorizado; sin consultas)", "generarInformeSesion", au(DUENO), { sessionId: "S1" }, "failed-precondition");
  await t("generarInformeSesion admin (autorizado; sin consultas)", "generarInformeSesion", au(ADMIN), { sessionId: "S1" }, "failed-precondition");
  console.table(filas.map(([a, b, c]) => ({ caso: a, esperado: b, obtenido: c })));
  console.log("OK: todas las reglas de acceso se cumplen.");
  process.exit(0);
})().catch((e) => { console.error("FALLÓ:", e.message); process.exit(1); });
