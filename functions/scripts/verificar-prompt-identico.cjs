// Prueba: el prompt que arma hoy functions/src/arbitroPrompt.ts (sin `contexto`) es
// IDÉNTICO, carácter por carácter, al prompt de producción original.
// Además comprueba que activar `contexto` sí agrega las líneas (y solo esas).
//
// Uso (desde functions/):  npm run build && node scripts/verificar-prompt-identico.cjs
const assert = require("assert");
const original = require("./fixtures/prompt-produccion-original.cjs").buildArbitroPrompt;
const nuevo = require("../lib/arbitroPrompt.js").buildArbitroPrompt;

const base = { materia: "Historia", nivel: "Secundaria", anio: "3°", tema: "Egipto antiguo",
  desacuerdo: 'Pregunta: "¿Quién construyó la Gran Pirámide?"\n\nRespuesta: "Cleopatra."', posicionA: "A: fue Keops.", posicionB: "B: fue Cleopatra." };
const variantes = [
  {}, { esJuegoOral: true }, { subtema: "Pirámides" }, { ejercicio: "1) ¿Quién?\n2) ¿Cuándo?" },
  { textoFuente: "El Nilo crecía cada año…" }, { textoFuente: "x".repeat(9000), esJuegoOral: true, subtema: "S", ejercicio: "E" },
  { anio: "2°" }, { anio: "5°" }, { anio: "x" }, { materia: "Matemática", tema: "Fracciones", nivel: "Primaria", anio: "4°" },
];
// Áreas tal como se guardaron en producción (nombre completo, español o inglés) y vacías.
const areasProduccion = [null, "", "Ciencias Exactas y Naturales", "Ciencias Sociales y Humanidades", "Comunicación y Lenguajes",
  "Arte y Expresión", "Exact and Natural Sciences", "Social Sciences and Humanities", "Communication and Languages", "Art and Expression"];

let n = 0;
for (const v of variantes) for (const area of areasProduccion) {
  const p = { ...base, ...v };
  const esperado = original({ ...p, area });
  assert.strictEqual(nuevo(p), esperado, `Difiere (variante ${JSON.stringify(v).slice(0, 60)}, área ${area})`);
  assert.strictEqual(nuevo({ ...p, contexto: {} }), esperado, "contexto vacío debe ser idéntico");
  assert.strictEqual(nuevo({ ...p, contexto: { area: null, materia: "", criterio: "  " } }), esperado, "campos vacíos deben ser idénticos");
  n++;
}
console.log(`OK: ${n} combinaciones, el prompt es idéntico al de producción.`);

// Activación futura: con contexto, aparecen las líneas y NO cambia nada más.
const sin = nuevo(base);
const con = nuevo({ ...base, contexto: { area: "Ciencias Sociales y Humanidades", materia: "Historia", criterio: "causas y contexto: …" } });
assert.notStrictEqual(con, sin);
for (const frag of ["\nÁrea: Ciencias Sociales y Humanidades", "\nMateria: Historia", "QUÉ CUENTA COMO RESPUESTA COMPLETA EN ESTA ÁREA (Ciencias Sociales y Humanidades): causas y contexto: …"])
  assert.ok(con.includes(frag), "falta: " + frag);
console.log("OK: con contexto activado se agregan Área / Materia / Criterio.");
