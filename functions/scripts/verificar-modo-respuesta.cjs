// Prueba de punta a punta (con Firestore simulado) del «Modo de respuesta» (oral/escrita) de los Árbitros de
// Aprendizaje, etapa 1:
//   1) crearSesionArbitro guarda modoRespuesta (por defecto "oral"; "escrita" si se pide; cualquier otro valor → "oral");
//   2) getSesionArbitro lo devuelve, incluso para sesiones viejas sin el campo ("oral");
//   3) registrarRonda acepta el campo "respuesta" (opcional, recortado a 1500 caracteres) y lo guarda en la ronda,
//      tanto si hubo disputa como si no; sin el campo (cliente viejo) la ronda se registra igual, con respuesta: "";
//   4) listarRondasSesion devuelve el modoRespuesta de la sesión, para que el panel sepa cómo mostrar el informe.
// Uso (desde functions/):  npm run build && node scripts/verificar-modo-respuesta.cjs
const Module = require("module");
const assert = require("assert");

// ── Firestore en memoria (mismo esquema que verificar-rondas.cjs) ──
const store = new Map();
let seq = 0;
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const hijos = (path) => [...store.keys()].filter((k) => k.startsWith(path + "/") && !k.slice(path.length + 1).includes("/"));
function col(path) {
  const snap = () => { const docs = hijos(path).map((k) => ({ id: k.split("/").pop(), data: () => clone(store.get(k)), exists: true, ref: docRef(k) })); return { docs, empty: docs.length === 0, size: docs.length, forEach: (f) => docs.forEach(f) }; };
  const q = { doc: (id) => docRef(path + "/" + (id || "auto" + ++seq + "XXXXXXXX")), add: async (d) => { const id = "c" + ++seq + "ABCDEFGHIJKL"; store.set(path + "/" + id, clone(d)); return { id }; },
    get: async () => snap(), orderBy: () => q, where: () => q, limit: () => q, count: () => ({ get: async () => ({ data: () => ({ count: hijos(path).length }) }) }) };
  return q;
}
function docRef(path) {
  return { id: path.split("/").pop(), path,
    get: async () => ({ exists: store.has(path), id: path.split("/").pop(), data: () => clone(store.get(path)), ref: docRef(path) }),
    set: async (d) => { store.set(path, clone(d)); }, update: async (p) => { const act = { ...store.get(path) }; for (const [k, v] of Object.entries(p)) act[k] = v && v.__inc !== undefined ? (act[k] || 0) + v.__inc : clone(v); store.set(path, act); },
    collection: (n) => col(path + "/" + n) };
}
const fakeDb = { collection: (n) => col(n) };
const fakeAdmin = { apps: [{}], initializeApp() {}, firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => ({ __inc: n }) }, Timestamp: {} }), auth: () => ({}), storage: () => ({}) };
let respuestaGemini = "";
class FakeAI { getGenerativeModel() { return { generateContent: async () => ({ response: { text: () => respuestaGemini } }) }; } }
const load = Module._load;
Module._load = function (r, ...a) { if (r === "firebase-admin") return fakeAdmin; if (r.startsWith("firebase-admin/")) return { getFirestore: () => fakeDb }; if (r === "@google/generative-ai") return { GoogleGenerativeAI: FakeAI }; return load.call(this, r, ...a); };
process.env.GCLOUD_PROJECT = "demo"; process.env.GEMINI_KEY = "k"; process.env.CLAUDE_KEY = "x";
console.warn = () => {}; const ce = console.error; console.error = () => {};
const fns = require("../lib/index.js");
const run = async (fn, data, uid) => { try { return { ok: true, r: await fn.run({ auth: uid ? { uid, token: { email: uid + "@x.com" } } : undefined, data, rawRequest: {}, acceptsStreaming: false }) }; } catch (e) { return { ok: false, code: e.code, msg: e.message }; } };

const ahora = Date.now();
const sesion = (extra = {}) => ({ docenteUid: "docente1", materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto y Mesopotamia", expiresAt: new Date(ahora + 3600e3).toISOString(), ...extra });
store.set("sesiones_arbitro/ORAL_VIEJA", sesion()); // sin el campo modoRespuesta: sesión de antes de esta etapa
store.set("sesiones_arbitro/ESCRITA", sesion({ modoRespuesta: "escrita" }));

const filas = [];
const t = (caso, esperado, obtenido) => { filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) }); assert.strictEqual(String(obtenido), String(esperado), caso); };
const P = "partidaMR_abcdef";

(async () => {
  // ════ 1) crearSesionArbitro guarda modoRespuesta ════
  const base = { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto" };
  const nOral = await run(fns.crearSesionArbitro, base, "docente1");
  t("crearSesionArbitro sin modoRespuesta → se guarda 'oral'", "oral", store.get("sesiones_arbitro/" + nOral.r.id).modoRespuesta);
  const nEscrita = await run(fns.crearSesionArbitro, { ...base, modoRespuesta: "escrita" }, "docente1");
  t("crearSesionArbitro con modoRespuesta: 'escrita' → se guarda 'escrita'", "escrita", store.get("sesiones_arbitro/" + nEscrita.r.id).modoRespuesta);
  const nInventado = await run(fns.crearSesionArbitro, { ...base, modoRespuesta: "telepatica" }, "docente1");
  t("crearSesionArbitro con un valor inventado → cae a 'oral'", "oral", store.get("sesiones_arbitro/" + nInventado.r.id).modoRespuesta);

  // ════ 2) getSesionArbitro lo devuelve (incluso en sesiones viejas sin el campo) ════
  t("getSesionArbitro: sesión vieja sin el campo → 'oral'", "oral", (await run(fns.getSesionArbitro, { sessionId: "ORAL_VIEJA" })).r.modoRespuesta);
  t("getSesionArbitro: sesión en modo escrita → 'escrita'", "escrita", (await run(fns.getSesionArbitro, { sessionId: "ESCRITA" })).r.modoRespuesta);
  t("getSesionArbitro: sesión recién creada en modo escrita → 'escrita'", "escrita", (await run(fns.getSesionArbitro, { sessionId: nEscrita.r.id })).r.modoRespuesta);

  // ════ 3) registrarRonda acepta "respuesta" (opcional, recortada a 1500) ════
  const r1 = await run(fns.registrarRonda, { sessionId: "ESCRITA", partidaId: P, ronda: 1, equipoPregunta: "Rojos", equipoResponde: "Azules", pregunta: "¿Qué tipos de fuentes hay?", respuesta: "Escritas, orales y materiales.", calificacion: "completa" });
  assert.ok(r1.ok, "registrarRonda con respuesta: " + r1.msg);
  t("ronda sin disputa, modo escrito: guarda la respuesta tal cual", "Escritas, orales y materiales.", store.get("sesiones_arbitro/ESCRITA/rondas/" + r1.r.id).respuesta);

  // Cliente viejo (sin mandar "respuesta"): la ronda se registra igual, con respuesta: "".
  const r2 = await run(fns.registrarRonda, { sessionId: "ORAL_VIEJA", partidaId: P, ronda: 1, equipoPregunta: "Rojos", equipoResponde: "Azules", pregunta: "¿Dónde?", calificacion: "completa" });
  assert.ok(r2.ok, "registrarRonda sin respuesta (compatibilidad): " + r2.msg);
  t("ronda sin el campo respuesta (cliente viejo): se registra igual, con \"\"", "", store.get("sesiones_arbitro/ORAL_VIEJA/rondas/" + r2.r.id).respuesta);

  // Respuesta demasiado larga: se recorta a 1500 caracteres (no se rechaza la ronda).
  const larga = "x".repeat(2000);
  const r3 = await run(fns.registrarRonda, { sessionId: "ESCRITA", partidaId: P, ronda: 2, equipoPregunta: "Azules", equipoResponde: "Rojos", pregunta: "¿Cuál?", respuesta: larga, calificacion: "incompleta" });
  assert.ok(r3.ok, "registrarRonda con respuesta larga: " + r3.msg);
  t("respuesta de más de 1500 caracteres: se recorta a 1500", "1500", String(store.get("sesiones_arbitro/ESCRITA/rondas/" + r3.r.id).respuesta.length));

  // Con disputa: la respuesta igual se guarda (no se descarta solo porque fue al árbitro).
  respuestaGemini = JSON.stringify({ resultado: "A", calificacionRecomendada: "completa", elementosClave: "e", evaluacion: "Correcto.", explicacion: "Explicación.", paraSeguirPensando: "¿Y el Tigris?" });
  const vft = await run(fns.requestVeredicto, { sessionId: "ESCRITA", modo: "juego_oral", conflicto: "Pregunta: \"\u00bfQu\u00e9 r\u00edo?\"\n\nRespuesta de Rojos: \"El Nilo\"", posicionA: "Azules (calific\u00f3 como no): no corresponde.", posicionB: "Rojos (no acepta la calificaci\u00f3n): el Nilo es correcto.", equipoPregunta: "Rojos", equipoResponde: "Azules" });
  assert.ok(vft.ok && vft.r.consultaId, "requestVeredicto para la prueba de disputa: " + JSON.stringify(vft));
  const r4 = await run(fns.registrarRonda, { sessionId: "ESCRITA", partidaId: P, ronda: 3, equipoPregunta: "Rojos", equipoResponde: "Azules", pregunta: "¿Qué río?", respuesta: "El Nilo.", calificacion: "no", consultaId: vft.r.consultaId });
  assert.ok(r4.ok, "registrarRonda con disputa y respuesta: " + r4.msg);
  t("ronda con disputa, modo escrito: también guarda la respuesta", "El Nilo.", store.get("sesiones_arbitro/ESCRITA/rondas/" + r4.r.id).respuesta);

  // Espacios de más se normalizan igual que en el resto de los campos de texto.
  const r5 = await run(fns.registrarRonda, { sessionId: "ESCRITA", partidaId: P, ronda: 4, equipoPregunta: "Azules", equipoResponde: "Rojos", pregunta: "¿Cuándo?", respuesta: "  con   espacios  de más  ", calificacion: "completa" });
  t("respuesta: espacios de más se colapsan y se recorta el borde", "con espacios de más", store.get("sesiones_arbitro/ESCRITA/rondas/" + r5.r.id).respuesta);

  // ════ 4) listarRondasSesion devuelve el modoRespuesta de la sesión ════
  const lOral = await run(fns.listarRondasSesion, { sessionId: "ORAL_VIEJA" }, "docente1");
  t("listarRondasSesion: sesión vieja → modoRespuesta 'oral'", "oral", lOral.r.modoRespuesta);
  const lEscrita = await run(fns.listarRondasSesion, { sessionId: "ESCRITA" }, "docente1");
  t("listarRondasSesion: sesión en modo escrita → modoRespuesta 'escrita'", "escrita", lEscrita.r.modoRespuesta);
  t("listarRondasSesion (modo escrita): las 4 rondas registradas llegan con su respuesta", "4", String(lEscrita.r.rondas.filter(r => r.partidaId === P).length));

  // ════ 5) Revisión de Pablo (2026-10-17): saltos de línea y fecha de la partida ════
  const P2 = "partidaMR2_ghijkl";
  const multilinea = "  Paso 1: sumar\n\n\n  Paso 2:   restar  \r\n\r\nPaso 3: listo  ";
  const r6 = await run(fns.registrarRonda, { sessionId: "ESCRITA", partidaId: P2, ronda: 1, equipoPregunta: "Rojos", equipoResponde: "Azules", pregunta: "¿Cómo se resuelve?", respuesta: multilinea, calificacion: "completa" });
  assert.ok(r6.ok, "registrarRonda con respuesta multilínea: " + r6.msg);
  t("respuesta con varias líneas: conserva los saltos, colapsa espacios y líneas en blanco de más", "Paso 1: sumar\n\nPaso 2: restar\n\nPaso 3: listo", store.get("sesiones_arbitro/ESCRITA/rondas/" + r6.r.id).respuesta);

  const creadoEnR6 = store.get("sesiones_arbitro/ESCRITA/rondas/" + r6.r.id).creadoEn;
  const r7 = await run(fns.registrarRonda, { sessionId: "ESCRITA", partidaId: P2, ronda: 2, equipoPregunta: "Azules", equipoResponde: "Rojos", pregunta: "¿Y después?", respuesta: "listo", calificacion: "completa" });
  assert.ok(r7.ok, "segunda ronda de P2: " + r7.msg);
  const lEscrita2 = await run(fns.listarRondasSesion, { sessionId: "ESCRITA" }, "docente1");
  const totalP2 = lEscrita2.r.totales.find((tt) => tt.partidaId === P2);
  assert.ok(totalP2, "totales debe incluir la partida P2");
  t("totales de la partida: la fecha es la del primer round jugado, no la de ahora", creadoEnR6, totalP2.creadoEn);

  // Disputa en modo escrito con respuesta multilínea: la posición de quien responde también conserva los saltos.
  respuestaGemini = JSON.stringify({ resultado: "A", calificacionRecomendada: "completa", elementosClave: "e", evaluacion: "Correcto.", explicacion: "Explicación.", paraSeguirPensando: "¿Algo más?" });
  const posicionMultilinea = "Primero: el Nilo.\nSegundo: también el Tigris.";
  const vft2 = await run(fns.requestVeredicto, { sessionId: "ESCRITA", modo: "juego_oral", conflicto: "x", posicionA: "Azules (calificó como no): no corresponde.", posicionB: posicionMultilinea, equipoPregunta: "Rojos", equipoResponde: "Azules" });
  assert.ok(vft2.ok && vft2.r.consultaId, "requestVeredicto para la prueba de disputa multilínea: " + JSON.stringify(vft2));
  const r8 = await run(fns.registrarRonda, { sessionId: "ESCRITA", partidaId: P2, ronda: 3, equipoPregunta: "Rojos", equipoResponde: "Azules", pregunta: "¿Qué río?", respuesta: posicionMultilinea, calificacion: "no", consultaId: vft2.r.consultaId });
  assert.ok(r8.ok, "registrarRonda con disputa multilínea: " + r8.msg);
  t("disputa en modo escrito: la posición de quien responde también conserva los saltos de línea", posicionMultilinea, store.get("sesiones_arbitro/ESCRITA/rondas/" + r8.r.id).disputa.posicionResponde);

  console.error = ce; console.table(filas); console.log(`OK: ${filas.length} comprobaciones.`); process.exit(0);
})().catch((e) => { console.error = ce; console.error("FALLÓ:", e.message); process.exit(1); });
