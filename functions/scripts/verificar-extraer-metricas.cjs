// Verifica extraer-metricas-arbitro.cjs con un Firestore simulado (sin red ni credenciales):
//  (1) los números salen bien con datos armados a mano, (2) el script es de solo lectura (no hay escrituras y el simulado las rechaza),
//  (3) solo pide campos no personales (select con lista blanca), (4) ni la consola ni el CSV contienen datos personales ni textos
//  (el simulado trae emails, nombres, integrantes, preguntas y respuestas de mentira), (5) el CSV tiene el desglose por fecha.
// Uso (desde functions/):  node scripts/verificar-extraer-metricas.cjs
const fs = require("fs");
const path = require("path");
const M = require("./extraer-metricas-arbitro.cjs");
let fallos = 0, total = 0;
const ok = (c, msg) => { total++; if (!c) { fallos++; console.error("  ✘ " + msg); } };

// ── Firestore simulado ──
const PII = ["docente.prueba@example.com", "Ana Pérez", "Luis Gómez", "integrante-secreto", "alumno-individual-secreto", "reflexion-individual-secreta", "pregunta-docente-secreta", "pregunta-secreta", "respuesta-secreta", "desacuerdo-secreto", "veredicto-secreto"];
const UID = { U1: "uid-docente-uno", U2: "uid-docente-dos", ADMIN: M.ADMIN_UID };
const docs = []; // { ruta: [col, id, col, id], data }
const add = (ruta, data) => docs.push({ ruta, data });
const S = (id, d) => add(["sesiones_arbitro", id], { preguntasMetacognicion: ["pregunta-docente-secreta", "otra pregunta-docente-secreta"], docenteEmail: "docente.prueba@example.com", textoFuente: "pregunta-secreta", tema: "desacuerdo-secreto", ...d });
S("S1", { area: "exactas", idioma: "es", creadoEn: "2026-10-01T15:00:00.000Z", docenteUid: UID.U1, informe: { generadoEn: "2026-10-02T10:00:00.000Z", resumenEjecutivo: "veredicto-secreto" } });
S("S2", { area: "lenguajes", idioma: "en", creadoEn: "2026-10-01T12:00:00.000Z", docenteUid: UID.U2 });
S("S3", { area: "sociales", creadoEn: "2026-10-02T01:30:00.000Z", docenteUid: UID.ADMIN }); // sin idioma; en Buenos Aires es el 1/10 a la noche
S("S4", { area: "arte", idioma: "es", creadoEn: "2026-10-03T12:00:00.000Z", docenteUid: null });
S("S5", { area: "exactas", idioma: "es", createdAt: "2026-10-04T12:00:00.000Z", docenteUid: UID.U1 });
const C = (sid, id, d) => add(["sesiones_arbitro", sid, "consultas", id], { desacuerdo: "desacuerdo-secreto", posicionA: "respuesta-secreta", veredicto: "veredicto-secreto", ...d });
C("S1", "c1", { resultado: "A", timestamp: "2026-10-01T15:10:00.000Z", tieneRazon: "pregunta" });
C("S1", "c2", { resultado: "fuera_de_tema", timestamp: "2026-10-01T15:12:00.000Z", tieneRazon: null });
C("S1", "c3", { resultado: "B", timestamp: "2026-10-01T15:20:00.000Z", tieneRazon: "responde" });
C("S2", "c4", { resultado: "ambas_correctas", timestamp: "2026-10-01T12:30:00.000Z", tieneRazon: "ambos" });
C("S3", "c5", { resultado: "A", timestamp: "2026-10-02T01:40:00.000Z" });
C("S3", "c6", { resultado: "B", timestamp: "2026-10-02T01:50:00.000Z" });
add(["otros", "X", "consultas", "ajena"], { resultado: "A", timestamp: "2026-10-01T10:00:00.000Z" }); // otra colección con el mismo nombre: no debe contarse
const R = (sid, id, d) => add(["sesiones_arbitro", sid, "rondas", id], { equipoPregunta: "Ana Pérez", equipoResponde: "Luis Gómez", pregunta: "pregunta-secreta", disputa: null, correccion: null, ...d });
R("S1", "r1", { partidaId: "P1AAAAAA", estado: "jugada", creadoEn: "2026-10-01T15:05:00.000Z", fueAlArbitro: false });
R("S1", "r2", { partidaId: "P1AAAAAA", estado: "jugada", creadoEn: "2026-10-01T15:10:00.000Z", fueAlArbitro: true, disputa: { resultado: "A", planteo: "desacuerdo-secreto", veredicto: "veredicto-secreto" }, correccion: { fecha: "2026-10-02T15:00:00.000Z", docenteUid: UID.U1 } });
R("S1", "r3", { partidaId: "P1AAAAAA", estado: "fuera_de_tema", creadoEn: "2026-10-01T15:12:00.000Z", fueAlArbitro: true, disputa: { resultado: "fuera_de_tema" } });
R("S1", "r4", { partidaId: "P1AAAAAA", estado: "pasada", creadoEn: "2026-10-01T15:15:00.000Z", fueAlArbitro: false });
R("S2", "r5", { partidaId: "P2BBBBBB", estado: "jugada", creadoEn: "2026-10-01T12:20:00.000Z", fueAlArbitro: false });
R("S2", "r6", { partidaId: "P2BBBBBB", estado: "jugada", creadoEn: "2026-10-01T12:30:00.000Z", fueAlArbitro: true, disputa: { resultado: "ambas_correctas" } });
// Los informes traen las estructuras nuevas (integrantes como array, reflexiones individuales por alumno, modo individual) además de las viejas:
// el extractor no debe leer ninguna.
const I = (sid, id, d) => add(["sesiones_arbitro", sid, "informes", id], {
  modoMetacognicion: "individual", preguntas: ["pregunta-docente-secreta"],
  equipos: [
    { nombre: "Ana Pérez", integrantes: ["integrante-secreto", "alumno-individual-secreto"], respuestas: { q1: "respuesta-secreta" },
      individuales: [{ alumno: "alumno-individual-secreto", respuestas: { q1: "reflexion-individual-secreta", q2: "", q3: "", q4: "" } }] },
    { nombre: "Luis Gómez", integrantes: "integrante-secreto", respuestas: { q1: "respuesta-secreta" } },
  ], ...d });
I("S1", "i1", { modo: "competitivo", partidaId: "P1AAAAAA", creadoEn: "2026-10-01T16:00:00.000Z" });
I("S2", "i2", { modo: "competitivo", partidaId: "P2BBBBBB", creadoEn: "2026-10-01T13:00:00.000Z" });
I("S2", "i3", { nombreAlumno: "Luis Gómez", respuestas: { q1: "respuesta-secreta" }, creadoEn: "2026-10-03T13:00:00.000Z" });

const selects = []; const llamadas = [];
function proyectar(data, campos) {
  const out = {};
  for (const c of campos) {
    const partes = c.split("."); let src = data, ok2 = true;
    for (const p of partes) { if (src && typeof src === "object" && p in src) src = src[p]; else { ok2 = false; break; } }
    if (!ok2) continue;
    let dst = out; for (let i = 0; i < partes.length - 1; i++) dst = dst[partes[i]] = dst[partes[i]] || {};
    dst[partes[partes.length - 1]] = src;
  }
  return out;
}
const mkDoc = (d, campos) => {
  const r = d.ruta;
  const refDe = (n) => ({ id: r[n - 1], parent: { id: r[n - 2], parent: n >= 3 ? refDe(n - 2) : null } });
  const ref = { id: r[r.length - 1], parent: { id: r[r.length - 2], parent: r.length >= 4 ? refDe(r.length - 2) : null } };
  return { id: r[r.length - 1], ref, data: () => proyectar(d.data, campos) };
};
const consulta = (filtro) => ({ select: (...campos) => { selects.push(campos); return { get: async () => ({ docs: docs.filter(filtro).map((d) => mkDoc(d, campos)) }) }; } });
const rechazar = (n) => () => { throw new Error("ESCRITURA PROHIBIDA: " + n); };
const db = {
  collection: (n) => { llamadas.push("collection:" + n); return { ...consulta((d) => d.ruta.length === 2 && d.ruta[0] === n), set: rechazar("set"), add: rechazar("add"), doc: rechazar("doc") }; },
  collectionGroup: (n) => { llamadas.push("collectionGroup:" + n); return consulta((d) => d.ruta.length >= 4 && d.ruta[d.ruta.length - 2] === n); },
  batch: rechazar("batch"), runTransaction: rechazar("runTransaction"),
};

(async () => {
  const datos = await M.leerDatos(db);
  ok(datos.sesiones.length === 5, "lee las 5 sesiones");
  ok(datos.consultas.length === 6, `solo cuenta las consultas de sesiones_arbitro (esperaba 6, hay ${datos.consultas.length})`);
  const m = M.calcular(datos, {});
  // sesiones
  ok(m.sesiones.total === 5, "total de sesiones = 5");
  ok(m.sesiones.porArea.get("exactas") === 2 && m.sesiones.porArea.get("lenguajes") === 1 && m.sesiones.porArea.get("sociales") === 1 && m.sesiones.porArea.get("arte") === 1, "sesiones por área");
  ok(m.sesiones.porIdioma.get("es") === 4 && m.sesiones.porIdioma.get("en") === 1, "sesiones por idioma (la sesión sin idioma cuenta como es)");
  ok(m.sesiones.idiomaSinCampo === 1, "avisa cuántas sesiones no tienen idioma");
  ok(m.sesiones.docentesDistintos === 3 && m.sesiones.sinDocente === 1, "docentes distintos = 3 y 1 sesión sin docente");
  ok(m.sesiones.delAdmin === 1 && m.sesiones.conInformeDeSesion === 1, "sesiones del admin = 1 e informes de sesión = 1");
  // consultas, rondas, veredictos, correcciones
  ok(m.consultas.total === 6 && m.consultas.oral === 3, `consultas 6 (3 orales con reparto): ${m.consultas.total}/${m.consultas.oral}`);
  ok(m.consultas.sesionesConConsultaSinRondas === 1, "detecta la sesión con consultas pero sin rondas (S3)");
  ok(m.rondas.total === 6 && m.rondas.partidas === 2, "6 rondas en 2 partidas");
  ok(m.rondas.veredictos === 3 && m.rondas.veredictosFueraDeTema === 1, "3 veredictos (1 fuera de tema)");
  ok(m.rondas.corregidas === 1 && m.rondas.pctCorregidas === 33.3, `1 corregida = 33,3 % (${m.rondas.pctCorregidas})`);
  ok(m.rondas.docentesQueCorrigieron === 1 && m.rondas.sesionesConCorrecciones === 1, "1 docente corrigió, en 1 sesión");
  ok(m.rondas.porEstado.get("jugada") === 4 && m.rondas.porEstado.get("pasada") === 1 && m.rondas.porEstado.get("fuera_de_tema") === 1, "rondas por estado");
  ok(m.metacognicion.total === 3 && m.metacognicion.competitivo === 2 && m.metacognicion.individual === 1, "metacognición: 3 (2 competitivos, 1 individual)");
  ok(m.metacognicion.partidasConInforme === 2 && m.metacognicion.sesionesConInforme === 2, "partidas y sesiones con informe");
  // fecha en hora de Buenos Aires
  const f1 = m.porFecha.find((d) => d.fecha === "2026-10-01");
  ok(f1 && f1.sesiones === 3, `el 1/10 hay 3 sesiones (S3 cuenta el 1/10 en hora local): ${f1 && f1.sesiones}`);
  ok(f1 && f1.rondas === 6 && f1.veredictos === 3 && f1.partidas === 2 && f1.consultas === 6 && f1.informes === 2, "desglose del 1/10");
  const f2 = m.porFecha.find((d) => d.fecha === "2026-10-02");
  ok(f2 && f2.correcciones === 1, "la corrección figura el día en que se hizo (2/10)");
  ok(m.porFecha.length === 4 && m.porFecha[0].fecha === "2026-10-01" && m.porFecha[3].fecha === "2026-10-04", "rango de fechas 1/10 → 4/10 en orden (S5 usa createdAt)");
  // filtros
  const sinAdmin = M.calcular(datos, { sinAdmin: true });
  ok(sinAdmin.sesiones.total === 4 && sinAdmin.sesiones.docentesDistintos === 2 && sinAdmin.consultas.total === 4, "--sin-admin saca la sesión del admin y sus consultas");
  const desde = M.calcular(datos, { desde: "2026-10-03" });
  ok(desde.sesiones.total === 2 && desde.rondas.total === 0, "--desde=2026-10-03 deja las 2 sesiones posteriores");
  // dato que no existe: cero y sin inventar
  const vacio = M.calcular({ sesiones: [], consultas: [], rondas: [], informes: [] }, {});
  ok(vacio.rondas.pctCorregidas === null && M.formatear(vacio).includes("sin veredictos"), "sin veredictos no calcula un porcentaje inventado");
  // salida: sin datos personales
  const texto = M.formatear(m), csv = M.aCsv(m);
  for (const p of [...PII, ...Object.values(UID), "S1", "S2", "P1AAAAAA", "P2BBBBBB"]) {
    ok(!texto.includes(p), `la consola no debe contener «${p}»`);
    ok(!csv.includes(p), `el CSV no debe contener «${p}»`);
  }
  ok(!/@/.test(texto + csv), "ni la consola ni el CSV contienen emails");
  ok(csv.split("\n")[0] === M.COLUMNAS.join(","), "el CSV tiene la fila de encabezados");
  ok(csv.trim().split("\n").length === 1 + m.porFecha.length, "el CSV tiene una fila por fecha");
  ok(/NO SE PUEDEN SACAR/.test(texto) && /no se guardan/i.test(texto), "la salida dice qué datos no se guardan");
  // solo lectura y solo campos no personales
  const PERMITIDOS = new Set(["area", "idioma", "creadoEn", "createdAt", "docenteUid", "informe.generadoEn", "resultado", "timestamp", "tieneRazon", "partidaId", "estado", "fueAlArbitro", "disputa.resultado", "correccion.fecha", "modo"]);
  const pedidos = new Set(selects.flat());
  ok(selects.length === 4, "hace exactamente 4 consultas select");
  for (const c of pedidos) ok(PERMITIDOS.has(c), `campo pedido fuera de la lista blanca: ${c}`);
  for (const prohibido of ["docenteEmail", "equipos", "respuestas", "pregunta", "textoFuente", "tema", "desacuerdo", "posicionA", "veredicto", "nombreAlumno", "integrantes", "individuales", "modoMetacognicion", "alumno", "preguntasMetacognicion", "preguntas", "disputa", "correccion"]) ok(!pedidos.has(prohibido), `no debe pedir el campo «${prohibido}»`);
  ok(llamadas.every((l) => /^collection(Group)?:/.test(l)), "solo usa collection / collectionGroup");
  const fuente = fs.readFileSync(path.join(__dirname, "extraer-metricas-arbitro.cjs"), "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  ok(!/\.(update|delete|create|doc|batch|runTransaction|bulkWriter|recursiveDelete)\s*\(/.test(fuente), "el código no contiene escrituras a Firestore (update, delete, create, doc, batch, transaction…)");
  ok(!/(\bdb|\bref|\bdoc|\bcollection\([^)]*\)|\bfirestore\(\))\s*\.(set|add)\s*\(/.test(fuente), "el código no llama set/add sobre Firestore");
  ok(!/console\.(log|error)\([^)]*(email|docenteEmail|uid\b)/i.test(fuente), "ningún console.log imprime emails ni uids");
  console.log(fallos ? `\nFALLÓ: ${fallos} de ${total} comprobaciones` : `OK: ${total} comprobaciones (conteos, hora local, solo lectura, campos permitidos, sin datos personales en consola ni CSV).`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error("ERROR en la verificación:", e); process.exit(1); });
