// Compara el prompt ACTUAL del árbitro (el de producción original: el modelo escribe
// puntosPregunta / puntosResponde) contra el prompt NUEVO (el modelo dice tieneRazon + grado y el
// CÓDIGO calcula el reparto), con las mismas disputas, 3 repeticiones por prompt, y verifica en cada
// salida que el equipo con razón reciba la parte mayor del punto.
//
// Casos: los 2 casos reales (Egipto y Mesopotamia) + 4 disputas de Lengua e Historia de la comparación anterior.
//
// ⚠️ Los casos reales ("real-1", "real-2") están reconstruidos con lo que se sabe: las respuestas son
// las que pasó Pablo; la PREGUNTA, el TEXTO BASE y los argumentos de cada equipo son una reconstrucción.
// Para usar los originales, reemplazá TEXTO_EGIPTO_MESOPOTAMIA y los campos `desacuerdo`, `posicionA` y
// `posicionB` de esos dos casos (están marcados con «RECONSTRUIDO»).
//
// CÓMO CORRERLO EN POWERSHELL (la clave queda solo en esa ventana; no se guarda en ningún archivo):
//
//   cd C:\Users\pablo_gi29o4o\Desktop\traffic-light-game\traffic-light-game\functions
//   npm run build
//   $k = Read-Host "Clave de Gemini" -AsSecureString
//   $env:GEMINI_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($k))
//   node scripts\comparar-prompts.cjs
//   Remove-Item Env:GEMINI_KEY        # borra la clave de la ventana al terminar
//
// Opcional: $env:MODELO = "otro-modelo"  (por defecto, el de producción: functions/src/config.ts)
// Sin GEMINI_KEY solo escribe los prompts en scripts\salida\. Con clave hace 36 llamadas (6 casos × 2 prompts × 3).
// Salida: scripts\salida\comparacion.md (lado a lado + tablas) y comparacion.json (salidas crudas).
//
// Qué se verifica en cada salida (columna «Mayor parte al que tiene razón»):
//  - ACTUAL: el ganador sale de "resultado" (A = quien preguntó, B = quien respondió). ✅ si ese equipo tiene
//    más puntos; ambas_correctas / ambas_incorrectas → ✅ si los dos tienen lo mismo.
//  - NUEVO: el ganador sale de "tieneRazon"; el reparto lo calcula el código, así que por construcción
//    coincide. Lo que se mide es si el modelo es coherente consigo mismo: «resultado coherente» (su "resultado"
//    coincide con tieneRazon) y «veredicto coherente» (el texto del veredicto nombra primero al equipo con
//    razón; heurística: si menciona a los dos, cuenta el que aparece primero).
const fs = require("fs");
const path = require("path");
const original = require("./fixtures/prompt-produccion-original.cjs").buildArbitroPrompt;
const { buildArbitroPrompt } = require("../lib/arbitroPrompt.js");
const { repartirPunto } = require("../lib/arbitroReparto.js");
const { MODELO_GEMINI } = require("../lib/config.js");

const MODELO = process.env.MODELO || MODELO_GEMINI;
const REPETICIONES = 3;
const dir = path.join(__dirname, "salida");

// RECONSTRUIDO: reemplazar por el texto base real de la sesión.
const TEXTO_EGIPTO_MESOPOTAMIA = "Las primeras civilizaciones surgieron junto a grandes ríos. En Egipto, el Nilo permitió sembrar y organizar la vida del reino; los egipcios usaron la escritura jeroglífica, grabada en piedra y escrita en papiro. En Mesopotamia, entre los ríos Tigris y Éufrates, los sumerios crearon hacia el 3300 a. C. la escritura cuneiforme, que se hacía con una caña sobre tablillas de arcilla húmeda; la escritura cuneiforme no se usó en Egipto. Los historiadores conocen estas civilizaciones a través de distintos tipos de fuentes: las fuentes escritas (papiros, tablillas, inscripciones), las fuentes materiales o arqueológicas (templos, tumbas, objetos, restos de ciudades) y las fuentes orales (relatos transmitidos de generación en generación, que muchas veces se pusieron por escrito mucho después).";

const sesiones = {
  egipto: { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto y Mesopotamia", textoFuente: TEXTO_EGIPTO_MESOPOTAMIA },
  lengua: { materia: "Lengua y Literatura", nivel: "Secundaria", anio: "3", tema: "Crónicas de Indias" },
  historia: { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto antiguo" },
};

const casos = [
  // ── Casos reales (Egipto y Mesopotamia) ──
  { id: "real-1", sesion: "egipto", equipoPregunta: "Rojos", equipoResponde: "Azules",
    // RECONSTRUIDO (la pregunta y los argumentos); la respuesta es la real.
    desacuerdo: 'Pregunta: "¿Qué tipos de fuentes usan los historiadores para estudiar Egipto y Mesopotamia?"\n\nRespuesta de Azules: "escritas, orales, vestigios y arqueológicas"',
    posicionA: "Rojos (calificó como incompleta): faltó aclarar qué es cada tipo de fuente y dar ejemplos de cada una.",
    posicionB: "Azules (no acepta la calificación): nombramos los tipos de fuentes que pedía la pregunta; los ejemplos no se pedían." },
  { id: "real-2", sesion: "egipto", equipoPregunta: "Azules", equipoResponde: "Rojos",
    // RECONSTRUIDO (la pregunta y los argumentos); la respuesta es la real.
    desacuerdo: 'Pregunta: "Identificá el error en esta afirmación: «Los egipcios escribían con escritura cuneiforme sobre tablillas de arcilla.»"\n\nRespuesta de Rojos: "Identificamos que la escritura cuneiforme no es egipcia."',
    posicionA: "Azules (calificó como incompleta): faltó corregir el error: decir cuál era la escritura de los egipcios.",
    posicionB: "Rojos (no acepta la calificación): la consigna pedía identificar el error y dijimos cuál era: el cuneiforme no es egipcio." },
  // ── Disputas de la comparación anterior ──
  { id: "lengua-1", sesion: "lengua", equipoPregunta: "Los Lectores", equipoResponde: "Los Cronistas",
    desacuerdo: 'Pregunta: "¿Por qué Bartolomé de las Casas escribió la Brevísima relación de la destrucción de las Indias?"\n\nRespuesta de Los Cronistas: "Para denunciar los abusos de los conquistadores contra los indígenas."',
    posicionA: "Los Lectores (calificó como incompleta): faltó decir a quién le hablaba y para qué: quería convencer al rey de frenar los abusos.",
    posicionB: "Los Cronistas (no acepta la calificación): dijimos el motivo principal, que era denunciar los abusos; el resto es un detalle." },
  { id: "lengua-2", sesion: "lengua", equipoPregunta: "Los Lectores", equipoResponde: "Los Cronistas",
    desacuerdo: 'Pregunta: "¿Qué es una crónica de Indias?"\n\nRespuesta de Los Cronistas: "Es una novela que escribió Cervantes sobre los viajes de Colón."',
    posicionA: "Los Lectores (calificó como no): una crónica de Indias es un relato de testigos o cronistas sobre la conquista y no es una novela.",
    posicionB: "Los Cronistas (no acepta la calificación): igual hablamos de Colón y de los viajes, tendría que valer algo." },
  { id: "historia-1", sesion: "historia", equipoPregunta: "Los Escribas", equipoResponde: "Los Faraones",
    desacuerdo: 'Pregunta: "¿Por qué el río Nilo fue fundamental para la civilización egipcia?"\n\nRespuesta de Los Faraones: "Porque con sus crecidas dejaba limo fértil y se podía sembrar."',
    posicionA: "Los Escribas (calificó como incompleta): faltó decir que el Nilo también organizaba el calendario y era la vía de transporte.",
    posicionB: "Los Faraones (no acepta la calificación): la razón principal es la agricultura y eso lo dijimos bien." },
  { id: "historia-2", sesion: "historia", equipoPregunta: "Los Escribas", equipoResponde: "Los Faraones",
    desacuerdo: 'Pregunta: "¿Quién mandó construir la Gran Pirámide de Guiza?"\n\nRespuesta de Los Faraones: "La mandó construir Cleopatra para su tumba."',
    posicionA: "Los Escribas (calificó como no): la Gran Pirámide la mandó construir Keops (Jufu), mucho antes de Cleopatra.",
    posicionB: "Los Faraones (no acepta la calificación): Cleopatra es la reina más famosa de Egipto, por algo la dijimos." },
];

const comun = { esJuegoOral: true, subtema: "", ejercicio: "" };
const datos = (c) => ({ ...sesiones[c.sesion], ...comun, desacuerdo: c.desacuerdo, posicionA: c.posicionA, posicionB: c.posicionB });
const promptActual = (c) => original({ ...datos(c), area: null });
const promptNuevo = (c) => buildArbitroPrompt({ ...datos(c), equipoPregunta: c.equipoPregunta, equipoResponde: c.equipoResponde });

// ── Evaluación ──
const limpiar = (t) => String(t).trim().replace(/```json|```/g, "").trim();
const f = (n) => String(n).replace(".", ",");
const repartoTxt = (c, r) => (r ? `${c.equipoPregunta} ${f(r.puntosPregunta)} · ${c.equipoResponde} ${f(r.puntosResponde)}` : "—");
const nombreMasTemprano = (texto, c) => {
  const t = String(texto || "").toLowerCase(); const a = t.indexOf(c.equipoPregunta.toLowerCase()), b = t.indexOf(c.equipoResponde.toLowerCase());
  if (a < 0 && b < 0) return null; if (a < 0) return "responde"; if (b < 0) return "pregunta"; return a < b ? "pregunta" : "responde";
};
function evaluarActual(c, texto) {
  let j; try { j = JSON.parse(limpiar(texto)); } catch { return { valido: false }; }
  if (typeof j?.puntosPregunta !== "number" || typeof j?.puntosResponde !== "number") return { valido: false, j };
  const r = { puntosPregunta: j.puntosPregunta, puntosResponde: j.puntosResponde };
  const razon = { A: "pregunta", B: "responde", ambas_correctas: "ambos", ambas_incorrectas: "ninguno" }[j.resultado] ?? null;
  let mayor = null;
  if (razon === "pregunta") mayor = r.puntosPregunta > r.puntosResponde;
  else if (razon === "responde") mayor = r.puntosResponde > r.puntosPregunta;
  else if (razon) mayor = r.puntosPregunta === r.puntosResponde;
  return { valido: true, j, r, razon, mayor, veredictoOk: razon === "pregunta" || razon === "responde" ? nombreMasTemprano(j.veredicto, c) === razon : null };
}
function evaluarNuevo(c, texto) {
  let j; try { j = JSON.parse(limpiar(texto)); } catch { return { valido: false }; }
  const r = repartirPunto(j?.tieneRazon, j?.grado);
  if (!r) return { valido: false, j };
  const razon = String(j.tieneRazon).trim().toLowerCase();
  let mayor;
  if (razon === "pregunta") mayor = r.puntosPregunta > r.puntosResponde;
  else if (razon === "responde") mayor = r.puntosResponde > r.puntosPregunta;
  else mayor = r.puntosPregunta === r.puntosResponde;
  const esperadoRes = { pregunta: "A", responde: "B", ambos: "ambas_correctas", ninguno: "ambas_incorrectas" }[razon];
  return { valido: true, j, r, razon, mayor, resultadoOk: j.resultado === esperadoRes,
    veredictoOk: razon === "pregunta" || razon === "responde" ? nombreMasTemprano(j.veredicto, c) === razon : null };
}

const moda = (xs) => { const m = {}; xs.forEach((x) => (m[x] = (m[x] || 0) + 1)); return Object.entries(m).sort((a, b) => b[1] - a[1])[0]; };
const estab = (xs) => { const [, n] = moda(xs); return n === xs.length ? "✅ iguales" : n === xs.length - 1 && xs.length === 3 ? "⚠️ 2 de 3" : "❌ distintas"; };
const marca = (v) => (v === true ? "✅" : v === false ? "❌" : "—");
const corto = (s, n = 260) => String(s ?? "").replace(/\s+/g, " ").replace(/\|/g, "/").slice(0, n);

async function gemini(prompt) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const model = new GoogleGenerativeAI(process.env.GEMINI_KEY).getGenerativeModel({ model: MODELO });
  const esperas = [5000, 15000];
  for (let i = 0; ; i++) {
    try {
      const r = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 700 } });
      return { texto: r.response.text() };
    } catch (e) {
      if ((e?.status === 429 || e?.status === 503) && i < esperas.length) { await new Promise((r) => setTimeout(r, esperas[i])); continue; }
      return { texto: "", error: `${e?.status ?? "red"}: ${String(e?.message || e).replace(/^.*?\]\s*/, "").replace(/AIza[0-9A-Za-z_-]{20,}/g, "[clave]").slice(0, 160)}` };
    }
  }
}

(async () => {
  fs.mkdirSync(dir, { recursive: true });
  for (const c of casos) { fs.writeFileSync(path.join(dir, `${c.id}.prompt-actual.txt`), promptActual(c)); fs.writeFileSync(path.join(dir, `${c.id}.prompt-nuevo.txt`), promptNuevo(c)); }
  if (!process.env.GEMINI_KEY) { console.log("Sin GEMINI_KEY: escribí solo los prompts en scripts/salida/. Mirá el encabezado del script para correrlo en PowerShell."); return; }
  console.log(`Modelo: ${MODELO} · ${casos.length} casos × 2 prompts × ${REPETICIONES} repeticiones = ${casos.length * 2 * REPETICIONES} llamadas…`);

  const res = {};
  for (const c of casos) {
    res[c.id] = { actual: [], nuevo: [] };
    for (let i = 0; i < REPETICIONES; i++) {
      const [oa, on] = [await gemini(promptActual(c)), await gemini(promptNuevo(c))];
      res[c.id].actual.push({ ...oa, ...evaluarActual(c, oa.texto) });
      res[c.id].nuevo.push({ ...on, ...evaluarNuevo(c, on.texto) });
      process.stdout.write(".");
    }
  }
  console.log("");

  let md = `# Comparación de prompts del árbitro: actual vs nuevo\n\n- Modelo: \`${MODELO}\` · ${REPETICIONES} repeticiones por prompt · temperatura 0.2 · juego oral.\n- **Actual:** el modelo escribe los puntajes. **Nuevo:** el modelo dice \`tieneRazon\` + \`grado\` y el código calcula el reparto; el prompt le dice quién preguntó y quién respondió; la completitud se mide contra la pregunta.\n- Los casos \`real-1\` y \`real-2\` usan una pregunta, un texto base y argumentos RECONSTRUIDOS (ver encabezado del script).\n- Generado: ${new Date().toISOString()}\n\n`;
  md += `## Resumen\n\n| Caso | Mayor parte al que tiene razón: actual | …nuevo | Reparto actual (rep. 1-3) | Reparto nuevo (rep. 1-3) | Estable actual | Estable nuevo | Nuevo: resultado coherente | Nuevo: veredicto coherente | JSON válido actual | JSON válido nuevo |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
  let totA = 0, okA = 0, totN = 0, okN = 0;
  for (const c of casos) {
    const { actual: A, nuevo: N } = res[c.id];
    const mA = A.filter((x) => x.valido), mN = N.filter((x) => x.valido);
    totA += mA.length; okA += mA.filter((x) => x.mayor).length; totN += mN.length; okN += mN.filter((x) => x.mayor).length;
    md += `| ${c.id} | ${mA.filter((x) => x.mayor).length}/${mA.length} | ${mN.filter((x) => x.mayor).length}/${mN.length} | ${A.map((x) => repartoTxt(c, x.r)).join("<br>")} | ${N.map((x) => repartoTxt(c, x.r)).join("<br>")} | ${estab(A.map((x) => repartoTxt(c, x.r)))} | ${estab(N.map((x) => repartoTxt(c, x.r)))} | ${mN.filter((x) => x.resultadoOk).length}/${mN.length} | ${mN.filter((x) => x.veredictoOk === true).length}/${mN.filter((x) => x.veredictoOk !== null).length} | ${mA.length}/${REPETICIONES} | ${mN.length}/${REPETICIONES} |\n`;
  }
  md += `\n**Total «el equipo con razón recibe la parte mayor»:** actual ${okA}/${totA} · nuevo ${okN}/${totN} (solo salidas con JSON válido).\n\n`;
  for (const c of casos) {
    md += `## ${c.id} — ${sesiones[c.sesion].materia} · ${sesiones[c.sesion].tema}\n\nPreguntó **${c.equipoPregunta}**, respondió **${c.equipoResponde}**.\n\n${c.desacuerdo}\n\n- A: ${c.posicionA}\n- B: ${c.posicionB}\n\n| Rep. | Prompt ACTUAL | Prompt NUEVO |\n|---|---|---|\n`;
    const celdaA = (x) => x.error ? `⚠️ ${x.error}` : !x.valido ? `❌ inválido: ${corto(x.texto, 160)}` : `resultado **${x.j.resultado}** · ${repartoTxt(c, x.r)} · mayor parte al que tiene razón ${marca(x.mayor)}<br>${corto(x.j.veredicto)}`;
    const celdaN = (x) => x.error ? `⚠️ ${x.error}` : !x.valido ? `❌ inválido: ${corto(x.texto, 160)}` : `**${x.j.tieneRazon}** / ${x.j.grado} → ${repartoTxt(c, x.r)} · resultado coherente ${marca(x.resultadoOk)} · veredicto coherente ${marca(x.veredictoOk)}<br>${corto(x.j.veredicto)}`;
    for (let i = 0; i < REPETICIONES; i++) md += `| ${i + 1} | ${celdaA(res[c.id].actual[i])} | ${celdaN(res[c.id].nuevo[i])} |\n`;
    md += "\n";
  }
  fs.writeFileSync(path.join(dir, "comparacion.md"), md);
  fs.writeFileSync(path.join(dir, "comparacion.json"), JSON.stringify({ modelo: MODELO, res }, null, 2));
  console.log("Listo: " + path.join(dir, "comparacion.md"));
})();
