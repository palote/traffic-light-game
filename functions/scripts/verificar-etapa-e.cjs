// Etapa E: la app instalada de los Árbitros (ingreso con ?next=, manifiestos por ruta/dominio) y la
// página principal (encabezado fijo, tarjetas Árbitros/Semáforo lado a lado, Herramientas plegada).
// Solo frontend. Chequeos de texto fuente (regex sobre .tsx/.ts/.json/.html) + funciones puras cargadas
// con ts.transpileModule, igual que el resto de los scripts de esta carpeta.
// Uso (desde functions/):  node scripts/verificar-etapa-e.cjs
const fs = require("fs"), path = require("path"), assert = require("assert"), vm = require("vm");
const ts = require("typescript");
const SRC = path.join(__dirname, "../../src");
const PUBLIC = path.join(__dirname, "../../public");
const ROOT = path.join(__dirname, "../..");
const leer = (rel, base = SRC) => fs.readFileSync(path.join(base, rel), "utf8");

const filas = [];
const t = (caso, esperado, obtenido) => {
  filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) });
  assert.strictEqual(String(obtenido), String(esperado), caso);
};
const ok = (caso, cond) => {
  filas.push({ caso, esperado: "true", obtenido: String(!!cond) });
  assert.ok(cond, caso);
};

// ── Cargador de módulos TS puros con imports relativos entre sí (sin React/firebase) ──
const cacheModulos = new Map();
function cargarModulo(relSrc) {
  const abs = path.join(SRC, relSrc);
  if (cacheModulos.has(abs)) return cacheModulos.get(abs);
  const dir = path.dirname(relSrc);
  const codigo = fs.readFileSync(abs, "utf8");
  const out = ts.transpileModule(codigo, { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
  const req = (spec) => {
    if (spec.startsWith("./") || spec.startsWith("../")) {
      const relResuelto = path.join(dir, spec).split(path.sep).join("/");
      return cargarModulo(relResuelto.endsWith(".ts") ? relResuelto : relResuelto + ".ts");
    }
    return require(spec);
  };
  const m = { exports: {} };
  new Function("module", "exports", "require", out)(m, m.exports, req);
  cacheModulos.set(abs, m.exports);
  return m.exports;
}

console.log("── 1) rutaSiguienteValida ──");
{
  const { rutaSiguienteValida } = cargarModulo("utils/nextRoute.ts");
  const ORIGEN = "https://eljuegodelsemaforo.com";
  t("ruta interna → se mantiene", "/arbitro-panel", rutaSiguienteValida("/arbitro-panel", ORIGEN));
  t("ruta interna con query → se mantiene", "/arbitro-config?area=exactas", rutaSiguienteValida("/arbitro-config?area=exactas", ORIGEN));
  t("ruta interna con query y hash → se mantiene", "/arbitro-panel?x=1", rutaSiguienteValida("/arbitro-panel?x=1", ORIGEN));
  t("protocol-relative '//otro.com' → '/'", "/", rutaSiguienteValida("//otro.com", ORIGEN));
  t("absoluta 'https://evil.com' → '/'", "/", rutaSiguienteValida("https://evil.com", ORIGEN));
  t("absoluta 'http://evil.com' → '/'", "/", rutaSiguienteValida("http://evil.com", ORIGEN));
  t("vacía → '/'", "/", rutaSiguienteValida("", ORIGEN));
  t("null → '/'", "/", rutaSiguienteValida(null, ORIGEN));
  t("undefined → '/'", "/", rutaSiguienteValida(undefined, ORIGEN));
  t("sin barra inicial 'arbitro-panel' → '/'", "/", rutaSiguienteValida("arbitro-panel", ORIGEN));
  t("'/' se mantiene", "/", rutaSiguienteValida("/", ORIGEN));
  // El parser de URLs trata "\" como separador y descarta tabs antes de armar la URL final:
  // un string que "parece" empezar con una sola barra puede resolver a otro origen igual.
  t("barra invertida '/\\evil.com' (el navegador la lee como separador) → '/'", "/", rutaSiguienteValida("/" + "\\" + "evil.com", ORIGEN));
  t("tab real '/<TAB>/evil.com' (se descarta antes de parsear) → '/'", "/", rutaSiguienteValida("/" + "\t" + "/evil.com", ORIGEN));
  // Y lo contrario: una barra invertida *percent-encoded* no es una barra invertida real para el
  // parser, así que sigue siendo una ruta interna normal — no hay que rechazarla de más.
  t("barra invertida percent-encoded '/%5Cevil.com' → se mantiene (no es una barra invertida real)", "/%5Cevil.com", rutaSiguienteValida("/%5Cevil.com", ORIGEN));
}

console.log("── 2) LoginPage.tsx: usa ?next= validado ──");
{
  const login = leer("pages/LoginPage.tsx");
  ok("importa useSearchParams", /useSearchParams/.test(login));
  ok("importa rutaSiguienteValida", /rutaSiguienteValida/.test(login));
  ok("navigate(next) en el efecto de sesión iniciada", /if \(user && !loading\) navigate\(next\);/.test(login));
  ok("el efecto depende de next (se recalcula si cambia el query)", /\[user, loading, navigate, next\]/.test(login));
}

console.log("── 3) Pantallas de Árbitros que mandan a /login ──");
{
  const panel = leer("pages/ArbitroPanelPage.tsx");
  ok("ArbitroPanelPage: sin sesión → /login?next=/arbitro-panel", /navigate\("\/login\?next=\/arbitro-panel"\)/.test(panel));
  ok("ArbitroPanelPage: ya no manda a '/login' pelado", !/navigate\("\/login"\)/.test(panel));

  const portada = leer("pages/ArbitrosPublicaPage.tsx");
  ok("Portada: importa useAuth", /useAuth/.test(portada));
  ok("Portada: sin sesión → /login?next=/arbitro-panel", /to="\/login\?next=\/arbitro-panel"/.test(portada));
  ok("Portada: con sesión → /arbitro-panel con cfgMySessions", /to="\/arbitro-panel"[^]*?\{ta\.cfgMySessions\}/.test(portada));
  ok("Portada: ya no manda a '/login' pelado", !/to="\/login"/.test(portada));

  // El resto de pantallas de Árbitros no debería mandar a /login en absoluto (ya se relevaron a mano:
  // solo estas dos lo hacían). Si alguna nueva empieza a hacerlo, este chequeo avisa.
  const pantallasArbitro = [
    "pages/ArbitroConfigPage.tsx", "pages/ArbitroJuegoPage.tsx", "pages/ArbitroIngresoPage.tsx",
    "pages/ArbitrosInfoPage.tsx",
  ];
  for (const f of pantallasArbitro) {
    if (!fs.existsSync(path.join(SRC, f))) continue;
    const c = leer(f);
    ok(`${f}: no manda a /login`, !/navigate\(["']\/login/.test(c) && !/to=["']\/login/.test(c));
  }
}

console.log("── 4) Manifiestos ──");
{
  const m = JSON.parse(fs.readFileSync(path.join(PUBLIC, "manifest.json"), "utf8"));
  t("manifest.json: id", "/", m.id);
  t("manifest.json: start_url (sin cambios)", "/", m.start_url);

  const ma = JSON.parse(fs.readFileSync(path.join(PUBLIC, "manifest-arbitro.json"), "utf8"));
  t("manifest-arbitro.json: start_url", "/arbitros", ma.start_url);
  t("manifest-arbitro.json: id", "/arbitros-app", ma.id);
  t("manifest-arbitro.json: lang", "es", ma.lang);
  t("manifest-arbitro.json: description", "Juego en equipos para la comprensión lectora, con IA como árbitro", ma.description);

  const en = JSON.parse(fs.readFileSync(path.join(PUBLIC, "manifest-arbitro-en.json"), "utf8"));
  t("manifest-arbitro-en.json: name", "Learning Referees", en.name);
  t("manifest-arbitro-en.json: short_name", "Referees", en.short_name);
  t("manifest-arbitro-en.json: description", "A team game for reading comprehension, refereed by AI", en.description);
  t("manifest-arbitro-en.json: lang", "en", en.lang);
  t("manifest-arbitro-en.json: start_url", "/arbitros", en.start_url);
  t("manifest-arbitro-en.json: id", "/arbitros-app", en.id);
  const nombresAtajos = en.shortcuts.map(s => s.name).join(" | ");
  t("manifest-arbitro-en.json: atajos", "My sessions | Create session", nombresAtajos);
  t("manifest-arbitro-en.json: atajo 1 description", "See sessions and generate reports", en.shortcuts[0].description);
  t("manifest-arbitro-en.json: atajo 2 description", "Set up a new session", en.shortcuts[1].description);
}

console.log("── 5) Elección de manifiesto: TS (dynamicManifest.ts) vs. script inline de index.html ──");
{
  const { datosManifestParaRuta } = cargarModulo("utils/dynamicManifest.ts");

  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const m = /<script id="manifest-inline">([\s\S]*?)<\/script>/.exec(html);
  ok("index.html tiene el <script id=\"manifest-inline\">", !!m);
  const cuerpoInline = m[1];

  function elementoFalso(tag) {
    const el = { tagName: tag };
    el.setAttribute = (k, v) => { el[k] = v; };
    return el;
  }
  function documentoFalso() {
    const elementos = [];
    return {
      head: { appendChild: (el) => elementos.push(el) },
      createElement: (tag) => elementoFalso(tag),
      querySelector: (selector) => {
        const mm = /^(\w+)\[(\w+)="([^"]+)"\]$/.exec(selector);
        if (!mm) return null;
        const [, tag, attr, val] = mm;
        return elementos.find(el => el.tagName === tag && el[attr] === val) || null;
      },
    };
  }
  function ejecutarInline(pathname, search, origen, hostname) {
    const doc = documentoFalso();
    const sandbox = { window: { location: { pathname, search, origin: origen, hostname } }, document: doc, URLSearchParams, URL, console };
    vm.createContext(sandbox);
    vm.runInContext(cuerpoInline, sandbox);
    const man = doc.querySelector('link[rel="manifest"]');
    const icon = doc.querySelector('link[rel="apple-touch-icon"]');
    const title = doc.querySelector('meta[name="apple-mobile-web-app-title"]');
    return { manifest: man && man.href, icon: icon && icon.href, title: title && title.content };
  }

  const DOMINIOS = [
    { hostname: "eljuegodelsemaforo.com", origen: "https://eljuegodelsemaforo.com", idioma: "es" },
    { hostname: "thetrafficlightgame.com", origen: "https://thetrafficlightgame.com", idioma: "en" },
    { hostname: "localhost", origen: "https://localhost", idioma: "es" }, // dominio desconocido → cae a es (ninguna coincide con "en")
  ];
  const RUTAS = [
    ["/", ""], ["/setup", ""], ["/arbitros", ""], ["/arbitro-panel", ""], ["/arbitro-config", ""],
    ["/alumnos", ""], ["/students", ""], ["/sesion/X", ""], ["/arbitro-juego/X", ""],
    ["/login", ""], ["/login", "?next=/arbitro-panel"],
  ];

  for (const { hostname, origen, idioma } of DOMINIOS) {
    for (const [pathname, search] of RUTAS) {
      const caso = `${hostname} ${pathname}${search}`;
      const esperadoTS = datosManifestParaRuta(pathname, search, origen);
      const inline = ejecutarInline(pathname, search, origen, hostname);
      t(`[manifest] ${caso}`, esperadoTS.manifest, inline.manifest);
      t(`[apple-touch-icon] ${caso}`, esperadoTS.appleTouchIcon, inline.icon);
      t(`[apple-title] ${caso}`, esperadoTS.appleTitle, inline.title);

      // Y el contenido tiene que ser el que pide la Etapa E, no solo "TS == inline":
      const esArbitro = pathname.startsWith("/arbitro") || pathname.startsWith("/sesion/") || pathname.startsWith("/alumnos")
        || pathname.startsWith("/students") || (pathname === "/login" && search.includes("next=/arbitro"));
      if (esArbitro) {
        t(`[manifest esperado] ${caso}`, idioma === "en" ? "/manifest-arbitro-en.json" : "/manifest-arbitro.json", esperadoTS.manifest);
        t(`[icon esperado] ${caso}`, "/icons/arbitro-icon-192.png", esperadoTS.appleTouchIcon);
        t(`[title esperado] ${caso}`, idioma === "en" ? "Referees" : "Árbitro IA", esperadoTS.appleTitle);
      } else {
        t(`[manifest esperado] ${caso}`, "/manifest.json", esperadoTS.manifest);
        t(`[icon esperado] ${caso}`, "/icons/icon-192x192.png", esperadoTS.appleTouchIcon);
        t(`[title esperado] ${caso}`, "TL Game", esperadoTS.appleTitle);
      }
    }
  }
}

console.log("── 6) ManifestManager (App.tsx) reacciona también a location.search ──");
{
  const app = leer("App.tsx");
  ok("ManifestManager: useEffect depende de [location.pathname, location.search]",
    /useEffect\(\(\) => \{\s*setManifestForRoute\(\);\s*\}, \[location\.pathname, location\.search\]\);/.test(app));
}

console.log("── 7) Página principal (diseño de Etapa E): sección superada por Etapa F ──");
{
  // Etapa E armó una sola página "/" con encabezado fijo + tarjetas Árbitros/Semáforo + Herramientas
  // plegada. Etapa F reemplazó ese diseño a propósito por tres páginas separadas (HomePage.tsx,
  // SemaforoPage.tsx, HerramientasPage.tsx con las herramientas sin plegar), así que las comprobaciones
  // de esta sección ya no aplican: no es una regresión, es el cambio de diseño que pidió el docente.
  // El equivalente vigente vive en verificar-etapa-f.cjs (secciones 1, 4, 5 y 8).
  ok("sección superada por Etapa F — sin comprobaciones propias", true);
}

console.log("── 8) /arbitros-info: ya no dice \"forman parte\" ──");
{
  const info = leer("pages/ArbitrosInfoPage.tsx");
  ok("ArbitrosInfoPage usa infSemName como link (navigate a /about) seguido de infSem1b", /\{ta\.infSemName\}[\s\S]{0,40}<\/button>\{ta\.infSem1b\}/.test(info));
  ok("ArbitrosInfoPage muestra infSem2 después", /\{ta\.infSem2\}/.test(info));

  for (const [nombre, archivo] of [["es", "i18n/es.ts"], ["en", "i18n/en.ts"]]) {
    const c = leer(archivo);
    ok(`${nombre}.ts: ya no dice "forman parte" / "are part"`, !/forman parte/.test(c) && !/are part of/.test(c));
  }
}

console.log("── 9) Textos nuevos en es y en (y pt para los de dashboard) ──");
{
  const cargarDicc = (archivo, nombre) => {
    const out = ts.transpileModule(leer(archivo, SRC + "/i18n"), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
    const m = { exports: {} }; new Function("module", "exports", "require", out)(m, m.exports, require); return m.exports[nombre];
  };
  const es = cargarDicc("es.ts", "es"), en = cargarDicc("en.ts", "en"), pt = cargarDicc("pt.ts", "pt");

  t("es.dashboard.arbLabel", "DOS EQUIPOS CONTRA DOS, CON UN TEXTO", es.dashboard.arbLabel);
  t("en.dashboard.arbLabel", "TWO TEAMS VS. TWO, WITH A TEXT", en.dashboard.arbLabel);
  ok("pt.dashboard.arbLabel existe", typeof pt.dashboard.arbLabel === "string" && pt.dashboard.arbLabel.length > 0);

  t("es.dashboard.semaforoLabel", "TODA LA CLASE, EN ETAPAS", es.dashboard.semaforoLabel);
  t("en.dashboard.semaforoLabel", "THE WHOLE CLASS, IN STAGES", en.dashboard.semaforoLabel);
  ok("pt.dashboard.semaforoLabel existe", typeof pt.dashboard.semaforoLabel === "string" && pt.dashboard.semaforoLabel.length > 0);

  t("es.dashboard.arbDesc", "Los equipos se preguntan y se califican sobre un texto; la IA arbitra solo cuando no se ponen de acuerdo.", es.dashboard.arbDesc);
  t("en.dashboard.arbDesc", "Teams question and grade each other on a text; the AI referees only when they disagree.", en.dashboard.arbDesc);
  t("es.dashboard.semaforoDesc", "Un juego de coopetición para toda la clase: primero trabajan en equipos y después juegan todos juntos.", es.dashboard.semaforoDesc);
  t("en.dashboard.semaforoDesc", "A coopetition game for the whole class: first they work in teams, then they all play together.", en.dashboard.semaforoDesc);

  ok("ya no existen dashboard.groupWork / dashboard.fullDynamic en es/en/pt",
    !("groupWork" in es.dashboard) && !("fullDynamic" in es.dashboard)
    && !("groupWork" in en.dashboard) && !("fullDynamic" in en.dashboard)
    && !("groupWork" in pt.dashboard) && !("fullDynamic" in pt.dashboard));

  t("es.arbitro.infSemaforo (título nuevo)", "🚦 ¿Y el Juego del Semáforo?", es.arbitro.infSemaforo);
  t("en.arbitro.infSemaforo (título nuevo)", "🚦 What about the Traffic Light Game?", en.arbitro.infSemaforo);
  t("es.arbitro.infSem2", "Son independientes: podés usar los Árbitros, el Semáforo o los dos.", es.arbitro.infSem2);
  t("en.arbitro.infSem2", "They are independent: you can use the Learning Referees, the Traffic Light Game, or both.", en.arbitro.infSem2);
}

console.log("── 10) Las verificaciones generales de i18n siguen en verde ──");
{
  const { execFileSync } = require("child_process");
  for (const script of ["verificar-claves-es-en.cjs", "verificar-en-sin-traducir.cjs"]) {
    const salida = execFileSync(process.execPath, [path.join(__dirname, script)], { encoding: "utf8" });
    ok(`${script} sigue en verde`, /^OK:/m.test(salida));
  }
}

console.table(filas);
console.log(`OK: ${filas.length} comprobaciones.`);
process.exit(0);
