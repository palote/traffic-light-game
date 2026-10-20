// Verifica la Etapa C (ingreso de alumnos + proyección del código):
//   1) normalizarCodigoSesion: minúsculas/espacios/guiones → código canónico (y el destino
//      del redirect /arbitro-juego/:sessionId cuando la URL no viene canónica).
//   2) proyeccionCodigo: dirección y destino del QR según el idioma de la SESIÓN (es/en).
//   3) Los tres mensajes de error del ingreso (código inexistente / sesión expirada / sin
//      conexión) son siempre distintos entre sí, nunca se confunden, y los dos primeros usan
//      redacción propia de esta pantalla (no el errorMotivo_sesion_* genérico, pensado para
//      quien llega por un link) — los dos primeros contra el getSesionArbitro REAL (con
//      Firestore en memoria, nunca producción), el tercero (sin motivo del servidor: ahí es
//      donde cae un error de red real) contra la función de resolución de texto directamente.
//   4) La restauración silenciosa del armado de equipos preserva el partidaId PROPIO de la
//      pestaña (no adopta el guardado); "Continuar" sigue adoptando el guardado, como antes.
//   5) Rutas: esRutaArbitro incluye /alumnos y /students; App.tsx tiene el wrapper de
//      redirect canónico y las dos rutas nuevas; el botón "Proyectar código" está en las
//      dos pantallas del docente (y no aparece en el panel para una sesión vencida); la
//      proyección pide pantalla completa; qrcode.react está declarado como dependencia.
//
// No toca Firebase real en ningún momento. Uso (desde functions/):
//   node scripts/verificar-ingreso-alumnos.cjs

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const ts = require("typescript");
const Module = require("module");

const SRC = path.join(__dirname, "../../src");

// ── Cargador de .ts del frontend: permite requerir un archivo y que sus imports relativos
// (otro .ts al lado) se resuelvan solos, para módulos como arbitroProyeccion.ts que importan
// dominioPorIdioma/idiomaSesion. Se registra una sola vez para todo el proceso del script. ──
if (!require.extensions[".ts"]) {
  require.extensions[".ts"] = function (mod, filename) {
    const src = fs.readFileSync(filename, "utf8");
    const js = ts.transpileModule(src, { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
    mod._compile(js, filename);
  };
}
const req = (rel) => require(path.join(SRC, rel));

const { normalizarCodigoSesion } = req("utils/arbitroCodigo.ts");
const { proyeccionCodigo } = req("utils/arbitroProyeccion.ts");
const { textoErrorArbitroConReemplazos, esSesionExpirada, motivoDeError } = req("utils/arbitroErrores.ts");
const { esRutaArbitro, esRutaAlumnoArbitro } = req("utils/arbitroRoutes.ts");
const { es } = req("i18n/es.ts");
const { en } = req("i18n/en.ts");

const filas = [];
const t = (caso, esperado, obtenido) => {
  filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) });
  assert.strictEqual(String(obtenido), String(esperado), caso);
};
const leer = (relFromRepoRoot) => fs.readFileSync(path.join(__dirname, "../..", relFromRepoRoot), "utf8");

(async () => {
  // ════ 1) normalizarCodigoSesion y el redirect canónico ════
  t('normalizarCodigoSesion("ab 12-cd")', "AB12CD", normalizarCodigoSesion("ab 12-cd"));
  t('destino del redirect canónico para "ab 12-cd"', "/arbitro-juego/AB12CD", `/arbitro-juego/${normalizarCodigoSesion("ab 12-cd")}`);
  t('ya canónico: no cambia', "AB12CD", normalizarCodigoSesion("AB12CD"));
  t('espacios de más y guiones múltiples', "XY9Z", normalizarCodigoSesion("  xy - 9z  "));

  // ════ 2) proyeccionCodigo: dirección y QR por idioma de la sesión ════
  const pEs = proyeccionCodigo("es", "AB12CD");
  t("es: dirección visible", "eljuegodelsemaforo.com/alumnos", pEs.direccionVisible);
  t("es: destino del QR", "https://eljuegodelsemaforo.com/arbitro-juego/AB12CD", pEs.urlJuego);
  const pEn = proyeccionCodigo("en", "AB12CD");
  t("en: dirección visible", "thetrafficlightgame.com/students", pEn.direccionVisible);
  t("en: destino del QR", "https://thetrafficlightgame.com/arbitro-juego/AB12CD", pEn.urlJuego);
  // Sesión vieja sin idioma guardado, o con un valor que no es 'en' → se comporta como 'es'.
  t("sin idioma guardado → se comporta como es", pEs.direccionVisible, proyeccionCodigo(undefined, "AB12CD").direccionVisible);
  t("idioma raro → se comporta como es", pEs.direccionVisible, proyeccionCodigo("pt", "AB12CD").direccionVisible);

  // ════ 3) Los tres mensajes de error, nunca confundidos, en los dos idiomas ════
  // 3a) Código inexistente y sesión expirada: contra el getSesionArbitro REAL, con
  // Firestore en memoria (la sesión "vencida" vive solo en este Map, nunca en producción).
  const store = new Map();
  const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  function docRef(p) {
    return {
      get: async () => ({ exists: store.has(p), data: () => clone(store.get(p)) }),
      set: async (d) => { store.set(p, clone(d)); },
    };
  }
  const fakeDb = { collection: (n) => ({ doc: (id) => docRef(`${n}/${id}`) }) };
  const fakeAdmin = { apps: [{}], initializeApp() {}, firestore: Object.assign(() => fakeDb, { FieldValue: { increment: () => ({}) } }), auth: () => ({}) };
  const load = Module._load;
  Module._load = function (r, ...a) {
    if (r === "firebase-admin") return fakeAdmin;
    if (r.startsWith("firebase-admin/")) return { getFirestore: () => fakeDb };
    if (r === "@google/generative-ai") return { GoogleGenerativeAI: class {} };
    return load.call(this, r, ...a);
  };
  process.env.GCLOUD_PROJECT = "demo"; process.env.GEMINI_KEY = "k"; process.env.CLAUDE_KEY = "x";
  const ce = console.error; console.error = () => {};
  const libPath = path.join(__dirname, "../lib/index.js");
  if (!fs.existsSync(libPath)) { console.error = ce; console.error("FALLÓ: falta functions/lib/index.js — corré \"npm run build\" en functions/ antes de este script."); process.exit(1); }
  delete require.cache[require.resolve(libPath)];
  const fns = require(libPath);
  console.error = ce;
  const run = async (fn, data) => { try { return { ok: true, r: await fn.run({ data, rawRequest: {}, acceptsStreaming: false }) }; } catch (e) { return { ok: false, code: e.code, details: e.details }; } };

  const ahora = Date.now();
  store.set("sesiones_arbitro/VENCIDA", { materia: "Historia", nivel: "Secundaria", anio: "3", tema: "Egipto", expiresAt: new Date(ahora - 1000).toISOString() });
  // (ninguna entrada para "NOEXISTE": la sesión inexistente es, justamente, no tener doc.)

  const errNoEncontrada = await run(fns.getSesionArbitro, { sessionId: "NOEXISTE" });
  t("código inexistente → not-found / motivo sesion_no_encontrada", "false/not-found/sesion_no_encontrada", `${errNoEncontrada.ok}/${errNoEncontrada.code}/${errNoEncontrada.details?.motivo}`);
  const errVencida = await run(fns.getSesionArbitro, { sessionId: "VENCIDA" });
  t("sesión expirada → motivo sesion_expirada", "sesion_expirada", errVencida.details?.motivo);
  t("esSesionExpirada detecta la expirada y no la inexistente", "true/false", `${esSesionExpirada(errVencida)}/${esSesionExpirada(errNoEncontrada)}`);

  // 3b) Error de red real: el cliente nunca llega a recibir un `motivo` del servidor —
  // se prueba la función de resolución de texto directamente con ese tipo de error.
  const errRed = { code: "functions/unavailable", message: "Failed to fetch" }; // sin `details`
  t("un error de red no trae motivo", null, motivoDeError(errRed));

  for (const [nombre, ta] of [["es", es.arbitro], ["en", en.arbitro]]) {
    const reemplazos = { sesion_no_encontrada: ta.ingErrorNoEncontrada, sesion_expirada: ta.ingErrorExpirada };
    const msgNoEncontrada = textoErrorArbitroConReemplazos(errNoEncontrada, ta, reemplazos, ta.ingErrorConexion);
    const msgExpirada = textoErrorArbitroConReemplazos(errVencida, ta, reemplazos, ta.ingErrorConexion);
    const msgRed = textoErrorArbitroConReemplazos(errRed, ta, reemplazos, ta.ingErrorConexion);
    t(`[${nombre}] código inexistente → ingErrorNoEncontrada (texto propio, no el de "link")`, ta.ingErrorNoEncontrada, msgNoEncontrada);
    t(`[${nombre}] código inexistente ≠ errorMotivo_sesion_no_encontrada (el genérico de link)`, "true", msgNoEncontrada !== ta.errorMotivo_sesion_no_encontrada);
    t(`[${nombre}] sesión expirada → ingErrorExpirada (texto propio, no el de "link")`, ta.ingErrorExpirada, msgExpirada);
    t(`[${nombre}] sesión expirada ≠ errorMotivo_sesion_expirada (el genérico de link)`, "true", msgExpirada !== ta.errorMotivo_sesion_expirada);
    t(`[${nombre}] error de red → ingErrorConexion (nunca "no existe")`, ta.ingErrorConexion, msgRed);
    t(`[${nombre}] los tres mensajes son distintos entre sí`, "true",
      new Set([msgNoEncontrada, msgExpirada, msgRed]).size === 3);
  }

  // ════ 4) partidaId: la restauración silenciosa preserva el propio; "Continuar" adopta el guardado ════
  const juegoSrc = leer("src/pages/ArbitroJuegoPage.tsx");
  t("aplicarPartida acepta conservarPartidaIdPropio", "true",
    /const aplicarPartida = \(g: PartidaGuardada, opts\?: \{ conservarPartidaIdPropio\?: boolean \}\) => \{/.test(juegoSrc));
  t("aplicarPartida: con el flag, NO copia el partidaId guardado", "true",
    /if \(g\.partidaId && !opts\?\.conservarPartidaIdPropio\) setPartidaId\(g\.partidaId\);/.test(juegoSrc));
  t('restauración silenciosa (pantalla "setup") pasa conservarPartidaIdPropio: true', "true",
    /aplicarPartida\(rec\.guardada, \{ conservarPartidaIdPropio: true \}\)/.test(juegoSrc));
  t('continuarPartida sigue llamando a aplicarPartida SIN el flag (adopta el guardado)', "true",
    /const continuarPartida = \(\) => \{ if \(rec\.guardada\) aplicarPartida\(rec\.guardada\); \};/.test(juegoSrc));
  t("el diálogo de continuar muestra el aviso de otra pestaña (t.resumeOtherTab)", "true",
    /\{t\.resumeOtherTab\}/.test(juegoSrc));
  t("resumeOtherTab existe en los dos idiomas", "true",
    typeof es.arbitro.resumeOtherTab === "string" && typeof en.arbitro.resumeOtherTab === "string" &&
    es.arbitro.resumeOtherTab.length > 0 && en.arbitro.resumeOtherTab.length > 0);

  // ════ 5) Rutas, wiring de App.tsx y de los botones "Proyectar código" ════
  t("esRutaArbitro incluye /alumnos", "true", esRutaArbitro("/alumnos"));
  t("esRutaArbitro incluye /students", "true", esRutaArbitro("/students"));
  t("esRutaAlumnoArbitro NO incluye /alumnos (el idioma ahí sale del general, no de la sesión)", "false", esRutaAlumnoArbitro("/alumnos"));
  t("esRutaAlumnoArbitro sigue incluyendo /arbitro-juego/", "true", esRutaAlumnoArbitro("/arbitro-juego/AB12CD"));

  const appSrc = leer("src/App.tsx");
  t('App.tsx: ruta "/alumnos" existe', "true", /path="\/alumnos"/.test(appSrc));
  t('App.tsx: ruta "/students" existe', "true", /path="\/students"/.test(appSrc));
  t("App.tsx: las dos rutas renderizan ArbitroIngresoPage", "true",
    (appSrc.match(/path="\/(alumnos|students)"[\s\S]{0,120}?<ArbitroIngresoPage \/>/g) || []).length === 2);
  t("App.tsx: el wrapper de redirect canónico existe y usa normalizarCodigoSesion", "true",
    /function ArbitroJuegoRutaCanonica\(\)/.test(appSrc) && /normalizarCodigoSesion\(sessionId\)/.test(appSrc));
  t('App.tsx: "/arbitro-juego/:sessionId" pasa por el wrapper (no por ArbitroJuegoPage directo)', "true",
    /path="\/arbitro-juego\/:sessionId"[\s\S]{0,250}?<ArbitroJuegoRutaCanonica \/>/.test(appSrc));

  const configSrc = leer("src/pages/ArbitroConfigPage.tsx");
  t("ArbitroConfigPage: botón «Proyectar código» tras crear la sesión", "true",
    /setMostrarProyeccion\(true\)/.test(configSrc) && /<ProyeccionCodigoArbitro/.test(configSrc));
  const ingresoSrc = leer("src/pages/ArbitroIngresoPage.tsx");
  t("ArbitroIngresoPage: usa textoErrorArbitroConReemplazos con ingErrorNoEncontrada/ingErrorExpirada (no el errorMotivo_sesion_* genérico)", "true",
    /textoErrorArbitroConReemplazos/.test(ingresoSrc) &&
    /sesion_no_encontrada: t\.ingErrorNoEncontrada/.test(ingresoSrc) &&
    /sesion_expirada: t\.ingErrorExpirada/.test(ingresoSrc));

  const panelSrc = leer("src/pages/ArbitroPanelPage.tsx");
  t("ArbitroPanelPage: botón «Proyectar código» por fila de sesión", "true",
    /setProyeccionSesion\(sesion\)/.test(panelSrc) && /<ProyeccionCodigoArbitro/.test(panelSrc));
  t("ArbitroPanelPage: el botón «Proyectar código» NO aparece en una sesión vencida", "true",
    /new Date\(sesion\.expiresAt\) > new Date\(\)[\s\S]{0,160}?setProyeccionSesion\(sesion\)/.test(panelSrc));

  const proyeccionSrc = leer("src/components/ProyeccionCodigoArbitro.tsx");
  t("ProyeccionCodigoArbitro: pide pantalla completa al navegador (Fullscreen API)", "true",
    /requestFullscreen/.test(proyeccionSrc) && /exitFullscreen/.test(proyeccionSrc));

  t("proyButton (en) pide mostrar el código a la clase, no «Project code»", "Show code to the class", en.arbitro.proyButton);
  t("proyAddressLabel (es)", "Entrá a:", es.arbitro.proyAddressLabel);

  const pkg = JSON.parse(leer("package.json"));
  t("qrcode.react está en package.json", "true", !!pkg.dependencies?.["qrcode.react"]);

  console.table(filas);
  console.log(`OK: ${filas.length} comprobaciones.`);
  process.exit(0);
})().catch((e) => {
  console.error("FALLÓ:", e.message);
  process.exit(1);
});
