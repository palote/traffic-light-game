// Verifica "un campo por alumno" y el informe de metacognición grupal/individual (sin Firebase: todo simulado).
//  1) Helpers: array nuevo y string viejo se leen igual (front y servidor); campos vacíos se ignoran; tamaños acotados.
//  2) Partida guardada: el formato viejo (string) se migra al leer; el nuevo (array + metaInd) se acepta; datos corruptos se rechazan.
//  3) Servidor: el informe guarda integrantes como array, limpia `individuales` y no inventa nada; modo desconocido = grupal.
//  4) Documentos: sin modo individual el .txt y la consigna son idénticos a antes; con modo individual aparece el desglose por alumno.
//  5) Cableado (texto del código): default grupal, aviso exacto, label por campo, botón con nombre, panel tolerante, extractor sin estos campos.
// Uso (desde functions/):  node scripts/verificar-integrantes.cjs
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
const F = cargarTs("src/utils/arbitroIntegrantes.ts"), S = cargarTs("functions/src/arbitroIntegrantes.ts");
const P = cargarTs("src/utils/arbitroPartida.ts"), D = cargarTs("src/utils/arbitroDocumentos.ts");
const es = cargarTs("src/i18n/es.ts").es.arbitro, en = cargarTs("src/i18n/en.ts").en.arbitro;

// 1) helpers
for (const [nombre, M] of [["front", F], ["servidor", S]]) {
  eq(M.listaIntegrantes("Juan, María, Pedro"), ["Juan", "María", "Pedro"], `${nombre}: string viejo`);
  eq(M.listaIntegrantes(["Juan", " María ", "", "  "]), ["Juan", "María"], `${nombre}: array con vacíos`);
  eq(M.listaIntegrantes(undefined), [], `${nombre}: sin dato`);
  eq(M.listaIntegrantes([1, null, "Ana"]), ["Ana"], `${nombre}: ignora lo que no es texto`);
  eq(M.normalizarModoMetacognicion("individual"), "individual", `${nombre}: individual`);
  for (const v of [undefined, null, "grupal", "otro", 3]) eq(M.normalizarModoMetacognicion(v), "grupal", `${nombre}: ${String(v)} = grupal`);
}
eq(F.textoIntegrantes(["Ana", "Luis"]), "Ana, Luis", "texto para mostrar");
eq(F.textoIntegrantes("Ana, Luis"), "Ana, Luis", "texto viejo igual");
eq(F.camposDesdeGuardado(""), ["", ""], "vacío → 2 campos");
eq(F.camposDesdeGuardado("Ana, Luis, Eva"), ["Ana", "Luis", "Eva"], "string viejo → campos");
eq(F.camposDesdeGuardado(["Ana", ""]), ["Ana", ""], "array se conserva (incluye campos vacíos)");
ok(F.camposDesdeGuardado(Array(30).fill("x")).length === F.MAX_INTEGRANTES, "tope de campos en el front");
ok(S.listaIntegrantes(Array(30).fill("x")).length === S.MAX_INTEGRANTES, "tope de integrantes en el servidor");
ok(S.listaIntegrantes(["x".repeat(200)])[0].length === S.MAX_NOMBRE, "tope de largo del nombre en el servidor");

// 2) partida guardada
const base = {
  v: 1, expiresAt: "2099-01-01T00:00:00.000Z", guardadoEn: 1, nombreEquipo1: "Rojos", nombreEquipo2: "Azules", colorEquipo1: "#f00", colorEquipo2: "#00f",
  integrantesEquipo1: "Ana, Luis", integrantesEquipo2: "Eva", vueltasTotales: 5, pantalla: "setup", preguntaNumero: 1, equipoPreguntaIdx: 0,
  puntosEquipo1: 0, puntosEquipo2: 0, registros: [], preguntaActual: "", usarPreguntaPropia: false, preguntaBorrador: "", respuestaActual: "",
  calificacionActual: null, justificacionCalificacion: "", disputaPregunta: "", disputaRespuesta: "", disputaArgEquipoPregunta: "", disputaArgEquipoRespuesta: "",
  veredictoArbitro: null, segundos: 0, tiempoVencido: false, corriendo: false, sonidoActivo: true, metaEquipoActual: 0, meta: ["", "", "", "", "", "", "", ""],
};
const viejo = P.validarPartida(base);
ok(viejo !== null, "partida con el formato viejo (string) sigue siendo válida");
eq([viejo.integrantesEquipo1, viejo.integrantesEquipo2], [["Ana", "Luis"], ["Eva"]], "partida vieja migrada a array");
ok(viejo.metaInd === undefined && viejo.metaTurno === undefined, "partida vieja sin metaInd/metaTurno");
const nuevo = P.validarPartida({ ...base, integrantesEquipo1: ["Ana", ""], integrantesEquipo2: ["Eva", "Leo"], metaInd: [[["a", "", "", ""]], []], metaTurno: 1 });
ok(nuevo !== null, "partida con el formato nuevo es válida");
eq(nuevo && nuevo.integrantesEquipo1, ["Ana", ""], "array nuevo conservado");
ok(P.validarPartida({ ...base, integrantesEquipo1: [1, 2] }) === null, "integrantes que no son texto → rechazada");
ok(P.validarPartida({ ...base, integrantesEquipo1: 5 }) === null, "integrantes numéricos → rechazada");
ok(P.validarPartida({ ...base, metaInd: [[Array(7).fill("a")]] }) === null, "metaInd con más de 6 respuestas → rechazada");
ok(P.validarPartida({ ...base, metaInd: [[[]]] }) === null, "metaInd con alumno sin respuestas → rechazada");
ok(P.validarPartida({ ...base, metaTurno: -1 }) === null, "metaTurno negativo → rechazada");

// 3) servidor
const eqSrv = S.sanearEquipoInforme({ nombre: "Rojos", color: "#f00", puntos: 2, integrantes: "Ana, Luis", respuestas: { q1: "x" } });
eq(eqSrv.integrantes, ["Ana", "Luis"], "servidor: string viejo → array");
eq(eqSrv.respuestas, { q1: "x" }, "servidor: conserva la reflexión grupal");
ok(!("individuales" in eqSrv), "servidor: sin individuales no inventa el campo");
const ind = S.sanearEquipoInforme({ nombre: "R", integrantes: ["Ana"], individuales: [{ alumno: " Ana ", respuestas: { q1: "a", q2: 5 } }, { alumno: "", respuestas: { q1: "z" } }, null] });
eq(ind.individuales, [{ alumno: "Ana", respuestas: { q1: "a", q2: "", q3: "", q4: "" } }], "servidor: individuales limpios (sin nombre/ruido)");
ok(S.sanearEquipoInforme(null).integrantes.length === 0, "servidor: equipo nulo no rompe");

// 4) documentos
const dat = (extra) => ({ materia: "Historia", tema: "Egipto", fecha: "1/1/2026", formatoPuntos: (n) => String(n),
  equipos: [{ nombre: "Rojos", integrantes: "Ana, Luis", puntos: 1 }],
  reflexiones: [{ nombre: "Rojos", integrantes: "Ana, Luis", respuestas: ["uno", "", "", ""], ...extra }] });
const grupal = D.textoInformePartida(es, dat({}));
ok(grupal.includes("1. ¿Qué aprendieron hoy sobre \"Egipto\"?") && grupal.includes("uno") && !grupal.includes("— Ana"), "informe .txt grupal igual que antes");
const indiv = D.textoInformePartida(es, dat({ individuales: [{ alumno: "Ana", respuestas: ["resp Ana", "", "", ""] }, { alumno: "Luis", respuestas: ["resp Luis", "", "", ""] }] }));
ok(indiv.includes("— Ana") && indiv.includes("resp Ana") && indiv.includes("— Luis") && !indiv.includes("\nuno"), "informe .txt individual: desglose por alumno");
const indEn = D.textoInformePartida(en, dat({ individuales: [{ alumno: "Ann", respuestas: ["a", "", "", ""] }] }));
ok(indEn.includes("— Ann") && !/[áéíóúñ¿¡]/.test(indEn.split("\n").slice(3).filter((l) => !l.includes("Egipto")).join("\n")), "informe .txt individual en inglés");
const gDefault = D.instruccionesPorDefecto(es, "Egipto"), gExplicito = D.instruccionesPorDefecto(es, "Egipto", "grupal"), gInd = D.instruccionesPorDefecto(es, "Egipto", "individual");
ok(gDefault === gExplicito, "consigna por defecto = grupal (sin cambios)");
ok(gDefault.includes(es.docInstrStep6) && !gDefault.includes(es.docInstrStep6Ind), "consigna grupal usa el paso 6 de siempre");
ok(gInd.includes(es.docInstrStep6Ind) && !gInd.includes(es.docInstrStep6 + "\n") && gInd.includes("inicial"), "consigna individual explica turnos y que se puede usar la inicial");
ok(D.instruccionesPorDefecto(en, "Egypt", "individual").includes("initial"), "consigna individual en inglés");

// 5) cableado
const idx = leer("functions/src/index.ts"), cfg = leer("src/pages/ArbitroConfigPage.tsx"), juego = leer("src/pages/ArbitroJuegoPage.tsx");
const panel = leer("src/pages/ArbitroPanelPage.tsx"), ext = leer("functions/scripts/extraer-metricas-arbitro.cjs");
ok(/modoMetacognicion: normalizarModoMetacognicion\(modoMetacognicion\)/.test(idx), "crearSesionArbitro guarda el modo normalizado");
ok(/modoMetacognicion: normalizarModoMetacognicion\(data\.modoMetacognicion\)/.test(idx), "getSesionArbitro devuelve el modo (sesiones viejas = grupal)");
ok(/equipos: equipos\.map\(sanearEquipoInforme\)/.test(idx), "guardarInformeArbitro sanea los equipos");
ok(/useState<ModoMetacognicion>\("grupal"\)/.test(cfg), "config: el modo arranca en grupal");
ok(/aria-pressed=\{modoMetacognicion === m\.id\}/.test(cfg) && /<legend[^>]*>\{ta\.cfgMetaMode\}/.test(cfg), "config: grupo con legend y botones aria-pressed");
ok(es.jgMembersNotice === "Se pueden agregar alumnos al equipo; lo recomendado es dos por equipo.", "aviso exacto en español");
ok(es.cfgMetaGroup.includes("Grupal") && es.cfgMetaIndividual.includes("Individual"), "opciones Grupal / Individual");
ok(/Array\(MIN_CAMPOS\)\.fill\(""\)/.test(juego) && F.MIN_CAMPOS === 2, "el armado de equipos arranca con 2 campos");
ok(/<label htmlFor=\{idCampo\}/.test(juego) && /aria-label=\{fillArbitro\(t\.jgRemoveStudentLabel/.test(juego) && /aria-label=\{fillArbitro\(t\.jgAddStudentTo/.test(juego), "cada campo con su label y los botones con nombre");
ok(/camposDe\(idx\)\.length > 1 &&/.test(juego), "quitar alumno solo si hay más de uno (mínimo 1)");
ok(/id=\{id\} value=\{vals\[i\]\}|htmlFor=\{id\}/.test(juego), "metacognición individual: textarea con label");
ok(!/console\.(log|info|warn)\([^)]*(integrantes|metaInd|individuales|alumno)/.test(juego + panel), "no se escriben nombres ni reflexiones en la consola");
ok(/textoIntegrantes\(eq\.integrantes\)/.test(panel) && /eq\.individuales/.test(panel), "panel: lee ambos formatos y muestra el desglose por alumno");
const selects = [...ext.matchAll(/\.select\(([^)]*)\)/g)].map((m) => m[1]).join(" ");
ok(selects.length > 0 && !/individuales|modoMetacognicion|integrantes|alumno|equipos|respuestas/.test(selects), "el extractor no pide integrantes, equipos, respuestas ni reflexiones individuales en ningún select");
ok(!/\.(get|data)\(\)\s*\.\s*(equipos|individuales)|\.individuales|\.integrantes/.test(ext), "el extractor no lee esos campos de los documentos");
for (const k of ["jgStudentN", "jgStudentPlaceholder", "jgAddStudent", "jgAddStudentTo", "jgRemoveStudent", "jgRemoveStudentLabel", "jgMembersNotice", "jgMembersNoticeInd", "jgMetaIndTurn", "jgMetaIndIntro", "jgMetaIndNext", "jgMetaIndSkip", "cfgMetaMode", "cfgMetaGroup", "cfgMetaIndividual", "cfgMetaGroupHint", "cfgMetaIndividualHint", "docInstrStep6Ind", "docIndStudent"])
  ok(typeof es[k] === "string" && typeof en[k] === "string" && es[k] && en[k], `texto ${k} en es y en`);

if (fallos) { console.error(`\nFALLÓ: ${fallos} de ${total} comprobaciones`); process.exit(1); }
console.log(`OK: ${total} comprobaciones (compatibilidad de integrantes, modo individual, servidor, documentos y privacidad del extractor).`);
