// Etapa D de "pantalla de configuración de los Árbitros": alivianar ArbitroConfigPage sin cambiar lo que
// se guarda en la sesión. Chequeos puramente de texto fuente (regex sobre el .tsx) + de las funciones puras
// separadas en utils (resumenOpcionesSesion) — no se renderiza React (no hay jsdom/testing-library en este
// repo), así que la cobertura es estructural: orden de los pasos, qué texto se muestra según qué estado, y
// que lo que se manda a crearSesionArbitro no cambió un carácter.
// Uso (desde functions/):  node scripts/verificar-etapa-d-config.cjs
const fs = require("fs"), path = require("path"), assert = require("assert");
const ts = require("typescript");
const SRC = path.join(__dirname, "../../src");
const cfgPath = path.join(SRC, "pages/ArbitroConfigPage.tsx");
const cfg = fs.readFileSync(cfgPath, "utf8");

const cargar = (rel, nombre) => {
  const src = fs.readFileSync(path.join(SRC, rel), "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
  const m = { exports: {} }; new Function("module", "exports", "require", out)(m, m.exports, require); return nombre ? m.exports[nombre] : m.exports;
};
const es = cargar("i18n/es.ts", "es").arbitro, en = cargar("i18n/en.ts", "en").arbitro;

// arbitroResumenOpciones.ts importa "../i18n" (index.tsx) solo por fillArbitro — se la reemplaza por un
// stub para no tener que cargar React/firebase/etc. para probar una función de texto.
function cargarResumenOpciones() {
  const f = path.join(SRC, "utils/arbitroResumenOpciones.ts");
  const out = ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText;
  const fakeI18n = { fillArbitro: (text, values) => text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m)) };
  const req = (r) => (r === "../i18n" ? fakeI18n : require(r));
  const m = { exports: {} };
  new Function("module", "exports", "require", out)(m, m.exports, req);
  return m.exports;
}
const { resumenOpcionesSesion } = cargarResumenOpciones();

const filas = [];
const t = (caso, esperado, obtenido) => { filas.push({ caso, esperado: String(esperado), obtenido: String(obtenido) }); assert.strictEqual(String(obtenido), String(esperado), caso); };

// ════ 1) Orden de los pasos: 1 Nivel · 2 Materia · 3 Tema · 4 Texto base · 5 Modo de respuesta ·
//         6 Preguntas para el juego · 7 Opciones de la sesión — el modo antes de las preguntas. ════
{
  const nros = [...cfg.matchAll(/<PasoLabel n=\{(\d+)\}/g)].map((m) => Number(m[1]));
  t("hay exactamente un <PasoLabel n={N}> por paso, en orden 1..7", "1,2,3,4,5,6,7", nros.join(","));
  const iModo = cfg.indexOf("<PasoLabel n={5}");
  const iPreguntas = cfg.indexOf("<PasoLabel n={6}");
  assert.ok(iModo > 0 && iPreguntas > iModo, "el paso 5 (modo) tiene que aparecer antes que el paso 6 (preguntas)");
  filas.push({ caso: "paso 5 (modo) antes del paso 6 (preguntas) en el código fuente", esperado: "true", obtenido: "true" });
}

// ════ 2) Tarjetas Oral/Escrito: títulos sin punto final + textos exactos, botón "Más detalle" ════
for (const [nombre, tx] of [["es", es], ["en", en]]) {
  for (const clave of ["cfgAnswerOralTitle", "cfgAnswerWrittenTitle"]) {
    t(`${nombre}.${clave} no termina en punto`, false, tx[clave].trim().endsWith("."));
  }
}
t("es.cfgAnswerOralTitle", "Repaso rápido", es.cfgAnswerOralTitle);
t("es.cfgAnswerWrittenTitle", "Registro completo", es.cfgAnswerWrittenTitle);
t("es.cfgAnswerOralSummary", "Responden en voz alta. Solo quedan registradas las disputas.", es.cfgAnswerOralSummary);
t("es.cfgAnswerWrittenSummary", "Escriben cada respuesta. Más lento, pero queda todo guardado.", es.cfgAnswerWrittenSummary);
t("en.cfgAnswerOralTitle", "Quick review", en.cfgAnswerOralTitle);
t("en.cfgAnswerWrittenTitle", "Full record", en.cfgAnswerWrittenTitle);
t("en.cfgAnswerOralSummary", "Teams answer out loud. Only disputes are recorded.", en.cfgAnswerOralSummary);
t("en.cfgAnswerWrittenSummary", "Teams type every answer. Slower, but everything is saved.", en.cfgAnswerWrittenSummary);
t("es.cfgAnswerMoreDetail", "Más detalle", es.cfgAnswerMoreDetail);
t("en.cfgAnswerMoreDetail", "More detail", en.cfgAnswerMoreDetail);

// El detalle se abre con un botón propio (aria-expanded, click/teclado nativos) separado del que elige la
// tarjeta — y ese botón de detalle nunca llama a setModoRespuesta (no cambia la selección).
{
  const bloque = cfg.slice(cfg.indexOf("5. Modo de respuesta"), cfg.indexOf("6. Preguntas para el juego"));
  const nAriaExpanded = (bloque.match(/aria-expanded=\{m\.abierto\}/g) || []).length;
  t("tarjetas de modo: hay un botón de detalle con aria-expanded (uno por tarjeta, vía .map)", 1, nAriaExpanded);
  const iDetalleBtn = bloque.indexOf("aria-expanded={m.abierto}");
  const iCierreDetalleBtn = bloque.indexOf("</button>", iDetalleBtn);
  const detalleBtn = bloque.slice(iDetalleBtn, iCierreDetalleBtn);
  t("el botón de detalle no cambia la tarjeta elegida (no llama a setModoRespuesta)", false, detalleBtn.includes("setModoRespuesta"));
  t("el botón de selección de tarjeta sí llama a setModoRespuesta, antes del botón de detalle", true, bloque.indexOf("setModoRespuesta(m.id)") < iDetalleBtn);
}

// ════ 3) Paso 7 plegado por defecto + resumen (función pura, probada con varias combinaciones) ════
t("opcionesAbierto arranca en false", true, /const \[opcionesAbierto, setOpcionesAbierto\] = useState\(false\)/.test(cfg));

for (const [nombre, tx] of [["es", es], ["en", en]]) {
  const base = { duracion: "clase", tiempoPregunta: 0, permitirPreguntasPropias: true, modoMetacognicion: "grupal", preguntasMetaEditadas: false, nCriterios: 0 };
  const sep = " · ";
  const r = (over) => resumenOpcionesSesion(tx, { ...base, ...over });

  t(`${nombre}: clase/sin-límite/propias-sí/grupal/sin-criterios`, [tx.cfgOptsSummaryClass, tx.cfgOptsSummaryNoRoundLimit, tx.cfgOptsSummaryOwnYes, tx.cfgOptsSummaryMetaGroup, tx.cfgOptsSummaryNoCriteria].join(sep), r({}));
  t(`${nombre}: cambia a "día"`, true, r({ duracion: "dia" }).includes(tx.cfgOptsSummaryDay));
  t(`${nombre}: cambia a tiempo por ronda (2 min)`, true, r({ tiempoPregunta: 120 }).includes(tx.cfgOptsSummaryRoundMin.replace("{n}", "2")));
  t(`${nombre}: preguntas propias en "no"`, true, r({ permitirPreguntasPropias: false }).includes(tx.cfgOptsSummaryOwnNo));
  t(`${nombre}: metacognición individual`, true, r({ modoMetacognicion: "individual" }).includes(tx.cfgOptsSummaryMetaIndividual));
  t(`${nombre}: "preguntas de metacognición editadas" NO aparece si no se tocaron`, false, r({}).includes(tx.cfgOptsSummaryMetaQEdited));
  t(`${nombre}: "preguntas de metacognición editadas" aparece si se tocaron`, true, r({ preguntasMetaEditadas: true }).includes(tx.cfgOptsSummaryMetaQEdited));
  t(`${nombre}: 1 criterio (singular)`, true, r({ nCriterios: 1 }).includes(tx.cfgOptsSummaryOneCriterion));
  t(`${nombre}: 2 criterios (plural, con {n})`, true, r({ nCriterios: 2 }).includes(tx.cfgOptsSummaryCriteriaN.replace("{n}", "2")));
  t(`${nombre}: 3 criterios (plural, con {n})`, true, r({ nCriterios: 3 }).includes(tx.cfgOptsSummaryCriteriaN.replace("{n}", "3")));
  t(`${nombre}: el resumen junta las partes con " · "`, true, r({ preguntasMetaEditadas: true }).split(sep).length === 6);
}

// ════ 4) Menos texto de ayuda ════
t("es.cfgRoundTimeHint", "Va de la pregunta a la respuesta; el árbitro no cuenta. Al vencerse, pueden seguir o pasar la pregunta.", es.cfgRoundTimeHint);
t("en.cfgRoundTimeHint", "Runs from question to answer; the referee isn't timed. When time runs out, teams can keep going or skip the question.", en.cfgRoundTimeHint);
t("es.cfgMetaGroupHint", "Cada equipo escribe una sola reflexión.", es.cfgMetaGroupHint);
t("es.cfgMetaIndividualHint", "Cada alumno responde en su turno, en el dispositivo del grupo. Ves el desglose por alumno.", es.cfgMetaIndividualHint);
t("en.cfgMetaGroupHint", "Each team writes a single reflection.", en.cfgMetaGroupHint);
t("en.cfgMetaIndividualHint", "Each student answers in turn on the group's device. You see a breakdown per student.", en.cfgMetaIndividualHint);
t("cfgMetaHint (texto combinado viejo) ya no existe en es", false, "cfgMetaHint" in es);
t("cfgMetaHint (texto combinado viejo) ya no existe en en", false, "cfgMetaHint" in en);
// Solo se ve la ayuda de la opción elegida (ternario, no las dos a la vez)
t("metacognición: ternario muestra solo la ayuda elegida", true, /modoMetacognicion === "individual" \? ta\.cfgMetaIndividualHint : ta\.cfgMetaGroupHint/.test(cfg));
t("es.cfgMetaGroup", "Grupal (por equipo)", es.cfgMetaGroup);
t("en.cfgMetaGroup", "Group (per team)", en.cfgMetaGroup);

t("es.cfgQuestionsHint1", "En cada turno, el equipo que pregunta elige una de esta lista. Las usadas quedan marcadas.", es.cfgQuestionsHint1);
t("en.cfgQuestionsHint1", "Each turn, the asking team picks one from this list. Used questions are marked.", en.cfgQuestionsHint1);
t("cfgGenerateWithAI (etiqueta repetida) ya no existe en es", false, "cfgGenerateWithAI" in es);
t("cfgGenerateWithAI (etiqueta repetida) ya no existe en en", false, "cfgGenerateWithAI" in en);

// La sugerencia de tipos depende del modo elegido en el paso 5
t("es.cfgTypeSuggestionOral", "En modo oral suelen funcionar mejor las de desarrollo.", es.cfgTypeSuggestionOral);
t("es.cfgTypeSuggestionEscrita", "En modo escrito suelen funcionar mejor las de recuperación.", es.cfgTypeSuggestionEscrita);
t("en.cfgTypeSuggestionOral", "In oral mode, skill-building questions tend to work best.", en.cfgTypeSuggestionOral);
t("en.cfgTypeSuggestionEscrita", "In written mode, recall questions tend to work best.", en.cfgTypeSuggestionEscrita);
t("la sugerencia de tipos cambia según modoRespuesta (ternario en el código)", true, /modoRespuesta === "oral" \? ta\.cfgTypeSuggestionOral : ta\.cfgTypeSuggestionEscrita/.test(cfg));

// "Revisá y editá…" solo después de generar con IA
{
  const iFn = cfg.indexOf("const renderSelectorTipoPreguntas");
  const iFinFn = cfg.indexOf("\n  );", iFn);
  const cuerpo = cfg.slice(iFn, iFinFn);
  const nMenciones = (cuerpo.match(/cfgTypeReviewEdit/g) || []).length;
  t("cfgTypeReviewEdit aparece una sola vez en renderSelectorTipoPreguntas", 1, nMenciones);
  const iEjercicioEsIA = cuerpo.indexOf("ejercicioEsIA && (");
  const iReviewEdit = cuerpo.indexOf("cfgTypeReviewEdit");
  assert.ok(iEjercicioEsIA >= 0 && iEjercicioEsIA < iReviewEdit, "cfgTypeReviewEdit tiene que estar DENTRO del bloque {ejercicioEsIA && ( … )}");
  filas.push({ caso: "\"Revisá y editá\" solo se muestra con ejercicioEsIA", esperado: "true", obtenido: "true" });
}

// Texto base: ayuda actualizada
t("es.cfgBaseTextHelp", "Con texto base, el árbitro y la IA juzgan según lo trabajado en clase. Sin texto, usan conocimiento general: funciona, pero es menos preciso.", es.cfgBaseTextHelp);
t("en.cfgBaseTextHelp", "With a base text, the referee and the AI judge answers against what was covered in class. Without one, they use general knowledge: it works, but it's less precise.", en.cfgBaseTextHelp);

// ════ 5) Botón principal: todo lo que habla de generar LA SESIÓN pasa a "crear" ("generar" queda ════
//         reservado para las preguntas con IA). Chequeo puntual de las claves de este botón/avisos +
//         barrido general del diccionario del árbitro con una lista de excepciones legítimas (preguntas).
t("es.cfgGenerateSession", "⚖️ Crear sesión", es.cfgGenerateSession);
t("en.cfgGenerateSession", "⚖️ Create session", en.cfgGenerateSession);
t("es.cfgGenerateAnyway", "Crear sesión igual →", es.cfgGenerateAnyway);
t("en.cfgGenerateAnyway", "Create session anyway →", en.cfgGenerateAnyway);
{
  const CLAVES_BOTON_SESION = ["cfgGenerateSession", "cfgLoginAndGenerate", "cfgGenerateAnyway", "cfgWarnGenerateDesc"];
  for (const clave of CLAVES_BOTON_SESION) {
    t(`es.${clave} no dice "generar/generando" la sesión`, false, /generan?do?\b.{0,20}\bsesi[óo]n/i.test(es[clave]));
    t(`en.${clave} no dice "generat(e|ing) … session"`, false, /generat(e|ing)\b.{0,20}\bsession\b/i.test(en[clave]));
  }
  // Barrido general: ninguna clave del diccionario del árbitro habla de "generar sesión" / "generate …
  // session", salvo las que son legítimamente sobre generar PREGUNTAS con IA (ya cubiertas arriba) o texto
  // narrativo de otras pantallas (landing/info) que no son esta pantalla de configuración.
  const EXCEPCIONES = new Set(["loginToGenerateQuestions", "cfgHowNote", "infStep1", "cfgGenerateBtn", "cfgGenerating"]);
  for (const [nombre, tx, patron] of [["es", es, /generan?do?\b.{0,20}\bsesi[óo]n/i], ["en", en, /generat(e|ing)\b.{0,20}\bsession\b/i]]) {
    const sospechosas = Object.entries(tx).filter(([k, v]) => typeof v === "string" && !EXCEPCIONES.has(k) && patron.test(v)).map(([k]) => k);
    assert.deepStrictEqual(sospechosas, [], `${nombre}: quedaron claves sin pasar de "generar" a "crear" la sesión: ${sospechosas.join(", ")}`);
  }
  filas.push({ caso: "ningún texto de es/en habla de \"generar\" la sesión (fuera de generar preguntas con IA)", esperado: "[]", obtenido: "[]" });
}

// ════ 6) "(obligatorio)" en gris; rojo solo tras un primer intento sin tema ════
t("el (obligatorio) del tema es rojo solo con intentoCrear && sin tema", true, /\(intentoCrear && !tema\.trim\(\)\) \? PALETA\.rojo : PALETA\.gris/.test(cfg));

// ════ 7) Lo que se manda a crearSesionArbitro no cambió (Etapa D es solo de interfaz) ════
{
  const iCrear = cfg.indexOf('"crearSesionArbitro");');
  const iCall = cfg.indexOf("await fn(", iCrear);
  const iInicioObj = cfg.indexOf("{", iCall);
  const iFinObj = cfg.indexOf(") as {", iCall);
  const objeto = cfg.slice(iInicioObj, iFinObj).trim().replace(/\s*,\s*$/, ""); // sin la coma/paréntesis final
  const ESPERADO = '{ area: areaConfig?.key ?? area, materia, nivel, anio, tema: tema.trim(), subtema: "", ejercicio, duracion, tiempoPregunta, textoFuente, permitirPreguntasPropias, idioma: idiomaSesion, modoMetacognicion, preguntasMetacognicion: preguntasParaGuardar(), modoRespuesta, verTextoDuranteJuego: !!textoFuente.trim() && verTextoDuranteJuego, criteriosCalificacion: criteriosParaGuardar() }';
  t("el objeto que se manda a crearSesionArbitro es carácter por carácter el mismo que antes de Etapa D", ESPERADO, objeto);
}

// ════ 8) El aviso de escrito con 1 minuto se ve con las opciones plegadas (vive en el paso 5, no dentro ════
//         del panel condicionado por opcionesAbierto, que recién abre en el paso 7) ════
{
  const iAviso = cfg.indexOf("cfgAnswerWrittenShortTimeWarning");
  const iPanelOpciones = cfg.indexOf('id="config-opciones-panel"');
  const iPaso6 = cfg.indexOf("<PasoLabel n={6}");
  assert.ok(iAviso > 0 && iAviso < iPaso6, "el aviso de 1 minuto tiene que estar en el paso 5, antes del paso 6");
  assert.ok(iAviso < iPanelOpciones, "el aviso de 1 minuto tiene que quedar fuera (antes) del panel plegable de opciones");
  filas.push({ caso: "aviso de escrito + 1 min: en el paso 5, fuera del panel plegable de opciones", esperado: "true", obtenido: "true" });
}

console.table(filas); console.log(`OK: ${filas.length} comprobaciones.`); process.exit(0);
