// Prueba de punta a punta (con Firestore simulado) + de los documentos (sin Firebase) del campo «Texto durante
// el juego» (verTextoDuranteJuego) — Etapa A.3 de "pantalla de configuración y criterios de calificación":
//   1) crearSesionArbitro guarda verTextoDuranteJuego (por defecto false; true si se pide; cualquier valor no
//      estrictamente `true` → false, igual que el resto de los booleanos de la sesión);
//   2) getSesionArbitro lo devuelve, incluso para sesiones viejas sin el campo (false);
//   3) listarRondasSesion lo devuelve, para que el panel sepa si mostrar la línea en el encabezado del informe;
//   4) instruccionesPorDefecto (src/utils/arbitroDocumentos.ts) arma el paso 3 y el "antes de jugar" según el
//      modoRespuesta y el verTextoDuranteJuego reales — a diferencia del acordeón "¿Cómo funciona?" (que se
//      muestra antes de configurar la sesión y por eso queda neutro), esto se genera CON la sesión ya
//      configurada, así que tiene que reflejar los valores reales, no una frase neutra (ver A.1 y A.3).
// Uso (desde functions/):  npm run build && node scripts/verificar-texto-durante-juego.cjs
const Module = require("module");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

// ── Firestore en memoria (mismo esquema que verificar-modo-respuesta.cjs) ──
const store = new Map();
let seq = 0;
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const hijos = (path_) => [...store.keys()].filter((k) => k.startsWith(path_ + "/") && !k.slice(path_.length + 1).includes("/"));
function col(path_) {
  const snap = () => { const docs = hijos(path_).map((k) => ({ id: k.split("/").pop(), data: () => clone(store.get(k)), exists: true, ref: docRef(k) })); return { docs, empty: docs.length === 0, size: docs.length, forEach: (f) => docs.forEach(f) }; };
  const q = { doc: (id) => docRef(path_ + "/" + (id || "auto" + ++seq + "XXXXXXXX")), add: async (d) => { const id = "c" + ++seq + "ABCDEFGHIJKL"; store.set(path_ + "/" + id, clone(d)); return { id }; },
    get: async () => snap(), orderBy: () => q, where: () => q, limit: () => q, count: () => ({ get: async () => ({ data: () => ({ count: hijos(path_).length }) }) }) };
  return q;
}
function docRef(path_) {
  return { id: path_.split("/").pop(), path: path_,
    get: async () => ({ exists: store.has(path_), id: path_.split("/").pop(), data: () => clone(store.get(path_)), ref: docRef(path_) }),
    set: async (d) => { store.set(path_, clone(d)); }, update: async (p) => { const act = { ...store.get(path_) }; for (const [k, v] of Object.entries(p)) act[k] = v && v.__inc !== undefined ? (act[k] || 0) + v.__inc : clone(v); store.set(path_, act); },
    collection: (n) => col(path_ + "/" + n) };
}
const fakeDb = { collection: (n) => col(n) };
const fakeAdmin = { apps: [{}], initializeApp() {}, firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => ({ __inc: n }) }, Timestamp: {} }), auth: () => ({}), storage: () => ({}) };
class FakeAI { getGenerativeModel() { return { generateContent: async () => ({ response: { text: () => "" } }) }; } }
const load = Module._load;
Module._load = function (r, ...a) { if (r === "firebase-admin") return fakeAdmin; if (r.startsWith("firebase-admin/")) return { getFirestore: () => fakeDb }; if (r === "@google/generative-ai") return { GoogleGenerativeAI: FakeAI }; return load.call(this, r, ...a); };
process.env.GCLOUD_PROJECT = "demo"; process.env.GEMINI_KEY = "k"; process.env.CLAUDE_KEY = "x";
console.warn = () => {}; const ce = console.error; console.error = () => {};
const fns = require("../lib/index.js");
const run = async (fn, data, uid) => { try { return { ok: true, r: await fn.run({ auth: uid ? { uid, token: { email: uid + "@x.com" } } : undefined, data, rawRequest: {}, acceptsStreaming: false }) }; } catch (e) { return { ok: false, code: e.code, msg: e.message }; } };

const ahora = Date.now();
const sesion = (extra = {}) => ({ docenteUid: "docente1", materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto y Mesopotamia", expiresAt: new Date(ahora + 3600e3).toISOString(), ...extra });
store.set("sesiones_arbitro/SIN_TEXTO_VIEJA", sesion()); // sin el campo verTextoDuranteJuego: sesión de antes de esta etapa
store.set("sesiones_arbitro/CON_TEXTO", sesion({ verTextoDuranteJuego: true }));
store.set("sesiones_arbitro/SIN_TEXTO_EXPLICITO", sesion({ verTextoDuranteJuego: false })); // nueva, eligió "sin el texto" a propósito (false ≠ undefined)

const filas = [];
const t = (caso, esperado, obtenido) => { filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) }); assert.strictEqual(String(obtenido), String(esperado), caso); };

(async () => {
  // ════ 1) crearSesionArbitro guarda verTextoDuranteJuego ════
  const base = { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto" };
  const nSin = await run(fns.crearSesionArbitro, base, "docente1");
  t("crearSesionArbitro sin el campo → se guarda false", "false", store.get("sesiones_arbitro/" + nSin.r.id).verTextoDuranteJuego);
  const nCon = await run(fns.crearSesionArbitro, { ...base, verTextoDuranteJuego: true }, "docente1");
  t("crearSesionArbitro con verTextoDuranteJuego: true → se guarda true", "true", store.get("sesiones_arbitro/" + nCon.r.id).verTextoDuranteJuego);
  const nInventado = await run(fns.crearSesionArbitro, { ...base, verTextoDuranteJuego: "si" }, "docente1");
  t("crearSesionArbitro con un valor que no es boolean true → cae a false", "false", store.get("sesiones_arbitro/" + nInventado.r.id).verTextoDuranteJuego);

  // ════ 2) getSesionArbitro lo devuelve (incluso en sesiones viejas sin el campo) ════
  t("getSesionArbitro: sesión vieja sin el campo → false", "false", (await run(fns.getSesionArbitro, { sessionId: "SIN_TEXTO_VIEJA" })).r.verTextoDuranteJuego);
  t("getSesionArbitro: sesión con el texto impreso → true", "true", (await run(fns.getSesionArbitro, { sessionId: "CON_TEXTO" })).r.verTextoDuranteJuego);

  // ════ 3) listarRondasSesion lo devuelve, en tri-state (Pablo, 2026-10-19): el panel tiene que distinguir
  // una sesión VIEJA sin el campo (undefined, no muestra nada) de una que eligió "sin el texto" a propósito
  // (false, sí muestra "Jugado sin el texto" — cambia cómo se leen los resultados). ════
  const lSin = await run(fns.listarRondasSesion, { sessionId: "SIN_TEXTO_VIEJA" }, "docente1");
  t("listarRondasSesion: sesión vieja sin el campo → verTextoDuranteJuego undefined (el panel no muestra nada)", "undefined", lSin.r.verTextoDuranteJuego);
  const lSinExplicito = await run(fns.listarRondasSesion, { sessionId: "SIN_TEXTO_EXPLICITO" }, "docente1");
  t("listarRondasSesion: sesión nueva que eligió \"sin el texto\" → verTextoDuranteJuego false (no undefined)", "false", lSinExplicito.r.verTextoDuranteJuego);
  const lCon = await run(fns.listarRondasSesion, { sessionId: "CON_TEXTO" }, "docente1");
  t("listarRondasSesion: sesión con el texto impreso → verTextoDuranteJuego true", "true", lCon.r.verTextoDuranteJuego);

  console.error = ce;

  // ════ 4) instruccionesPorDefecto (frontend, sin Firebase): paso 3 y "antes de jugar" reales ════
  const ROOT = path.join(__dirname, "../..");
  function cargarTs(rel, cache = {}) {
    const f = path.join(ROOT, rel); if (cache[f]) return cache[f].exports;
    const out = ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
    const m = { exports: {} }; cache[f] = m;
    const req = (r) => (r.startsWith(".") ? cargarTs(path.relative(ROOT, path.resolve(path.dirname(f), r)) + ".ts", cache) : require(r));
    new Function("module", "exports", "require", out)(m, m.exports, req); return m.exports;
  }
  const docs = cargarTs("src/utils/arbitroDocumentos.ts");
  const es = cargarTs("src/i18n/es.ts").es.arbitro;
  const en = cargarTs("src/i18n/en.ts").en.arbitro;

  // Sin pasar los parámetros nuevos (compatibilidad con el único call-site existente antes de este cambio):
  // tiene que seguir dando lo mismo que antes (oral, sin texto).
  const porDefecto = docs.instruccionesPorDefecto(es, "Egipto");
  t("instruccionesPorDefecto sin los parámetros nuevos: paso 3 oral (compatibilidad)", true, porDefecto.includes(es.docInstrStep3));
  t("instruccionesPorDefecto sin los parámetros nuevos: \"antes de jugar\" sin texto", true, porDefecto.includes(es.docInstrBefore));

  for (const [nombre, tx] of [["es", es], ["en", en]]) {
    const oralSinTexto = docs.instruccionesPorDefecto(tx, "Egipto", "grupal", "oral", false);
    t(`${nombre} · oral + sin texto: paso 3 = docInstrStep3`, true, oralSinTexto.includes(tx.docInstrStep3));
    t(`${nombre} · oral + sin texto: "antes de jugar" = docInstrBefore`, true, oralSinTexto.includes(tx.docInstrBefore));
    t(`${nombre} · oral + sin texto: NO incluye las variantes "escrita"/"con texto"`, false, oralSinTexto.includes(tx.docInstrStep3Escrita) || oralSinTexto.includes(tx.docInstrBeforeConTexto));

    const escritaConTexto = docs.instruccionesPorDefecto(tx, "Egipto", "grupal", "escrita", true);
    t(`${nombre} · escrita + con texto: paso 3 = docInstrStep3Escrita`, true, escritaConTexto.includes(tx.docInstrStep3Escrita));
    t(`${nombre} · escrita + con texto: "antes de jugar" = docInstrBeforeConTexto`, true, escritaConTexto.includes(tx.docInstrBeforeConTexto));
    t(`${nombre} · escrita + con texto: NO incluye las variantes "oral"/"sin texto"`, false, escritaConTexto.includes(tx.docInstrStep3) || escritaConTexto.includes(tx.docInstrBefore));

    // Las combinaciones cruzadas también funcionan de forma independiente (modoRespuesta y verTextoDuranteJuego
    // son dos ejes separados, no atados entre sí).
    const oralConTexto = docs.instruccionesPorDefecto(tx, "Egipto", "grupal", "oral", true);
    t(`${nombre} · oral + con texto: paso 3 sigue siendo el oral`, true, oralConTexto.includes(tx.docInstrStep3));
    t(`${nombre} · oral + con texto: "antes de jugar" es la variante con texto`, true, oralConTexto.includes(tx.docInstrBeforeConTexto));

    const escritaSinTexto = docs.instruccionesPorDefecto(tx, "Egipto", "grupal", "escrita", false);
    t(`${nombre} · escrita + sin texto: paso 3 es la variante escrita`, true, escritaSinTexto.includes(tx.docInstrStep3Escrita));
    t(`${nombre} · escrita + sin texto: "antes de jugar" sigue siendo la de siempre`, true, escritaSinTexto.includes(tx.docInstrBefore));

    // El número del paso no cambia nunca: regla de siempre de Pablo (no renumerar — hay números escritos en
    // los propios textos).
    for (const texto of [tx.docInstrStep3, tx.docInstrStep3Escrita]) {
      t(`${nombre} · el paso 3 sigue empezando con "3."`, true, texto.trim().startsWith("3."));
    }
  }

  console.table(filas); console.log(`OK: ${filas.length} comprobaciones.`); process.exit(0);
})().catch((e) => { console.error = ce; console.error("FALLÓ:", e.message); process.exit(1); });
