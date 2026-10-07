// Compara el prompt ACTUAL del árbitro (el de producción: genérico, sin línea de
// área/materia/criterio; es el que sigue desplegado) contra el prompt NUEVO con el
// contexto OPCIONAL activado (área, materia y una línea por área sobre qué cuenta
// como respuesta completa). Hoy producción NO lo activa; esto sirve para evaluarlo antes.
//
// Uso (desde functions/):
//   npm run build
//   node scripts/comparar-prompts.cjs                       -> solo escribe los prompts
//   GEMINI_KEY=tu_clave node scripts/comparar-prompts.cjs  -> además llama a Gemini
// Salida: scripts/salida/comparacion.md (lado a lado) y un .json por caso.
const fs = require("fs");
const path = require("path");
const { buildArbitroPrompt, criterioDeArea, AREA_LABEL_ES } = require("../lib/arbitroPrompt.js");

const sesiones = {
  lengua: { area: "lenguajes", materia: "Lengua y Literatura", nivel: "Secundaria", anio: "3°", tema: "Crónicas de Indias" },
  historia: { area: "sociales", materia: "Historia", nivel: "Secundaria", anio: "3°", tema: "Egipto antiguo" },
};

// Las mismas disputas se usan con los dos prompts.
const casos = [
  { id: "lengua-1", sesion: "lengua",
    desacuerdo: 'Pregunta: "¿Por qué Bartolomé de las Casas escribió la Brevísima relación de la destrucción de las Indias?"\n\nRespuesta de Los Cronistas: "Para denunciar los abusos de los conquistadores contra los indígenas."',
    posicionA: "Los Lectores (calificó como incompleta): faltó decir a quién le hablaba y para qué: quería convencer al rey de frenar los abusos.",
    posicionB: "Los Cronistas (no acepta la calificación): dijimos el motivo principal, que era denunciar los abusos; el resto es un detalle." },
  { id: "lengua-2", sesion: "lengua",
    desacuerdo: 'Pregunta: "¿Qué es una crónica de Indias?"\n\nRespuesta de Los Cronistas: "Es una novela que escribió Cervantes sobre los viajes de Colón."',
    posicionA: "Los Lectores (calificó como no): una crónica de Indias es un relato de testigos o cronistas sobre la conquista y no es una novela.",
    posicionB: "Los Cronistas (no acepta la calificación): igual hablamos de Colón y de los viajes, tendría que valer algo." },
  { id: "historia-1", sesion: "historia",
    desacuerdo: 'Pregunta: "¿Por qué el río Nilo fue fundamental para la civilización egipcia?"\n\nRespuesta de Los Faraones: "Porque con sus crecidas dejaba limo fértil y se podía sembrar."',
    posicionA: "Los Escribas (calificó como incompleta): faltó decir que el Nilo también organizaba el calendario y era la vía de transporte.",
    posicionB: "Los Faraones (no acepta la calificación): la razón principal es la agricultura y eso lo dijimos bien." },
  { id: "historia-2", sesion: "historia",
    desacuerdo: 'Pregunta: "¿Quién construyó la Gran Pirámide de Guiza?"\n\nRespuesta de Los Faraones: "Las construyó Cleopatra para su tumba."',
    posicionA: "Los Escribas (calificó como no): la Gran Pirámide la mandó construir Keops (Jufu), mucho antes de Cleopatra.",
    posicionB: "Los Faraones (no acepta la calificación): Cleopatra es la reina más famosa de Egipto, por algo la dijimos." },
];

const comun = { esJuegoOral: true, ejercicio: "", textoFuente: "", subtema: "" };
// ACTUAL = producción: sin `contexto` (sin línea de área/materia/criterio).
// NUEVO  = el mismo prompt con el contexto activado (así se vería al activarlo más adelante).
const sinArea = ({ area, ...resto }) => resto;
const actual = (c) => buildArbitroPrompt({ ...sinArea(sesiones[c.sesion]), ...comun, desacuerdo: c.desacuerdo, posicionA: c.posicionA, posicionB: c.posicionB });
const nuevo = (c) => {
  const s = sesiones[c.sesion];
  return buildArbitroPrompt({ ...sinArea(s), ...comun, desacuerdo: c.desacuerdo, posicionA: c.posicionA, posicionB: c.posicionB,
    contexto: { area: AREA_LABEL_ES[s.area], materia: s.materia, criterio: criterioDeArea(s.area) } });
};

async function gemini(prompt) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const model = new GoogleGenerativeAI(process.env.GEMINI_KEY).getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
  const r = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 700 } });
  return r.response.text().trim().replace(/```json|```/g, "").trim();
}

(async () => {
  const dir = path.join(__dirname, "salida"); fs.mkdirSync(dir, { recursive: true });
  let md = "# Comparación de prompts del árbitro: actual vs nuevo\n\n";
  for (const c of casos) {
    const pa = actual(c), pn = nuevo(c);
    fs.writeFileSync(path.join(dir, `${c.id}.prompt-actual.txt`), pa);
    fs.writeFileSync(path.join(dir, `${c.id}.prompt-nuevo.txt`), pn);
    md += `## ${c.id} — ${sesiones[c.sesion].materia} · ${sesiones[c.sesion].tema}\n\n${c.desacuerdo}\n\n- A: ${c.posicionA}\n- B: ${c.posicionB}\n\n`;
    if (process.env.GEMINI_KEY) {
      const [oa, on] = [await gemini(pa), await gemini(pn)];
      fs.writeFileSync(path.join(dir, `${c.id}.json`), JSON.stringify({ actual: oa, nuevo: on }, null, 2));
      md += `| | Prompt ACTUAL | Prompt NUEVO |\n|---|---|---|\n| Salida | \`\`\`${oa.replace(/\n/g, " ")}\`\`\` | \`\`\`${on.replace(/\n/g, " ")}\`\`\` |\n\n`;
    }
  }
  if (!process.env.GEMINI_KEY) md += "_Sin GEMINI_KEY: solo se generaron los prompts (ver los .txt). Corré de nuevo con la clave para ver las salidas._\n";
  fs.writeFileSync(path.join(dir, "comparacion.md"), md);
  console.log("Listo:", dir);
})();
