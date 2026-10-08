// Pruebas de la lógica del front de la etapa 1 del inglés. Usa el código REAL de src/ (i18n/index.tsx y utils/),
// compilado al vuelo, con un mini-runtime de hooks en lugar de React y sin navegador (no hay DOM en este entorno).
//   1) <html lang>, textos del árbitro, puntos y fechas en las pantallas de los alumnos: salen del idioma de la
//      SESIÓN (no del navegador); en las pantallas del docente siguen en español; fuera del árbitro, el idioma elegido.
//   2) calificacionPregunta, idioma de sesión, errores con motivo: las funciones puras.
//   3) Cableado: las pantallas usan lo anterior (revisión del código fuente).
// Uso (desde functions/):  node scripts/verificar-etapa1-front.cjs
const Module = require("module");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const SRC = path.join(__dirname, "../../src");

// ── Compilar .ts/.tsx al vuelo ──
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, f) => {
  const out = ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true }, fileName: f }).outputText;
  m._compile(out, f);
};

// ── Mini-runtime de hooks (reemplaza a React) ──
let cur = null;
class Runner {
  constructor(fn) { this.fn = fn; this.h = []; this.i = 0; this.fx = []; this.args = []; this.out = undefined; }
  render(...args) {
    if (args.length) this.args = args;
    cur = this; this.i = 0; this.fx = [];
    const r = this.fn(...this.args);
    cur = null; this.out = r;
    if (r && r.type && r.type.ctx) r.type.ctx._cur = r.props.value; // un Provider publica su valor
    this.flush();
    return r;
  }
  flush() {
    for (const e of this.fx) {
      const prev = this.h[e.slot];
      const cambio = !prev || !e.deps || e.deps.some((d, k) => !Object.is(d, prev.deps[k]));
      if (cambio) { if (prev && prev.cleanup) prev.cleanup(); const cleanup = e.cb(); this.h[e.slot] = { deps: e.deps, cleanup }; }
    }
  }
  unmount() { for (const s of this.h) if (s && typeof s.cleanup === "function") { const c = s.cleanup; s.cleanup = undefined; c(); } }
}
const FakeReact = {
  createContext: (def) => { const ctx = { _cur: def }; ctx.Provider = { ctx }; return ctx; },
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useContext: (ctx) => ctx._cur,
  useState: (init) => {
    const r = cur; const slot = r.i++;
    if (!r.h[slot]) r.h[slot] = { v: typeof init === "function" ? init() : init };
    const s = r.h[slot];
    return [s.v, (nv) => { const val = typeof nv === "function" ? nv(s.v) : nv; if (!Object.is(val, s.v)) { s.v = val; r.render(); } }];
  },
  useEffect: (cb, deps) => { const r = cur; r.fx.push({ slot: r.i++, cb, deps }); },
};
const cargar = Module._load;
Module._load = function (req, ...a) {
  if (req === "react") return FakeReact;
  if (/almacenSeguro$/.test(req)) return { almacenLocal: { getItem: () => null, setItem() {} } };
  return cargar.call(this, req, ...a);
};
const poner = (k, v) => Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
poner("React", FakeReact); // el JSX compilado llama a React.createElement
poner("window", { location: { pathname: "/" } });
poner("document", { documentElement: { lang: "" } });

const m = require(path.join(SRC, "i18n/index.tsx"));
const { es } = require(path.join(SRC, "i18n/es.ts"));
const { en } = require(path.join(SRC, "i18n/en.ts"));
const idiomaSesion = require(path.join(SRC, "utils/idiomaSesion.ts"));
const { calificacionPreguntaParaServidor } = require(path.join(SRC, "utils/arbitroCalificacion.ts"));
const errores = require(path.join(SRC, "utils/arbitroErrores.ts"));
const { esRutaArbitro, esRutaAlumnoArbitro } = require(path.join(SRC, "utils/arbitroRoutes.ts"));
const filas = [];
const t = (caso, esperado, obtenido) => { filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) }); assert.strictEqual(String(obtenido), String(esperado), caso); };

// Una pantalla de alumnos: carga la sesión y fija el idioma de la interfaz con el hook real.
const pantalla = () => new Runner((sesion) => { m.useIdiomaSesion(sesion && sesion.idioma, !!sesion); return { t: m.useArbitroT(), fmt: m.useFormatoPuntos(), loc: m.useLocaleArbitro() }; });
const montar = (pathname, navegador) => {
  window.location.pathname = pathname; document.documentElement.lang = "";
  poner("navigator", { language: navegador, languages: [navegador] });
  const prov = new Runner(m.I18nProvider); prov.render({ children: null });
  return prov;
};
const lang = () => document.documentElement.lang;

// ── 1) Pantallas de los alumnos ──
let prov = montar("/sesion/ABC123", "en-US");           // navegador en inglés
let pg = pantalla(); let sal = pg.render(null);          // sesión todavía cargando
t("/sesion/ · cargando (navegador en inglés) · <html lang>", "es", lang());
assert.strictEqual(sal.t, es.arbitro, "cargando: textos del árbitro en español");
sal = pg.render({ idioma: "en" });                        // llegó la sesión: idioma 'en'
t("/sesion/ · sesión 'en' · <html lang>", "en", lang());
sal = pg.render({ idioma: "en" });
assert.strictEqual(sal.t, en.arbitro, "sesión 'en': textos del árbitro en inglés");
t("/sesion/ · sesión 'en' · puntaje 0,25", "0.25", sal.fmt(0.25)); t("/sesion/ · sesión 'en' · fechas y números", "en-US", sal.loc);
pg.unmount();
t("/sesion/ · al salir de la pantalla vuelve a «es»", "es", lang());

prov = montar("/arbitro-juego/ABC123", "en-US"); pg = pantalla(); pg.render(null);
pg.render({ materia: "x" });                              // sesión vieja, sin idioma
t("/arbitro-juego/ · sesión vieja sin idioma (navegador en inglés) · <html lang>", "es", lang());
sal = pg.render({ materia: "x" });
assert.strictEqual(sal.t, es.arbitro); t("/arbitro-juego/ · sesión vieja · puntaje 0,25", "0,25", sal.fmt(0.25)); t("/arbitro-juego/ · sesión vieja · fechas y números", "es-AR", sal.loc);

prov = montar("/arbitro-juego/ABC123", "en-US"); pg = pantalla(); pg.render({ idioma: "en" });
t("/arbitro-juego/ · sesión 'en' · <html lang>", "en", lang());
pg.render({ idioma: "en" }); pg.render({ idioma: "es" });  // el docente la cambió: ahora 'es'
t("/arbitro-juego/ · la sesión pasa de 'en' a 'es' · <html lang>", "es", lang());

prov = montar("/arbitro-juego/ABC123", "es-AR"); pg = pantalla(); pg.render({ idioma: "fr" });
t("/arbitro-juego/ · idioma inválido en la sesión → «es»", "es", lang());

// ── Pantallas del docente (etapa 2): siguen el idioma de la interfaz, aunque haya una sesión 'en' o 'es' cargada;
//    el portugués, que no tiene sección `arbitro`, cae en español ──
for (const ruta of ["/arbitro-config", "/arbitro-panel", "/arbitros-info", "/arbitro/exactas"]) {
  for (const [nav, langEsp, dic, loc, pts] of [["en-US", "en", en, "en-US", "0.25"], ["es-AR", "es", es, "es-AR", "0,25"], ["pt-BR", "es", es, "es-AR", "0,25"]]) {
    for (const idiomaDeSesion of ["en", "es"]) {
      prov = montar(ruta, nav); pg = pantalla(); pg.render({ idioma: idiomaDeSesion }); sal = pg.render({ idioma: idiomaDeSesion });
      t(`${ruta} · interfaz ${nav} · sesión ${idiomaDeSesion} · <html lang>`, langEsp, lang());
      assert.strictEqual(sal.t, dic.arbitro, `${ruta}: textos en el idioma de la interfaz (${nav})`);
      t(`${ruta} · interfaz ${nav} · fechas y números`, loc, sal.loc); t(`${ruta} · interfaz ${nav} · puntaje 0,25`, pts, sal.fmt(0.25));
    }
  }
}
// ── Fuera del árbitro: sigue el idioma elegido ──
for (const [nav, esperado] of [["en-US", "en"], ["es-AR", "es"], ["pt-BR", "pt"], ["fr-FR", "en"]]) {
  prov = montar("/dashboard", nav); t(`/dashboard · navegador ${nav} · <html lang>`, esperado, lang());
}
prov = montar("/dashboard", "en-US"); pg = pantalla(); sal = pg.render(null);
assert.strictEqual(sal.t, en.arbitro, "fuera del árbitro: sección arbitro en el idioma elegido");

// htmlLangForPath, tabla
const casos = [
  ["/sesion/X", "en", "en", "en"], ["/sesion/X", "en", null, "es"], ["/sesion/X", "es", "en", "en"], ["/arbitro-juego/X", "pt", "en", "en"], ["/arbitro-juego/X", "en", "es", "es"],
  ["/arbitro-config", "en", "en", "en"], ["/arbitro-config", "es", "en", "es"], ["/arbitro-panel", "en", "es", "en"], ["/arbitro-panel", "pt", null, "es"], ["/arbitro/lenguajes", "pt", "en", "es"], ["/arbitro/lenguajes", "en", null, "en"], ["/arbitros-info", "en", "en", "en"], ["/arbitros-info", "es", "en", "es"],
  ["/", "pt", "en", "pt"], ["/dashboard", "en", "es", "en"], ["/dashboard", "es", null, "es"],
];
for (const [ruta, idioma, sesion, esp] of casos) t(`htmlLangForPath(${ruta}, ${idioma}, ${sesion})`, esp, m.htmlLangForPath(ruta, idioma, sesion));
t("htmlLangForPath sin tercer argumento", "es", m.htmlLangForPath("/sesion/X", "en"));
t("esRutaAlumnoArbitro /sesion/ y /arbitro-juego/", "true/true/false/false/false", [esRutaAlumnoArbitro("/sesion/A"), esRutaAlumnoArbitro("/arbitro-juego/A"), esRutaAlumnoArbitro("/arbitro-config"), esRutaAlumnoArbitro("/arbitro/exactas"), esRutaAlumnoArbitro("/")].join("/"));
t("esRutaArbitro sigue igual", "true/true/true/false", [esRutaArbitro("/sesion/A"), esRutaArbitro("/arbitro-config"), esRutaArbitro("/arbitro-juego/A"), esRutaArbitro("/dashboard")].join("/"));

// ── 2) Funciones puras ──
for (const [e, s] of [["completa", "completa"], ["incompleta", "incompleta"], ["no", "incorrecta"], ["incorrecta", "incorrecta"], ["pasada", null], ["fuera_de_tema", null], ["", null], [undefined, null], [null, null], ["otra", null]])
  t(`calificacionPreguntaParaServidor(${JSON.stringify(e)})`, s, calificacionPreguntaParaServidor(e));
const backend = require("../lib/arbitroIdioma.js");
for (const v of ["en", "es", "EN", "fr", "", undefined, null, 5, {}]) t(`normalizarIdiomaSesion(${JSON.stringify(v)}) igual en front y backend`, backend.normalizarIdiomaSesion(v), idiomaSesion.normalizarIdiomaSesion(v));
for (const [i, e] of [["en", "en"], ["es", "es"], ["pt", "es"], ["", "es"]]) t(`idioma de sesión por defecto con la interfaz en «${i}»`, e, idiomaSesion.idiomaSesionPorDefecto(i));
for (const [i, e] of [["en", "en-US"], ["es", "es-AR"], ["pt", "es-AR"], [undefined, "es-AR"], [null, "es-AR"]]) t(`localeDeIdioma(${i})`, e, idiomaSesion.localeDeIdioma(i));
// Errores con motivo: el texto sale del diccionario; sin motivo o sin clave, el mensaje del servidor
const e1 = { code: "functions/deadline-exceeded", message: "Sesión expirada.", details: { motivo: "sesion_expirada" } };
t("textoErrorArbitro es · sesion_expirada", es.arbitro.errorMotivo_sesion_expirada, errores.textoErrorArbitro(e1, es.arbitro, e1.message));
t("textoErrorArbitro en · sesion_expirada", en.arbitro.errorMotivo_sesion_expirada, errores.textoErrorArbitro(e1, en.arbitro, e1.message));
assert.notStrictEqual(es.arbitro.errorMotivo_sesion_expirada, en.arbitro.errorMotivo_sesion_expirada);
t("textoErrorArbitro · sin motivo → mensaje del servidor", "Algo raro", errores.textoErrorArbitro({ message: "Algo raro" }, en.arbitro, "Algo raro"));
t("textoErrorArbitro · motivo sin texto en el diccionario → respaldo", "Mensaje", errores.textoErrorArbitro({ details: { motivo: "nuevo_motivo" }, message: "Mensaje" }, en.arbitro, "Mensaje"));
t("textoErrorArbitro · respaldo por defecto = message", "Hola", errores.textoErrorArbitro({ message: "Hola" }, en.arbitro));
t("esSesionExpirada · por motivo", true, errores.esSesionExpirada(e1));
t("esSesionExpirada · otro motivo", false, errores.esSesionExpirada({ details: { motivo: "sesion_no_encontrada" }, message: "Sesión expirada." }));
t("esSesionExpirada · servidor viejo, sin motivo (por el mensaje)", true, errores.esSesionExpirada({ message: "Sesión expirada." }));
t("esSesionExpirada · servidor viejo, otro mensaje", false, errores.esSesionExpirada({ message: "Sesión no encontrada." }));
t("esRespuestaNoClara / esIaNoDisponible siguen igual", "true/false/false/true", [errores.esRespuestaNoClara({ code: "functions/unavailable", details: { motivo: "respuesta_no_clara" } }), errores.esIaNoDisponible({ code: "functions/unavailable", details: { motivo: "respuesta_no_clara" } }), errores.esRespuestaNoClara({ code: "functions/unavailable" }), errores.esIaNoDisponible({ code: "functions/unavailable" })].join("/"));

// ── 3) Cableado (código fuente) ──
const leer = (f) => fs.readFileSync(path.join(SRC, f), "utf8").replace(/\r\n/g, "\n");
const pagina = (n) => leer(`pages/${n}.tsx`);
for (const n of ["ArbitroSesionPage", "ArbitroJuegoPage"]) assert.ok(/useIdiomaSesion\(sesion\?\.idioma, !!sesion\)/.test(pagina(n)), `${n} debe fijar el idioma con el de la sesión`);
for (const n of ["ArbitroConfigPage", "ArbitroPanelPage", "ArbitroJuegoPage", "ArbitroSesionPage", "ArbitroLandingPage", "ArbitrosInfoPage"]) {
  const s = pagina(n); assert.ok(!/["'`]es-AR["'`]/.test(s), `${n}: quedó un "es-AR" fijo`);
}
const cfg = pagina("ArbitroConfigPage");
assert.ok(/"crearSesionArbitro"\);\n\s+const res = await fn\(\{[^}]*idioma: idiomaSesion/.test(cfg), "la configuración manda `idioma` al crear la sesión");
assert.ok(/"generarConsignasArbitro"\);\n\s+const res = await fn\(\{[^}]*idioma: idiomaSesion/.test(cfg), "la configuración manda `idioma` al generar preguntas");
assert.ok(/useState<IdiomaSesion>\(\(\) => idiomaSesionPorDefecto\(idiomaInterfaz\)\)/.test(cfg), "el selector toma por defecto el idioma de la interfaz");
assert.ok(cfg.includes("ta.cfgSessionLang") && cfg.includes("label: ta.cfgLangEs") && cfg.includes("label: ta.cfgLangEn"), "selector «Idioma de la sesión: Español / English»");
assert.strictEqual(es.arbitro.cfgSessionLang, "Idioma de la sesión"); assert.strictEqual(en.arbitro.cfgSessionLang, "Session language");
assert.ok(es.arbitro.cfgLangEs === "Español" && en.arbitro.cfgLangEn === "English" && en.arbitro.cfgLangEs === "Español", "los nombres de idioma se muestran como se escriben en cada idioma");
const juego = pagina("ArbitroJuegoPage");
assert.ok(/calificacionPregunta: calificacionPreguntaParaServidor\(calificacionActual\)/.test(juego), "el juego manda calificacionPregunta");
assert.ok(!/calific[óo] como/.test(juego), "el juego ya no arma «(calificó como …)» dentro del texto");
assert.ok(/posicionA: `\$\{equipoPregunta\.nombre\}: \$\{disputaArgEquipoPregunta\}`/.test(juego), "la Posición A va sin etiqueta");
assert.ok(/sessionLanguage/.test(leer("App.tsx")) && /htmlLangForPath\(location\.pathname, language, sessionLanguage\)/.test(leer("App.tsx")), "ArbitroLangManager usa el idioma de la sesión");
filas.push({ caso: "cableado: pantallas, configuración, juego y App.tsx", esperado: "ok", obtenido: "ok" });

console.table(filas); console.log(`OK: ${filas.length} comprobaciones del front de la etapa 1.`);
