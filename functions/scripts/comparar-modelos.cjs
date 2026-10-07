// Compara DOS modelos de Gemini con el MISMO prompt de producción (buildArbitroPrompt, sin
// contexto de área), con las mismas 4 disputas y 3 repeticiones por modelo (24 llamadas).
//
// Casos (Lengua y Historia, cada una con un caso borderline y uno con error de dato):
//   lengua-borderline, lengua-error-dato, historia-borderline, historia-error-dato.
// Todos llevan texto base, así se puede ver si el modelo lo cita.
//
// CÓMO CORRERLO EN POWERSHELL (la clave queda SOLO en esa ventana; no se guarda en ningún archivo):
//
//   cd C:\Users\pablo_gi29o4o\Desktop\traffic-light-game\traffic-light-game\functions
//   npm run build
//   $k = Read-Host "Clave de Gemini" -AsSecureString
//   $env:GEMINI_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($k))
//   $env:MODELO_A = "gemini-3.1-flash-lite-preview"     # el de producción (si no lo ponés, se usa ese)
//   $env:MODELO_B = "NOMBRE-DEL-MODELO-A-PROBAR"        # obligatorio
//   node scripts\comparar-modelos.cjs
//   Remove-Item Env:GEMINI_KEY                           # borra la clave de la ventana al terminar
//
// Salida: scripts\salida\comparacion-modelos.md (lado a lado + tabla resumen) y
// scripts\salida\comparacion-modelos.json (salidas crudas). El script no escribe la clave ni la imprime.
// Con 429 reintenta hasta 2 veces (espera 5 y 15 s). Cuesta 24 llamadas cortas.
//
// Cómo se evalúa cada fila de la tabla resumen:
//  - Reparto de puntos: la pareja (puntosResponde, puntosPregunta) de cada repetición.
//      "Entre repeticiones": ✅ las 3 iguales · ⚠️ 2 de 3 · ❌ las 3 distintas (se evalúa por modelo).
//      "Entre modelos": ✅ si el reparto más frecuente de A es igual al de B.
//  - JSON válido: igual que en producción: JSON que se parsea y, en juego oral, con los dos puntos numéricos.
//  - Cita el texto base: la explicación/veredicto contiene una frase entrecomillada del texto base o
//    una secuencia de 4 palabras seguidas copiada del texto base (heurística; revisá a ojo los casos dudosos).
const fs = require("fs");
const path = require("path");
const { buildArbitroPrompt } = require("../lib/arbitroPrompt.js");
const { MODELO_GEMINI } = require("../lib/config.js");

const MODELO_A = process.env.MODELO_A || MODELO_GEMINI;
const MODELO_B = process.env.MODELO_B;
const REPETICIONES = 3;
const dir = path.join(__dirname, "salida");

const sesiones = {
  lengua: { materia: "Lengua y Literatura", nivel: "Secundaria", anio: "3", tema: "Crónicas de Indias",
    textoFuente: "Las crónicas de Indias son relatos escritos en el siglo XVI por testigos o historiadores de la conquista de América. Bartolomé de las Casas, fraile dominico, escribió en 1542 la Brevísima relación de la destrucción de las Indias para denunciar ante el rey los abusos de los conquistadores contra los pueblos indígenas y pedir que se los frenara. Otros cronistas, como Bernal Díaz del Castillo, narraron la conquista de México desde la mirada de un soldado que había participado en ella." },
  historia: { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto antiguo",
    textoFuente: "El Nilo fue la base de la civilización egipcia. Cada año sus crecidas depositaban limo fértil en las orillas, lo que permitía sembrar cereales. Los egipcios organizaron su calendario según las etapas del río: inundación, siembra y cosecha. Además, el Nilo era la principal vía de transporte y comunicación. La Gran Pirámide de Guiza fue mandada construir por el faraón Keops (Jufu) hacia el año 2560 a. C. como su tumba." },
};

const casos = [
  { id: "lengua-borderline", sesion: "lengua", tipo: "borderline",
    desacuerdo: 'Pregunta: "¿Por qué Bartolomé de las Casas escribió la Brevísima relación de la destrucción de las Indias?"\n\nRespuesta de Los Cronistas: "Para denunciar los abusos de los conquistadores contra los indígenas."',
    posicionA: "Los Lectores (calificó como incompleta): faltó decir a quién le hablaba y para qué: quería convencer al rey de frenar los abusos.",
    posicionB: "Los Cronistas (no acepta la calificación): dijimos el motivo principal, que era denunciar los abusos; el resto es un detalle." },
  { id: "lengua-error-dato", sesion: "lengua", tipo: "error de dato",
    desacuerdo: 'Pregunta: "¿Qué es una crónica de Indias?"\n\nRespuesta de Los Cronistas: "Es una novela que escribió Cervantes sobre los viajes de Colón."',
    posicionA: "Los Lectores (calificó como no): una crónica de Indias es un relato de testigos o cronistas sobre la conquista y no es una novela.",
    posicionB: "Los Cronistas (no acepta la calificación): igual hablamos de Colón y de los viajes, tendría que valer algo." },
  { id: "historia-borderline", sesion: "historia", tipo: "borderline",
    desacuerdo: 'Pregunta: "¿Por qué el río Nilo fue fundamental para la civilización egipcia?"\n\nRespuesta de Los Faraones: "Porque con sus crecidas dejaba limo fértil y se podía sembrar."',
    posicionA: "Los Escribas (calificó como incompleta): faltó decir que el Nilo también organizaba el calendario y era la vía de transporte.",
    posicionB: "Los Faraones (no acepta la calificación): la razón principal es la agricultura y eso lo dijimos bien." },
  { id: "historia-error-dato", sesion: "historia", tipo: "error de dato",
    desacuerdo: 'Pregunta: "¿Quién mandó construir la Gran Pirámide de Guiza?"\n\nRespuesta de Los Faraones: "La mandó construir Cleopatra para su tumba."',
    posicionA: "Los Escribas (calificó como no): la Gran Pirámide la mandó construir Keops (Jufu), mucho antes de Cleopatra.",
    posicionB: "Los Faraones (no acepta la calificación): Cleopatra es la reina más famosa de Egipto, por algo la dijimos." },
];

// El prompt de producción: sin `contexto`, juego oral, con texto base de la sesión.
const promptDe = (c) => buildArbitroPrompt({ ...sesiones[c.sesion], esJuegoOral: true, subtema: "", ejercicio: "",
  desacuerdo: c.desacuerdo, posicionA: c.posicionA, posicionB: c.posicionB });

// ── Evaluación de una salida ──
function parsear(texto) {
  const raw = String(texto).trim().replace(/```json|```/g, "").trim(); // igual que runArbitro
  try {
    const j = JSON.parse(raw);
    const valido = typeof j?.puntosResponde === "number" && typeof j?.puntosPregunta === "number";
    return { valido, json: j };
  } catch { return { valido: false, json: null }; }
}
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
function citaTexto(json, textoFuente) {
  if (!json) return false;
  const salida = [json.veredicto, json.explicacion, json.elementosClave, json.paraSeguirPensando].filter(Boolean).join(" ");
  const fuente = norm(textoFuente), salidaN = norm(salida);
  const w = fuente.split(" ");
  for (let i = 0; i + 4 <= w.length; i++) if (salidaN.includes(w.slice(i, i + 4).join(" "))) return true;
  return false;
}
const reparto = (r) => (r.json && r.valido ? `${r.json.puntosResponde}/${r.json.puntosPregunta}` : "—");
const moda = (xs) => { const m = {}; xs.forEach((x) => (m[x] = (m[x] || 0) + 1)); return Object.entries(m).sort((a, b) => b[1] - a[1])[0]; };
const estabilidad = (xs) => { const [, n] = moda(xs); return n === xs.length ? "✅ iguales" : n === xs.length - 1 && xs.length === 3 ? "⚠️ 2 de 3" : "❌ distintas"; };
const corto = (s, n = 400) => String(s ?? "").replace(/\s+/g, " ").replace(/\|/g, "/").slice(0, n);

// ── Llamada a Gemini (con reintento en 429/503; nunca se imprime la clave) ──
async function gemini(modelo, prompt) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const model = new GoogleGenerativeAI(process.env.GEMINI_KEY).getGenerativeModel({ model: modelo });
  const esperas = [5000, 15000];
  for (let intento = 0; ; intento++) {
    const t0 = Date.now();
    try {
      const r = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 700 } });
      return { texto: r.response.text(), ms: Date.now() - t0 };
    } catch (e) {
      const st = e?.status;
      if ((st === 429 || st === 503) && intento < esperas.length) { await new Promise((r) => setTimeout(r, esperas[intento])); continue; }
      const msg = String(e?.message || e).replace(/^.*?\]\s*/, "").replace(/AIza[0-9A-Za-z_-]{20,}/g, "[clave]").slice(0, 200);
      return { texto: "", error: `${st ?? "red"}: ${msg}`, ms: Date.now() - t0 };
    }
  }
}

(async () => {
  fs.mkdirSync(dir, { recursive: true });
  if (!MODELO_B || !process.env.GEMINI_KEY) {
    for (const c of casos) fs.writeFileSync(path.join(dir, `${c.id}.prompt-produccion.txt`), promptDe(c));
    console.log("Faltan MODELO_B y/o GEMINI_KEY. Solo escribí los prompts en scripts/salida/. Mirá el encabezado del script para correrlo en PowerShell.");
    process.exit(1);
  }
  console.log(`Modelo A: ${MODELO_A}\nModelo B: ${MODELO_B}\n${casos.length} casos × ${REPETICIONES} repeticiones × 2 modelos = ${casos.length * REPETICIONES * 2} llamadas…`);

  const resultados = {};
  for (const c of casos) {
    const prompt = promptDe(c);
    resultados[c.id] = { A: [], B: [] };
    for (let i = 0; i < REPETICIONES; i++) {
      for (const [lado, modelo] of [["A", MODELO_A], ["B", MODELO_B]]) {
        const o = await gemini(modelo, prompt);
        const p = parsear(o.texto);
        resultados[c.id][lado].push({ ...o, ...p, cita: citaTexto(p.json, sesiones[c.sesion].textoFuente) });
      }
      process.stdout.write(".");
    }
  }
  console.log("");

  // ── Reporte ──
  let md = `# Comparación de modelos del árbitro\n\n- **Modelo A:** \`${MODELO_A}\`\n- **Modelo B:** \`${MODELO_B}\`\n- Mismo prompt de producción (juego oral, con texto base, sin línea de área), temperatura 0.2, ${REPETICIONES} repeticiones por modelo.\n- Generado: ${new Date().toISOString()}\n\n`;
  md += `## Resumen\n\n| Caso | Tipo | Reparto A (rep. 1-3) | Reparto B (rep. 1-3) | Estable entre repeticiones A | Estable entre repeticiones B | Coincide entre modelos | JSON válido A | JSON válido B | Cita texto base A | Cita texto base B |\n|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const c of casos) {
    const { A, B } = resultados[c.id];
    const rA = A.map(reparto), rB = B.map(reparto);
    const coincide = moda(rA)[0] === moda(rB)[0] && moda(rA)[0] !== "—" ? "✅" : "❌";
    md += `| ${c.id} | ${c.tipo} | ${rA.join(" · ")} | ${rB.join(" · ")} | ${estabilidad(rA)} | ${estabilidad(rB)} | ${coincide} | ${A.filter((x) => x.valido).length}/${REPETICIONES} | ${B.filter((x) => x.valido).length}/${REPETICIONES} | ${A.filter((x) => x.cita).length}/${REPETICIONES} | ${B.filter((x) => x.cita).length}/${REPETICIONES} |\n`;
  }
  md += `\nFormato del reparto: puntosResponde/puntosPregunta. «—» = la llamada falló o el JSON no era válido.\n\n`;
  const msMedio = (xs) => Math.round(xs.reduce((a, x) => a + x.ms, 0) / xs.length);
  const todosA = casos.flatMap((c) => resultados[c.id].A), todosB = casos.flatMap((c) => resultados[c.id].B);
  md += `Tiempo medio por llamada: A ${msMedio(todosA)} ms · B ${msMedio(todosB)} ms. Llamadas con error: A ${todosA.filter((x) => x.error).length} · B ${todosB.filter((x) => x.error).length}.\n\n`;

  for (const c of casos) {
    md += `## ${c.id} — ${sesiones[c.sesion].materia} · ${sesiones[c.sesion].tema} (${c.tipo})\n\n${c.desacuerdo}\n\n- A: ${c.posicionA}\n- B: ${c.posicionB}\n\n`;
    md += `| Rep. | Modelo A (\`${MODELO_A}\`) | Modelo B (\`${MODELO_B}\`) |\n|---|---|---|\n`;
    const celda = (r) => r.error ? `⚠️ ERROR ${corto(r.error, 160)}`
      : !r.json ? `❌ JSON inválido: ${corto(r.texto, 200)}`
      : `**${r.json.resultado}** · calif.: ${r.json.calificacionRecomendada} · puntos ${reparto(r)}${r.valido ? "" : " (sin reparto ❌)"} · cita texto: ${r.cita ? "sí" : "no"}<br>${corto(r.json.veredicto, 220)}<br><em>${corto(r.json.explicacion, 320)}</em>`;
    for (let i = 0; i < REPETICIONES; i++) md += `| ${i + 1} | ${celda(resultados[c.id].A[i])} | ${celda(resultados[c.id].B[i])} |\n`;
    md += "\n";
  }
  fs.writeFileSync(path.join(dir, "comparacion-modelos.md"), md);
  fs.writeFileSync(path.join(dir, "comparacion-modelos.json"), JSON.stringify({ modeloA: MODELO_A, modeloB: MODELO_B, resultados }, null, 2));
  console.log("Listo: " + path.join(dir, "comparacion-modelos.md"));
})();
