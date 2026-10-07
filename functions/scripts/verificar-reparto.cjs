// Prueba del reparto del punto (juego oral): lo calcula el CÓDIGO a partir de tieneRazon + grado.
//   1) Tabla de los seis repartos (orden pregunta/responde) y valores fuera de las opciones.
//   2) De punta a punta (requestVeredicto con Gemini simulado): el equipo con razón recibe la parte
//      mayor, el modelo no puede imponer puntajes, "resultado" queda coherente, valores inválidos
//      siguen el camino de «Reintentar», y el prompt le dice al modelo quién preguntó y quién respondió.
// Uso (desde functions/):  npm run build && node scripts/verificar-reparto.cjs
const Module = require("module");
const assert = require("assert");
const { repartirPunto, resultadoDesdeTieneRazon } = require("../lib/arbitroReparto.js");

// ── 1) Tabla ──
const tabla = [
  ["pregunta", "total", 1, 0], ["pregunta", "parcial", 0.75, 0.25], ["ambos", "parcial", 0.5, 0.5],
  ["responde", "parcial", 0.25, 0.75], ["responde", "total", 0, 1], ["ninguno", "parcial", 0, 0],
  ["ambos", "total", 0.5, 0.5], ["ninguno", "total", 0, 0], ["ambos", undefined, 0.5, 0.5], ["ninguno", undefined, 0, 0],
  [" Pregunta ", "TOTAL", 1, 0],
];
for (const [r, g, pp, pr] of tabla) {
  const x = repartirPunto(r, g);
  assert.deepStrictEqual(x, { puntosPregunta: pp, puntosResponde: pr }, `${r}/${g}`);
}
for (const [r, g] of [["quizás", "total"], ["pregunta", "medio"], ["pregunta", undefined], ["responde", ""], [undefined, "total"], [null, null], [1, 1], ["ambos", "casi"], ["a", "b"]])
  assert.strictEqual(repartirPunto(r, g), null, `debería rechazar ${r}/${g}`);
console.log("OK: 6 repartos de la tabla + variantes válidas; valores fuera de las opciones → null.");

// ── 2) De punta a punta ──
const SESION = { docenteUid: "u", materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto", textoFuente: "Texto base.", expiresAt: new Date(Date.now() + 3600e3).toISOString() };
const vacio = { empty: true, docs: [], exists: false, data: () => ({}) };
let consultas = [];
const docRef = () => ({ get: async () => ({ exists: true, data: () => SESION }), update: async () => {}, collection: () => ({ add: async (d) => { consultas.push(d); }, get: async () => vacio }) });
const fakeDb = { collection: () => ({ doc: docRef }) };
const fakeAdmin = { apps: [{}], initializeApp() {}, firestore: Object.assign(() => fakeDb, { FieldValue: {}, Timestamp: {} }), auth: () => ({}), storage: () => ({}) };
let respuestaGemini = ""; let ultimoPrompt = "";
class FakeAI { getGenerativeModel() { return { generateContent: async (c) => { ultimoPrompt = JSON.stringify(c); return { response: { text: () => respuestaGemini } }; } }; } }
const load = Module._load;
Module._load = function (r, ...a) { if (r === "firebase-admin") return fakeAdmin; if (r.startsWith("firebase-admin/")) return { getFirestore: () => fakeDb }; if (r === "@google/generative-ai") return { GoogleGenerativeAI: FakeAI }; return load.call(this, r, ...a); };
process.env.GCLOUD_PROJECT = "demo"; process.env.GEMINI_KEY = "k"; process.env.CLAUDE_KEY = "x";
console.warn = () => {}; const ce = console.error; console.error = () => {};
const fns = require("../lib/index.js");
const llamar = async (data) => { try { return { ok: true, r: await fns.requestVeredicto.run({ auth: undefined, data, rawRequest: {}, acceptsStreaming: false }) }; } catch (e) { return { ok: false, code: e.code, details: e.details }; } };
const datos = (pregunta, responde) => ({ sessionId: "S1", modo: "juego_oral", conflicto: "Pregunta: x", posicionA: `${pregunta} (calificó como incompleta): …`, posicionB: `${responde} (no acepta la calificación): …`, equipoPregunta: pregunta, equipoResponde: responde });
const json = (o) => JSON.stringify({ calificacionRecomendada: "incompleta", elementosClave: "e", veredicto: "v", explicacion: "e", paraSeguirPensando: "p", ...o });

(async () => {
  const filas = [];
  const t = (caso, esperado, obtenido) => { filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) }); assert.strictEqual(String(obtenido), String(esperado), caso); };

  // Los dos casos reales: el que tiene razón recibe la parte mayor, en los dos sentidos
  const casos = [
    ["Caso 1: Rojos preguntan, Azules responden — tienen razón los Rojos (parcial)", "Rojos", "Azules", { tieneRazon: "pregunta", grado: "parcial" }, { Rojos: 0.75, Azules: 0.25 }],
    ["Caso 2: Azules preguntan, Rojos responden — tienen razón los Azules (parcial)", "Azules", "Rojos", { tieneRazon: "pregunta", grado: "parcial" }, { Azules: 0.75, Rojos: 0.25 }],
    ["Rojos preguntan, tienen razón los que responden (total)", "Rojos", "Azules", { tieneRazon: "responde", grado: "total" }, { Rojos: 0, Azules: 1 }],
    ["Azules preguntan, tienen razón los que responden (parcial)", "Azules", "Rojos", { tieneRazon: "responde", grado: "parcial" }, { Azules: 0.25, Rojos: 0.75 }],
    ["Los dos tienen parte de razón", "Rojos", "Azules", { tieneRazon: "ambos", grado: "parcial" }, { Rojos: 0.5, Azules: 0.5 }],
    ["Ninguno tiene razón", "Rojos", "Azules", { tieneRazon: "ninguno", grado: "parcial" }, { Rojos: 0, Azules: 0 }],
  ];
  for (const [nombre, preg, resp, campos, esperado] of casos) {
    respuestaGemini = json({ resultado: "B", ...campos }); // "resultado" del modelo incoherente a propósito: el código lo corrige
    const x = await llamar(datos(preg, resp));
    assert.ok(x.ok, nombre + ": falló " + x.code);
    t(`${nombre} · ${preg}`, esperado[preg], x.r.puntosPregunta); t(`${nombre} · ${resp}`, esperado[resp], x.r.puntosResponde);
    t(`${nombre} · resultado coherente`, resultadoDesdeTieneRazon(campos.tieneRazon), x.r.resultado);
    t(`${nombre} · devuelve tieneRazon`, campos.tieneRazon, x.r.tieneRazon);
    // el equipo con razón (si hay uno) recibe la parte mayor
    if (campos.tieneRazon === "pregunta") assert.ok(x.r.puntosPregunta > x.r.puntosResponde);
    if (campos.tieneRazon === "responde") assert.ok(x.r.puntosResponde > x.r.puntosPregunta);
  }
  // El modelo no puede imponer puntajes: si manda los suyos, se ignoran
  respuestaGemini = json({ resultado: "A", tieneRazon: "pregunta", grado: "total", puntosPregunta: 0, puntosResponde: 1 });
  const imp = await llamar(datos("Rojos", "Azules")); t("puntajes escritos por el modelo se ignoran (pregunta total → 1/0)", "1/0", `${imp.r.puntosPregunta}/${imp.r.puntosResponde}`);
  // Valores fuera de las opciones / formato viejo → «Reintentar» (unavailable + respuesta_no_clara), y no se registra la consulta
  consultas = [];
  for (const [nombre, resp] of [["tieneRazon inválido", { tieneRazon: "quizás", grado: "total" }], ["grado inválido", { tieneRazon: "pregunta", grado: "medio" }],
    ["falta grado con pregunta", { tieneRazon: "pregunta" }], ["formato viejo (solo puntajes)", { puntosPregunta: 0.25, puntosResponde: 0.75 }], ["sin campos", {}]]) {
    respuestaGemini = json({ resultado: "A", ...resp });
    const x = await llamar(datos("Rojos", "Azules"));
    t(`${nombre} · código`, "unavailable", x.code); t(`${nombre} · motivo`, "respuesta_no_clara", x.details && x.details.motivo);
  }
  t("inválidos: no se registra la consulta", 0, consultas.length);
  // El prompt enviado nombra a los equipos y no pide puntajes
  respuestaGemini = json({ resultado: "A", tieneRazon: "pregunta", grado: "total" }); await llamar(datos("Rojos", "Azules"));
  assert.ok(ultimoPrompt.includes('el equipo que PREGUNTÓ es \\"Rojos\\" (es la Posición A) y el equipo que RESPONDIÓ es \\"Azules\\" (es la Posición B)'), "el prompt debe nombrar quién preguntó y quién respondió");
  assert.ok(!/\\"puntosResponde\\"|\\"puntosPregunta\\"/.test(ultimoPrompt), "el prompt no debe pedir puntajes");
  filas.push({ caso: "el prompt enviado nombra a quien preguntó y a quien respondió y no pide puntajes", esperado: "ok", obtenido: "ok" });
  // Pregunta fuera de tema (juego oral): reparto 0/0, sin «Reintentar», la consulta se registra
  consultas = [];
  respuestaGemini = JSON.stringify({ resultado: "fuera_de_tema", calificacionRecomendada: "no", veredicto: "Este desacuerdo no corresponde al tema de la sesión.", explicacion: "e", paraSeguirPensando: "p" });
  const ft = await llamar(datos("Rojos", "Azules"));
  assert.ok(ft.ok, "fuera de tema no debe ser un error");
  t("fuera de tema · resultado", "fuera_de_tema", ft.r.resultado); t("fuera de tema · reparto 0/0", "0/0", `${ft.r.puntosPregunta}/${ft.r.puntosResponde}`);
  t("fuera de tema · se registra la consulta", "fuera_de_tema", consultas[0] && consultas[0].resultado);
  // Modo no oral (pantalla Sesión): no pide ni exige reparto
  respuestaGemini = json({ resultado: "A" });
  const no = await fns.requestVeredicto.run({ auth: undefined, data: { sessionId: "S1", conflicto: "x", posicionA: "a", posicionB: "b" }, rawRequest: {}, acceptsStreaming: false });
  t("modo no oral · devuelve el veredicto sin reparto", "A/undefined", `${no.resultado}/${no.puntosPregunta}`);

  console.error = ce; console.table(filas); console.log(`OK: ${filas.length} comprobaciones de punta a punta.`); process.exit(0);
})().catch((e) => { console.error = ce; console.error("FALLÓ:", e.message); process.exit(1); });
