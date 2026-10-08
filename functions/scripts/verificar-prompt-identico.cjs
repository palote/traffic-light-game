// Prueba del prompt contra el prompt de producción ORIGINAL (copia congelada en
// scripts/fixtures/prompt-produccion-original.cjs).
//
// Desde el cambio de reparto/completitud el prompt YA NO es idéntico a propósito. Esta prueba
// verifica que lo único que cambió son los bloques previstos y que todo lo demás sigue igual:
//  - Texto común (ambos modos): solo cambia la regla de completitud (línea de "incompleta" + bloque
//    «REGLA DE COMPLETITUD»).
//  - Juego oral: además, el bloque «QUIÉN ES QUIÉN» y el bloque «CÓMO DECIDIR LA CALIFICACIÓN» (el árbitro decide solo la
//    calificación, sin ver lo que calificó quien preguntó ni una tabla de reparto: los argumentos de los equipos son para
//    considerar, no para adoptar), la «evaluacion» en lugar del «veredicto» (el código antepone quién tiene razón) y la
//    Posición A SIN la etiqueta «(calificó como …)». El prompt oral no pide tieneRazon, grado ni puntajes.
//  - Sin `contexto` (área/materia/criterio) el prompt no cambia; con `contexto` se agregan solo esas líneas.
//  - Los nombres de equipo no se filtran al modo no oral.
// Uso (desde functions/):  npm run build && node scripts/verificar-prompt-identico.cjs
const assert = require("assert");
const original = require("./fixtures/prompt-produccion-original.cjs").buildArbitroPrompt;
const nuevo = require("../lib/arbitroPrompt.js").buildArbitroPrompt;

const base = { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto antiguo",
  desacuerdo: 'Pregunta: "¿Quién construyó la Gran Pirámide?"\n\nRespuesta: "Cleopatra."', posicionA: "Rojos (calificó como no): fue Keops.", posicionB: "Azules (no acepta la calificación): fue Cleopatra." };
const variantes = [
  {}, { subtema: "Pirámides" }, { ejercicio: "1) ¿Quién?\n2) ¿Cuándo?" }, { textoFuente: "El Nilo crecía cada año…" },
  { textoFuente: "x".repeat(9000), subtema: "S", ejercicio: "E" }, { anio: "2" }, { anio: "5" }, { anio: "x" },
  { materia: "Matemática", tema: "Fracciones", nivel: "Primaria", anio: "4" },
];
const areas = [null, "", "Ciencias Exactas y Naturales", "Ciencias Sociales y Humanidades", "Exact and Natural Sciences", "Art and Expression"];

// Diff de líneas (LCS): devuelve líneas quitadas y agregadas.
function diff(a, b) {
  const A = a.split("\n"), B = b.split("\n");
  const m = A.length, n = B.length, L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const quitadas = [], agregadas = []; let i = 0, j = 0;
  while (i < m && j < n) { if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) quitadas.push(A[i++]); else agregadas.push(B[j++]); }
  while (i < m) quitadas.push(A[i++]); while (j < n) agregadas.push(B[j++]);
  return { quitadas, agregadas };
}

// Cambios permitidos
// Sinónimos / coherencia: cambian las líneas de "elementosClave" y "paraSeguirPensando" del JSON, la frase del
// texto base («no exijas que la respuesta repita sus palabras») y se agrega el bloque «EVALUÁ EL CONCEPTO, NO LAS PALABRAS».
const SINONIMOS_QUITADA = (l) => l.startsWith('  "elementosClave":') || l.startsWith('  "paraSeguirPensando":') || l.startsWith("Fundamentá tu veredicto");
const SINONIMOS_AGREGADA = (l) => l.startsWith('  "elementosClave":') || l.startsWith('  "paraSeguirPensando":') || l.startsWith("Fundamentá tu ") || l.startsWith("EVALUÁ EL CONCEPTO, NO LAS PALABRAS:");
const COMPLETITUD_QUITADA = (l) => l.startsWith('- "incompleta":') || SINONIMOS_QUITADA(l);
const COMPLETITUD_AGREGADA = (l) => l.startsWith('- "incompleta":') || l === "" || l.startsWith("REGLA DE COMPLETITUD:") || SINONIMOS_AGREGADA(l);
const ORAL_QUITADA = (l) => COMPLETITUD_QUITADA(l) || /puntosResponde|puntosPregunta/.test(l) || l.startsWith('  "veredicto": "una oración que resume')
  || l.startsWith("- Si la respuesta") || l.startsWith("- Si los dos") || l.startsWith("- Si la objeción") || l.startsWith("- Si NINGUNA")
  || l.startsWith("Además de \"calificacionRecomendada\", tenés que repartir") || l.startsWith("Muy importante: evaluá el mérito real de cada argumento")
  || l.startsWith('El campo "resultado" debe ser exactamente uno de')
  || l.startsWith("No lo saltees");   // en oral la línea sigue con el bloque de completitud
const ORAL_AGREGADA = (l) => COMPLETITUD_AGREGADA(l) || /QUIÉN ES QUIÉN|^CÓMO DECIDIR LA CALIFICACIÓN|^La "evaluacion", la "explicacion" y "paraSeguirPensando" NO dicen quién tiene razón|^Muy importante: evaluá el mérito real de la respuesta|No lo saltees|Vos NO escribís puntajes|En esta ronda, "resultado"|^  "evaluacion": "una oración que evalúa la respuesta en sí misma/.test(l);

let n = 0;
for (const v of variantes) for (const area of areas) {
  const p = { ...base, ...v };
  // 1) Modo NO oral: solo cambia la regla de completitud.
  const d = diff(original({ ...p, area }), nuevo(p));
  assert.ok(d.quitadas.every(COMPLETITUD_QUITADA), "no oral: se quitó algo no previsto: " + d.quitadas.filter((l) => !COMPLETITUD_QUITADA(l)).join(" | ").slice(0, 200));
  assert.ok(d.agregadas.every(COMPLETITUD_AGREGADA), "no oral: se agregó algo no previsto: " + d.agregadas.filter((l) => !COMPLETITUD_AGREGADA(l)).join(" | ").slice(0, 200));
  assert.ok(d.agregadas.some((l) => l.startsWith("REGLA DE COMPLETITUD:")), "falta la regla de completitud");
  // 2) Sin contexto / contexto vacío: igual
  assert.strictEqual(nuevo({ ...p, contexto: {} }), nuevo(p));
  assert.strictEqual(nuevo({ ...p, contexto: { area: null, materia: "", criterio: "  " } }), nuevo(p));
  // 3) Los nombres de equipo no cambian el modo no oral
  assert.strictEqual(nuevo({ ...p, equipoPregunta: "Rojos", equipoResponde: "Azules" }), nuevo(p));
  // 4) Modo oral
  // (al prompt original se le pasa la Posición A ya sin la etiqueta; más abajo se verifica que el nuevo la saca)
  const o = diff(original({ ...p, posicionA: p.posicionA.replace(" (calificó como no)", ""), area, esJuegoOral: true }), nuevo({ ...p, esJuegoOral: true, equipoPregunta: "Rojos", equipoResponde: "Azules" }));
  assert.ok(o.quitadas.every(ORAL_QUITADA), "oral: se quitó algo no previsto: " + o.quitadas.filter((l) => !ORAL_QUITADA(l)).join(" | ").slice(0, 200));
  assert.ok(o.agregadas.every(ORAL_AGREGADA), "oral: se agregó algo no previsto: " + o.agregadas.filter((l) => !ORAL_AGREGADA(l)).join(" | ").slice(0, 200));
  n++;
}
console.log(`OK: ${n} combinaciones: solo cambian los bloques previstos (completitud y, en juego oral, reparto/quién es quién).`);

// Contenido del prompt oral nuevo
const oral = nuevo({ ...base, esJuegoOral: true, equipoPregunta: "Rojos", equipoResponde: "Azules" });
for (const frag of [
  'el equipo que PREGUNTÓ es "Rojos" (es la Posición A) y el equipo que RESPONDIÓ es "Azules" (es la Posición B)',
  "REGLA DE COMPLETITUD", "EVALUÁ EL CONCEPTO, NO LAS PALABRAS", "«vestigios» o «restos arqueológicos» corresponden a «fuentes materiales»", "nunca a recordar la palabra exacta",
  "la respuesta es completa si señala cuál es el error; corregirlo solo se exige si la consigna lo pide explícitamente (por ejemplo, «identificá y corregí»)",
  "mostrar la cuenta o justificar solo se exige si la consigna lo pide explícitamente", "NO lo uses para exigir información que la pregunta no pidió",
  "CÓMO DECIDIR LA CALIFICACIÓN: vos NO escribís puntajes ni decidís quién tiene razón",
  "Decidila evaluando la respuesta contra la consigna (la pregunta) y, si la sesión tiene TEXTO BASE, contra ese texto",
  "sirven para que los CONSIDERES, no para que los ADOPTES",
  'NO dicen quién tiene razón ni nombran a un equipo como ganador: esa frase la agrega el sistema',
  'Si tu calificación es "incompleta", NO digas que la respuesta es incorrecta ni errónea',
  '"evaluacion": "una oración que evalúa la respuesta en sí misma',
  "Posición A: Rojos: fue Keops.", "Posición B: Azules (no acepta la calificación): fue Cleopatra.",
  "no pueden contradecirse con ella"])
  assert.ok(oral.includes(frag), "falta en el prompt oral: " + frag);
assert.ok(!/tieneRazon|"grado"|"puntosResponde"|"puntosPregunta"|"veredicto": "una oración/.test(oral), "el prompt oral ya no pide tieneRazon, grado, puntajes ni veredicto al modelo");
assert.ok(!oral.includes("calificó como") && !oral.includes("CÓMO SE REPARTE") && !/Si tu calificación es "(completa|incompleta|no)": tiene razón/.test(oral), "el prompt oral no trae la calificación de quien preguntó ni la tabla de reparto");
assert.ok(!oral.includes("y lo corrige"), "la regla anterior de «identificá el error» (que exigía corregirlo) ya no está");
assert.ok(!nuevo({ ...base }).includes("tieneRazon") && !nuevo({ ...base }).includes("CÓMO SE REPARTE"), "el prompt no oral no debe hablar de reparto");
const sinNombres = nuevo({ ...base, esJuegoOral: true });
assert.ok(sinNombres.includes("el equipo que PREGUNTÓ es el de la Posición A"), "sin nombres, igual aclara A/B");
// La calificación de quien preguntó no cambia el prompt (el modelo no la ve), sea cual sea
for (const cp of ["completa", "incompleta", "no", "incorrecta"]) {
  const pA = nuevo({ ...base, posicionA: `Rojos (calificó como ${cp}): x`, esJuegoOral: true, equipoPregunta: "Rojos", equipoResponde: "Azules" });
  assert.ok(!pA.includes("calificó como") && pA.includes("Posición A: Rojos: x\n"), "la Posición A va sin la etiqueta: " + cp);
}
assert.strictEqual(nuevo({ ...base, posicionA: "Rojos (calificó como completa): x", esJuegoOral: true, equipoPregunta: "Rojos" }), nuevo({ ...base, posicionA: "Rojos (calificó como no): x", esJuegoOral: true, equipoPregunta: "Rojos" }), "el prompt es el mismo cualquiera sea la calificación de quien preguntó");
assert.ok(nuevo({ ...base, posicionA: "Rojos: sin formato", esJuegoOral: true }).includes("Posición A: Rojos: sin formato"), "sin etiqueta, la Posición A queda igual");
// El modo no oral conserva la Posición A tal cual
assert.ok(nuevo({ ...base, posicionA: "Rojos (calificó como no): x" }).includes("Posición A: Rojos (calificó como no): x"), "no oral: la Posición A no se toca");
assert.strictEqual(nuevo({ ...base, calificacionPregunta: "completa" }), nuevo(base), "el modo no oral no depende de la calificación de quien preguntó");
console.log("OK: el prompt oral pide solo la calificación y la evaluación, no trae la calificación de quien preguntó ni la tabla, y no pide tieneRazon/grado/puntajes/veredicto.");

// Activación futura del contexto
const con = nuevo({ ...base, contexto: { area: "Ciencias Sociales y Humanidades", materia: "Historia", criterio: "causas y contexto: …" } });
for (const frag of ["\nÁrea: Ciencias Sociales y Humanidades", "\nMateria: Historia", "QUÉ CUENTA COMO RESPUESTA COMPLETA EN ESTA ÁREA (Ciencias Sociales y Humanidades): causas y contexto: …"])
  assert.ok(con.includes(frag), "falta: " + frag);
console.log("OK: con contexto activado se agregan Área / Materia / Criterio.");
