// Prueba del reparto del punto (juego oral). El árbitro decide SOLO «calificacionRecomendada»; el CÓDIGO deduce
// «tieneRazon» y «grado» comparándola con la calificación que puso el equipo que preguntó, y reparte con repartirPunto.
// Esa calificación se lee de la Posición A SOLO en el código: el prompt recibe la Posición A sin «(calificó como …)». El veredicto lo arma
// el código («Tiene razón el equipo X» / «Los dos equipos tienen parte de razón») + la «evaluacion» del modelo.
//   1) Los seis repartos de repartirPunto y los valores fuera de las opciones.
//   2) La tabla de calificaciones (todas las filas + los bordes) y la lectura de la calificación de quien preguntó.
//   3) De punta a punta (requestVeredicto con Gemini simulado): los casos de la tabla, el modelo no puede imponer
//      «tieneRazon», «grado» ni puntajes, «resultado» queda coherente, valores inválidos siguen el camino de «Reintentar»,
//      fuera de tema 0/0, el veredicto lo arma el código, y el prompt nombra a los equipos pero NO trae la calificación de quien preguntó ni la tabla.
// Uso (desde functions/):  npm run build && node scripts/verificar-reparto.cjs
const Module = require("module");
const assert = require("assert");
const { repartirPunto, resultadoDesdeTieneRazon, razonPorCalificacion, calificacionDePosicionA, normalizarCalificacion, resolverRondaOral, quitarEtiquetaCalificacion, fraseVeredicto, armarVeredicto } = require("../lib/arbitroReparto.js");

// ── 1) repartirPunto ──
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

// ── 2) Tabla: calificación del árbitro contra la de quien preguntó ──
const razon = (p, a) => { const x = razonPorCalificacion(p, a); return x && `${x.tieneRazon}/${x.grado}`; };
const casosTabla = [
  // [calificó quien preguntó, calificó el árbitro, tieneRazon/grado esperado, reparto pregunta-responde]
  ["no", "no", "pregunta/total", [1, 0]],                // 1) igual e incorrecta
  ["incompleta", "incompleta", "pregunta/parcial", [0.75, 0.25]], // 2) igual e incompleta
  ["no", "incompleta", "responde/parcial", [0.25, 0.75]], // 3) mejor en un nivel (de incorrecta a incompleta)
  ["incompleta", "completa", "responde/total", [0, 1]],   // 4) completa cuando se había puesto menos
  ["no", "completa", "responde/total", [0, 1]],           // 4) ídem, subiendo dos niveles
  ["incompleta", "no", "pregunta/total", [1, 0]],         // 5) peor que la de quien preguntó → pregunta, total
  ["completa", "incompleta", "pregunta/total", [1, 0]],   // 5) ídem
  ["completa", "no", "pregunta/total", [1, 0]],           // 5) ídem, bajando dos niveles
  ["completa", "completa", "responde/total", [0, 1]],     // 6) coinciden en «completa» → la respuesta es completa: responde, total
];
for (const [p, a, esperado, [pp, pr]] of casosTabla) {
  assert.strictEqual(razon(p, a), esperado, `${p} vs ${a}`);
  const [tr, g] = esperado.split("/");
  assert.deepStrictEqual(repartirPunto(tr, g), { puntosPregunta: pp, puntosResponde: pr }, `reparto ${p} vs ${a}`);
}
assert.strictEqual(razon("incorrecta", "incorrecta"), "pregunta/total", '«incorrecta» vale como «no»');
assert.strictEqual(razon(" Incompleta ", "COMPLETA"), "responde/total", "mayúsculas y espacios");
for (const [p, a] of [[null, "no"], ["no", null], ["pasada", "no"], ["no", "pasada"], ["fuera_de_tema", "no"], ["no", "talvez"], [undefined, undefined], ["", "no"]])
  assert.strictEqual(razonPorCalificacion(p, a), null, `debería rechazar ${p}/${a}`);
assert.strictEqual(normalizarCalificacion("incorrecta"), "no");
console.log("OK: tabla de calificaciones (todas las filas + bordes) y calificaciones inválidas → null.");

// Lectura de la calificación de quien preguntó en la Posición A
const lee = (posicionA, equipo) => calificacionDePosicionA(posicionA, equipo);
assert.strictEqual(lee("Rojos (calificó como incompleta): faltó algo", "Rojos"), "incompleta");
assert.strictEqual(lee("Rojos (calificó como no): está mal", "Rojos"), "no");
assert.strictEqual(lee("Rojos (calificó como completa): ok", "Rojos"), "completa");
assert.strictEqual(lee("Los Escribas (calificó como incorrecta): x", "Los Escribas"), "no");
assert.strictEqual(lee("Rojos (calificó como incompleta): x", undefined), "incompleta", "sin nombre de equipo");
assert.strictEqual(lee("  rojos  (calificó como Incompleta) : x", "Rojos"), "incompleta", "mayúsculas y espacios");
assert.strictEqual(lee("Rojos (calificó como incompleta): dijeron (calificó como completa)", "Rojos"), "incompleta", "el texto del argumento no pisa la calificación");
assert.strictEqual(lee("Equipo (calificó como completa) (calificó como no): x", "Equipo (calificó como completa)"), "no", "un nombre que imita el formato no pisa la calificación");
assert.strictEqual(lee("Rojos: faltó algo", "Rojos"), null);
assert.strictEqual(lee("Rojos (calificó como pasada): x", "Rojos"), null);
assert.strictEqual(lee(undefined, "Rojos"), null);
console.log("OK: se lee la calificación de quien preguntó de la Posición A (y no se confunde con el texto del argumento).");

// La Posición A que ve el modelo no trae la calificación de quien preguntó
assert.strictEqual(quitarEtiquetaCalificacion("Rojos (calificó como incompleta): faltó algo", "Rojos"), "Rojos: faltó algo");
assert.strictEqual(quitarEtiquetaCalificacion("Los Escribas (calificó como no): x", "Los Escribas"), "Los Escribas: x");
assert.strictEqual(quitarEtiquetaCalificacion("Rojos (calificó como completa): x", undefined), "Rojos: x", "sin nombre de equipo");
assert.strictEqual(quitarEtiquetaCalificacion("Rojos (calificó como incompleta): dijeron (calificó como completa) y listo", "Rojos"), "Rojos: dijeron (calificó como completa) y listo", "solo la etiqueta del lugar del formato");
assert.strictEqual(quitarEtiquetaCalificacion("Rojos: sin etiqueta", "Rojos"), "Rojos: sin etiqueta");
assert.ok(!/calific[óo] como/i.test(quitarEtiquetaCalificacion("Rojos (calificó como incorrecta): x", "Rojos")));
assert.strictEqual(quitarEtiquetaCalificacion(undefined, "Rojos"), "");
// La frase del veredicto la pone el código
assert.strictEqual(fraseVeredicto("pregunta", "total", "Rojos", "Azules"), "Tiene razón el equipo Rojos.");
assert.strictEqual(fraseVeredicto("responde", "total", "Rojos", "Azules"), "Tiene razón el equipo Azules.");
assert.strictEqual(fraseVeredicto("pregunta", "parcial", "Rojos", "Azules"), "Los dos equipos tienen parte de razón.");
assert.strictEqual(fraseVeredicto("responde", "parcial", "Rojos", "Azules"), "Los dos equipos tienen parte de razón.");
assert.strictEqual(fraseVeredicto("ambos", "parcial", "Rojos", "Azules"), "Los dos equipos tienen parte de razón.");
assert.strictEqual(fraseVeredicto("pregunta", "total", "", ""), "Tiene razón el equipo que preguntó.");
assert.strictEqual(fraseVeredicto("responde", "total"), "Tiene razón el equipo que respondió.");
assert.strictEqual(fraseVeredicto("ninguno", "parcial", "Rojos", "Azules"), "");
assert.strictEqual(armarVeredicto("Tiene razón el equipo Rojos.", "  La  respuesta\nes falsa. "), "Tiene razón el equipo Rojos. La respuesta es falsa.");
assert.strictEqual(armarVeredicto("Tiene razón el equipo Rojos.", undefined), "Tiene razón el equipo Rojos.");
console.log("OK: la Posición A sin etiqueta para el prompt y la frase del veredicto que arma el código.");

// resolverRondaOral: lo que decide el código, sin Firebase
const modelo = (o) => ({ resultado: "A", calificacionRecomendada: "incompleta", ...o });
let r = resolverRondaOral(modelo({ tieneRazon: "responde", grado: "total", puntosPregunta: 0, puntosResponde: 1 }), "Rojos (calificó como incompleta): x", "Rojos");
assert.ok(r.ok && r.valor.tieneRazon === "pregunta" && r.valor.grado === "parcial" && r.valor.reparto.puntosPregunta === 0.75 && r.valor.resultado === "A", "se ignoran tieneRazon, grado y puntajes del modelo");
r = resolverRondaOral(modelo({ calificacionRecomendada: "completa", veredicto: "Tiene razón Rojos.", evaluacion: "Dijeron lo que se pedía." }), "Rojos (calificó como incompleta): x", "Rojos", "Azules");
assert.ok(r.ok && r.valor.veredicto === "Tiene razón el equipo Azules. Dijeron lo que se pedía.", "el veredicto lo arma el código: ignora el «veredicto» del modelo y usa su «evaluacion»");
r = resolverRondaOral(modelo({ calificacionRecomendada: "incompleta", evaluacion: "Falta una parte." }), "Rojos (calificó como incompleta): x", "Rojos", "Azules");
assert.ok(r.ok && r.valor.veredicto === "Los dos equipos tienen parte de razón. Falta una parte.", "razón parcial → «Los dos equipos tienen parte de razón»");
r = resolverRondaOral(modelo({ calificacionRecomendada: "no" }), "Rojos (calificó como incompleta): x", "Rojos", "Azules");
assert.ok(r.ok && r.valor.veredicto === "Tiene razón el equipo Rojos.", "sin evaluación del modelo, queda solo la frase");
r = resolverRondaOral(modelo({ resultado: "fuera_de_tema", calificacionRecomendada: "no" }), "sin formato", "Rojos");
assert.ok(r.ok && r.valor.fueraDeTema && r.valor.reparto.puntosPregunta === 0 && r.valor.reparto.puntosResponde === 0 && r.valor.resultado === "fuera_de_tema", "fuera de tema no necesita la calificación de quien preguntó");
r = resolverRondaOral({ resultado: "fuera_de_tema", veredicto: "Este desacuerdo no corresponde al tema de la sesión." }, "sin formato", "Rojos", "Azules");
assert.ok(r.ok && r.valor.veredicto === "Este desacuerdo no corresponde al tema de la sesión.", "fuera de tema conserva su veredicto fijo");
assert.deepStrictEqual(resolverRondaOral(modelo({}), "sin formato", "Rojos"), { ok: false, motivo: "sin_calificacion_pregunta" });
assert.deepStrictEqual(resolverRondaOral(modelo({ calificacionRecomendada: "regular" }), "Rojos (calificó como no): x", "Rojos"), { ok: false, motivo: "calificacion_arbitro_invalida" });
assert.deepStrictEqual(resolverRondaOral({ resultado: "A" }, "Rojos (calificó como no): x", "Rojos"), { ok: false, motivo: "calificacion_arbitro_invalida" });
console.log("OK: resolverRondaOral ignora lo que el modelo diga de tieneRazon/grado/puntajes; fuera de tema 0/0; datos faltantes → motivo.");

// ── 3) De punta a punta ──
const SESION = { docenteUid: "u", materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto", textoFuente: "Texto base.", expiresAt: new Date(Date.now() + 3600e3).toISOString() };
const vacio = { empty: true, docs: [], exists: false, data: () => ({}) };
let consultas = [];
const docRef = () => ({ get: async () => ({ exists: true, data: () => SESION }), update: async () => {}, collection: () => ({ add: async (d) => { consultas.push(d); return { id: "c" + consultas.length }; }, get: async () => vacio }) });
const fakeDb = { collection: () => ({ doc: docRef }) };
const fakeAdmin = { apps: [{}], initializeApp() {}, firestore: Object.assign(() => fakeDb, { FieldValue: {}, Timestamp: {} }), auth: () => ({}), storage: () => ({}) };
let respuestaGemini = ""; let ultimoPrompt = ""; let llamadasGemini = 0;
class FakeAI { getGenerativeModel() { return { generateContent: async (c) => { llamadasGemini++; ultimoPrompt = JSON.stringify(c); return { response: { text: () => respuestaGemini } }; } }; } }
const load = Module._load;
Module._load = function (r, ...a) { if (r === "firebase-admin") return fakeAdmin; if (r.startsWith("firebase-admin/")) return { getFirestore: () => fakeDb }; if (r === "@google/generative-ai") return { GoogleGenerativeAI: FakeAI }; return load.call(this, r, ...a); };
process.env.GCLOUD_PROJECT = "demo"; process.env.GEMINI_KEY = "k"; process.env.CLAUDE_KEY = "x";
console.warn = () => {}; const ce = console.error; console.error = () => {};
const fns = require("../lib/index.js");
const llamar = async (data) => { try { return { ok: true, r: await fns.requestVeredicto.run({ auth: undefined, data, rawRequest: {}, acceptsStreaming: false }) }; } catch (e) { return { ok: false, code: e.code, details: e.details }; } };
const datos = (pregunta, responde, califPregunta = "incompleta") => ({ sessionId: "S1", modo: "juego_oral", conflicto: "Pregunta: x", posicionA: `${pregunta} (calificó como ${califPregunta}): …`, posicionB: `${responde} (no acepta la calificación): …`, equipoPregunta: pregunta, equipoResponde: responde });
// El modelo nuevo manda «evaluacion»; el «veredicto» equivocado es a propósito: el código lo ignora y arma el suyo.
const json = (o) => JSON.stringify({ resultado: "A", elementosClave: "e", evaluacion: "Evaluación de la respuesta.", veredicto: "Tiene razón el equipo EQUIVOCADO.", explicacion: "e", paraSeguirPensando: "p", ...o });

(async () => {
  const filas = [];
  const t = (caso, esperado, obtenido) => { filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) }); assert.strictEqual(String(obtenido), String(esperado), caso); };

  // Los casos de la tabla, de punta a punta. El "resultado" del modelo es incoherente a propósito (siempre "B"):
  // el código lo corrige. Y el modelo manda un tieneRazon/grado/puntajes contrarios: se ignoran.
  const casos = [
    ["1) igual e incorrecta → pregunta, total", "no", "no", "pregunta", "total", { Rojos: 1, Azules: 0 }, "A"],
    ["2) igual e incompleta → pregunta, parcial", "incompleta", "incompleta", "pregunta", "parcial", { Rojos: 0.75, Azules: 0.25 }, "A"],
    ["3) mejor en un nivel (no → incompleta) → responde, parcial", "no", "incompleta", "responde", "parcial", { Rojos: 0.25, Azules: 0.75 }, "B"],
    ["4) completa cuando se había puesto menos → responde, total", "incompleta", "completa", "responde", "total", { Rojos: 0, Azules: 1 }, "B"],
    ["5) peor que la de quien preguntó (incompleta → no) → pregunta, total", "incompleta", "no", "pregunta", "total", { Rojos: 1, Azules: 0 }, "A"],
    ["5b) peor que la de quien preguntó (completa → incompleta) → pregunta, total", "completa", "incompleta", "pregunta", "total", { Rojos: 1, Azules: 0 }, "A"],
    ["6) coinciden en «completa» → responde, total", "completa", "completa", "responde", "total", { Rojos: 0, Azules: 1 }, "B"],
  ];
  for (const [nombre, califP, califA, razonEsp, gradoEsp, esperado, resultadoEsp] of casos) {
    respuestaGemini = json({ resultado: "B", calificacionRecomendada: califA, tieneRazon: "ninguno", grado: "total", puntosPregunta: 0, puntosResponde: 0 });
    consultas = [];
    const x = await llamar(datos("Rojos", "Azules", califP));
    assert.ok(x.ok, nombre + ": falló " + x.code);
    t(`${nombre} · Rojos (preguntó)`, esperado.Rojos, x.r.puntosPregunta); t(`${nombre} · Azules (respondió)`, esperado.Azules, x.r.puntosResponde);
    t(`${nombre} · tieneRazon`, razonEsp, x.r.tieneRazon); t(`${nombre} · grado`, gradoEsp, x.r.grado);
    t(`${nombre} · resultado coherente`, resultadoEsp, x.r.resultado);
    const frase = gradoEsp === "parcial" ? "Los dos equipos tienen parte de razón." : `Tiene razón el equipo ${razonEsp === "pregunta" ? "Rojos" : "Azules"}.`;
    t(`${nombre} · veredicto armado por el código`, `${frase} Evaluación de la respuesta.`, x.r.veredicto);
    t(`${nombre} · se guarda el mismo veredicto`, x.r.veredicto, consultas[0].veredicto);
    assert.ok(!("evaluacion" in x.r), "la «evaluacion» no sale hacia el front");
    t(`${nombre} · calificacionRecomendada del árbitro`, califA, x.r.calificacionRecomendada);
    t(`${nombre} · se guarda calificación de quien preguntó y reparto`, `${califP}/${califA}/${razonEsp}/${gradoEsp}/${esperado.Rojos}/${esperado.Azules}`,
      [consultas[0].calificacionPregunta, consultas[0].calificacionRecomendada, consultas[0].tieneRazon, consultas[0].grado, consultas[0].puntosPregunta, consultas[0].puntosResponde].join("/"));
    if (razonEsp === "pregunta") assert.ok(x.r.puntosPregunta > x.r.puntosResponde);
    if (razonEsp === "responde") assert.ok(x.r.puntosResponde > x.r.puntosPregunta);
  }
  // Los equipos con los lugares cambiados: preguntan Azules, responden Rojos
  respuestaGemini = json({ calificacionRecomendada: "incompleta" });
  const inv = await llamar(datos("Azules", "Rojos", "incompleta"));
  t("preguntan Azules, igual e incompleta → Azules 0,75", "0.75/0.25", `${inv.r.puntosPregunta}/${inv.r.puntosResponde}`);
  // «incorrecta» (con ese nombre) vale como «no»
  respuestaGemini = json({ calificacionRecomendada: "incorrecta" });
  const inc = await llamar(datos("Rojos", "Azules", "no"));
  t("el árbitro dice «incorrecta» → igual que «no» → pregunta, total", "pregunta/total/no", `${inc.r.tieneRazon}/${inc.r.grado}/${inc.r.calificacionRecomendada}`);
  // Sin tieneRazon/grado del modelo funciona igual (ya no se piden)
  respuestaGemini = json({ calificacionRecomendada: "completa" });
  const sinCampos = await llamar(datos("Rojos", "Azules", "incompleta"));
  t("el modelo no manda tieneRazon ni grado → responde, total", "responde/total/0/1", `${sinCampos.r.tieneRazon}/${sinCampos.r.grado}/${sinCampos.r.puntosPregunta}/${sinCampos.r.puntosResponde}`);

  // Valores inválidos → «Reintentar» (unavailable + respuesta_no_clara) y no se registra la consulta
  consultas = [];
  for (const [nombre, resp] of [["calificación del árbitro inválida", { calificacionRecomendada: "regular" }], ["calificación «pasada»", { calificacionRecomendada: "pasada" }],
    ["sin calificación (formato viejo: solo tieneRazon y grado)", { calificacionRecomendada: undefined, tieneRazon: "pregunta", grado: "total" }], ["formato viejo (solo puntajes)", { calificacionRecomendada: undefined, puntosPregunta: 0.25, puntosResponde: 0.75 }], ["sin campos", { calificacionRecomendada: undefined }]]) {
    respuestaGemini = json(resp);
    const x = await llamar(datos("Rojos", "Azules"));
    t(`${nombre} · código`, "unavailable", x.code); t(`${nombre} · motivo`, "respuesta_no_clara", x.details && x.details.motivo);
  }
  // Falta la calificación de quien preguntó en la Posición A → «Reintentar» (sin sumar nada)
  respuestaGemini = json({ calificacionRecomendada: "incompleta" });
  const sinP = await llamar({ ...datos("Rojos", "Azules"), posicionA: "Rojos: sin el formato esperado" });
  t("sin calificación de quien preguntó · código", "unavailable", sinP.code); t("sin calificación de quien preguntó · motivo", "respuesta_no_clara", sinP.details && sinP.details.motivo);
  t("inválidos: no se registra la consulta", 0, consultas.length);

  // El prompt enviado: nombra a los equipos, NO trae la calificación de quien preguntó ni la tabla, ni pide tieneRazon/grado/puntajes
  respuestaGemini = json({ calificacionRecomendada: "incompleta" }); await llamar(datos("Rojos", "Azules", "incompleta"));
  assert.ok(ultimoPrompt.includes('el equipo que PREGUNTÓ es \\"Rojos\\" (es la Posición A) y el equipo que RESPONDIÓ es \\"Azules\\" (es la Posición B)'), "el prompt debe nombrar quién preguntó y quién respondió");
  assert.ok(ultimoPrompt.includes("Posición A: Rojos: …") && ultimoPrompt.includes("Posición B: Azules (no acepta la calificación): …"), "los argumentos de los dos equipos se mantienen, sin la etiqueta «calificó como…»");
  assert.ok(!/calific[óo] como|calificó la respuesta como|Si tu calificación es \\"(completa|incompleta|no)\\": tiene razón|CÓMO SE REPARTE|IGUAL o PEOR/.test(ultimoPrompt), "el prompt no debe traer la calificación de quien preguntó ni la tabla de reparto");
  assert.ok(ultimoPrompt.includes("CÓMO DECIDIR LA CALIFICACIÓN") && ultimoPrompt.includes("no para que los ADOPTES"), "el prompt dice que los argumentos son para considerar, no para adoptar");
  assert.ok(!/\\"tieneRazon\\"|\\"grado\\"|\\"puntosResponde\\"|\\"puntosPregunta\\"|\\"veredicto\\": \\"una oración/.test(ultimoPrompt), "el prompt no debe pedir tieneRazon, grado, puntajes ni veredicto");
  for (const califP of ["completa", "no"]) { respuestaGemini = json({ calificacionRecomendada: "incompleta" }); await llamar(datos("Rojos", "Azules", califP)); assert.ok(!ultimoPrompt.includes(`como ${califP}`) && !ultimoPrompt.includes("calificó como"), "la calificación de quien preguntó (" + califP + ") no viaja al prompt"); }
  filas.push({ caso: "el prompt enviado nombra a los equipos, mantiene los argumentos sin la calificación de quien preguntó, sin tabla, y no pide tieneRazon/grado/puntajes/veredicto", esperado: "ok", obtenido: "ok" });
  // Pregunta fuera de tema (juego oral): reparto 0/0, sin «Reintentar», la consulta se registra, aunque no haya calificación de quien preguntó
  consultas = [];
  respuestaGemini = JSON.stringify({ resultado: "fuera_de_tema", calificacionRecomendada: "no", veredicto: "Este desacuerdo no corresponde al tema de la sesión.", explicacion: "e", paraSeguirPensando: "p" });
  const ft = await llamar(datos("Rojos", "Azules"));
  assert.ok(ft.ok, "fuera de tema no debe ser un error");
  t("fuera de tema · resultado", "fuera_de_tema", ft.r.resultado); t("fuera de tema · reparto 0/0", "0/0", `${ft.r.puntosPregunta}/${ft.r.puntosResponde}`);
  t("fuera de tema · se registra la consulta", "fuera_de_tema", consultas[0] && consultas[0].resultado);
  const ft2 = await llamar({ ...datos("Rojos", "Azules"), posicionA: "Rojos: sin formato" });
  t("fuera de tema sin calificación de quien preguntó · sigue igual (0/0)", "true/0/0", `${ft2.ok}/${ft2.r && ft2.r.puntosPregunta}/${ft2.r && ft2.r.puntosResponde}`);
  // Modo no oral (pantalla Sesión): no pide ni exige reparto
  respuestaGemini = json({ resultado: "A" });
  const no = await fns.requestVeredicto.run({ auth: undefined, data: { sessionId: "S1", conflicto: "x", posicionA: "a", posicionB: "b" }, rawRequest: {}, acceptsStreaming: false });
  t("modo no oral · devuelve el veredicto sin reparto", "A/undefined", `${no.resultado}/${no.puntosPregunta}`);

  console.error = ce; console.table(filas); console.log(`OK: ${filas.length} comprobaciones de punta a punta.`); process.exit(0);
})().catch((e) => { console.error = ce; console.error("FALLÓ:", e.message); process.exit(1); });
