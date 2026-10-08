// Prueba al árbitro con el modelo REAL usando casos-prueba-arbitro.json: 12 disputas de juego oral en inglés y sus equivalentes
// en español (4 completa, 4 incompleta, 4 incorrecta). Para cada una arma el prompt del idioma de la sesión con
// buildArbitroPrompt (el mismo que usa requestVeredicto), llama a Gemini y compara la "calificacionRecomendada" con la esperada.
// También informa el reparto que deduciría el código y si el modelo contestó en el idioma de la sesión (solo informa).
//
// SIN clave (GEMINI_API_KEY, o GEMINI_KEY como en comparar-modelos.cjs) no llama a nada: valida el archivo de casos y termina.
//
// CÓMO CORRERLO EN POWERSHELL (la clave queda SOLO en esa ventana; no se guarda en ningún archivo):
//   cd C:\Users\pablo_gi29o4o\Desktop\traffic-light-game\traffic-light-game\functions
//   npm run build
//   $k = Read-Host "Clave de Gemini" -AsSecureString
//   $env:GEMINI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($k))
//   node scripts\probar-casos-arbitro.cjs                      # los 24 envíos (12 en inglés + 12 en español), 1 corrida cada uno
//   node scripts\probar-casos-arbitro.cjs --idioma en          # solo inglés   (también: --idioma es)
//   node scripts\probar-casos-arbitro.cjs --repeticiones 3     # 3 corridas por caso (72 envíos)
//   node scripts\probar-casos-arbitro.cjs --solo c09-incorrecta-piramide
//   Remove-Item Env:GEMINI_API_KEY                             # borra la clave de la ventana al terminar
// Usa el modelo de src/config.ts (gemini-3.1-flash-lite). Salida: scripts\salida\casos-prueba-arbitro.md y .json (la clave nunca se escribe).
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const RUTA_CASOS = path.join(__dirname, "casos-prueba-arbitro.json");
const GRADOS = ["completa", "incompleta", "incorrecta"];
const LETRAS_ES = /[áéíóúñ¿¡ÁÉÍÓÚÑ]/;

function validarCasos(datos, { detectarIdioma, MATERIA_EN, NIVEL_EN }) {
  const errores = [], casos = datos.casos || [];
  if (casos.length !== 12) errores.push(`tiene que haber 12 casos y hay ${casos.length}`);
  for (const g of GRADOS) { const n = casos.filter((c) => c.esperada === g).length; if (n !== 4) errores.push(`tiene que haber 4 casos «${g}» y hay ${n}`); }
  const ids = new Set();
  for (const c of casos) {
    if (ids.has(c.id)) errores.push(`id repetido: ${c.id}`); ids.add(c.id);
    if (!GRADOS.includes(c.esperada)) errores.push(`${c.id}: «esperada» inválida`);
    if (!GRADOS.includes(c.calificacionPregunta)) errores.push(`${c.id}: «calificacionPregunta» inválida`);
    if (!(c.materia in MATERIA_EN)) errores.push(`${c.id}: materia «${c.materia}» no es una clave de materia`);
    if (!(c.nivel in NIVEL_EN)) errores.push(`${c.id}: nivel «${c.nivel}» inválido`);
    for (const idioma of ["en", "es"]) {
      const x = c[idioma]; if (!x) { errores.push(`${c.id}: falta la versión «${idioma}»`); continue; }
      for (const k of ["tema", "pregunta", "respuesta", "argumentoPregunta", "argumentoResponde"]) if (typeof x[k] !== "string" || !x[k].trim()) errores.push(`${c.id}.${idioma}.${k}: vacío`);
      if (typeof x.textoFuente !== "string") errores.push(`${c.id}.${idioma}.textoFuente: tiene que ser texto (puede ser "")`);
      const todo = [x.tema, x.textoFuente, x.pregunta, x.respuesta, x.argumentoPregunta, x.argumentoResponde].join(" ");
      if (idioma === "en" && LETRAS_ES.test(todo)) errores.push(`${c.id}.en: tiene letras del español (${todo.match(LETRAS_ES)[0]})`);
      for (const k of ["pregunta", "respuesta", "argumentoPregunta", "argumentoResponde"]) { const d = detectarIdioma(x[k]); if (d && d !== idioma) errores.push(`${c.id}.${idioma}.${k}: parece estar en «${d}»`); }
    }
    if (!!c.en?.textoFuente !== !!c.es?.textoFuente) errores.push(`${c.id}: el texto base está en un idioma y en el otro no`);
  }
  return errores;
}
module.exports = { validarCasos, RUTA_CASOS };
if (require.main !== module) return;

(async () => {
  const P = require("../lib/arbitroPrompt.js"), E = require("../lib/arbitroPromptEn.js");
  const { detectarIdioma } = require("../lib/arbitroIdioma.js");
  const { resolverRondaOral, normalizarCalificacion } = require("../lib/arbitroReparto.js");
  const datos = JSON.parse(fs.readFileSync(RUTA_CASOS, "utf8"));
  const errores = validarCasos(datos, { detectarIdioma, MATERIA_EN: E.MATERIA_EN, NIVEL_EN: E.NIVEL_EN });
  if (errores.length) { console.error("El archivo de casos tiene errores:\n - " + errores.join("\n - ")); process.exit(1); }
  console.log(`Casos válidos: ${datos.casos.length} (4 completa · 4 incompleta · 4 incorrecta), cada uno en inglés y en español.`);

  const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : d; };
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
  if (!apiKey) {
    console.log("\nNo hay GEMINI_API_KEY en esta ventana: no se llamó al modelo. Para correr los casos con el modelo real:\n  1) npm run build\n  2) poné la clave en la ventana y corré: node scripts\\probar-casos-arbitro.cjs   (instrucciones completas en el encabezado del script)");
    return;
  }
  const { generarTextoGemini } = require("../lib/gemini.js");
  const { MODELO_GEMINI } = require("../lib/config.js");
  const cargar = (f, n) => { const out = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../../src/i18n", f), "utf8"), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText; const m = { exports: {} }; new Function("module", "exports", "require", out)(m, m.exports, require); return m.exports[n].arbitro; };
  const dic = { es: cargar("es.ts", "es"), en: cargar("en.ts", "en") };
  const llenar = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  const idiomas = arg("idioma", "ambos") === "ambos" ? ["en", "es"] : [arg("idioma")];
  const reps = Math.max(1, parseInt(arg("repeticiones", "1"), 10) || 1), solo = arg("solo", null);
  const casos = datos.casos.filter((c) => !solo || c.id === solo);
  const equipos = { en: ["Red", "Blue"], es: ["Rojos", "Azules"] };
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const llamar = async (prompt) => {
    for (const espera of [0, 5000, 15000]) {
      if (espera) await dormir(espera);
      try { process.env.GEMINI_KEY = apiKey; return await generarTextoGemini(apiKey, { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 700 } }); }
      catch (e) { if (espera === 15000) throw e; }
    }
  };

  const filas = [], salidas = [];
  console.log(`Modelo: ${MODELO_GEMINI} · ${casos.length * idiomas.length * reps} envíos...`);
  for (const c of casos) for (const idioma of idiomas) for (let r = 1; r <= reps; r++) {
    const x = c[idioma], [eqP, eqR] = equipos[idioma], d = dic[idioma];
    const prompt = P.buildArbitroPrompt({ materia: c.materia, nivel: c.nivel, anio: c.anio, tema: x.tema, textoFuente: x.textoFuente, esJuegoOral: true, equipoPregunta: eqP, equipoResponde: eqR, idioma,
      desacuerdo: llenar(d.modelConflict, { pregunta: x.pregunta, equipo: eqR, respuesta: x.respuesta }),
      posicionA: `${eqP}: ${x.argumentoPregunta}`, posicionB: llenar(d.modelPositionB, { equipo: eqR, argumento: x.argumentoResponde }) });
    let fila = { id: c.id, idioma, corrida: r, esperada: c.esperada, obtenida: "—", coincide: false, reparto: "—", idiomaSalida: "—", error: "" };
    try {
      const crudo = await llamar(prompt);
      const parsed = JSON.parse(crudo.trim().replace(/```json|```/g, "").trim());
      const g = normalizarCalificacion(parsed.calificacionRecomendada);
      fila.obtenida = g === "no" ? "incorrecta" : g || String(parsed.calificacionRecomendada);
      fila.coincide = fila.obtenida === c.esperada;
      const res = resolverRondaOral(parsed, `${eqP}: x`, eqP, eqR, c.calificacionPregunta, idioma);
      fila.reparto = res.ok ? `${res.valor.reparto.puntosPregunta}/${res.valor.reparto.puntosResponde}` : "reintentar";
      const dets = [parsed.evaluacion, parsed.explicacion, parsed.paraSeguirPensando].map(detectarIdioma);
      fila.idiomaSalida = dets.every((v) => v === null || v === idioma) ? "ok" : `⚠ ${dets.filter((v) => v && v !== idioma)[0]}`;
      salidas.push({ id: c.id, idioma, corrida: r, salida: parsed });
    } catch (e) { fila.error = String(e.message || e).slice(0, 120); }
    filas.push(fila); console.log(`${fila.coincide ? "✔" : "✘"} ${c.id} [${idioma}] esperada=${c.esperada} obtenida=${fila.obtenida} reparto=${fila.reparto} idioma=${fila.idiomaSalida}${fila.error ? " ERROR " + fila.error : ""}`);
  }
  const total = filas.length, ok = filas.filter((f) => f.coincide).length;
  const porIdioma = Object.fromEntries(idiomas.map((i) => [i, `${filas.filter((f) => f.idioma === i && f.coincide).length}/${filas.filter((f) => f.idioma === i).length}`]));
  const avisos = filas.filter((f) => f.idiomaSalida.startsWith("⚠")).length;
  console.log(`\nCoinciden con la calificación esperada: ${ok}/${total} (${Object.entries(porIdioma).map(([i, v]) => `${i}: ${v}`).join(" · ")}) · respuestas en otro idioma: ${avisos}`);
  const md = ["# Casos de prueba del árbitro (modelo real)", "", `Modelo: ${MODELO_GEMINI} · ${new Date().toISOString()}`, "", `**Coinciden con lo esperado: ${ok}/${total}** (${Object.entries(porIdioma).map(([i, v]) => `${i}: ${v}`).join(" · ")}) · respuestas en otro idioma: ${avisos}`, "",
    "| caso | idioma | corrida | esperada | obtenida | coincide | reparto | idioma salida | error |", "|---|---|---|---|---|---|---|---|---|",
    ...filas.map((f) => `| ${f.id} | ${f.idioma} | ${f.corrida} | ${f.esperada} | ${f.obtenida} | ${f.coincide ? "sí" : "NO"} | ${f.reparto} | ${f.idiomaSalida} | ${f.error} |`)].join("\n");
  const SALIDA = process.env.CASOS_SALIDA || path.join(__dirname, "salida");
  fs.mkdirSync(SALIDA, { recursive: true });
  fs.writeFileSync(path.join(SALIDA, "casos-prueba-arbitro.md"), md);
  fs.writeFileSync(path.join(SALIDA, "casos-prueba-arbitro.json"), JSON.stringify({ filas, salidas }, null, 2));
  console.log("Informe: scripts\\salida\\casos-prueba-arbitro.md");
})().catch((e) => { console.error("Falló:", String(e.message || e).replace(/AIza[0-9A-Za-z_-]{20,}/g, "[clave]")); process.exit(1); });
