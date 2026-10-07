// Prueba del prompt contra el prompt de producción ORIGINAL (copia congelada en
// scripts/fixtures/prompt-produccion-original.cjs).
//
// Desde el cambio de reparto/completitud el prompt YA NO es idéntico a propósito. Esta prueba
// verifica que lo único que cambió son los bloques previstos y que todo lo demás sigue igual:
//  - Texto común (ambos modos): solo cambia la regla de completitud (línea de "incompleta" + bloque
//    «REGLA DE COMPLETITUD»).
//  - Juego oral: además, los campos de reparto (tieneRazon/grado en vez de puntosResponde/puntosPregunta),
//    el bloque «QUIÉN ES QUIÉN» y la instrucción del veredicto.
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
const SINONIMOS_AGREGADA = (l) => l.startsWith('  "elementosClave":') || l.startsWith('  "paraSeguirPensando":') || l.startsWith("Fundamentá tu veredicto") || l.startsWith("EVALUÁ EL CONCEPTO, NO LAS PALABRAS:");
const COMPLETITUD_QUITADA = (l) => l.startsWith('- "incompleta":') || SINONIMOS_QUITADA(l);
const COMPLETITUD_AGREGADA = (l) => l.startsWith('- "incompleta":') || l === "" || l.startsWith("REGLA DE COMPLETITUD:") || SINONIMOS_AGREGADA(l);
const ORAL_QUITADA = (l) => COMPLETITUD_QUITADA(l) || /puntosResponde|puntosPregunta/.test(l) || l.startsWith('  "veredicto": "una oración que resume')
  || l.startsWith("- Si la respuesta") || l.startsWith("- Si los dos") || l.startsWith("- Si la objeción") || l.startsWith("- Si NINGUNA")
  || l.startsWith("Además de \"calificacionRecomendada\", tenés que repartir") || l.startsWith("Muy importante: evaluá el mérito real de cada argumento")
  || l.startsWith('El campo "resultado" debe ser exactamente uno de')
  || l.startsWith("No lo saltees");   // en oral la línea sigue con el bloque de completitud
const ORAL_AGREGADA = (l) => COMPLETITUD_AGREGADA(l) || /tieneRazon|grado|QUIÉN ES QUIÉN|vos no escribas puntajes|^- "(tieneRazon|grado)"|veredicto" tiene que decir|COHERENCIA CON "grado"|Muy importante: evaluá|No lo saltees|Vos NO escribís puntajes|En esta ronda, "resultado"/.test(l);

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
  const o = diff(original({ ...p, area, esJuegoOral: true }), nuevo({ ...p, esJuegoOral: true, equipoPregunta: "Rojos", equipoResponde: "Azules" }));
  assert.ok(o.quitadas.every(ORAL_QUITADA), "oral: se quitó algo no previsto: " + o.quitadas.filter((l) => !ORAL_QUITADA(l)).join(" | ").slice(0, 200));
  assert.ok(o.agregadas.every(ORAL_AGREGADA), "oral: se agregó algo no previsto: " + o.agregadas.filter((l) => !ORAL_AGREGADA(l)).join(" | ").slice(0, 200));
  n++;
}
console.log(`OK: ${n} combinaciones: solo cambian los bloques previstos (completitud y, en juego oral, reparto/quién es quién).`);

// Contenido del prompt oral nuevo
const oral = nuevo({ ...base, esJuegoOral: true, equipoPregunta: "Rojos", equipoResponde: "Azules" });
for (const frag of ['"tieneRazon": "pregunta" | "responde" | "ambos" | "ninguno"', '"grado": "total" | "parcial"',
  'el equipo que PREGUNTÓ es "Rojos" (es la Posición A) y el equipo que RESPONDIÓ es "Azules" (es la Posición B)',
  "REGLA DE COMPLETITUD", "EVALUÁ EL CONCEPTO, NO LAS PALABRAS", "«vestigios» o «restos arqueológicos» corresponden a «fuentes materiales»", "nunca a recordar la palabra exacta", 'COHERENCIA CON "grado"', "Si \"grado\" es \"parcial\", NO puede decir que la respuesta es incorrecta", "identificá el error", "NO lo uses para exigir información que la pregunta no pidió"])
  assert.ok(oral.includes(frag), "falta en el prompt oral: " + frag);
assert.ok(!/"puntosResponde"|"puntosPregunta"/.test(oral), "el prompt oral no debe pedir puntajes al modelo");
assert.ok(!nuevo({ ...base }).includes("tieneRazon"), "el prompt no oral no debe hablar de tieneRazon");
const sinNombres = nuevo({ ...base, esJuegoOral: true });
assert.ok(sinNombres.includes("el equipo que PREGUNTÓ es el de la Posición A"), "sin nombres, igual aclara A/B");
console.log("OK: el prompt oral pide tieneRazon/grado, aclara quién preguntó y quién respondió, y no pide puntajes.");

// Activación futura del contexto
const con = nuevo({ ...base, contexto: { area: "Ciencias Sociales y Humanidades", materia: "Historia", criterio: "causas y contexto: …" } });
for (const frag of ["\nÁrea: Ciencias Sociales y Humanidades", "\nMateria: Historia", "QUÉ CUENTA COMO RESPUESTA COMPLETA EN ESTA ÁREA (Ciencias Sociales y Humanidades): causas y contexto: …"])
  assert.ok(con.includes(frag), "falta: " + frag);
console.log("OK: con contexto activado se agregan Área / Materia / Criterio.");
