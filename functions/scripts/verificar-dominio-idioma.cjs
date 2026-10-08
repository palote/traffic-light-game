// Verifica (1) la prioridad del idioma inicial con hostnames simulados, (2) que getInitialLanguage() la use,
// (3) que las 4 pantallas del árbitro monten LanguageSelector, (4) enlaces/dominios por origin e idioma.
// Uso (desde functions/):  node scripts/verificar-dominio-idioma.cjs
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const SRC = path.join(__dirname, "../../src");
const leer = (f) => fs.readFileSync(path.join(SRC, f), "utf8");
function cargar(f) {
  const out = ts.transpileModule(leer(f), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
  const m = { exports: {} }; new Function("module", "exports", "require", out)(m, m.exports, require); return m.exports;
}
let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.error("  ✘ " + msg); } };

// ── 1. Prioridad con hostname simulado ──
const { resolverIdiomaInicial: r, idiomaPorDominio } = cargar("utils/idiomaInicial.ts");
const H_EN = ["thetrafficlightgame.com", "www.thetrafficlightgame.com", "traffic-light-game.web.app"];
const H_ES = ["eljuegodelsemaforo.com", "www.eljuegodelsemaforo.com"];
const H_NADA = ["localhost", "172.16.25.195", "traffic-ligths-game.web.app", "coopetition-game-site.web.app"];
for (const h of H_EN) ok(idiomaPorDominio(h) === "en", `dominio ${h} debería dar 'en'`);
for (const h of H_ES) ok(idiomaPorDominio(h) === "es", `dominio ${h} debería dar 'es'`);
for (const h of H_NADA) ok(idiomaPorDominio(h) === null, `${h} no debería decidir idioma`);
// (a) la elección guardada gana siempre, también contra el dominio
for (const g of ["es", "en", "pt"]) for (const h of [...H_EN, ...H_ES, "localhost"]) for (const nav of ["es-AR", "en-US", "pt-BR"])
  ok(r({ guardado: g, hostname: h, idiomaNavegador: nav }) === g, `guardado=${g} debe ganar (host ${h}, nav ${nav})`);
// (b) sin guardado: manda el dominio, aunque el navegador diga otra cosa
for (const h of H_EN) for (const nav of ["es-AR", "pt-BR", "en-US", ""]) ok(r({ guardado: null, hostname: h, idiomaNavegador: nav }) === "en", `${h} sin guardado → en (nav ${nav})`);
for (const h of H_ES) for (const nav of ["en-US", "pt-BR", "es-AR", ""]) ok(r({ guardado: null, hostname: h, idiomaNavegador: nav }) === "es", `${h} sin guardado → es (nav ${nav})`);
// valor guardado inválido se ignora
ok(r({ guardado: "fr", hostname: "thetrafficlightgame.com", idiomaNavegador: "es" }) === "en", "guardado inválido cae al dominio");
// (c) navegador y (d) fallback
ok(r({ guardado: null, hostname: "localhost", idiomaNavegador: "es-AR" }) === "es", "localhost + navegador es → es");
ok(r({ guardado: null, hostname: "localhost", idiomaNavegador: "PT-br" }) === "pt", "localhost + navegador pt → pt");
ok(r({ guardado: null, hostname: "localhost", idiomaNavegador: "fr-FR" }) === "en", "fallback → en");
ok(r({}) === "en", "sin datos → en");

// ── 2. getInitialLanguage usa la función y no pisa nada más ──
const idx = leer("i18n/index.tsx");
const gi = idx.slice(idx.indexOf("function getInitialLanguage"), idx.indexOf("// CONTEXTO"));
ok(/resolverIdiomaInicial\(\{\s*guardado,\s*hostname,\s*idiomaNavegador\s*\}\)/.test(gi), "getInitialLanguage debe llamar a resolverIdiomaInicial");
ok(gi.includes("tlg_language") && gi.includes("window.location.hostname"), "getInitialLanguage debe leer tlg_language y window.location.hostname");
ok(/import \{ resolverIdiomaInicial \} from "\.\.\/utils\/idiomaInicial"/.test(idx), "falta el import de resolverIdiomaInicial");
ok(!leer("contexts/GameModeContext.tsx").includes("idiomaInicial"), "GameModeContext no debe tocarse");

// ── 3. Las 4 pantallas del árbitro montan el selector ──
const PANTALLAS = { "pages/ArbitroConfigPage.tsx": 1, "pages/ArbitroLandingPage.tsx": 1, "pages/ArbitrosInfoPage.tsx": 1, "pages/ArbitroPanelPage.tsx": 2 };
for (const [f, n] of Object.entries(PANTALLAS)) {
  const s = leer(f);
  ok(/import \{[^}]*\bLanguageSelector\b[^}]*\} from "\.\.\/i18n"/.test(s), `${f}: falta importar LanguageSelector`);
  const usos = (s.match(/<LanguageSelector compact tone="onColor" \/>/g) || []).length;
  ok(usos === n, `${f}: se esperaban ${n} selector(es) y hay ${usos}`);
}
ok(/tone\?: 'onDark' \| 'onColor' \| 'onLight'/.test(idx) && idx.includes("aria-label={nombreAccesible[language]}"), "LanguageSelector debe tener tone y aria-label");
// El resto de las páginas que ya lo usaban conservan el estilo por defecto (sin tone)
for (const f of ["pages/DashboardPage.tsx", "pages/LoginPage.tsx", "pages/LibraryPage.tsx"]) ok(!/tone=/.test(leer(f)), `${f}: no debe cambiar de estilo`);

// ── 4. Enlaces y dominios ──
const cfg = leer("pages/ArbitroConfigPage.tsx");
ok(cfg.includes("`${window.location.origin}/arbitro-juego/${sesion.id}`"), "enlace de alumno debe usar window.location.origin");
ok(!/https:\/\/eljuegodelsemaforo\.com/.test(cfg), "ArbitroConfigPage no debe tener dominio fijo");
const es = cargar("i18n/es.ts").es, en = cargar("i18n/en.ts").en;
const buscar = (o, k) => { for (const x of Object.keys(o)) { if (x === k) return o[x]; if (o[x] && typeof o[x] === "object") { const r = buscar(o[x], k); if (r !== undefined) return r; } } };
const docES = [buscar(es, "docFooter"), buscar(es, "docTeacherNote")].join(" "), docEN = [buscar(en, "docFooter"), buscar(en, "docTeacherNote")].join(" ");
ok(docES.length > 20 && docEN.length > 20, "no se encontraron docFooter/docTeacherNote");
ok(docES.includes("eljuegodelsemaforo.com") && !docES.includes("thetrafficlightgame"), "docs ES: dominio eljuegodelsemaforo.com");
ok(docEN.includes("thetrafficlightgame.com") && !docEN.includes("eljuegodelsemaforo"), "docs EN: dominio thetrafficlightgame.com");
const { dominioPorIdioma, piePaginaGenerador } = cargar("utils/dominioPorIdioma.ts");
ok(dominioPorIdioma("en") === "thetrafficlightgame.com" && dominioPorIdioma("es") === "eljuegodelsemaforo.com" && dominioPorIdioma("pt") === "eljuegodelsemaforo.com", "dominioPorIdioma");
ok(piePaginaGenerador("es") === "Generado con El Juego del Semáforo · eljuegodelsemaforo.com", "pie ES idéntico al original");
ok(piePaginaGenerador("en").endsWith("thetrafficlightgame.com"), "pie EN con su dominio");
for (const f of ["pages/CorreccionPage.tsx", "pages/RubricGeneratorPage.tsx", "pages/SecuenciaGeneratorPage.tsx"]) {
  const s = leer(f);
  ok(s.includes("piePaginaGenerador(language)") && !/footer-print">[^<]*eljuegodelsemaforo/.test(s), `${f}: pie por idioma`);
}
console.log(fallos ? `\nFALLÓ: ${fallos} de ${total} comprobaciones` : `OK: ${total} comprobaciones (prioridad de idioma por dominio, selector en las 4 pantallas, enlaces y dominios).`);
process.exit(fallos ? 1 : 0);
