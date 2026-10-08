// Prueba de scripts/comparar-modelos.cjs (prompt actual vs nuevo) con Gemini SIMULADO (no usa clave ni red).
// Verifica: que cada llamada lleve el prompt que corresponde (el actual congelado o el nuevo de lib/), que el reparto del
// prompt nuevo salga de resolverRondaOral (ignorando tieneRazon/grado del modelo; el veredicto lo arma el código) y el del
// actual de repartirPunto, que el prompt nuevo NO lleve la calificación de quien preguntó,
// que la tabla resumen y los totales cuenten bien, que el modelo por defecto sea el de config.ts, que el 404 corte
// antes de las 72 llamadas, que un 429 se reintente y que la clave nunca llegue a la salida.
// Uso (desde functions/):  npm run build && node scripts/verificar-comparar-modelos.cjs
// Escribe en una carpeta temporal: no pisa scripts/salida/.
const Module = require("module");
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

// ── Espías (tienen que instalarse antes de cargar el script) ──
const reparto = require("../lib/arbitroReparto.js");
let llamadasResolver = 0, llamadasRepartir = 0;
const resolverReal = reparto.resolverRondaOral, repartirReal = reparto.repartirPunto;
reparto.resolverRondaOral = (...a) => { llamadasResolver++; return resolverReal(...a); };
reparto.repartirPunto = (...a) => { llamadasRepartir++; return repartirReal(...a); };

// ── Gemini simulado ──
const CLAVE_FALSA = "AIzaSyFAKEFAKEFAKEFAKEFAKEFAKE12345678";
const J = (o) => JSON.stringify({ resultado: "A", elementosClave: "e", explicacion: "Porque sí.", paraSeguirPensando: "¿Y por qué?", ...o });
const FUERA = J({ resultado: "fuera_de_tema", calificacionRecomendada: "no", veredicto: "Este desacuerdo no corresponde al tema de la sesión." });
const err500 = { error: { status: 500, message: `[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/x:generateContent?key=${CLAVE_FALSA}: boom ${CLAVE_FALSA}` } };

// Cada entrada: { calif, razon, grado, quien: de quién habla el veredicto, extra } o un valor especial (FUERA / err500 / texto)
const e = (calif, razon, grado, quien, extra = {}) => ({ calif, razon, grado, quien, extra });
const R3 = (x) => [x, x, x];
const guion = {
  // El prompt ACTUAL: el modelo ve la calificación de quien preguntó y escribe tieneRazon/grado. Reproduce lo observado: con
  // «incompleta» igual a la de quien preguntó, da la razón a quien respondió (fuentes-sinonimos e historia-borderline) o a quien preguntó.
  actual: {
    "fuentes-sinonimos": R3(e("incompleta", "responde", "parcial", "responde")),
    "cuneiforme-bien": R3(e("completa", "responde", "total", "responde")),
    "piramides-esclavos": R3(e("no", "pregunta", "total", "pregunta")),
    "fuera-de-tema": [FUERA, FUERA, FUERA],
    "lengua-borderline": R3(e("completa", "responde", "total", "responde")),
    "lengua-error-dato": R3(e("no", "pregunta", "total", "pregunta")),
    "historia-borderline": [e("incompleta", "responde", "parcial", "responde"), e("completa", "responde", "total", "responde"), e("incompleta", "responde", "parcial", "pregunta")], // la 3.ª: veredicto con el equipo equivocado
    "historia-error-dato": R3(e("no", "pregunta", "total", "pregunta")),
    "biologia-fotosintesis": R3(e("incompleta", "pregunta", "parcial", "pregunta")),
    "matematica-sin-cuenta": R3(e("incompleta", "pregunta", "parcial", "pregunta")), // anclaje: copia la calificación de quien preguntó
    "matematica-error": R3(e("no", "pregunta", "total", "pregunta")),
    "arte-sinonimos": [e("completa", "responde", "total", "responde"), e("incompleta", "pregunta", "parcial", "pregunta"), e("completa", "responde", "total", "responde")],
  },
  // El prompt NUEVO: el modelo decide solo la calificación y escribe la «evaluacion» (a veces manda un tieneRazon/grado/veredicto que se ignora).
  nuevo: {
    "fuentes-sinonimos": [e("incompleta", null, null, "pregunta", { explicacion: "La respuesta es incorrecta." }), e("incompleta", null, null, "pregunta"), e("incompleta", null, null, "pregunta")],
    "cuneiforme-bien": R3(e("completa", null, null, "responde")),
    "piramides-esclavos": [e("no", null, null, "pregunta"), e("regular", null, null, "pregunta"), e("no", null, null, "pregunta")],
    "fuera-de-tema": [FUERA, err500, FUERA],
    "lengua-borderline": R3(e("completa", null, null, "responde")),
    "lengua-error-dato": R3(e("no", null, null, "pregunta")),
    "historia-borderline": [e("incompleta", null, null, "pregunta"), e("completa", null, null, "responde"), e("completa", null, null, "pregunta")],
    "historia-error-dato": R3(e("no", null, null, "pregunta")),
    "biologia-fotosintesis": [e("incompleta", null, null, "pregunta", { explicacion: "Tiene razón Rojos." }), e("incompleta", null, null, "pregunta"), e("incompleta", null, null, "pregunta")], // la 1.ª: el texto del modelo nombra un ganador
    "matematica-sin-cuenta": R3(e("completa", null, null, "responde")),
    "matematica-error": R3(e("no", null, null, "pregunta")),
    "arte-sinonimos": [e("completa", null, null, "responde"), e("completa", null, null, "responde"), e("incompleta", null, null, "pregunta")],
  },
};

const llamadas = []; // { modelo, prompt, config, variante, caso }
let casosRef = null, forzar404 = false, fallar429Una = false;
const cuenta = {};
const respuestaDe = (variante, c, item) => {
  if (typeof item === "string") return item;
  const nombre = item.quien === "pregunta" ? c.equipoPregunta : c.equipoResponde;
  const base = { calificacionRecomendada: item.calif, veredicto: `Tiene razón ${nombre}.`, ...item.extra };
  // El actual manda tieneRazon/grado y el veredicto. El nuevo manda la «evaluacion» (el código arma el veredicto); además, a veces,
  // manda un tieneRazon/grado/veredicto que se tienen que ignorar.
  return J(variante === "actual" ? { ...base, tieneRazon: item.razon, grado: item.grado } : { ...base, evaluacion: "Evaluación de la respuesta.", tieneRazon: "ninguno", grado: "total" });
};
class FakeAI {
  getGenerativeModel({ model }) {
    return {
      generateContent: async (req) => {
        const prompt = req.contents[0].parts[0].text, config = req.generationConfig;
        if (/^Respondé solo con la palabra/.test(prompt)) {
          llamadas.push({ modelo: model, prompt, config, variante: "preflight", caso: "preflight" });
          if (forzar404 || model === "modelo-inexistente") throw Object.assign(new Error(`[GoogleGenerativeAI Error]: models/${model} is not found`), { status: 404 });
          return { response: { text: () => "ok" } };
        }
        if (fallar429Una) { fallar429Una = false; throw Object.assign(new Error("cuota"), { status: 429 }); }
        const c = casosRef.find((x) => prompt.includes(x.desacuerdo));
        assert.ok(c, "el prompt no corresponde a ningún caso");
        const variante = prompt.includes("CÓMO DECIDIR LA CALIFICACIÓN") ? "nuevo" : "actual";
        llamadas.push({ modelo: model, prompt, config, variante, caso: c.id });
        const k = `${variante}|${c.id}`; const i = (cuenta[k] = (cuenta[k] || 0) + 1) - 1;
        const item = guion[variante][c.id][i];
        await new Promise((r) => setTimeout(r, variante === "actual" ? 20 : 45));
        if (item && item.error) throw Object.assign(new Error(item.error.message), { status: item.error.status });
        return { response: { text: () => respuestaDe(variante, c, item) } };
      },
    };
  }
}
const load = Module._load;
Module._load = function (r, ...a) { if (r === "@google/generative-ai") return { GoogleGenerativeAI: FakeAI }; return load.call(this, r, ...a); };

const celdas = (linea) => linea.split("|").slice(1, -1).map((s) => s.trim());
const fila = (md, caso, prompt) => celdas(md.split("\n").find((l) => l.startsWith(`| ${caso} | Prompt ${prompt} |`)));
const filaTotal = (md, prompt) => celdas(md.split("\n").find((l) => l.startsWith(`| Prompt ${prompt} |`) && !/^\| Prompt \w+ \| (razón|sin esperado|fuera|coherente)/.test(l) && celdas(l).length === 13));

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "comparar-"));
  process.env.GEMINI_KEY = "clave-falsa-de-prueba";
  process.env.COMPARAR_SALIDA = tmp;
  process.env.COMPARAR_ESPERAS_MS = "1,1";
  delete process.env.MODELO;
  process.env.MODELO_A = "viejo-a"; process.env.MODELO_B = "viejo-b"; // quedaron en la ventana de PowerShell: se ignoran
  const script = require("./comparar-modelos.cjs");
  casosRef = script.casos;
  const log = console.log; const out = []; console.log = (...a) => out.push(a.join(" ")); const wr = process.stdout.write.bind(process.stdout); process.stdout.write = () => true;
  const restaurar = () => { console.log = log; process.stdout.write = wr; };
  try {
    // ── 0) Sin MODELO: usa el de config.ts (gemini-3.1-flash-lite) e ignora MODELO_A/MODELO_B ──
    const { MODELO_GEMINI } = require("../lib/config.js");
    assert.strictEqual(MODELO_GEMINI, "gemini-3.1-flash-lite", "config.ts tiene que tener el modelo estable");
    forzar404 = true;
    let r = await script.main();
    forzar404 = false;
    assert.strictEqual(llamadas[0].modelo, "gemini-3.1-flash-lite", "sin MODELO se usa el de config.ts");
    assert.ok(out.some((l) => /MODELO_A y MODELO_B ya no se usan/.test(l)), "avisa que MODELO_A/MODELO_B se ignoran");
    // ── 1) Modelo inexistente: corta tras la prueba de acceso ──
    out.length = 0; llamadas.length = 0;
    process.env.MODELO = "modelo-inexistente";
    r = await script.main();
    assert.strictEqual(r.ok, false); assert.strictEqual(r.status, 404);
    assert.ok(out.some((l) => /404/.test(l) && /AI Studio/.test(l)), "tiene que avisar del 404 y de la lista de AI Studio");
    assert.strictEqual(llamadas.filter((x) => x.variante !== "preflight").length, 0, "no debe hacer las 72 llamadas");
    assert.ok(!fs.existsSync(path.join(tmp, "comparacion-reparto.md")), "no debe escribir el informe");
    llamadas.length = 0;

    // ── 2) Corrida completa (con un 429 que se reintenta) ──
    fallar429Una = true;
    process.env.MODELO = "gemini-3.1-flash-lite";
    r = await script.main();
    assert.strictEqual(r.ok, true);
    const principales = llamadas.filter((x) => x.variante !== "preflight");
    assert.strictEqual(principales.length, 72, "12 casos × 3 corridas × 2 prompts");
    assert.strictEqual(llamadas.filter((x) => x.variante === "preflight").length, 1);
    assert.ok(principales.every((x) => x.modelo === "gemini-3.1-flash-lite"), "los dos prompts corren con el mismo modelo");
    assert.strictEqual(script.casos.length, 12);
    assert.deepStrictEqual(script.casos.filter((c) => c.nuevoCaso).map((c) => c.id), ["biologia-fotosintesis", "matematica-sin-cuenta", "matematica-error", "arte-sinonimos"]);
    // Los textos base de los casos nuevos: el de Biología menciona la clorofila como necesaria; el de Matemática no pide el procedimiento
    assert.ok(/necesita cuatro cosas: luz solar, agua, dióxido de carbono y clorofila/.test(script.sesiones.biologia.textoFuente));
    assert.ok(!/procedimiento|mostrar la cuenta/i.test(script.sesiones.matematica.textoFuente));
    for (const v of ["actual", "nuevo"]) for (const c of script.casos) assert.strictEqual(principales.filter((x) => x.variante === v && x.caso === c.id).length, 3, `${v} ${c.id}`);

    // Prompts: el actual es el congelado; el nuevo, el de lib/ (producción)
    const { buildArbitroPrompt: congelado } = require("./fixtures/prompt-produccion-actual.cjs");
    const { buildArbitroPrompt: nuevo } = require("../lib/arbitroPrompt.js");
    for (const x of principales) {
      const c = script.casos.find((k) => k.id === x.caso);
      const p = script.paramsDe(c);
      assert.strictEqual(x.prompt, (x.variante === "actual" ? congelado : nuevo)(p), `${x.variante} ${x.caso}: prompt distinto del esperado`);
      assert.ok(/QUIÉN ES QUIÉN: el equipo que PREGUNTÓ es "/.test(x.prompt) && x.prompt.includes("TEXTO BASE DE LA SESIÓN") && !/\nÁrea: /.test(x.prompt), "equipos, texto base y sin línea de área");
      assert.deepStrictEqual(x.config, { temperature: 0.2, maxOutputTokens: 700 });
      if (x.variante === "actual") assert.ok(x.prompt.includes('"tieneRazon": "pregunta" | "responde" | "ambos" | "ninguno"') && !x.prompt.includes("CÓMO DECIDIR") && x.prompt.includes("(calificó como "), "el actual pide tieneRazon/grado y ve la calificación de quien preguntó");
      else assert.ok(x.prompt.includes("CÓMO DECIDIR LA CALIFICACIÓN") && !x.prompt.includes("tieneRazon") && !x.prompt.includes("calificó como") && !x.prompt.includes("CÓMO SE REPARTE") && x.prompt.includes("Posición A: " + c.equipoPregunta + ": "), "el nuevo pide solo la calificación y NO ve la calificación de quien preguntó");
    }
    assert.ok(llamadasResolver >= 34, `el reparto del prompt nuevo sale de resolverRondaOral (${llamadasResolver} llamadas)`);
    assert.ok(llamadasRepartir >= 30, `el del actual, de repartirPunto (${llamadasRepartir} llamadas)`);

    // Tabla resumen: [acierta, repartoOk, coherente, json, contradice, veredictoOk, nombra un ganador (solo nuevo), consistencia]
    const md = fs.readFileSync(path.join(tmp, "comparacion-reparto.md"), "utf8");
    const I3 = "✅ las 3 iguales", D2 = "⚠️ 2 de 3";
    const chequear = (caso, prompt, esperado) => {
      const c = fila(md, caso, prompt);
      assert.deepStrictEqual([c[3], c[4], c[5], c[6], c[7], c[8], c[9], c[11]], esperado, `${caso} ${prompt}: ${JSON.stringify(c)}`);
      return c;
    };
    // ACTUAL
    chequear("fuentes-sinonimos", "actual", ["0/3", "0/3", "0/3", "3/3", "0/3", "3/3", "—", I3]);
    chequear("cuneiforme-bien", "actual", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "—", I3]);
    chequear("piramides-esclavos", "actual", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "—", I3]);
    chequear("fuera-de-tema", "actual", ["3/3", "3/3", "—", "3/3", "0/3", "—", "—", I3]);
    chequear("lengua-borderline", "actual", ["—", "—", "3/3", "3/3", "0/3", "3/3", "—", I3]);
    chequear("lengua-error-dato", "actual", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "—", I3]);
    chequear("historia-borderline", "actual", ["1/3", "1/3", "1/3", "3/3", "0/3", "2/3", "—", D2]);
    chequear("historia-error-dato", "actual", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "—", I3]);
    chequear("biologia-fotosintesis", "actual", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "—", I3]);
    chequear("matematica-sin-cuenta", "actual", ["0/3", "0/3", "3/3", "3/3", "0/3", "3/3", "—", I3]);   // copia la calificación de quien preguntó
    chequear("matematica-error", "actual", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "—", I3]);
    chequear("arte-sinonimos", "actual", ["2/3", "2/3", "3/3", "3/3", "0/3", "3/3", "—", D2]);
    // NUEVO
    chequear("fuentes-sinonimos", "nuevo", ["3/3", "3/3", "3/3", "3/3", "1/3", "3/3", "0/3", I3]);
    chequear("cuneiforme-bien", "nuevo", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "0/3", I3]);
    chequear("piramides-esclavos", "nuevo", ["2/3", "2/3", "2/3", "2/3", "0/3", "2/3", "0/3", D2]);
    chequear("fuera-de-tema", "nuevo", ["2/3", "2/3", "—", "2/3", "0/3", "—", "—", D2]);
    chequear("lengua-borderline", "nuevo", ["—", "—", "3/3", "3/3", "0/3", "3/3", "0/3", I3]);
    chequear("lengua-error-dato", "nuevo", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "0/3", I3]);
    chequear("historia-borderline", "nuevo", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "0/3", D2]); // el veredicto lo arma el código: nunca nombra al equipo equivocado
    chequear("historia-error-dato", "nuevo", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "0/3", I3]);
    chequear("biologia-fotosintesis", "nuevo", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "1/3", I3]);
    chequear("matematica-sin-cuenta", "nuevo", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "0/3", I3]);
    chequear("matematica-error", "nuevo", ["3/3", "3/3", "3/3", "3/3", "0/3", "3/3", "0/3", I3]);
    chequear("arte-sinonimos", "nuevo", ["2/3", "2/3", "3/3", "3/3", "0/3", "3/3", "0/3", D2]);
    // «Obtenido»
    assert.ok(fila(md, "fuentes-sinonimos", "actual")[12].startsWith("incompleta → responde/parcial 0,25-0,75"), fila(md, "fuentes-sinonimos", "actual")[12]);
    assert.ok(fila(md, "fuentes-sinonimos", "nuevo")[12].startsWith("incompleta → pregunta/parcial 0,75-0,25"), "el nuevo ignora el tieneRazon que mandó el modelo: " + fila(md, "fuentes-sinonimos", "nuevo")[12]);
    assert.ok(fila(md, "piramides-esclavos", "nuevo")[12].includes("inválido"));
    // Totales: [acierta 6 fijos anteriores, acierta 4 nuevos, acierta (11 con esperado), reparto, coherente, json, contradice, veredicto, nombra ganador, iguales, errores]
    const tA = filaTotal(md, "actual"), tN = filaTotal(md, "nuevo");
    assert.deepStrictEqual([tA[1], tA[2], tA[3], tA[4], tA[5], tA[6], tA[7], tA[8], tA[9], tA[10], tA[12]], ["15/18", "8/12", "24/33", "24/33", "28/33", "36/36", "0/36", "32/33", "—", "10/12", "0"], "totales del actual: " + JSON.stringify(tA));
    assert.deepStrictEqual([tN[1], tN[2], tN[3], tN[4], tN[5], tN[6], tN[7], tN[8], tN[9], tN[10], tN[12]], ["16/18", "11/12", "30/33", "30/33", "32/33", "34/36", "1/36", "32/33", "1/33", "8/12", "1"], "totales del nuevo: " + JSON.stringify(tN));
    // Criterios de despliegue (el nuevo de esta corrida simulada falla algunos a propósito: pirámides y arte)
    assert.ok(md.includes("## Criterios para decidir el despliegue") && md.indexOf("## Criterios para decidir el despliegue") < md.indexOf("## Resumen por caso y prompt"));
    const crit = (txt) => md.split("\n").find((l) => l.startsWith("| ") && l.includes(txt));
    assert.ok(/\| 16\/18 \| 15\/18 \| ❌ \|$/.test(crit("casos fijos anteriores: 18/18")), crit("casos fijos anteriores: 18/18"));
    assert.ok(/\| 3\/3 \| 3\/3 \| ✅ \|$/.test(crit("`cuneiforme-bien`: razón a quien respondió")), crit("`cuneiforme-bien`: razón a quien respondió"));
    assert.ok(/\| 3\/3 \| 3\/3 \| ✅ \|$/.test(crit("el árbitro dice «completa»")), crit("el árbitro dice «completa»"));
    assert.ok(/\| 3\/3 \| 0\/3 \| ✅ \|$/.test(crit("`fuentes-sinonimos` (no se pierde)")), crit("`fuentes-sinonimos` (no se pierde)"));
    assert.ok(/\| 3\/3 \| 3\/3 \| ✅ \|$/.test(crit("`biologia-fotosintesis`")) && /\| 3\/3 \| 0\/3 \| ✅ \|$/.test(crit("`matematica-sin-cuenta`")) && /\| 3\/3 \| 3\/3 \| ✅ \|$/.test(crit("`matematica-error`")) && /\| 2\/3 \| 2\/3 \| ❌ \|$/.test(crit("`arte-sinonimos`")), "criterios de los casos nuevos");
    assert.ok(md.includes("No se cumplen todos los criterios (2 de 8 fallan): no se despliega así."), "el informe dice si se cumplen o no todos los criterios");
    // Tiempo: el nuevo (45 ms) más lento que el actual (20 ms) en el JSON crudo, y mostrado en segundos
    const js = JSON.parse(fs.readFileSync(path.join(tmp, "comparacion-reparto.json"), "utf8"));
    const prom = (v) => { const xs = Object.values(js.resultados).flatMap((x) => x[v]).filter((x) => !x.error); return xs.reduce((a, x) => a + x.ms, 0) / xs.length; };
    assert.ok(prom("actual") >= 15 && prom("nuevo") > prom("actual"), `tiempos actual ${prom("actual")} nuevo ${prom("nuevo")}`);
    assert.ok(/^\d,\d\d s$/.test(fila(md, "fuentes-sinonimos", "actual")[10]), "tiempo medio en segundos");
    // Salidas completas debajo de la tabla, con las marcas
    assert.ok(md.indexOf("## Salidas completas") > md.indexOf("## Resumen por caso y prompt"));
    assert.ok(md.includes("NO coherente con su calificación") && md.includes("contradice el grado («incorrecta»)") && md.includes("el veredicto no nombra al equipo correcto") && md.includes("el texto del modelo nombra un ganador"));
    assert.ok(md.includes("Veredicto que arma el código: «Los dos equipos tienen parte de razón. Evaluación de la respuesta.»") && md.includes("Veredicto que arma el código: «Tiene razón el equipo Azules. Evaluación de la respuesta.»") && md.includes("Veredicto que arma el código: «Tiene razón el equipo Rojos. Evaluación de la respuesta.»"), "el veredicto del prompt nuevo lo arma el código (ignora el que mandó el modelo)");
    assert.ok(!md.includes("Tiene razón el equipo EQUIVOCADO"));
    assert.ok(md.includes("no se pudo deducir el reparto (calificacion_arbitro_invalida; calificacionRecomendada: \"regular\")"));
    assert.ok(md.includes("reconstrucción"), "avisa que el texto base es reconstruido");
    assert.strictEqual((md.match(/^#### Prompt (actual|nuevo) · /gm) || []).length, 72);
    // La clave no aparece en ningún archivo ni en la consola
    const todo = md + JSON.stringify(js) + out.join("\n");
    assert.ok(!todo.includes(CLAVE_FALSA) && !/AIza/.test(todo) && !todo.includes("clave-falsa-de-prueba"), "la clave no puede aparecer en la salida");
    assert.ok(md.includes("error de la API: 500: boom [clave]"), "mensaje de error limpio y sin clave");
    // Encabezado del script: PowerShell con Read-Host, y no pisa la comparación anterior entre modelos
    const fuente = fs.readFileSync(path.join(__dirname, "comparar-modelos.cjs"), "utf8");
    assert.ok(/Read-Host "Clave de Gemini"/.test(fuente.split("\n").slice(0, 60).join("\n")), "el encabezado trae el comando con Read-Host");
    assert.ok(!fs.existsSync(path.join(tmp, "comparacion-modelos.md")), "no escribe comparacion-modelos.md");

    // ── 3) Corrida parcial: SOLO=cuneiforme-bien (no pisa la comparación completa y no trae la tabla de criterios) ──
    const mdCompleto = fs.readFileSync(path.join(tmp, "comparacion-reparto.md"), "utf8");
    llamadas.length = 0; Object.keys(cuenta).forEach((k) => delete cuenta[k]);
    process.env.SOLO = "cuneiforme-bien";
    delete require.cache[require.resolve("./comparar-modelos.cjs")];
    const parcial = require("./comparar-modelos.cjs");
    casosRef = parcial.casos.slice();
    r = await parcial.main();
    assert.strictEqual(r.ok, true);
    assert.strictEqual(llamadas.filter((x) => x.variante !== "preflight").length, 6, "1 caso × 3 corridas × 2 prompts");
    assert.ok(llamadas.filter((x) => x.variante !== "preflight").every((x) => x.caso === "cuneiforme-bien"));
    const mdSolo = fs.readFileSync(path.join(tmp, "comparacion-reparto-solo.md"), "utf8");
    assert.ok(mdSolo.includes("Corrida parcial") && !mdSolo.includes("## Criterios para decidir el despliegue") && mdSolo.includes("cuneiforme-bien") && !mdSolo.includes("| piramides-esclavos |"));
    assert.strictEqual(fs.readFileSync(path.join(tmp, "comparacion-reparto.md"), "utf8"), mdCompleto, "no pisa la comparación completa");
    process.env.SOLO = "no-existe";
    delete require.cache[require.resolve("./comparar-modelos.cjs")];
    const mala = require("./comparar-modelos.cjs");
    assert.strictEqual((await mala.main()).ok, false);
    assert.ok(out.some((l) => /no existe\(n\) el\/los caso\(s\) no-existe/.test(l)), "avisa de un id inválido");
    delete process.env.SOLO;

    restaurar();
    console.log("OK: modelo por defecto = config.ts · MODELO_A/B ignorados · 404 corta antes de las 72 llamadas · 429 reintentado · 72 llamadas con el prompt actual (congelado) y el nuevo (lib/, sin la calificación de quien preguntó) · reparto del nuevo con resolverRondaOral (ignora tieneRazon del modelo) y veredicto armado por el código · 12 casos · tabla, totales y criterios exactos · salidas completas · clave nunca en la salida.");
    console.log("Informe de prueba:", path.join(tmp, "comparacion-reparto.md"));
  } catch (err) { restaurar(); throw err; }
})().catch((err) => { console.error("FALLÓ:", err.message, process.env.DEBUG_TEST ? err.stack : ""); process.exitCode = 1; });
