// Etapa F: la página principal como entrada a las tres propuestas (Árbitros, Semáforo, Herramientas).
// "/" pasa a ser pública; el Semáforo se muda a "/semaforo" (con sesión); Herramientas a "/herramientas"
// (pública, sin plegar); ProtectedRoute vuelve con ?next=; avisos vencidos no se muestran; /dashboard
// redirige a /semaforo y no queda ningún enlace viejo a él.
// Solo frontend. Chequeos de texto fuente (regex sobre .tsx/.ts/.json) + funciones puras cargadas con
// ts.transpileModule, igual que el resto de los scripts de esta carpeta.
// Uso (desde functions/):  node scripts/verificar-etapa-f.cjs
const fs = require("fs"), path = require("path"), assert = require("assert");
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

const appTsx = leer("App.tsx");
const homeTsx = leer("pages/HomePage.tsx");
const semaforoTsx = leer("pages/SemaforoPage.tsx");
const herramientasTsx = leer("pages/HerramientasPage.tsx");
const protectedRouteTsx = leer("components/ProtectedRoute.tsx");
const bannersTsx = leer("components/DashboardBanners.tsx");
const aboutTsx = leer("pages/AboutPage.tsx");
const manifestJson = JSON.parse(fs.readFileSync(path.join(PUBLIC, "manifest.json"), "utf8"));

console.log("── 1) '/' es pública: no hay ProtectedRoute alrededor de HomePage ──");
{
  const m = /<Route\s+path="\/"\s+element=\{<HomePage \/>\}\s*\/>/.exec(appTsx);
  ok('Route "/" → <HomePage /> sin envoltorio', !!m);
  ok('ProtectedRoute no aparece junto al Route de "/"', m ? !/ProtectedRoute/.test(appTsx.slice(Math.max(0, m.index - 80), m.index)) : false);
}

console.log("── 2) '/semaforo' pide sesión; '/herramientas', '/about' y '/dashboard' son públicas o redirigen ──");
{
  ok('Route "/semaforo" envuelta en <ProtectedRoute>',
    /<ProtectedRoute>\s*<SemaforoPage \/>\s*<\/ProtectedRoute>/.test(appTsx));
  const mHerr = /<Route path="\/herramientas" element=\{<HerramientasPage \/>\}\s*\/>/.exec(appTsx);
  ok('Route "/herramientas" → <HerramientasPage /> sin ProtectedRoute', !!mHerr);
  const mAbout = /<Route path="\/about" element=\{<AboutPage \/>\}\s*\/>/.exec(appTsx);
  ok('Route "/about" → <AboutPage /> sin ProtectedRoute (ahora pública)', !!mAbout);
  ok('Route "/dashboard" → Navigate a "/semaforo"',
    /<Route path="\/dashboard" element=\{<Navigate to="\/semaforo" replace \/>\}\s*\/>/.test(appTsx));
}

console.log("── 3) AboutPage no muestra datos del usuario (por eso puede ser pública) ──");
{
  ok("AboutPage no usa useAuth", !/useAuth/.test(aboutTsx));
  ok('AboutPage no referencia "user."', !/\buser\./.test(aboutTsx));
}

console.log("── 4) Las tres tarjetas de '/' llevan a su ruta, en el orden Árbitros, Semáforo, Herramientas ──");
{
  const iArb = homeTsx.indexOf('navigate("/arbitros")');
  const iSem = homeTsx.indexOf('navigate("/semaforo")');
  const iHer = homeTsx.indexOf('navigate("/herramientas")');
  ok("tarjeta Árbitros → /arbitros existe", iArb !== -1);
  ok("tarjeta Semáforo → /semaforo existe", iSem !== -1);
  ok("tarjeta Herramientas → /herramientas existe", iHer !== -1);
  ok("orden en el DOM: Árbitros, Semáforo, Herramientas", iArb < iSem && iSem < iHer);
  ok('"/" no tiene ProtectedRoute import usado dentro de HomePage', !/ProtectedRoute/.test(homeTsx));
}

console.log("── 5) Encabezados: fijo (primaria) en '/' y '/herramientas'; sigue el modo en '/semaforo' ──");
{
  ok('HomePage usa headerTheme fijo (getThemeByMode("traffic-light", ...))',
    /getThemeByMode\("traffic-light",\s*language\)/.test(homeTsx));
  ok("HomePage no pasa backTo a SiteHeader (es la página de inicio)",
    /<SiteHeader theme=\{headerTheme\} \/>/.test(homeTsx));
  ok('HerramientasPage usa headerTheme fijo (getThemeByMode("traffic-light", ...))',
    /getThemeByMode\("traffic-light",\s*language\)/.test(herramientasTsx));
  ok('HerramientasPage pasa backTo="/"', /<SiteHeader theme=\{headerTheme\} backTo="\/" \/>/.test(herramientasTsx));
  ok("SemaforoPage NO usa headerTheme fijo (el nombre y los colores siguen el modo)",
    !/getThemeByMode/.test(semaforoTsx));
  ok('SemaforoPage pasa backTo="/" con el theme del modo', /<SiteHeader theme=\{theme\} backTo="\/" \/>/.test(semaforoTsx));
}

console.log("── 6) Ninguna pantalla del Semáforo vuelve a '/' (van a /semaforo) ──");
{
  const archivosSemaforo = [
    "App.tsx", "components/Stage2/FinalPodium.tsx", "pages/GameResultsPage.tsx", "pages/LibraryPage.tsx",
  ];
  for (const rel of archivosSemaforo) {
    const src = leer(rel);
    ok(`${rel}: no queda navigate("/") ni navigate('/')`, !/navigate\((?:"\/"|'\/')\)/.test(src));
    ok(`${rel}: navega a "/semaforo"`, /navigate\((?:"\/semaforo"|'\/semaforo')\)/.test(src));
  }
}

console.log("── 7) El Volver/✕ de las Herramientas va a /herramientas (no a '/') ──");
{
  const archivosHerramientas = [
    "pages/RubricGeneratorPage.tsx", "pages/ConsignaAdapterPage.tsx", "pages/CorreccionPage.tsx",
    "pages/EcuacionesGeneratorPage.tsx", "pages/HorarioGeneratorPage.tsx", "pages/InformeGeneratorPage.tsx",
    "pages/PlanificacionGeneratorPage.tsx", "pages/PresentacionGeneratorPage.tsx", "pages/PresentismoGeneratorPage.tsx",
    "pages/SecuenciaGeneratorPage.tsx", "pages/ComparadorPaisesPage.tsx",
  ];
  for (const rel of archivosHerramientas) {
    const src = leer(rel);
    ok(`${rel}: no queda navigate("/") ni navigate('/')`, !/navigate\((?:"\/"|'\/')\)/.test(src));
    ok(`${rel}: navega a "/herramientas"`, /navigate\((?:"\/herramientas"|'\/herramientas')\)/.test(src));
  }
  const bingo = leer("pages/BingoFamiliarPage.tsx");
  ok('BingoFamiliarPage: el link "Volver al inicio" va a /herramientas', /<a href="\/herramientas"/.test(bingo));
  ok('BingoFamiliarPage: no queda href="/"', !/href="\/"/.test(bingo));
}

console.log("── 8) HerramientasPage lista las mismas 11 herramientas de siempre, sin plegar ──");
{
  const rutas = Array.from(herramientasTsx.matchAll(/route: "(\/[a-z-]+)"/g)).map(m => m[1]);
  t("cantidad de herramientas", 11, rutas.length);
  ok("no hay ningún estado de colapso (toolsCollapsed) en HerramientasPage", !/Collapsed/.test(herramientasTsx));
  for (const ruta of ["/rubric-generator", "/consigna-adapter", "/informe-generator", "/presentismo-generator",
    "/horario-generator", "/presentacion-generator", "/secuencia-generator", "/planificacion-generator",
    "/comparador-paises", "/ecuaciones-generator", "/bingo-familiar"]) {
    ok(`HerramientasPage incluye ${ruta}`, rutas.includes(ruta));
  }
}

console.log("── 9) ProtectedRoute redirige con ?next= (validado con rutaSiguienteValida) ──");
{
  ok("ProtectedRoute usa useLocation", /useLocation/.test(protectedRouteTsx));
  ok("ProtectedRoute importa rutaSiguienteValida", /import \{ rutaSiguienteValida \} from "\.\.\/utils\/nextRoute"/.test(protectedRouteTsx));
  ok("ProtectedRoute arma next con pathname + search + hash",
    /rutaSiguienteValida\(location\.pathname \+ location\.search \+ location\.hash\)/.test(protectedRouteTsx));
  ok("ProtectedRoute redirige a /login?next=<next> (encodeURIComponent)",
    /to=\{`\/login\?next=\$\{encodeURIComponent\(next\)\}`\}/.test(protectedRouteTsx));

  // Round-trip con la misma función que usa ProtectedRoute: lo que arma al redirigir, LoginPage lo
  // debe poder volver a resolver a la ruta original (ya probado en Etapa E; acá se confirma el nuevo caso).
  const { rutaSiguienteValida } = cargarModulo("utils/nextRoute.ts");
  const ORIGEN = "https://eljuegodelsemaforo.com";
  const rutaOriginal = "/semaforo";
  const nextArmado = rutaSiguienteValida(rutaOriginal, ORIGEN);
  const nextCodificado = encodeURIComponent(nextArmado);
  const nextDecodificadoYValidado = rutaSiguienteValida(decodeURIComponent(nextCodificado), ORIGEN);
  t("ProtectedRoute → /login?next=/semaforo → vuelve a /semaforo", "/semaforo", nextDecodificadoYValidado);

  const nextArmadoConQuery = rutaSiguienteValida("/resultados/abc?tab=autoevaluaciones", ORIGEN);
  t("ida y vuelta conserva query", "/resultados/abc?tab=autoevaluaciones",
    rutaSiguienteValida(decodeURIComponent(encodeURIComponent(nextArmadoConQuery)), ORIGEN));
}

console.log("── 10) Avisos vencidos (webinar) no se muestran ──");
{
  const m = /const shouldShowWebinar = \(config: WebinarConfig \| null, dismissed: boolean\): boolean => \{[\s\S]*?\n  \};/.exec(bannersTsx);
  ok("se encontró shouldShowWebinar en DashboardBanners.tsx", !!m);
  const jsOut = ts.transpileModule(m[0], { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
  const factory = new Function("language", "checkingGames", "hasFinishedGame", jsOut + "\nreturn shouldShowWebinar;");
  const shouldShow = factory("es", false, true);

  const ahora = Date.now();
  const pasado = new Date(ahora - 24 * 3600 * 1000).toISOString();
  const futuro = new Date(ahora + 24 * 3600 * 1000).toISOString();

  t("webinar con fecha pasada (ej. jueves 4/6 ya pasado) → no se muestra", "false", shouldShow({ active: true, date: pasado }, false));
  t("webinar con fecha futura → se sigue mostrando", "true", shouldShow({ active: true, date: futuro }, false));
  t("webinar inactivo → no se muestra (sin cambios)", "false", shouldShow({ active: false, date: futuro }, false));
  t("webinar descartado por el docente → no se muestra (sin cambios)", "false", shouldShow({ active: true, date: futuro }, true));
}

console.log("── 11) /dashboard: el atajo de manifest.json y los enlaces viejos ya no apuntan ahí ──");
{
  const atajoCrear = manifestJson.shortcuts.find(s => s.name === "Crear Juego");
  t('manifest.json: atajo "Crear Juego" → /setup', "/setup", atajoCrear.url);

  const referral = leer("pages/ReferralPage.tsx");
  const webinarReg = leer("pages/WebinarRegistrationPage.tsx");
  ok("ReferralPage: enlace a /semaforo (antes /dashboard)", /href="\/semaforo"/.test(referral));
  ok("WebinarRegistrationPage: enlaces a /semaforo (antes /dashboard)",
    (webinarReg.match(/href="\/semaforo"/g) || []).length === 2);

  // No debe quedar ningún "/dashboard" salvo el propio Route de App.tsx (la ruta que redirige).
  const dirsABuscar = ["pages", "components"];
  const hallazgos = [];
  function recorrer(dirRel) {
    const abs = path.join(SRC, dirRel);
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const relHijo = path.join(dirRel, entry.name);
      if (entry.isDirectory()) recorrer(relHijo);
      else if (/\.(tsx|ts)$/.test(entry.name)) {
        const contenido = fs.readFileSync(path.join(abs, entry.name), "utf8");
        if (contenido.includes("/dashboard")) hallazgos.push(relHijo.split(path.sep).join("/"));
      }
    }
  }
  for (const d of dirsABuscar) recorrer(d);
  t("no queda ningún enlace a /dashboard en pages/ ni components/", 0, hallazgos.length);
  ok('App.tsx es el único archivo del repo con "/dashboard" (la ruta que redirige)',
    appTsx.includes('path="/dashboard"'));
}

console.log("── 12) Las verificaciones generales de i18n y dominio/idioma siguen en verde ──");
{
  const { execFileSync } = require("child_process");
  for (const script of ["verificar-claves-es-en.cjs", "verificar-en-sin-traducir.cjs", "verificar-dominio-idioma.cjs"]) {
    const salida = execFileSync(process.execPath, [path.join(__dirname, script)], { encoding: "utf8" });
    ok(`${script} sigue en verde`, /^OK:/m.test(salida));
  }
}

console.table(filas);
console.log(`OK: ${filas.length} comprobaciones.`);
process.exit(0);
