// Comprobación en PRODUCCIÓN de la Etapa 2 (revisión con IA de las respuestas sin disputa) de los Árbitros de
// Aprendizaje, para correr después de un deploy, sobre sesiones de prueba puntuales.
//
// SOLO LECTURA: únicamente hace get() / select() sobre Firestore (vía leerSesion/leerRondas/leerRevisiones/
// leerRevisionesVacio, abajo); nunca escribe, actualiza ni borra nada.
//
// ALCANCE: solo lee las sesiones (sesiones_arbitro/{id}) cuyo id se pasa por línea de comandos — nunca hace un
// query ni un collectionGroup sobre toda la base. Si no se pasa ningún id, no toca Firestore: imprime el uso y
// termina. No hace falta decir cuáles son de modo escrito y cuáles orales: el script lee el campo modoRespuesta
// de cada una y aplica las comprobaciones que correspondan.
//
// DATOS PERSONALES: no imprime preguntas, respuestas, nombres de equipo, explicaciones de la IA ni notas del
// docente. Hace falta LEER pregunta/respuesta/nota (para medir longitud y saltos de línea, y para alimentar
// rondasFaltantesParaRevisar, que los usa igual que en producción), pero el script los convierte a un booleano
// apenas los lee y nunca los imprime ni los guarda en ningún lado; nombres de equipo (equipoPregunta/
// equipoResponde) directamente no se piden a Firestore (no hacen falta para ninguna comprobación). Lo único que
// se imprime son ids de sesión/partida/ronda (son ids generados por el sistema, no nombres) y conteos/booleanos.
//
// Reusa el MISMO código de producción que corren las Cloud Functions, compilado en functions/lib/ (no reimplementa
// ninguna regla propia): rondasFaltantesParaRevisar, esNoRevisable, compararConOtroEquipo, VEREDICTOS_IA
// (arbitroRevision.js) y normalizarModoRespuesta (arbitroIntegrantes.js). Son módulos puros (sin Firestore ni
// Cloud Functions de por medio), así que se pueden requerir directo sin mockear nada.
//
// Uso (desde functions/, después de "npm run build"):
//   node scripts/comprobar-etapa2-produccion.cjs SESSION_ID [SESSION_ID...]
// Credenciales: las de Google por defecto (gcloud auth application-default login, o GOOGLE_APPLICATION_CREDENTIALS).
//
// A propósito NO se llama verificar-*.cjs: no es parte de la batería de regresión (necesita credenciales y datos
// reales de producción, no el Firestore simulado que usan los verificar-*.cjs).
"use strict";

const PROYECTO = "traffic-ligths-game";

const { rondasFaltantesParaRevisar, esNoRevisable, compararConOtroEquipo, VEREDICTOS_IA } = require("../lib/arbitroRevision.js");
const { normalizarModoRespuesta } = require("../lib/arbitroIntegrantes.js");

// ── Reporte de comprobaciones (mismo estilo que los verificar-*.cjs, pero sin "assert": una comprobación que
// falla queda registrada y se sigue con las demás, para ver el estado completo de una corrida real) ──────────
const filas = [];
function c(etiqueta, ok, detalle) {
  filas.push({ etiqueta, resultado: ok ? "OK" : "FALLÓ", detalle: detalle || "" });
}

// ── Lectura (solo get/select) ────────────────────────────────────────────────────────────────────────────
async function leerSesion(db, id) {
  const ref = db.collection("sesiones_arbitro").doc(id);
  const snap = await ref.get();
  return { ref, existe: snap.exists, datos: snap.exists ? snap.data() : null };
}

// Campos pedidos: ni equipoPregunta ni equipoResponde (nombres de equipo) — no hacen falta para ninguna
// comprobación, así que ni se piden. pregunta/respuesta sí hace falta leerlos (longitud, saltos de línea, y
// para alimentar rondasFaltantesParaRevisar), pero se convierten a booleano antes de volver de esta función.
async function leerRondas(sessionRef) {
  const snap = await sessionRef.collection("rondas")
    .select("partidaId", "ronda", "pregunta", "respuesta", "calificacion", "estado", "fueAlArbitro", "disputa", "correccion")
    .get();
  return snap.docs.map((d) => {
    const x = d.data();
    const pregunta = typeof x.pregunta === "string" ? x.pregunta : "";
    const respuesta = typeof x.respuesta === "string" ? x.respuesta : "";
    return {
      id: d.id,
      partidaId: x.partidaId ?? null,
      ronda: x.ronda ?? null,
      fueAlArbitro: !!x.fueAlArbitro,
      tieneDisputa: !!x.disputa,
      tieneCorreccion: !!x.correccion,
      calificacion: x.calificacion ?? null,
      estado: x.estado ?? null,
      tienePregunta: pregunta.trim().length > 0,
      tieneRespuesta: respuesta.trim().length > 0,
      respuestaConSalto: respuesta.includes("\n"),
      // Para rondasFaltantesParaRevisar (la función real): necesita el texto para hacer .trim(). No se imprime
      // en ningún lado — solo se usa para calcular longitudes de arrays más abajo.
      _respuesta: respuesta,
    };
  });
}

async function leerRevisiones(sessionRef) {
  const snap = await sessionRef.collection("revisiones").get();
  const porPartida = {};
  for (const d of snap.docs) porPartida[d.id] = d.data();
  return porPartida;
}

// Objeto mínimo que rondasFaltantesParaRevisar necesita de cada ronda (id, fueAlArbitro, respuesta, calificacion;
// el resto de su salida — ronda/equipoPregunta/equipoResponde/pregunta — no se usa acá, nunca se imprime).
const paraFiltro = (r) => ({ id: r.id, fueAlArbitro: r.fueAlArbitro, respuesta: r._respuesta, calificacion: r.calificacion, ronda: r.ronda });

// ── Comprobaciones (puras: reciben los datos ya leídos, nunca tocan Firestore) ──────────────────────────────

// 1) Sesión oral: modoRespuesta normaliza a "oral". Desde la Etapa 3 (nota general del docente por partida, en
// los DOS modos), un documento revisiones/{partidaId} SÍ puede existir en una sesión oral — con solo el campo
// notaGeneral, si el docente dejó una nota — porque guardarNotaPartidaArbitro escribe ahí en cualquier modo. Lo
// que NO puede pasar en modo oral es que un documento tenga observaciones o intentos: revisarPartidaArbitro (la
// revisión con IA) nunca corre en modo oral (el panel solo la dispara en modo escrito), así que esos dos campos
// solo pueden venir de ahí.
function comprobarSesionOral(id, datos, revisiones) {
  const modo = normalizarModoRespuesta(datos.modoRespuesta);
  c(`[${id}] sesión oral: modoRespuesta normaliza a "oral"`, modo === "oral", `valor crudo: ${JSON.stringify(datos.modoRespuesta ?? null)}`);
  const pids = Object.keys(revisiones);
  const conObservacionesOIntentos = pids.filter((pid) => {
    const rev = revisiones[pid] || {};
    return Object.keys(rev.observaciones || {}).length > 0 || Object.keys(rev.intentos || {}).length > 0;
  });
  c(`[${id}] sesión oral: ningún documento revisiones/ tiene observaciones ni intentos (solo pueden tener notaGeneral)`,
    conObservacionesOIntentos.length === 0, `${conObservacionesOIntentos.length} de ${pids.length} documentos: ${conObservacionesOIntentos.join(", ")}`);
  // Diagnóstico (no es un chequeo pasa/falla): cuántas partidas tienen nota general. Nunca se imprime la nota
  // en sí, solo si está presente (igual criterio de privacidad que el resto del script).
  const conNotaGeneral = pids.filter((pid) => typeof (revisiones[pid] || {}).notaGeneral === "string" && revisiones[pid].notaGeneral.trim());
  c(`[${id}] sesión oral: partidas con nota general del docente`, true, `${conNotaGeneral.length} de ${pids.length} documentos revisiones/`);
}

// 2–5) Sesión escrita: rondas, revisiones/{partidaId} por partida, acciones del docente a nivel de sesión, y
// rondasFaltantesParaRevisar sobre el estado real no debe dejar nada pendiente.
function comprobarSesionEscrita(id, datos, rondas, revisiones) {
  const modo = normalizarModoRespuesta(datos.modoRespuesta);
  c(`[${id}] sesión escrita: modoRespuesta normaliza a "escrita"`, modo === "escrita", `valor crudo: ${JSON.stringify(datos.modoRespuesta ?? null)}`);

  // ── 2) Rondas ──
  // "pasada" (el equipo pasó la pregunta) y "fuera_de_tema" quedan afuera: en esos dos casos el juego NUNCA
  // guarda una respuesta (ver pasarPregunta/registrarFueraDeTema en ArbitroJuegoPage.tsx) — es el mismo criterio
  // que ya usa rondasFaltantesParaRevisar para no pedirles revisión. Exigirles respuesta acá sería un falso
  // positivo del script, no un problema real de los datos.
  const debenTenerRespuesta = rondas.filter((r) => r.calificacion !== "pasada" && r.calificacion !== "fuera_de_tema");
  const sinRespuesta = debenTenerRespuesta.filter((r) => !r.tieneRespuesta);
  c(`[${id}] todas las rondas que corresponde tienen respuesta (${debenTenerRespuesta.length} de ${rondas.length}; se excluyen pasada/fuera_de_tema)`, sinRespuesta.length === 0, `${sinRespuesta.length} sin respuesta: ${sinRespuesta.map((r) => r.id).join(", ")}`);

  const sinDisputa = rondas.filter((r) => !r.tieneDisputa);
  const incompletas = sinDisputa.filter((r) => !r.tienePregunta || !r.calificacion);
  c(`[${id}] rondas sin disputa (${sinDisputa.length}) tienen pregunta y calificación`, incompletas.length === 0, `${incompletas.length} incompletas: ${incompletas.map((r) => r.id).join(", ")}`);

  c(`[${id}] al menos una respuesta conserva saltos de línea`, rondas.some((r) => r.respuestaConSalto));

  // ── Agrupa por partida para 3) y 5); acumula estados del docente para 4) a nivel de sesión ──
  const porPartida = new Map();
  for (const r of rondas) {
    if (!porPartida.has(r.partidaId)) porPartida.set(r.partidaId, []);
    porPartida.get(r.partidaId).push(r);
  }
  const porEstadoDocente = { pendiente: 0, confirmada: 0, corregida: 0, descartada: 0 };
  const corregidasSinNota = [];
  // Etapa 3: el servidor exige veredictoDocente en TODO "corregir" nuevo (revisarObservacionArbitro) — una
  // observación corregida sin este campo es un dato LEGADO (de antes de esta etapa, como la de la sesión
  // YVBRKD) que el docente todavía no completó, y por eso no entra al PDF del curso (ver comparacionEfectiva en
  // arbitroRevision.ts, que le da null hasta que se complete).
  const corregidasSinVeredicto = [];
  let partidasConNotaGeneral = 0;

  for (const [pid, rondasDePartida] of porPartida) {
    const etq = `[${id}/${pid}]`;
    const candidatas = rondasFaltantesParaRevisar(rondasDePartida.map(paraFiltro), {}, {}); // sin exclusiones: TODO lo que calificaría como revisable
    const idsCandidatas = new Set(candidatas.map((x) => x.rondaId));
    const idsRondasDePartida = new Set(rondasDePartida.map((r) => r.id));
    const rev = revisiones[pid];

    // ── Volcado de claves (diagnóstico, para comparar a mano — pedido del docente después del 404/not-found
    // real: "la observación existe... pero el panel la pide con una clave distinta de la que se usó para
    // guardarla"). Son ids generados por el sistema (nunca texto de pregunta/respuesta/nombres), no hay
    // problema en imprimirlos completos. Siempre se imprime (resultado "OK"): no es un chequeo pasa/falla,
    // es el dato crudo para diferenciar a ojo rondaId/partidaId del panel contra lo guardado.
    const rondaIdsDelPanel = [...idsRondasDePartida].sort();
    c(`${etq} rondaId que tiene el panel para esta partida (${rondaIdsDelPanel.length})`, true, rondaIdsDelPanel.join(", ") || "(ninguna)");

    if (!rev) {
      // Sin documento revisiones/{pid}: válido solo si esta partida no tenía nada revisable (p.ej. todas con
      // disputa). Si tenía candidatas pero no hay documento, es una falla real.
      c(`${etq} tiene revisiones/ (o esta partida no tenía ninguna ronda revisable)`, idsCandidatas.size === 0, `${idsCandidatas.size} rondas revisables sin ningún documento revisiones/`);
      continue;
    }

    const observaciones = rev.observaciones || {};
    const intentos = rev.intentos || {};
    const idsConObservacion = new Set(Object.keys(observaciones));
    c(`${etq} id del documento revisiones/ (= partidaId)`, true, pid);
    c(`${etq} claves de observaciones guardadas (${idsConObservacion.size})`, true, [...idsConObservacion].sort().join(", ") || "(ninguna)");

    c(`${etq} estado "lista" (enProgreso liberado, sin corrida trabada)`, rev.enProgreso == null, `enProgreso=${JSON.stringify(rev.enProgreso ?? null)}`);

    const sinObservacion = [...idsCandidatas].filter((rid) => !idsConObservacion.has(rid));
    c(`${etq} cada ronda revisable (${idsCandidatas.size}) tiene una observación`, sinObservacion.length === 0, `${sinObservacion.length} sin observación: ${sinObservacion.join(", ")}`);

    const deMas = [...idsConObservacion].filter((rid) => !idsCandidatas.has(rid));
    const ajenas = deMas.filter((rid) => !idsRondasDePartida.has(rid));
    const indebidas = deMas.filter((rid) => idsRondasDePartida.has(rid)); // ronda real, pero con disputa/pasada/fuera_de_tema
    c(`${etq} ninguna observación en rondas con disputa, pasadas o fuera de tema`, indebidas.length === 0, `${indebidas.length}: ${indebidas.join(", ")}`);
    c(`${etq} ningún rondaId ajeno en observaciones (no pertenece a esta partida)`, ajenas.length === 0, `${ajenas.length}: ${ajenas.join(", ")}`);

    const veredictosInvalidos = Object.entries(observaciones).filter(([, o]) => !VEREDICTOS_IA.includes(o.veredictoIA));
    c(`${etq} todos los veredictoIA son completa/incompleta/no`, veredictosInvalidos.length === 0, `${veredictosInvalidos.length}: ${veredictosInvalidos.map(([rid]) => rid).join(", ")}`);

    const porId = new Map(rondasDePartida.map((r) => [r.id, r]));
    const comparacionDistinta = Object.entries(observaciones).filter(([rid, o]) => {
      const ronda = porId.get(rid);
      if (!ronda || !VEREDICTOS_IA.includes(o.veredictoIA)) return false; // ya se cuentan arriba (ajena / veredicto inválido)
      return compararConOtroEquipo(ronda.calificacion, o.veredictoIA) !== o.comparacion;
    });
    c(`${etq} el tipo guardado coincide con recalcularlo (veredicto + calificación del otro equipo)`, comparacionDistinta.length === 0, `${comparacionDistinta.length}: ${comparacionDistinta.map(([rid]) => rid).join(", ")}`);

    const conIntentos = Object.keys(intentos).length;
    c(`${etq} sin intentos acumulados`, conIntentos === 0, `${conIntentos} rondas con intentos`);
    const marcadasNoRevisables = rondasDePartida.filter((r) => esNoRevisable(intentos[r.id])).length;
    c(`${etq} sin rondas marcadas no revisables`, marcadasNoRevisables === 0, `${marcadasNoRevisables}`);

    for (const [rid, o] of Object.entries(observaciones)) {
      if (porEstadoDocente[o.estadoDocente] !== undefined) porEstadoDocente[o.estadoDocente]++;
      if (o.estadoDocente === "corregida" && !(typeof o.notaDocente === "string" && o.notaDocente.trim())) corregidasSinNota.push(true);
      if (o.estadoDocente === "corregida" && !VEREDICTOS_IA.includes(o.veredictoDocente)) corregidasSinVeredicto.push(rid);
    }
    if (typeof rev.notaGeneral === "string" && rev.notaGeneral.trim()) partidasConNotaGeneral++;

    // ── 5) rondasFaltantesParaRevisar con el estado REAL no deja nada pendiente en esta partida ──
    const pendientesReal = rondasFaltantesParaRevisar(rondasDePartida.map(paraFiltro), observaciones, intentos);
    c(`${etq} rondasFaltantesParaRevisar no deja ninguna ronda pendiente`, pendientesReal.length === 0, `${pendientesReal.length} pendientes: ${pendientesReal.map((r) => r.rondaId).join(", ")}`);
  }

  // ── Documentos revisiones/{partidaId} que NO corresponden a ninguna partida con rondas en esta sesión
  // (huérfanos: de una partida vieja, o guardados con un partidaId que no es el de ninguna ronda real).
  // Esto es justo lo que un panel desactualizado podría seguir mostrando si guardó el pid en memoria antes de
  // que cambiara: el bucle de arriba nunca los ve porque solo recorre partidas con rondas.
  const pidsHuerfanos = Object.keys(revisiones).filter((pid) => !porPartida.has(pid));
  c(`[${id}] documentos revisiones/ sin ninguna ronda real de esta sesión (huérfanos)`, pidsHuerfanos.length === 0,
    pidsHuerfanos.length === 0 ? "" : `${pidsHuerfanos.length}: ${pidsHuerfanos.map((pid) => `${pid} (observaciones: ${Object.keys(revisiones[pid].observaciones || {}).sort().join(", ") || "ninguna"})`).join(" | ")}`);

  // ── 4) Revisión del docente, a nivel de sesión (confirmar/corregir/descartar pueden haberse hecho en
  // cualquier partida de la sesión) ──
  c(`[${id}] hay al menos una observación confirmada`, porEstadoDocente.confirmada > 0, `confirmada=${porEstadoDocente.confirmada}`);
  c(`[${id}] hay al menos una observación corregida`, porEstadoDocente.corregida > 0, `corregida=${porEstadoDocente.corregida}`);
  c(`[${id}] hay al menos una observación descartada`, porEstadoDocente.descartada > 0, `descartada=${porEstadoDocente.descartada}`);
  c(`[${id}] toda observación corregida tiene nota`, corregidasSinNota.length === 0, `${corregidasSinNota.length} sin nota`);
  c(`[${id}] toda observación corregida tiene veredictoDocente (si no, queda pendiente de completar y no entra al PDF del curso)`,
    corregidasSinVeredicto.length === 0, `${corregidasSinVeredicto.length}: ${corregidasSinVeredicto.join(", ")}`);
  // Diagnóstico (no es un chequeo pasa/falla): cuántas partidas tienen nota general. Nunca se imprime la nota
  // en sí, solo si está presente.
  c(`[${id}] partidas con nota general del docente`, true, `${partidasConNotaGeneral} de ${porPartida.size}`);
}

// ── Orquestación ─────────────────────────────────────────────────────────────────────────────────────────
async function comprobarSesion(db, id) {
  const { ref, existe, datos } = await leerSesion(db, id);
  if (!existe) {
    c(`[${id}] la sesión existe`, false);
    return;
  }
  const modo = normalizarModoRespuesta(datos.modoRespuesta);
  // Etapa 3: en los dos modos, revisiones/ puede tener documentos (nota general del docente); se lee completo
  // en los dos casos, con la misma leerRevisiones.
  const revisiones = await leerRevisiones(ref);
  if (modo === "oral") {
    comprobarSesionOral(id, datos, revisiones);
  } else {
    const rondas = await leerRondas(ref);
    comprobarSesionEscrita(id, datos, rondas, revisiones);
  }
}

async function main() {
  const ids = process.argv.slice(2).filter((a) => a.trim());
  if (ids.length === 0) {
    console.error("Uso: node scripts/comprobar-etapa2-produccion.cjs SESSION_ID [SESSION_ID...]");
    console.error("No se pasó ningún id: no se tocó Firestore.");
    process.exit(2);
  }

  const admin = require("firebase-admin");
  admin.initializeApp({ projectId: PROYECTO });
  const db = admin.firestore();

  for (const id of ids) {
    await comprobarSesion(db, id);
  }

  console.table(filas);
  const fallaron = filas.filter((f) => f.resultado === "FALLÓ");
  if (fallaron.length > 0) {
    console.log(`FALLARON ${fallaron.length} de ${filas.length} comprobaciones.`);
    process.exit(1);
  }
  console.log(`OK: ${filas.length} comprobaciones, sobre ${ids.length} sesión(es).`);
  process.exit(0);
}

module.exports = { leerSesion, leerRondas, leerRevisiones, comprobarSesionOral, comprobarSesionEscrita, filas, paraFiltro };
if (require.main === module) main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
