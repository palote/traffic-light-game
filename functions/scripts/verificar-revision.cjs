// Prueba de punta a punta (con Firestore y Gemini simulados) de la revisión con IA de las respuestas sin
// disputa en modo escrito (Etapa 2 de los Árbitros de Aprendizaje):
//   1) revisarPartidaArbitro: incremental por rondaId (nunca por posición), reserva atómica (dos llamadas
//      simultáneas, un en_progreso viejo se reclama, un error libera la reserva sin esperar el timeout),
//      validación estricta de lo que devuelve Gemini (rondas de menos, de más, repetidas, veredicto inválido),
//      mismos criterios/contexto que requestVeredicto (misma rúbrica, sin la línea de área/criterio porque el
//      árbitro tampoco la usa hoy en producción), solo para sesiones en modo escrito, solo el panel (docente
//      dueño o admin, como listarRondasSesion).
//   2) revisarObservacionArbitro: confirmar / corregir (nota obligatoria) / descartar, en transacción (no pisa
//      una fusión de revisarPartidaArbitro ni al revés), rechazada para quien no es el docente dueño (sin
//      bypass de admin, a diferencia de la lectura).
//   3) listarRondasSesion expone las observaciones para el panel.
// Uso (desde functions/): npm run build && node scripts/verificar-revision.cjs
const Module = require("module");
const assert = require("assert");

// ── Firestore en memoria, con soporte de transacciones ──────────────────────────
const store = new Map();
let seq = 0;
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const hijos = (path) => [...store.keys()].filter((k) => k.startsWith(path + "/") && !k.slice(path.length + 1).includes("/"));
// Firestore real distingue .update(patch) de .set(patch, {merge:true}): SOLO .update() separa por puntos
// una clave como "observaciones.x" en un campo anidado real; .set(merge) trata cada clave de nivel superior
// tal cual viene (aunque tenga puntos, es UN solo nombre de campo), y solo fusiona de verdad los objetos
// anidados de JS de verdad (no las claves-string con punto). Antes este simulado no distinguía los dos casos
// (aplicaba la misma fusión-por-punto a ambos) y por eso 80/80 pruebas pasaban con un bug real de producción:
// revisarPartidaArbitro/revisarObservacionArbitro usaban .set(..., {merge:true}) con claves "observaciones.<id>"
// esperando que anidara, y en Firestore real NUNCA anidaba (ver index.ts). Separado en dos funciones para que
// una prueba que llame a la función real y después LEA el documento (no el valor que la función devolvió)
// pueda detectar justamente esta clase de bug.
function aplicarMergeUpdate(path, patch) { // semántica real de .update(patch): SIEMPRE separa por puntos
  const actual = { ...(store.get(path) || {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (k.includes(".")) {
      const partes = k.split(".");
      let obj = actual;
      for (let i = 0; i < partes.length - 1; i++) {
        obj[partes[i]] = obj[partes[i]] && typeof obj[partes[i]] === "object" ? obj[partes[i]] : {};
        obj = obj[partes[i]];
      }
      obj[partes[partes.length - 1]] = clone(v);
    } else {
      actual[k] = clone(v);
    }
  }
  store.set(path, actual);
}
function aplicarMergeSet(path, patch) { // semántica real de .set(patch, {merge:true}): NUNCA separa por puntos
  const actual = { ...(store.get(path) || {}) };                 // en las claves; solo fusiona objetos anidados reales
  function fusionar(destino, origen) {
    for (const [k, v] of Object.entries(origen)) {
      const esObjetoReal = (x) => x && typeof x === "object" && !Array.isArray(x);
      if (esObjetoReal(v) && esObjetoReal(destino[k])) fusionar(destino[k], v);
      else destino[k] = clone(v); // la clave (aunque tenga puntos) se guarda LITERAL, sin separarla
    }
  }
  fusionar(actual, patch);
  store.set(path, actual);
}
function col(path) {
  const snap = () => { const docs = hijos(path).map((k) => ({ id: k.split("/").pop(), data: () => clone(store.get(k)), exists: true, ref: docRef(k) })); return { docs, empty: docs.length === 0, size: docs.length, forEach: (f) => docs.forEach(f) }; };
  const q = { doc: (id) => docRef(path + "/" + (id || "auto" + ++seq + "XXXXXXXX")), add: async (d) => { const id = "c" + ++seq + "ABCDEFGHIJKL"; store.set(path + "/" + id, clone(d)); return { id }; },
    get: async () => snap(), orderBy: () => q, where: () => q, limit: () => q };
  return q;
}
function docRef(path) {
  return { id: path.split("/").pop(), path,
    get: async () => ({ exists: store.has(path), id: path.split("/").pop(), data: () => clone(store.get(path)), ref: docRef(path) }),
    set: async (d, opts) => { if (opts && opts.merge) aplicarMergeSet(path, d); else store.set(path, clone(d)); },
    update: async (p) => aplicarMergeUpdate(path, p),
    collection: (n) => col(path + "/" + n) };
}
const fakeDb = { collection: (n) => col(n) };
// Transacciones: se serializan (una corre del todo antes de que la siguiente empiece). Alcanza para probar la
// propiedad que importa acá: ninguna transacción puede leer un estado que otra todavía no terminó de escribir.
let colaTx = Promise.resolve();
const txApi = { get: (ref) => ref.get(), set: (ref, d, opts) => ref.set(d, opts), update: (ref, p) => ref.update(p) };
fakeDb.runTransaction = (fn) => {
  const corrida = colaTx.then(() => fn(txApi));
  colaTx = corrida.catch(() => {});
  return corrida;
};
const fakeAdmin = { apps: [{}], initializeApp() {}, firestore: Object.assign(() => fakeDb, { FieldValue: { increment: (n) => ({ __inc: n }) }, Timestamp: {} }), auth: () => ({}), storage: () => ({}) };
let respuestaGemini = ""; let ultimoPrompt = ""; let llamadasGemini = 0;
class FakeAI { getGenerativeModel() { return { generateContent: async (c) => { llamadasGemini++; ultimoPrompt = typeof c === "string" ? c : JSON.stringify(c); if (respuestaGemini === "__ERROR__") { const e = new Error("503"); e.status = 503; throw e; } return { response: { text: () => respuestaGemini } }; } }; } }
const load = Module._load;
Module._load = function (r, ...a) { if (r === "firebase-admin") return fakeAdmin; if (r.startsWith("firebase-admin/")) return { getFirestore: () => fakeDb }; if (r === "@google/generative-ai") return { GoogleGenerativeAI: FakeAI }; return load.call(this, r, ...a); };
process.env.GCLOUD_PROJECT = "demo"; process.env.GEMINI_KEY = "k"; process.env.CLAUDE_KEY = "x";
console.warn = () => {}; const ce = console.error; console.error = () => {};
const fns = require("../lib/index.js");
const { RUBRICA_CALIFICACION_ES } = require("../lib/arbitroPrompt.js");
const ADMIN = "P2lU12xoCxMkZ0AdZdMoGGksJ5o1";
const run = async (fn, data, uid) => { try { return { ok: true, r: await fn.run({ auth: uid ? { uid, token: { email: uid + "@x.com" } } : undefined, data, rawRequest: {}, acceptsStreaming: false }) }; } catch (e) { return { ok: false, code: e.code, msg: e.message, motivo: e.details && e.details.motivo }; } };

const filas = [];
const t = (caso, esperado, obtenido) => { filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) }); assert.strictEqual(String(obtenido), String(esperado), caso); };
const geminiResp = (items) => JSON.stringify(items.map(([rondaId, calificacionRecomendada, explicacion]) => ({ rondaId, calificacionRecomendada, explicacion: explicacion || "Explicación pedagógica de dos o tres oraciones sobre el concepto." })));

const ahora = Date.now();
const sesion = (extra = {}) => ({ docenteUid: "docente1", materia: "Biología", nivel: "Secundaria", anio: "3", tema: "Fotosíntesis y respiración celular", textoFuente: "Texto base sobre fotosíntesis.", idioma: "es", modoRespuesta: "escrita", expiresAt: new Date(ahora + 3600e3).toISOString(), ...extra });
store.set("sesiones_arbitro/TSTK7M", sesion());
store.set("sesiones_arbitro/ORAL", sesion({ modoRespuesta: "oral" }));
store.set("sesiones_arbitro/VACIA", sesion());

// IDs con la forma REAL de producción (pedido del docente: "la prueba de contrato pasó porque usó ids del
// test, no los reales"): partidaId como lo arma nuevoIdPartida en el cliente (24 hex) y rondaId con la MISMA
// función que usa el servidor (idDeRonda), no una reimplementación — así un cambio futuro en el formato real
// rompe este script en vez de quedar sin probar.
const { idDeRonda } = require("../lib/arbitroRondas.js");
const P = "4baebda1f939498d8369cd5d"; // 24 hex, como crypto.randomUUID().replace(/-/g, "").slice(0, 24)
const rid = (n) => idDeRonda(P, n);
function agregarRonda(n, extra = {}) {
  store.set(`sesiones_arbitro/TSTK7M/rondas/${rid(n)}`, {
    partidaId: P, ronda: n, equipoPregunta: "Rojos", equipoResponde: "Azules",
    pregunta: `Pregunta ${n}`, respuesta: `Respuesta ${n}.`, calificacion: "completa",
    fueAlArbitro: false, estado: "jugada", creadoEn: new Date(ahora + n).toISOString(), disputa: null, correccion: null,
    reparto: { puntosPregunta: 0, puntosResponde: 1, tieneRazon: null, grado: null },
    ...extra,
  });
}
const obsDe = () => (store.get(`sesiones_arbitro/TSTK7M/revisiones/${P}`) || {}).observaciones || {};

(async () => {
  // ════ 0) Validaciones y autorización ════
  t("sin sessionId → invalid-argument", "invalid-argument", (await run(fns.revisarPartidaArbitro, { partidaId: P }, "docente1")).code);
  t("partidaId inválido (corto) → invalid-argument", "invalid-argument", (await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: "x" }, "docente1")).code);
  t("sesión inexistente → not-found", "not-found", (await run(fns.revisarPartidaArbitro, { sessionId: "NOEXISTE", partidaId: P }, "docente1")).code);
  t("sin login → unauthenticated", "unauthenticated", (await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P })).code);
  t("docente ajeno → permission-denied", "permission-denied", (await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente2")).code);
  llamadasGemini = 0;
  const oral = await run(fns.revisarPartidaArbitro, { sessionId: "ORAL", partidaId: P }, "docente1");
  t("sesión en modo oral → failed-precondition (motivo modo_no_escrito)", "failed-precondition/modo_no_escrito", `${oral.code}/${oral.motivo}`);
  t("  y no llama a Gemini", "0", llamadasGemini);
  const vacia = await run(fns.revisarPartidaArbitro, { sessionId: "VACIA", partidaId: "sinRondas1" }, ADMIN);
  t("admin (no dueño) puede llamar (exigirDocenteDeSesion) · sin rondas no hay nada que revisar", "true/false/0", `${vacia.ok}/${vacia.r && vacia.r.revisando}/${Object.keys((vacia.r || {}).observaciones || {}).length}`);

  // ════ 1) Primera corrida: 3 rondas sin disputa, con respuesta — y las que NO cuentan ════
  agregarRonda(1, { calificacion: "pasada", respuesta: "" }); // no cuenta: pasada / sin respuesta
  agregarRonda(2, { fueAlArbitro: true, disputa: { consultaId: "x" } }); // no cuenta: ya fue al árbitro
  agregarRonda(3, { calificacion: "completa" }); // → IA dice "completa": sin_observacion
  agregarRonda(4, { calificacion: "incompleta" }); // → IA dice "no": error_no_detectado (el otro equipo calificó más alto)
  agregarRonda(5, { calificacion: "no" }); // → IA dice "completa": acierto_no_defendido (el otro equipo calificó más bajo)

  respuestaGemini = geminiResp([[rid(3), "completa"], [rid(4), "no"], [rid(5), "completa"]]);
  llamadasGemini = 0;
  const b1 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  assert.ok(b1.ok, "primera corrida: " + b1.msg);
  const promptB1 = ultimoPrompt;
  t("primera corrida: una sola llamada a Gemini para las 3 rondas", "1", llamadasGemini);
  t("primera corrida: revisando=false, ok", "false", String(b1.r.revisando));
  t("  rondas 'pasada' y 'ya fue al árbitro' no se mandan a revisar", "false/false", `${promptB1.includes("Pregunta 1")}/${promptB1.includes("Pregunta 2")}`);
  t("  comparación sin_observacion (completa/completa)", "sin_observacion", b1.r.observaciones[rid(3)].comparacion);
  t("  comparación error_no_detectado (incompleta del otro equipo, IA dice no)", "error_no_detectado", b1.r.observaciones[rid(4)].comparacion);
  t("  comparación acierto_no_defendido (no del otro equipo, IA dice completa)", "acierto_no_defendido", b1.r.observaciones[rid(5)].comparacion);
  t("  estado inicial de cada observación: pendiente, sin nota", "pendiente/null pendiente/null pendiente/null", `${b1.r.observaciones[rid(3)].estadoDocente}/${b1.r.observaciones[rid(3)].notaDocente} ${b1.r.observaciones[rid(4)].estadoDocente}/${b1.r.observaciones[rid(4)].notaDocente} ${b1.r.observaciones[rid(5)].estadoDocente}/${b1.r.observaciones[rid(5)].notaDocente}`);
  const rubricaEnJson = JSON.stringify(RUBRICA_CALIFICACION_ES).slice(1, -1); // ultimoPrompt es JSON.stringify(contents): las comillas van escapadas
  t("  mismos criterios que el árbitro: el prompt reusa la rúbrica de calificación (texto idéntico)", "true", promptB1.includes(rubricaEnJson));
  t("  mismo contexto de sesión (materia/nivel/año/tema)", "true", promptB1.includes("Biología") && promptB1.includes("3° año") && promptB1.includes("Fotosíntesis y respiración celular"));
  t("  decisión: NO agrega la línea de Área (el árbitro tampoco la usa hoy en producción)", "false", /\n *Área: /.test(promptB1));
  t("  reserva liberada al terminar (en_progreso=null)", "null", String((store.get(`sesiones_arbitro/TSTK7M/revisiones/${P}`) || {}).enProgreso));

  // listarRondasSesion expone las observaciones para el panel
  const listado1 = await run(fns.listarRondasSesion, { sessionId: "TSTK7M" }, "docente1");
  t("listarRondasSesion expone revisiones[partidaId].observaciones", "true/true/true", `${!!listado1.r.revisiones[P].observaciones[rid(3)]}/${!!listado1.r.revisiones[P].observaciones[rid(4)]}/${!!listado1.r.revisiones[P].observaciones[rid(5)]}`);

  // ════ 2) Revisión incremental: ronda nueva → solo se manda ESA a Gemini ════
  agregarRonda(6, { calificacion: "incompleta" });
  respuestaGemini = geminiResp([[rid(6), "incompleta"]]);
  llamadasGemini = 0;
  const antesObs = clone(obsDe());
  const b2 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("incremental: 1 llamada más, solo la ronda nueva en el prompt", "1/false/false/false", `${llamadasGemini}/${ultimoPrompt.includes("Pregunta 3")}/${ultimoPrompt.includes("Pregunta 4")}/${ultimoPrompt.includes("Pregunta 5")}`);
  t("incremental: las 3 observaciones viejas quedan exactamente iguales", "true", JSON.stringify(b2.r.observaciones[rid(3)]) === JSON.stringify(antesObs[rid(3)]) && JSON.stringify(b2.r.observaciones[rid(4)]) === JSON.stringify(antesObs[rid(4)]) && JSON.stringify(b2.r.observaciones[rid(5)]) === JSON.stringify(antesObs[rid(5)]));
  t("incremental: la ronda nueva se agrega", "incompleta", b2.r.observaciones[rid(6)].veredictoIA);

  // ════ 3) Rondas de menos: Gemini omite una → queda sin revisar para la próxima vez ════
  agregarRonda(7); agregarRonda(8);
  respuestaGemini = geminiResp([[rid(7), "completa"]]); // omite rid(8)
  llamadasGemini = 0;
  const c1 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("rondas de menos: la que contestó Gemini se agrega", "true", !!c1.r.observaciones[rid(7)]);
  t("  la que faltó NO se adivina: queda sin observación", "false", !!c1.r.observaciones[rid(8)]);
  respuestaGemini = geminiResp([[rid(8), "incompleta"]]);
  const c2 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("  próxima corrida: se vuelve a pedir y se completa", "incompleta", c2.r.observaciones[rid(8)].veredictoIA);

  // ════ 4) Rondas de más: un rondaId inventado o no pedido se ignora ════
  agregarRonda(9);
  respuestaGemini = geminiResp([[rid(9), "completa"], ["rondaInventada_999", "no"], [rid(1), "no"]]); // rid(1) no fue pedida esta vez
  llamadasGemini = 0;
  const d1 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("rondas de más: la pedida se agrega igual", "completa", d1.r.observaciones[rid(9)].veredictoIA);
  t("  la inventada y la no pedida no generan ninguna observación", "false/false", `${!!d1.r.observaciones["rondaInventada_999"]}/${!!d1.r.observaciones[rid(1)]}`);

  // ════ 5) Repetidas: un rondaId que aparece dos veces se descarta entero ════
  agregarRonda(10);
  respuestaGemini = JSON.stringify([
    { rondaId: rid(10), calificacionRecomendada: "completa", explicacion: "Primera versión, explicación válida." },
    { rondaId: rid(10), calificacionRecomendada: "no", explicacion: "Segunda versión, también válida." },
  ]);
  const e1 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("repetidas: ninguna de las dos se usa (no se adivina cuál vale)", "false", !!e1.r.observaciones[rid(10)]);
  respuestaGemini = geminiResp([[rid(10), "completa"]]);
  const e2 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("  próxima corrida con una sola respuesta: se agrega normalmente", "completa", e2.r.observaciones[rid(10)].veredictoIA);

  // ════ 6) Veredicto inválido: se ignora, la ronda queda pendiente ════
  agregarRonda(11);
  respuestaGemini = geminiResp([[rid(11), "excelente"]]); // no es completa/incompleta/no
  const f1 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("veredicto inválido: se ignora (la ronda sigue sin observación)", "false", !!f1.r.observaciones[rid(11)]);
  respuestaGemini = geminiResp([[rid(11), "incompleta"]]);
  const f2 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("  próxima corrida con un valor válido: se agrega", "incompleta", f2.r.observaciones[rid(11)].veredictoIA);

  // ════ 7) Dos llamadas simultáneas: una sola pega a Gemini ════
  agregarRonda(12); agregarRonda(13);
  respuestaGemini = geminiResp([[rid(12), "completa"], [rid(13), "incompleta"]]);
  llamadasGemini = 0;
  const conc = await Promise.all([
    run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1"),
    run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1"),
  ]);
  t("concurrencia: las dos responden ok", "true/true", `${conc[0].ok}/${conc[1].ok}`);
  const revisandoFlags = conc.map((x) => x.r.revisando);
  t("concurrencia: exactamente una queda 'revisando' (la otra hizo el trabajo)", "1", revisandoFlags.filter((x) => x === true).length);
  t("concurrencia: una sola llamada real a Gemini", "1", llamadasGemini);
  const finalConc = conc.find((x) => x.r.revisando === false).r;
  t("  la que hizo el trabajo revisó las dos rondas nuevas", "true/true", `${!!finalConc.observaciones[rid(12)]}/${!!finalConc.observaciones[rid(13)]}`);

  // ════ 8) en_progreso viejo: se trata como abandonado y se reclama de nuevo ════
  agregarRonda(14);
  const refRevision = `sesiones_arbitro/TSTK7M/revisiones/${P}`;
  const docRevisionActual = store.get(refRevision);
  store.set(refRevision, { ...docRevisionActual, enProgreso: { inicio: new Date(ahora - 10 * 60 * 1000).toISOString() } }); // 10 min: más viejo que REVISION_TIMEOUT_MS
  respuestaGemini = geminiResp([[rid(14), "completa"]]);
  llamadasGemini = 0;
  const g1 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("en_progreso viejo: se reclama igual (no queda trabado)", "1/false/completa", `${llamadasGemini}/${g1.r.revisando}/${g1.r.observaciones[rid(14)].veredictoIA}`);

  // ════ 9) Un error de Gemini libera la reserva sin esperar el timeout, y NO suma intentos (la falla es de la
  // llamada entera, no de ninguna ronda en particular — pedido del docente) ════
  agregarRonda(15);
  respuestaGemini = "__ERROR__";
  const h1 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("Gemini caído → unavailable (el panel ofrece Reintentar)", "unavailable", h1.code);
  t("  y libera la reserva ya (sin esperar el timeout)", "null", String((store.get(refRevision) || {}).enProgreso));
  t("  no le suma un intento a la ronda 15", "undefined", String(((store.get(refRevision) || {}).intentos || {})[rid(15)]));
  respuestaGemini = geminiResp([[rid(15), "no"]]);
  const h2 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("  reintentar de inmediato funciona (no quedó trabado)", "true/no", `${h2.ok}/${h2.r.observaciones[rid(15)].veredictoIA}`);

  // ════ 10) revisarObservacionArbitro: confirmar / corregir / descartar ════
  const conf = await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: rid(3), accion: "confirmar" }, "docente1");
  t("confirmar: estado y sin nota", "confirmada/null", `${conf.r.observacion.estadoDocente}/${conf.r.observacion.notaDocente}`);
  const sinNota = await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: rid(5), accion: "corregir" }, "docente1");
  t("corregir sin nota → invalid-argument (nota_requerida)", "invalid-argument/nota_requerida", `${sinNota.code}/${sinNota.motivo}`);
  const conNota = await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: rid(5), accion: "corregir", nota: "En realidad la respuesta sí defendía el concepto: vale completa." }, "docente1");
  t("corregir con nota: estado corregida, nota guardada, la explicación de la IA queda (para auditoría) pero deja de ser la que se muestra", "corregida/true/true", `${conNota.r.observacion.estadoDocente}/${conNota.r.observacion.notaDocente.startsWith("En realidad")}/${!!conNota.r.observacion.explicacionIA}`);
  const desc = await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: rid(6), accion: "descartar" }, "docente1");
  t("descartar: estado descartada", "descartada", desc.r.observacion.estadoDocente);
  t("acción inválida → invalid-argument", "invalid-argument", (await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: rid(3), accion: "ignorar" }, "docente1")).code);
  const sinObs = await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: rid(2), accion: "confirmar" }, "docente1");
  t("ronda sin observación todavía → not-found", "not-found/observacion_no_encontrada", `${sinObs.code}/${sinObs.motivo}`);

  // ════ 11) Reintento no pisa lo que el docente ya revisó ════
  agregarRonda(16);
  respuestaGemini = geminiResp([[rid(16), "completa"]]);
  const antesRid4 = clone(obsDe()[rid(4)]);
  const k1 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("reintento: la ronda 16 se agrega", "completa", k1.r.observaciones[rid(16)].veredictoIA);
  t("reintento: la ronda 4 (ya revisada por el docente) no se toca", "true", JSON.stringify(k1.r.observaciones[rid(4)]) === JSON.stringify(antesRid4));
  t("  y no se la vuelve a mandar a Gemini", "false", ultimoPrompt.includes("Pregunta 4"));

  // ════ 12) Validaciones y autorización de revisarObservacionArbitro ════
  t("sin login → unauthenticated", "unauthenticated", (await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: rid(3), accion: "confirmar" })).code);
  t("sessionId inválido → invalid-argument", "invalid-argument", (await run(fns.revisarObservacionArbitro, { sessionId: "", partidaId: P, rondaId: rid(3), accion: "confirmar" }, "docente1")).code);
  t("partidaId inválido → invalid-argument", "invalid-argument", (await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: "x", rondaId: rid(3), accion: "confirmar" }, "docente1")).code);
  t("rondaId inválido → invalid-argument", "invalid-argument", (await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: "../x", accion: "confirmar" }, "docente1")).code);
  t("sesión inexistente → not-found", "not-found", (await run(fns.revisarObservacionArbitro, { sessionId: "NOEXISTE", partidaId: P, rondaId: rid(3), accion: "confirmar" }, "docente1")).code);
  const antesRid3 = clone(obsDe()[rid(3)]);
  t("docente ajeno → permission-denied", "permission-denied", (await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: rid(3), accion: "descartar" }, "docente2")).code);
  t("admin (no dueño) → permission-denied (sin bypass, a diferencia de la lectura)", "permission-denied", (await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: rid(3), accion: "descartar" }, ADMIN)).code);
  t("  ninguno de los dos rechazados cambió nada", "true", JSON.stringify(obsDe()[rid(3)]) === JSON.stringify(antesRid3));

  // ════ 13) Límite de intentos: una ronda que Gemini nunca contesta queda "no revisable" ════
  // (ajuste pedido por el docente, además de faltantesPorPartida en listarRondasSesion, abajo)
  agregarRonda(17);
  respuestaGemini = geminiResp([]); // Gemini no devuelve nada para rid(17): queda sin observación
  llamadasGemini = 0;
  const m1 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("límite de intentos — intento 1: sigue sin observación, intentos=1", "false/1", `${!!m1.r.observaciones[rid(17)]}/${m1.r.intentos[rid(17)]}`);
  const listadoM1 = await run(fns.listarRondasSesion, { sessionId: "TSTK7M" }, "docente1");
  t("  listarRondasSesion: todavía cuenta como faltante (no llegó al límite)", "1", listadoM1.r.faltantesPorPartida[P]);

  llamadasGemini = 0;
  const m2 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("  intento 2: se vuelve a pedir, intentos=2", "1/true/2", `${llamadasGemini}/${ultimoPrompt.includes("Pregunta 17")}/${m2.r.intentos[rid(17)]}`);

  llamadasGemini = 0;
  const m3 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("  intento 3 (llega al límite): se pidió una vez más, intentos=3", "1/3", `${llamadasGemini}/${m3.r.intentos[rid(17)]}`);

  llamadasGemini = 0;
  const m4 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("  pasado el límite: no hay nada más que pedir, no llama a Gemini", "false/0", `${m4.r.revisando}/${llamadasGemini}`);

  const listadoM4 = await run(fns.listarRondasSesion, { sessionId: "TSTK7M" }, "docente1");
  const r17 = listadoM4.r.rondas.find((x) => x.id === rid(17));
  t("  listarRondasSesion: la ronda queda marcada noRevisable", "true", !!r17.noRevisable);
  t("  y ya no cuenta como faltante", "0", listadoM4.r.faltantesPorPartida[P]);

  // ════ 14) faltantesPorPartida de listarRondasSesion: baja a 0 cuando se resuelve lo último que faltaba ════
  agregarRonda(18);
  const antesListado = await run(fns.listarRondasSesion, { sessionId: "TSTK7M" }, "docente1");
  t("faltantesPorPartida cuenta la ronda nueva sin observación", "1", antesListado.r.faltantesPorPartida[P]);
  respuestaGemini = geminiResp([[rid(18), "completa"]]);
  await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  const despuesListado = await run(fns.listarRondasSesion, { sessionId: "TSTK7M" }, "docente1");
  t("  y vuelve a 0 una vez que tiene observación", "0", despuesListado.r.faltantesPorPartida[P]);

  // ════ 15) Gemini responde (no está caído) pero con texto que no es JSON válido: también es una falla de LA
  // LLAMADA ENTERA, no de ninguna ronda puntual — no suma intentos a nadie, igual que el caso anterior.
  agregarRonda(19);
  respuestaGemini = "esto no es JSON en absoluto {{{";
  const n1 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("respuesta de Gemini no es JSON válido → unavailable (igual que Gemini caído)", "unavailable", n1.code);
  t("  no le suma un intento a la ronda 19", "undefined", String(((store.get(refRevision) || {}).intentos || {})[rid(19)]));
  t("  y libera la reserva ya", "null", String((store.get(refRevision) || {}).enProgreso));
  respuestaGemini = geminiResp([[rid(19), "completa"]]);
  const n2 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  t("  reintentar con una respuesta válida funciona normalmente", "true/completa", `${n2.ok}/${n2.r.observaciones[rid(19)].veredictoIA}`);

  // ════ 16) Logging de revisarObservacionArbitro: deja código y motivo de cada rechazo (para poder auditar
  // incidentes de producción, como el 404 reportado), pero NUNCA el texto de la nota del docente ════
  agregarRonda(20);
  respuestaGemini = geminiResp([[rid(20), "completa"]]);
  await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1"); // le genera una observación a rid(20)
  const warnOriginal = console.warn; // ya está silenciado (no-op) desde el arranque del script; lo reemplazamos para capturar
  const NOTA_SECRETA = "TEXTO_SECRETO_DE_LA_NOTA_QUE_NO_DEBE_APARECER_EN_LOS_LOGS";
  let warnsCapturados = [];
  console.warn = (...args) => warnsCapturados.push(args.join(" "));
  const ajenoConNota = await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: rid(20), accion: "corregir", nota: NOTA_SECRETA }, "docente2");
  console.warn = warnOriginal;
  t("docente ajeno con nota: igual permission-denied (la nota no cambia el chequeo de permisos)", "permission-denied", ajenoConNota.code);
  let logsUnidos = warnsCapturados.join(" | ");
  t("  el rechazo queda logueado con code y motivo", "true", logsUnidos.includes("permission-denied") && logsUnidos.includes("sesion_de_otro_docente"));
  t("  y con sessionId/partidaId/rondaId/accion (para poder atar un incidente real a una sesión)", "true",
    logsUnidos.includes("TSTK7M") && logsUnidos.includes(P) && logsUnidos.includes(rid(20)) && logsUnidos.includes("corregir"));
  t("  pero el texto de la nota NUNCA aparece en los logs", "true", !logsUnidos.includes(NOTA_SECRETA));

  warnsCapturados = [];
  console.warn = (...args) => warnsCapturados.push(args.join(" "));
  const sinNotaLog = await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: rid(20), accion: "corregir" }, "docente1");
  console.warn = warnOriginal;
  t("falta la nota: invalid-argument/nota_requerida, y queda logueado con ese motivo", "true", sinNotaLog.code === "invalid-argument" && warnsCapturados.join(" ").includes("nota_requerida"));

  // ════ 17) El pedido armado con el MISMO CÓDIGO que ArbitroPanelPage.tsx (actuarSobreObservacion):
  // { sessionId, partidaId, rondaId, accion, nota } — con "nota" literalmente undefined para confirmar/descartar,
  // tal como lo arma el panel cuando no hay textarea abierto (el SDK de Functions descarta las claves
  // undefined al serializar, así que esto reproduce lo que realmente le llega a la función en producción) ════
  agregarRonda(21);
  respuestaGemini = geminiResp([[rid(21), "incompleta"]]);
  await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  const notaDelPanelSinTextarea = undefined; // así queda "nota" cuando el docente aprieta Confirmar o Descartar
  const pedidoPanelConfirmar = { sessionId: "TSTK7M", partidaId: P, rondaId: rid(21), accion: "confirmar", nota: notaDelPanelSinTextarea };
  const panelConfirmar = await run(fns.revisarObservacionArbitro, pedidoPanelConfirmar, "docente1");
  t("pedido armado como el panel (confirmar, sin nota): funciona", "true/confirmada", `${panelConfirmar.ok}/${panelConfirmar.r.observacion.estadoDocente}`);

  agregarRonda(22);
  respuestaGemini = geminiResp([[rid(22), "incompleta"]]);
  await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  const notaDelTextarea = "La respuesta sí tenía los dos elementos pedidos.";
  const pedidoPanelCorregir = { sessionId: "TSTK7M", partidaId: P, rondaId: rid(22), accion: "corregir", nota: notaDelTextarea };
  const panelCorregir = await run(fns.revisarObservacionArbitro, pedidoPanelCorregir, "docente1");
  t("pedido armado como el panel (corregir, con nota del textarea): funciona", "true/corregida/true", `${panelCorregir.ok}/${panelCorregir.r.observacion.estadoDocente}/${panelCorregir.r.observacion.notaDocente === notaDelTextarea}`);

  agregarRonda(23);
  respuestaGemini = geminiResp([[rid(23), "no"]]);
  await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  const pedidoPanelDescartar = { sessionId: "TSTK7M", partidaId: P, rondaId: rid(23), accion: "descartar", nota: undefined };
  const panelDescartar = await run(fns.revisarObservacionArbitro, pedidoPanelDescartar, "docente1");
  t("pedido armado como el panel (descartar, sin nota): funciona", "true/descartada", `${panelDescartar.ok}/${panelDescartar.r.observacion.estadoDocente}`);

  // El botón «Corregir» del panel está deshabilitado si la nota está vacía (no llega a llamar a la función).
  // Si de todos modos llegara a pedirse así (panel desactualizado, request manual, etc.), el servidor lo sigue
  // rechazando igual — es la última línea de defensa, no la única.
  const pedidoPanelCorregirSinNota = { sessionId: "TSTK7M", partidaId: P, rondaId: rid(21), accion: "corregir", nota: "" };
  const panelCorregirSinNota = await run(fns.revisarObservacionArbitro, pedidoPanelCorregirSinNota, "docente1");
  t("  si igual llegara 'corregir' sin nota, el servidor lo rechaza igual", "invalid-argument/nota_requerida", `${panelCorregirSinNota.code}/${panelCorregirSinNota.motivo}`);

  // ════ 18) Persistencia real (pedido del docente, a raíz del 404 en producción con sesión YVBRKD): lo que
  // revisarPartidaArbitro y revisarObservacionArbitro devuelven tiene que estar REALMENTE guardado. Se verifica
  // leyendo por una vía totalmente independiente del valor que la función devolvió: listarRondasSesion, que lee
  // sesiones_arbitro/{sessionId}/revisiones/{partidaId} con el mismo db.collection(...).get() que usa el panel
  // en producción — la misma ruta que revisarObservacionArbitro también lee para buscar la observación. Todas
  // las pruebas anteriores (secciones 1-17) solo miraban el valor de retorno de la función, nunca releían el
  // documento por separado — por eso no habían detectado que el guardado real fallaba. ════
  agregarRonda(24);
  respuestaGemini = geminiResp([[rid(24), "completa"]]);
  const r24 = await run(fns.revisarPartidaArbitro, { sessionId: "TSTK7M", partidaId: P }, "docente1");
  assert.ok(r24.ok, "revisarPartidaArbitro (persistencia): " + r24.msg);
  const leidoTrasRevisar = await run(fns.listarRondasSesion, { sessionId: "TSTK7M" }, "docente1");
  t("persistencia real: lo que guardó revisarPartidaArbitro se puede releer después, por listarRondasSesion (no por el valor que devolvió la función)",
    "completa", ((leidoTrasRevisar.r.revisiones[P] || {}).observaciones || {})[rid(24)] && leidoTrasRevisar.r.revisiones[P].observaciones[rid(24)].veredictoIA);

  const corregirReal = await run(fns.revisarObservacionArbitro, { sessionId: "TSTK7M", partidaId: P, rondaId: rid(24), accion: "corregir", nota: "Nota de prueba de persistencia." }, "docente1");
  assert.ok(corregirReal.ok, "revisarObservacionArbitro (persistencia): " + corregirReal.msg);
  const leidoTrasCorregir = await run(fns.listarRondasSesion, { sessionId: "TSTK7M" }, "docente1");
  const obsTrasCorregir = (leidoTrasCorregir.r.revisiones[P] || {}).observaciones?.[rid(24)] || {};
  t("  y lo que corregirla guardó TAMBIÉN se puede releer después, no solo en lo que la función devolvió",
    "corregida/true", `${obsTrasCorregir.estadoDocente}/${obsTrasCorregir.notaDocente === "Nota de prueba de persistencia."}`);

  console.error = ce; console.table(filas); console.log(`OK: ${filas.length} comprobaciones.`); process.exit(0);
})().catch((e) => { console.error = ce; console.error("FALLÓ:", e.message); process.exit(1); });
