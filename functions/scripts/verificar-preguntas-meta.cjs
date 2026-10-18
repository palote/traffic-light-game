// Verifica el editor de preguntas de metacognición (sin Firebase: todo simulado).
//  1) Sin personalizar (o vacías / basura) se usan las 4 por defecto del diccionario ES/EN, idénticas a las de siempre.
//  2) Personalizadas: se usan tal cual (con {tema} reemplazado), de 1 a 6, la primera obligatoria; en el .txt y en el panel.
//  3) Servidor: normaliza (máx. 6, 300 caracteres, sin vacías), crearSesionArbitro/getSesionArbitro/guardarInformeArbitro cableados.
//  4) Partida guardada: formato viejo (meta de 8) y nuevo (metaG) válidos; corruptos rechazados.
//  5) Cableado de la config (acordeón cerrado, aria-expanded/controls, labels, botones con nombre, reset) y privacidad del extractor.
// Uso (desde functions/):  node scripts/verificar-preguntas-meta.cjs
const fs = require("fs"), path = require("path"), ts = require("typescript");
const ROOT = path.join(__dirname, "../..");
let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.error("  ✘ " + msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — obtenido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`);
function cargarTs(rel, cache = {}) {
  const f = path.join(ROOT, rel); if (cache[f]) return cache[f].exports;
  const out = ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
  const m = { exports: {} }; cache[f] = m;
  const req = (r) => (r.startsWith(".") ? cargarTs(path.relative(ROOT, path.resolve(path.dirname(f), r)) + ".ts", cache) : require(r));
  new Function("module", "exports", "require", out)(m, m.exports, req); return m.exports;
}
const leer = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const F = cargarTs("src/utils/arbitroMetaPreguntas.ts"), S = cargarTs("functions/src/arbitroMetaPreguntas.ts"), SI = cargarTs("functions/src/arbitroIntegrantes.ts");
const D = cargarTs("src/utils/arbitroDocumentos.ts"), P = cargarTs("src/utils/arbitroPartida.ts");
const es = cargarTs("src/i18n/es.ts").es.arbitro, en = cargarTs("src/i18n/en.ts").en.arbitro;

// 1) por defecto = lo de siempre
for (const [nom, tx, tema] of [["es", es, "Egipto"], ["en", en, "Egypt"]]) {
  for (const custom of [undefined, null, [], [""], ["  ", ""], "texto", 5, [3, null]]) {
    const r = F.preguntasMeta(tx, custom, tema);
    eq(r.map((x) => x.label), [tx.jgMetaQ1.replace("{tema}", tema), tx.jgMetaQ2, tx.jgMetaQ3, tx.jgMetaQ4], `${nom}: ${JSON.stringify(custom)} → las 4 por defecto del juego`);
    eq(r.map((x) => x.required), [true, false, false, false], `${nom}: solo la primera obligatoria`);
  }
  eq(F.preguntasMeta(tx, undefined, tema, "doc").map((x) => x.label), [tx.docMetaQ1.replace("{tema}", tema), tx.docMetaQ2, tx.docMetaQ3, tx.docMetaQ4], `${nom}: por defecto del .txt`);
}
ok(F.esIgualALasPorDefecto(es, F.preguntasPorDefecto(es)) && !F.esIgualALasPorDefecto(es, ["x"]), "detecta cuando el docente dejó las por defecto");
// 2) personalizadas
const custom = ["¿Qué sobre {tema}?", "  Segunda  ", "", "Tercera"];
eq(F.preguntasMeta(es, custom, "Egipto").map((x) => x.label), ["¿Qué sobre Egipto?", "Segunda", "Tercera"], "personalizadas: sin vacías, {tema} reemplazado");
eq(F.preguntasMeta(es, ["Solo una"], "X").length, 1, "mínimo 1 pregunta");
ok(F.preguntasMeta(es, Array(10).fill("p"), "X").length === 6, "máximo 6 preguntas");
ok(F.listaPreguntasMeta(["x".repeat(900)])[0].length === F.MAX_LARGO_PREGUNTA, "largo acotado");
eq(F.clavesRespuestas(6), ["q1", "q2", "q3", "q4", "q5", "q6"], "claves q1..q6");
const dat = (extra) => ({ materia: "Historia", tema: "Egipto", fecha: "1/1/2026", formatoPuntos: String, equipos: [{ nombre: "R", integrantes: "Ana", puntos: 1 }],
  reflexiones: [{ nombre: "R", integrantes: "Ana", respuestas: ["uno", "dos", "tres", "cuatro", "cinco"] }], ...extra });
const txtDef = D.textoInformePartida(es, dat({}));
ok(txtDef.includes("1. ¿Qué aprendieron hoy sobre \"Egipto\"?") && txtDef.includes("4. ") && !txtDef.includes("5. "), "txt sin personalizar: 4 preguntas de siempre (la 5ª respuesta no sale)");
const txtCus = D.textoInformePartida(es, dat({ preguntasPersonalizadas: ["Mi pregunta A", "Mi pregunta B", "Mi pregunta C", "D", "Mi pregunta E"] }));
ok(txtCus.includes("1. Mi pregunta A") && txtCus.includes("5. Mi pregunta E") && txtCus.includes("cinco") && !txtCus.includes("aprendieron hoy"), "txt con personalizadas (5)");
// 3) servidor
eq(S.normalizarPreguntasMeta(undefined), [], "servidor: ausente = []");
eq(S.normalizarPreguntasMeta(["  a ", "", 3, "b"]), ["a", "b"], "servidor: limpia");
ok(S.normalizarPreguntasMeta(Array(9).fill("p")).length === 6 && S.normalizarPreguntasMeta(["x".repeat(999)])[0].length === 300, "servidor: topes 6 y 300");
eq(SI.sanearEquipoInforme({ respuestas: { q1: "a", q5: "e", q9: "no", q2: 3 } }).respuestas, { q1: "a", q5: "e" }, "servidor: respuestas grupales q1..q6 con texto");
eq(SI.sanearEquipoInforme({ individuales: [{ alumno: "Ana", respuestas: { q1: "a" } }] }).individuales[0].respuestas, { q1: "a", q2: "", q3: "", q4: "" }, "servidor: individuales mantienen q1..q4");
eq(Object.keys(SI.sanearEquipoInforme({ individuales: [{ alumno: "Ana", respuestas: { q1: "a", q6: "f" } }] }).individuales[0].respuestas), ["q1", "q2", "q3", "q4", "q6"], "servidor: individuales con q6");
const idx = leer("functions/src/index.ts");
ok(/preguntasMetacognicion: normalizarPreguntasMeta\(preguntasMetacognicion\)/.test(idx), "crearSesionArbitro guarda las preguntas normalizadas");
ok(/preguntasMetacognicion: normalizarPreguntasMeta\(data\.preguntasMetacognicion\)/.test(idx), "getSesionArbitro las devuelve ([] en sesiones viejas)");
ok(/normalizarPreguntasMeta\(sesionData\?\.preguntasMetacognicion\)/.test(idx) && /preguntasUsadas\.length \? \{ preguntas: preguntasUsadas \}/.test(idx), "el informe copia las preguntas de la SESIÓN (no del cliente)");
// 4) partida guardada
const base = { v: 1, expiresAt: "2099-01-01T00:00:00.000Z", guardadoEn: 1, nombreEquipo1: "R", nombreEquipo2: "A", colorEquipo1: "#f00", colorEquipo2: "#00f",
  integrantesEquipo1: ["Ana"], integrantesEquipo2: ["Eva"], vueltasTotales: 5, pantalla: "setup", preguntaNumero: 1, equipoPreguntaIdx: 0, puntosEquipo1: 0, puntosEquipo2: 0,
  registros: [], preguntaActual: "", usarPreguntaPropia: false, preguntaBorrador: "", respuestaActual: "", calificacionActual: null, justificacionCalificacion: "",
  disputaPregunta: "", disputaRespuesta: "", disputaArgEquipoPregunta: "", disputaArgEquipoRespuesta: "", veredictoArbitro: null, segundos: 0, tiempoVencido: false, corriendo: false, sonidoActivo: true, metaEquipoActual: 0 };
ok(P.validarPartida({ ...base, meta: ["a", "b", "c", "d", "e", "f", "g", "h"] }) !== null, "partida con `meta` de 8 (formato viejo) sigue válida");
ok(P.validarPartida({ ...base, metaG: [["a", "b", "c", "d", "e", "f"], ["x"]] }) !== null, "partida con metaG (hasta 6) válida");
ok(P.validarPartida(base) === null, "sin meta ni metaG → rechazada");
ok(P.validarPartida({ ...base, metaG: [["a"]] }) === null && P.validarPartida({ ...base, metaG: [Array(7).fill("a"), []] }) === null && P.validarPartida({ ...base, metaG: [[1], []] }) === null, "metaG corrupta → rechazada");
ok(P.validarPartida({ ...base, meta: ["a"] }) === null, "meta de largo distinto de 8 → rechazada");
// 5) cableado
const cfg = leer("src/pages/ArbitroConfigPage.tsx"), juego = leer("src/pages/ArbitroJuegoPage.tsx"), panel = leer("src/pages/ArbitroPanelPage.tsx"), ext = leer("functions/scripts/extraer-metricas-arbitro.cjs");
ok(/useState<string\[\] \| null>\(null\)/.test(cfg) && /useState\(false\); \/\/ acordeón cerrado por defecto/.test(cfg), "config: preguntas sin tocar (null) y acordeón cerrado por defecto");
ok(/aria-expanded=\{preguntasMetaAbierto\}/.test(cfg) && /aria-controls="config-metaq-panel"/.test(cfg) && /id="config-metaq-panel"[^>]*hidden=\{!preguntasMetaAbierto\}/.test(cfg), "acordeón: botón con aria-expanded/aria-controls y panel siempre presente (hidden)");
ok(/<button type="button" id="config-metaq-boton"/.test(cfg), "acordeón: es un <button> (operable con teclado)");
ok(/<label htmlFor=\{idP\}/.test(cfg) && /aria-label=\{fillArbitro\(ta\.cfgMetaQRemoveLabel/.test(cfg) && /listaPreguntasEditor\.length > MIN_PREGUNTAS_META/.test(cfg) && /listaPreguntasEditor\.length >= MAX_PREGUNTAS_META/.test(cfg), "cada pregunta con su label; quitar con nombre; mínimo 1 y máximo 6");
ok(/setPreguntasMeta\(null\)/.test(cfg) && /preguntasMetacognicion: preguntasParaGuardar\(\)/.test(cfg), "restablecer vuelve a las por defecto y la creación envía solo lo personalizado");
ok(/preguntasMeta\(t, sesion\.preguntasMetacognicion, sesion\.tema\)/.test(juego) && !/jgMetaQ[1-4]/.test(juego), "juego: grupal e individual leen las preguntas de la sesión (no del diccionario directo)");
ok(/filasMeta\(meta\.preguntas/.test(panel), "panel: usa las preguntas que trae el informe");
const selects = [...ext.matchAll(/\.select\(([^)]*)\)/g)].map((m) => m[1]).join(" ");
ok(!/preguntas|respuestas|individuales|equipos/.test(selects), "extractor: ningún select pide preguntas ni respuestas");
for (const k of ["cfgMetaQTitle", "cfgMetaQHint", "cfgMetaQN", "cfgMetaQAdd", "cfgMetaQRemove", "cfgMetaQRemoveLabel", "cfgMetaQReset"]) ok(es[k] && en[k], `texto ${k} en es y en`);
if (fallos) { console.error(`\nFALLÓ: ${fallos} de ${total} comprobaciones`); process.exit(1); }
console.log(`OK: ${total} comprobaciones (preguntas de metacognición por defecto y personalizadas, servidor, partida guardada, accesibilidad y privacidad).`);
