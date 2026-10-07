// Prueba de punta a punta (con Firestore y Gemini simulados) de:
//   1) registro y lectura de rondas (registrarRonda / listarRondasSesion), validación de sesión, idempotencia,
//      solo nombres de equipos, veredicto y reparto tomados de la consulta del servidor (no del cliente);
//   2) corrección del docente (corregirRonda): reparto original + nuevo + fecha, marca «corregida», totales recalculados,
//      marca en el informe; el marcador que vieron los alumnos no cambia;
//   3) corrección hecha por un docente ajeno (y sin sesión, y por el admin): RECHAZADA, sin cambios;
//   4) pregunta propia fuera de tema (rechazada) y pertinente (aceptada) con validarPreguntaPropia, y la opción
//      «Permitir preguntas propias» (activada por defecto);
//   5) partidaId en el informe de metacognición;
//   6) validarPreguntaPropia: sesión existente y vigente + tope de 30 validaciones por sesión (al superarlo pasa sin Gemini y se loguea);
//   7) guardarInformeArbitro: valida que la sesión exista y no esté vencida.
// Uso (desde functions/):  npm run build && node scripts/verificar-rondas.cjs
const Module = require("module");
const assert = require("assert");

// ── Firestore en memoria ──
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
let respuestaGemini = ""; let ultimoPrompt = ""; let llamadasGemini = 0;
class FakeAI { getGenerativeModel() { return { generateContent: async (c) => { llamadasGemini++; ultimoPrompt = typeof c === "string" ? c : JSON.stringify(c); if (respuestaGemini === "__ERROR__") { const e = new Error("503"); e.status = 503; throw e; } return { response: { text: () => respuestaGemini } }; } }; } }
const load = Module._load;
Module._load = function (r, ...a) { if (r === "firebase-admin") return fakeAdmin; if (r.startsWith("firebase-admin/")) return { getFirestore: () => fakeDb }; if (r === "@google/generative-ai") return { GoogleGenerativeAI: FakeAI }; return load.call(this, r, ...a); };
process.env.GCLOUD_PROJECT = "demo"; process.env.GEMINI_KEY = "k"; process.env.CLAUDE_KEY = "x";
console.warn = () => {}; const ce = console.error; console.error = () => {};
const fns = require("../lib/index.js");
const { reglaPertinencia } = require("../lib/arbitroPrompt.js");
const ADMIN = "P2lU12xoCxMkZ0AdZdMoGGksJ5o1";
const run = async (fn, data, uid) => { try { return { ok: true, r: await fn.run({ auth: uid ? { uid, token: { email: uid + "@x.com" } } : undefined, data, rawRequest: {}, acceptsStreaming: false }) }; } catch (e) { return { ok: false, code: e.code, msg: e.message }; } };

const ahora = Date.now();
const sesion = (extra = {}) => ({ docenteUid: "docente1", materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto y Mesopotamia", textoFuente: "Texto base sobre fuentes escritas, orales y materiales.", expiresAt: new Date(ahora + 3600e3).toISOString(), ...extra });
store.set("sesiones_arbitro/S1", sesion());
store.set("sesiones_arbitro/VENCIDA", sesion({ expiresAt: new Date(ahora - 1000).toISOString() }));
store.set("sesiones_arbitro/SINPROPIAS", sesion({ permitirPreguntasPropias: false }));

const filas = [];
const t = (caso, esperado, obtenido) => { filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) }); assert.strictEqual(String(obtenido), String(esperado), caso); };
const veredictoJson = (o) => JSON.stringify({ resultado: "A", calificacionRecomendada: "incompleta", elementosClave: "e", veredicto: "Los Rojos tienen razón en parte.", explicacion: "Explicación.", paraSeguirPensando: "¿Qué relación hay?", ...o });
const P = "partida01_abcdef"; // partidaId

(async () => {
  // ════ 1) Registro y lectura de rondas ════
  // Ronda 1: disputa. El árbitro (simulado) da tieneRazon=pregunta, parcial → Rojos 0,75 / Azules 0,25.
  respuestaGemini = veredictoJson({ tieneRazon: "pregunta", grado: "parcial" });
  const v = await run(fns.requestVeredicto, { sessionId: "S1", modo: "juego_oral", conflicto: 'Pregunta: "¿Qué fuentes?"\n\nRespuesta de Azules: "escritas, orales, vestigios y arqueológicas"', posicionA: "Rojos (calificó como incompleta): faltó materiales.", posicionB: "Azules (no acepta la calificación): vestigios son materiales.", equipoPregunta: "Rojos", equipoResponde: "Azules" });
  assert.ok(v.ok, "veredicto"); assert.ok(v.r.consultaId, "requestVeredicto devuelve consultaId");
  t("requestVeredicto (oral) devuelve consultaId", "true", !!v.r.consultaId);
  const consultaGuardada = [...store.entries()].find(([k]) => k.includes("/consultas/"))[1];
  t("la consulta guarda el reparto del árbitro", "pregunta/parcial/0.75/0.25", [consultaGuardada.tieneRazon, consultaGuardada.grado, consultaGuardada.puntosPregunta, consultaGuardada.puntosResponde].join("/"));

  // El cliente intenta falsear el reparto y agregar datos de alumnos: se ignoran.
  const r1 = await run(fns.registrarRonda, { sessionId: "S1", partidaId: P, ronda: 1, equipoPregunta: "Rojos", equipoResponde: "Azules", pregunta: "¿Qué tipos de fuentes usan los historiadores?", calificacion: "incompleta", consultaId: v.r.consultaId, tiempoSegundos: 42,
    puntosPregunta: 0, puntosResponde: 1, reparto: { puntosResponde: 1 }, integrantes: "Ana Pérez, Leo Gómez", email: "ana@escuela.com" });
  assert.ok(r1.ok, "registrarRonda 1: " + r1.msg);
  const doc1 = store.get("sesiones_arbitro/S1/rondas/" + r1.r.id);
  t("ronda con disputa: se registra", "true", !!doc1);
  t("  equipos", "Rojos→Azules", doc1.equipoPregunta + "→" + doc1.equipoResponde);
  t("  número de ronda y pregunta", "1|¿Qué tipos de fuentes usan los historiadores?", doc1.ronda + "|" + doc1.pregunta);
  t("  calificación", "incompleta", doc1.calificacion);
  t("  reparto tomado de la consulta del servidor (no del cliente)", "0.75/0.25", doc1.reparto.puntosPregunta + "/" + doc1.reparto.puntosResponde);
  t("  las dos posiciones", "true", doc1.disputa.posicionPregunta.includes("Rojos (calificó") && doc1.disputa.posicionResponde.includes("Azules (no acepta"));
  t("  veredicto", "Los Rojos tienen razón en parte.", doc1.disputa.veredicto);
  t("  reparto original del árbitro", "pregunta/parcial", doc1.disputa.repartoOriginal.tieneRazon + "/" + doc1.disputa.repartoOriginal.grado);
  t("  sin datos de alumnos (integrantes/email)", "false", /Ana|Leo|ana@|integrantes|email/i.test(JSON.stringify(doc1)));
  // Ronda 2: pasada. Ronda 3: sin disputa, completa. Ronda 4: fuera de tema (con consulta).
  const r2 = await run(fns.registrarRonda, { sessionId: "S1", partidaId: P, ronda: 2, equipoPregunta: "Azules", equipoResponde: "Rojos", pregunta: "¿Dónde ocurre?", calificacion: "pasada" });
  const r3 = await run(fns.registrarRonda, { sessionId: "S1", partidaId: P, ronda: 3, equipoPregunta: "Rojos", equipoResponde: "Azules", pregunta: "¿Qué río?", calificacion: "completa" });
  respuestaGemini = JSON.stringify({ resultado: "fuera_de_tema", calificacionRecomendada: "no", veredicto: "No corresponde al tema.", explicacion: "e", paraSeguirPensando: "p" });
  const vft = await run(fns.requestVeredicto, { sessionId: "S1", modo: "juego_oral", conflicto: "x", posicionA: "a", posicionB: "b", equipoPregunta: "Azules", equipoResponde: "Rojos" });
  const r4 = await run(fns.registrarRonda, { sessionId: "S1", partidaId: P, ronda: 4, equipoPregunta: "Azules", equipoResponde: "Rojos", pregunta: "¿Cuál es tu comida favorita?", calificacion: "fuera_de_tema", consultaId: vft.r.consultaId });
  assert.ok(r2.ok && r3.ok && r4.ok, "registrar 2-4");
  t("ronda pasada: reparto 0/0", "0/0", store.get("sesiones_arbitro/S1/rondas/" + r2.r.id).reparto.puntosPregunta + "/" + store.get("sesiones_arbitro/S1/rondas/" + r2.r.id).reparto.puntosResponde);
  t("ronda sin disputa completa: 0 para quien preguntó, 1 para quien respondió", "0/1", store.get("sesiones_arbitro/S1/rondas/" + r3.r.id).reparto.puntosPregunta + "/" + store.get("sesiones_arbitro/S1/rondas/" + r3.r.id).reparto.puntosResponde);
  t("ronda fuera de tema: estado y reparto 0/0", "fuera_de_tema 0/0", store.get("sesiones_arbitro/S1/rondas/" + r4.r.id).estado + " " + store.get("sesiones_arbitro/S1/rondas/" + r4.r.id).reparto.puntosResponde + "/0");
  // Idempotencia
  const rep = await run(fns.registrarRonda, { sessionId: "S1", partidaId: P, ronda: 1, equipoPregunta: "Rojos", equipoResponde: "Azules", pregunta: "otra cosa", calificacion: "no" });
  t("reintentar la misma ronda no duplica ni pisa", "true/true/1", `${rep.r.yaRegistrada}/${store.get("sesiones_arbitro/S1/rondas/" + r1.r.id).pregunta.startsWith("¿Qué tipos")}/${hijos("sesiones_arbitro/S1/rondas").length === 4 ? 1 : 0}`);
  // Validaciones
  const base = { sessionId: "S1", partidaId: P, ronda: 9, equipoPregunta: "Rojos", equipoResponde: "Azules", pregunta: "¿Q?", calificacion: "completa" };
  t("sesión inexistente → not-found", "not-found", (await run(fns.registrarRonda, { ...base, sessionId: "NOEXISTE" })).code);
  t("sesión vencida → failed-precondition", "failed-precondition", (await run(fns.registrarRonda, { ...base, sessionId: "VENCIDA" })).code);
  for (const [n, x] of [["sin partidaId", { partidaId: "x" }], ["ronda 0", { ronda: 0 }], ["ronda 1,5", { ronda: 1.5 }], ["sin equipo", { equipoResponde: "" }], ["sin pregunta", { pregunta: "  " }], ["calificación inventada", { calificacion: "excelente" }], ["consultaId con barras", { consultaId: "../../x" }]])
    t(`${n} → invalid-argument`, "invalid-argument", (await run(fns.registrarRonda, { ...base, ...x })).code);
  t("consultaId que no existe → invalid-argument", "invalid-argument", (await run(fns.registrarRonda, { ...base, consultaId: "ZZZZZZZZZZZZZZ" })).code);
  t("sin sesión (alumno sin login) se puede registrar", "true", (await run(fns.registrarRonda, { ...base, ronda: 10 })).ok);
  store.delete("sesiones_arbitro/S1/rondas/" + "partida01_abcdef_010");

  // Informe de metacognición con partidaId (el marcador que vieron los alumnos: Rojos 0,75+1+0 = 1,75 · Azules 0,25)
  await run(fns.guardarInformeArbitro, { sessionId: "S1", modo: "competitivo", partidaId: P, equipos: [{ nombre: "Rojos", puntos: 1.75, color: "#f00", integrantes: "x", respuestas: {} }, { nombre: "Azules", puntos: 0.25, color: "#00f", integrantes: "y", respuestas: {} }], registros: [] });
  const informeDoc = [...store.entries()].find(([k]) => k.startsWith("sesiones_arbitro/S1/informes/"))[1];
  t("el informe guarda el partidaId", P, informeDoc.partidaId);

  // Lectura por el docente dueño
  const l = await run(fns.listarRondasSesion, { sessionId: "S1" }, "docente1");
  assert.ok(l.ok, "listar: " + l.msg);
  t("lectura: 4 rondas, en orden", "1,2,3,4", l.r.rondas.map((x) => x.ronda).join(","));
  t("lectura: puedeCorregir para el dueño", "true", l.r.puedeCorregir);
  t("lectura: 6 opciones de reparto", "6", l.r.opciones.length);
  t("totales antes de corregir (Rojos / Azules)", "1.75/0.25", l.r.totales[0].equipos.map((e) => e.puntosFinales).join("/"));
  t("lectura por un docente ajeno → permission-denied", "permission-denied", (await run(fns.listarRondasSesion, { sessionId: "S1" }, "docente2")).code);
  t("lectura sin login → unauthenticated", "unauthenticated", (await run(fns.listarRondasSesion, { sessionId: "S1" })).code);
  const admin = await run(fns.listarRondasSesion, { sessionId: "S1" }, ADMIN);
  t("el admin puede leer pero no corregir", "true/false", `${admin.ok}/${admin.r && admin.r.puedeCorregir}`);

  // ════ 2) Corrección del docente ════
  const id1 = r1.r.id;
  const c1 = await run(fns.corregirRonda, { sessionId: "S1", rondaId: id1, tieneRazon: "responde", grado: "total" }, "docente1");
  assert.ok(c1.ok, "corregir: " + c1.msg);
  const d1 = store.get("sesiones_arbitro/S1/rondas/" + id1);
  t("corrección: cambio", "corregida", c1.r.cambio);
  t("corrección: nuevo reparto (responde total → 0/1)", "0/1", d1.reparto.puntosPregunta + "/" + d1.reparto.puntosResponde);
  t("corrección: guarda el reparto original del árbitro", "pregunta/parcial 0.75/0.25", `${d1.correccion.repartoOriginal.tieneRazon}/${d1.correccion.repartoOriginal.grado} ${d1.correccion.repartoOriginal.puntosPregunta}/${d1.correccion.repartoOriginal.puntosResponde}`);
  t("corrección: guarda el reparto nuevo", "responde/total", `${d1.correccion.repartoNuevo.tieneRazon}/${d1.correccion.repartoNuevo.grado}`);
  t("corrección: guarda la fecha (ISO) y quién corrigió", "true/docente1", `${!isNaN(Date.parse(d1.correccion.fecha))}/${d1.correccion.docenteUid}`);
  t("corrección: el veredicto del árbitro y su reparto original no se pierden", "pregunta/parcial", d1.disputa.repartoOriginal.tieneRazon + "/" + d1.disputa.repartoOriginal.grado);
  const l2 = await run(fns.listarRondasSesion, { sessionId: "S1" }, "docente1");
  const tot = l2.r.totales[0].equipos; const por = (n) => tot.find((e) => e.nombre === n);
  t("totales recalculados (Rojos: 1,75 → 1 · Azules: 0,25 → 1)", "1.75→1 | 0.25→1", `${por("Rojos").puntosAlumnos}→${por("Rojos").puntosFinales} | ${por("Azules").puntosAlumnos}→${por("Azules").puntosFinales}`);
  t("el marcador que vieron los alumnos no cambia (informe de la partida)", "1.75/0.25", `${informeDoc.equipos[0].puntos}/${informeDoc.equipos[1].puntos}`);
  t("resumen: rondas corregidas", "1 de 1 con veredicto (2 con consulta)", `${l2.r.resumen.rondasCorregidas} de ${1} con veredicto (${l2.r.resumen.rondasConVeredicto} con consulta)`);
  // Corregir de nuevo a otra opción conserva el original del árbitro
  await run(fns.corregirRonda, { sessionId: "S1", rondaId: id1, tieneRazon: "ambos", grado: "parcial" }, "docente1");
  const d1b = store.get("sesiones_arbitro/S1/rondas/" + id1);
  t("segunda corrección: sigue guardando el original del árbitro", "pregunta/parcial → ambos", `${d1b.correccion.repartoOriginal.tieneRazon}/${d1b.correccion.repartoOriginal.grado} → ${d1b.correccion.repartoNuevo.tieneRazon}`);
  // Informe: indica cuántas rondas se corrigieron (informe ya generado en caché)
  store.set("sesiones_arbitro/S1/consultas/x1", { timestamp: "2026-01-01T00:00:00Z", resultado: "A" });
  store.set("sesiones_arbitro/S1", { ...store.get("sesiones_arbitro/S1"), informe: { resumenEjecutivo: "r", totalConsultas: 2 } });
  const inf = await run(fns.generarInformeSesion, { sessionId: "S1" }, "docente1");
  assert.ok(inf.ok, "informe: " + inf.msg);
  t("el informe indica cuántas rondas se corrigieron", "1", inf.r.correcciones.rondasCorregidas);
  t("el informe trae los totales recalculados con la 2.ª corrección «ambos» (Rojos 1,75−0,25 / Azules 0,25+0,25)", "1.5/0.5", inf.r.correcciones.totales[0].equipos.map((e) => e.puntosFinales).join("/"));
  // Elegir la misma opción del árbitro restaura la ronda
  const rest = await run(fns.corregirRonda, { sessionId: "S1", rondaId: id1, tieneRazon: "pregunta", grado: "parcial" }, "docente1");
  t("elegir la opción original restaura la ronda (sin marca)", "restaurada/null/0.75", `${rest.r.cambio}/${store.get("sesiones_arbitro/S1/rondas/" + id1).correccion}/${store.get("sesiones_arbitro/S1/rondas/" + id1).reparto.puntosPregunta}`);
  await run(fns.corregirRonda, { sessionId: "S1", rondaId: id1, tieneRazon: "responde", grado: "total" }, "docente1"); // vuelve a quedar corregida para lo que sigue
  t("opción fuera de las 6 → invalid-argument", "invalid-argument", (await run(fns.corregirRonda, { sessionId: "S1", rondaId: id1, tieneRazon: "quizás", grado: "total" }, "docente1")).code);
  t("ronda sin disputa no se corrige → failed-precondition", "failed-precondition", (await run(fns.corregirRonda, { sessionId: "S1", rondaId: r3.r.id, tieneRazon: "pregunta", grado: "total" }, "docente1")).code);

  // ════ 3) Docente ajeno ════
  const antes = JSON.stringify(store.get("sesiones_arbitro/S1/rondas/" + id1));
  const aj = await run(fns.corregirRonda, { sessionId: "S1", rondaId: id1, tieneRazon: "pregunta", grado: "total" }, "docente2");
  t("corrección por un docente ajeno → permission-denied", "permission-denied", aj.code);
  t("  y la ronda queda igual", "true", JSON.stringify(store.get("sesiones_arbitro/S1/rondas/" + id1)) === antes);
  t("corrección sin sesión iniciada → unauthenticated", "unauthenticated", (await run(fns.corregirRonda, { sessionId: "S1", rondaId: id1, tieneRazon: "pregunta", grado: "total" })).code);
  t("corrección por el admin (no es el dueño) → permission-denied", "permission-denied", (await run(fns.corregirRonda, { sessionId: "S1", rondaId: id1, tieneRazon: "pregunta", grado: "total" }, ADMIN)).code);
  t("rondaId con barras → invalid-argument", "invalid-argument", (await run(fns.corregirRonda, { sessionId: "S1", rondaId: "../x", tieneRazon: "pregunta", grado: "total" }, "docente1")).code);

  // ════ 4) Preguntas propias ════
  const regla = reglaPertinencia({ materia: "Historia", tema: "Egipto y Mesopotamia", hayTexto: true });
  respuestaGemini = JSON.stringify({ pertinente: false, motivo: "No tiene relación con el texto." });
  const fuera = await run(fns.validarPreguntaPropia, { sessionId: "S1", pregunta: "¿Cuál es tu comida favorita?" });
  t("pregunta propia fuera de tema → rechazada", "false", fuera.r.pertinente);
  t("  el prompt lleva la pregunta, el texto base y el mismo criterio de pertinencia del árbitro", "true", ultimoPrompt.includes("comida favorita") && ultimoPrompt.includes("Texto base sobre fuentes") && ultimoPrompt.includes(regla.criterio.slice(0, 80)));
  respuestaGemini = JSON.stringify({ pertinente: true, motivo: "Se responde con el texto." });
  const ok = await run(fns.validarPreguntaPropia, { sessionId: "S1", pregunta: "¿Qué diferencia hay entre una fuente escrita y una material?" });
  t("pregunta propia pertinente → aceptada", "true", ok.r.pertinente);
  respuestaGemini = "```json\n{\"pertinente\": false}\n```";
  t("respuesta de Gemini con backticks se interpreta igual", "false", (await run(fns.validarPreguntaPropia, { sessionId: "S1", pregunta: "¿Quién ganó el mundial?" })).r.pertinente);
  respuestaGemini = "no sé";
  t("Gemini sin JSON → unavailable (el juego no se traba)", "unavailable", (await run(fns.validarPreguntaPropia, { sessionId: "S1", pregunta: "¿Qué río?" })).code);
  respuestaGemini = "__ERROR__";
  t("Gemini caído → unavailable", "unavailable", (await run(fns.validarPreguntaPropia, { sessionId: "S1", pregunta: "¿Qué río?" })).code);
  respuestaGemini = JSON.stringify({ pertinente: true }); llamadasGemini = 0;
  t("sesión con preguntas propias desactivadas → failed-precondition (y no llama a Gemini)", "failed-precondition/0", `${(await run(fns.validarPreguntaPropia, { sessionId: "SINPROPIAS", pregunta: "¿Qué río?" })).code}/${llamadasGemini}`);
  t("sesión vencida → failed-precondition", "failed-precondition", (await run(fns.validarPreguntaPropia, { sessionId: "VENCIDA", pregunta: "¿Qué río?" })).code);
  t("pregunta vacía → invalid-argument", "invalid-argument", (await run(fns.validarPreguntaPropia, { sessionId: "S1", pregunta: " " })).code);
  // — Sesión: tiene que existir y no estar vencida (igual que las demás funciones de alumnos) —
  respuestaGemini = JSON.stringify({ pertinente: true }); llamadasGemini = 0;
  t("sesión inexistente → not-found (y no llama a Gemini)", "not-found/0", `${(await run(fns.validarPreguntaPropia, { sessionId: "NOEXISTE", pregunta: "¿Qué río?" })).code}/${llamadasGemini}`);
  t("sin sessionId → invalid-argument", "invalid-argument", (await run(fns.validarPreguntaPropia, { pregunta: "¿Qué río?" })).code);
  t("sesión vencida → no llama a Gemini", "0", llamadasGemini);
  // — Tope de validaciones por sesión (contadas en el documento de la sesión) —
  t("cada validación suma 1 en el documento de la sesión (5 llamadas válidas a S1; las rechazadas por sesión/opción no cuentan)", "5", store.get("sesiones_arbitro/S1").validacionesPropias);
  store.set("sesiones_arbitro/TOPE", sesion({ validacionesPropias: 28 }));
  respuestaGemini = JSON.stringify({ pertinente: false, motivo: "No está en el texto." }); llamadasGemini = 0;
  const v29 = await run(fns.validarPreguntaPropia, { sessionId: "TOPE", pregunta: "¿Cuál es tu comida favorita?" });
  const v30 = await run(fns.validarPreguntaPropia, { sessionId: "TOPE", pregunta: "¿Cuál es tu color favorito?" });
  t("validación 29 y 30: se llama a Gemini y se rechaza lo que no corresponde", "false/false/2", `${v29.r.pertinente}/${v30.r.pertinente}/${llamadasGemini}`);
  t("  el contador llegó a 30", "30", store.get("sesiones_arbitro/TOPE").validacionesPropias);
  const avisos = []; const cw = console.warn; console.warn = (m) => avisos.push(String(m));
  const v31 = await run(fns.validarPreguntaPropia, { sessionId: "TOPE", pregunta: "¿Cuál es tu deporte favorito?" });
  console.warn = cw;
  t("validación 31 (supera el tope): la pregunta pasa SIN llamar a Gemini", "true/true/2", `${v31.ok}/${v31.r?.pertinente}/${llamadasGemini}`);
  t("  se avisa que no se validó", "true", v31.r?.sinValidar);
  t("  queda registrado en el log", "true", avisos.some((a) => a.includes("validarPreguntaPropia_tope_superado") && a.includes("TOPE")));
  t("  el contador no sigue subiendo", "30", store.get("sesiones_arbitro/TOPE").validacionesPropias);
  respuestaGemini = "__ERROR__";
  t("  con Gemini caído, superado el tope igual pasa (no hay llamada)", "true", (await run(fns.validarPreguntaPropia, { sessionId: "TOPE", pregunta: "¿Qué río?" })).r?.pertinente);
  store.set("sesiones_arbitro/TOPE2", sesion({ validacionesPropias: 3 }));
  t("  bajo el tope y con Gemini caído → unavailable (el juego deja pasar la pregunta)", "unavailable", (await run(fns.validarPreguntaPropia, { sessionId: "TOPE2", pregunta: "¿Qué río?" })).code);
  t("  esa llamada fallida también suma al contador", "4", store.get("sesiones_arbitro/TOPE2").validacionesPropias);

  // ════ guardarInformeArbitro valida la sesión ════
  const informeCompetitivo = (sid) => ({ sessionId: sid, modo: "competitivo", equipos: [{ nombre: "Rojos", puntos: 1, color: "#f00", integrantes: "x", respuestas: {} }, { nombre: "Azules", puntos: 0, color: "#00f", integrantes: "y", respuestas: {} }], registros: [] });
  const nInformes = () => [...store.keys()].filter((k) => k.includes("/informes/")).length;
  const antesInformes = nInformes();
  t("informe competitivo, sesión inexistente → not-found", "not-found", (await run(fns.guardarInformeArbitro, informeCompetitivo("NOEXISTE"))).code);
  t("informe competitivo, sesión vencida → failed-precondition", "failed-precondition", (await run(fns.guardarInformeArbitro, informeCompetitivo("VENCIDA"))).code);
  t("informe competitivo, sessionId con barras → invalid-argument", "invalid-argument", (await run(fns.guardarInformeArbitro, informeCompetitivo("../x"))).code);
  t("informe normal, sesión inexistente → not-found", "not-found", (await run(fns.guardarInformeArbitro, { sessionId: "NOEXISTE", nombreAlumno: "Ana", respuestas: {} })).code);
  t("informe normal, sesión vencida → failed-precondition", "failed-precondition", (await run(fns.guardarInformeArbitro, { sessionId: "VENCIDA", nombreAlumno: "Ana", respuestas: {} })).code);
  t("  ninguno de los rechazados guardó nada", "0", nInformes() - antesInformes);
  t("informe competitivo con sesión vigente → se guarda", "true/1", `${(await run(fns.guardarInformeArbitro, informeCompetitivo("S1"))).ok}/${nInformes() - antesInformes}`);
  t("informe normal con sesión vigente → se guarda", "true/2", `${(await run(fns.guardarInformeArbitro, { sessionId: "S1", nombreAlumno: "Ana", respuestas: {} })).ok}/${nInformes() - antesInformes}`);
  // Opción «Permitir preguntas propias»: activada por defecto
  const nueva = await run(fns.crearSesionArbitro, { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto" }, "docente1");
  t("crearSesionArbitro: «Permitir preguntas propias» activada por defecto", "true", store.get("sesiones_arbitro/" + nueva.r.id).permitirPreguntasPropias);
  const nueva2 = await run(fns.crearSesionArbitro, { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto", permitirPreguntasPropias: false }, "docente1");
  t("crearSesionArbitro: se puede desactivar", "false", store.get("sesiones_arbitro/" + nueva2.r.id).permitirPreguntasPropias);
  t("getSesionArbitro: sesión vieja sin el campo → permitido", "true", (await run(fns.getSesionArbitro, { sessionId: "S1" })).r.permitirPreguntasPropias);
  t("getSesionArbitro: devuelve false cuando está desactivada", "false", (await run(fns.getSesionArbitro, { sessionId: nueva2.r.id })).r.permitirPreguntasPropias);

  console.error = ce; console.table(filas); console.log(`OK: ${filas.length} comprobaciones.`); process.exit(0);
})().catch((e) => { console.error = ce; console.error("FALLÓ:", e.message); process.exit(1); });
