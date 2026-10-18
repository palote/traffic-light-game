// Extractor de métricas de uso de los Árbitros de Aprendizaje (Firestore, proyecto traffic-ligths-game).
// SOLO LECTURA: únicamente hace get() / select() sobre Firestore; no escribe, no actualiza y no borra nada.
// DATOS PERSONALES: solo calcula y muestra conteos agregados. No lee ni imprime nombres, integrantes, emails, uids, ids de sesión,
// preguntas, respuestas ni textos de las partidas: las consultas piden solamente campos sueltos (fechas, estados, enumeraciones).
//
// Esquema que lee (ver functions/src/index.ts y arbitroRondas.ts):
//   sesiones_arbitro/{id}            area, idioma, creadoEn, docenteUid, informe.generadoEn (informe de sesión para el docente)
//   sesiones_arbitro/{id}/consultas  cada consulta al árbitro: resultado, timestamp, tieneRazon (si fue del juego oral)
//   sesiones_arbitro/{id}/rondas     cada ronda registrada: partidaId, estado, creadoEn, disputa.resultado (veredicto), correccion.fecha
//   sesiones_arbitro/{id}/informes   metacognición enviada: creadoEn, modo, partidaId
//
// Uso (desde functions/):  node scripts/extraer-metricas-arbitro.cjs [--sin-admin] [--desde=AAAA-MM-DD] [--hasta=AAAA-MM-DD] [--sin-csv]
// Credenciales: las de Google por defecto (gcloud auth application-default login, o GOOGLE_APPLICATION_CREDENTIALS).
const fs = require("fs");
const path = require("path");

const PROYECTO = "traffic-ligths-game";
const ADMIN_UID = "P2lU12xoCxMkZ0AdZdMoGGksJ5o1"; // cuenta de administración (ADMIN_UID_ARBITRO en functions/src/index.ts): sus sesiones suelen ser pruebas
const ZONA = "America/Argentina/Buenos_Aires";
const SALIDA = path.join(__dirname, "salida");

// ── Lectura (solo get) ────────────────────────────────────────────────────────
// Cada consulta pide únicamente los campos necesarios (select): los textos y los nombres nunca salen de Firestore.
async function leerDatos(db) {
  const idSesion = (d) => d.ref.parent.parent.id;
  const deSesiones = (d) => d.ref.parent.parent.parent.id === "sesiones_arbitro"; // los collectionGroup pueden coincidir con otras colecciones del proyecto
  const sesSnap = await db.collection("sesiones_arbitro").select("area", "idioma", "creadoEn", "createdAt", "docenteUid", "informe.generadoEn").get();
  const sesiones = sesSnap.docs.map((d) => { const x = d.data(); return { id: d.id, area: x.area ?? null, idioma: x.idioma ?? null, fecha: x.creadoEn || x.createdAt || null, uid: x.docenteUid ?? null, informeSesion: !!(x.informe && x.informe.generadoEn) }; });
  const conSnap = await db.collectionGroup("consultas").select("resultado", "timestamp", "tieneRazon").get();
  const consultas = conSnap.docs.filter(deSesiones).map((d) => { const x = d.data(); return { sid: idSesion(d), fecha: x.timestamp || null, resultado: x.resultado ?? null, oral: x.tieneRazon !== undefined && x.tieneRazon !== null }; });
  const ronSnap = await db.collectionGroup("rondas").select("partidaId", "estado", "creadoEn", "fueAlArbitro", "disputa.resultado", "correccion.fecha").get();
  const rondas = ronSnap.docs.filter(deSesiones).map((d) => { const x = d.data(); return { sid: idSesion(d), partidaId: x.partidaId ?? null, estado: x.estado ?? null, fecha: x.creadoEn || null, veredicto: !!x.disputa, resultado: x.disputa ? (x.disputa.resultado ?? "") : null, corregida: !!x.correccion, fechaCorreccion: x.correccion ? (x.correccion.fecha ?? null) : null }; });
  const infSnap = await db.collectionGroup("informes").select("creadoEn", "modo", "partidaId").get();
  const informes = infSnap.docs.filter(deSesiones).map((d) => { const x = d.data(); return { sid: idSesion(d), fecha: x.creadoEn || null, modo: x.modo ?? null, partidaId: x.partidaId ?? null }; });
  return { sesiones, consultas, rondas, informes };
}

// ── Cálculo (puro: recibe arreglos de objetos simples) ───────────────────────
const fechaLocal = (iso, zona = ZONA) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};
const contar = (arr, clave) => { const m = new Map(); for (const x of arr) { const k = clave(x); m.set(k, (m.get(k) || 0) + 1); } return m; };
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

function calcular(datos, opciones = {}) {
  const zona = opciones.zona || ZONA;
  const adminUid = opciones.adminUid ?? ADMIN_UID;
  const f = (iso) => fechaLocal(iso, zona);
  const sesionesTodas = datos.sesiones;
  const delAdmin = sesionesTodas.filter((s) => s.uid === adminUid).length;
  let sesiones = sesionesTodas;
  if (opciones.sinAdmin) sesiones = sesiones.filter((s) => s.uid !== adminUid);
  if (opciones.desde) sesiones = sesiones.filter((s) => (f(s.fecha) ?? "") >= opciones.desde);
  if (opciones.hasta) sesiones = sesiones.filter((s) => (f(s.fecha) ?? "9999") <= opciones.hasta);
  const ids = new Set(sesiones.map((s) => s.id));
  const consultas = datos.consultas.filter((x) => ids.has(x.sid));
  const rondas = datos.rondas.filter((x) => ids.has(x.sid));
  const informes = datos.informes.filter((x) => ids.has(x.sid));
  const uidDeSesion = new Map(sesiones.map((s) => [s.id, s.uid]));

  const m = { opciones: { sinAdmin: !!opciones.sinAdmin, desde: opciones.desde || null, hasta: opciones.hasta || null, zona } };
  m.sesiones = {
    total: sesiones.length,
    delAdmin,
    sinFecha: sesiones.filter((s) => !f(s.fecha)).length,
    porArea: contar(sesiones, (s) => s.area || "(sin área)"),
    porIdioma: contar(sesiones, (s) => (s.idioma === "en" ? "en" : "es")),
    idiomaSinCampo: sesiones.filter((s) => s.idioma !== "es" && s.idioma !== "en").length,
    sinDocente: sesiones.filter((s) => !s.uid).length,
    docentesDistintos: new Set(sesiones.filter((s) => s.uid).map((s) => s.uid)).size,
    conInformeDeSesion: sesiones.filter((s) => s.informeSesion).length,
  };
  const veredictos = rondas.filter((r) => r.veredicto);
  const corregidas = rondas.filter((r) => r.corregida);
  const sesConConsulta = new Set(consultas.map((c) => c.sid));
  const sesConRonda = new Set(rondas.map((r) => r.sid));
  m.consultas = {
    total: consultas.length,
    oral: consultas.filter((c) => c.oral).length,
    sesionesConConsulta: sesConConsulta.size,
    sesionesConConsultaSinRondas: [...sesConConsulta].filter((id) => !sesConRonda.has(id)).length,
  };
  const partidas = new Set(rondas.filter((r) => r.partidaId).map((r) => r.partidaId));
  m.rondas = {
    total: rondas.length,
    partidas: partidas.size,
    sesionesConRondas: sesConRonda.size,
    porEstado: contar(rondas, (r) => r.estado || "(sin estado)"),
    veredictos: veredictos.length,
    veredictosPorResultado: contar(veredictos, (r) => r.resultado || "(sin resultado)"),
    veredictosFueraDeTema: veredictos.filter((r) => r.resultado === "fuera_de_tema").length,
    corregidas: corregidas.length,
    pctCorregidas: pct(corregidas.length, veredictos.length),
    sesionesConCorrecciones: new Set(corregidas.map((r) => r.sid)).size,
    docentesQueCorrigieron: new Set(corregidas.map((r) => uidDeSesion.get(r.sid)).filter(Boolean)).size,
  };
  const comp = informes.filter((i) => i.modo === "competitivo");
  const indiv = informes.filter((i) => i.modo !== "competitivo");
  m.metacognicion = {
    total: informes.length,
    competitivo: comp.length,
    individual: indiv.length,
    sesionesConInforme: new Set(informes.map((i) => i.sid)).size,
    partidasConInforme: new Set(comp.filter((i) => i.partidaId).map((i) => i.partidaId)).size,
  };

  // Desglose por fecha (cada evento en el día en que ocurrió, hora de Buenos Aires)
  const dias = new Map();
  const dia = (k) => { if (!dias.has(k)) dias.set(k, { fecha: k, sesiones: 0, docentes: new Set(), consultas: 0, rondas: 0, veredictos: 0, correcciones: 0, partidas: new Map(), informes: 0 }); return dias.get(k); };
  for (const s of sesiones) { const k = f(s.fecha); if (!k) continue; const d = dia(k); d.sesiones++; if (s.uid) d.docentes.add(s.uid); }
  for (const c of consultas) { const k = f(c.fecha); if (k) dia(k).consultas++; }
  for (const r of rondas) {
    const k = f(r.fecha); if (!k) continue;
    const d = dia(k); d.rondas++; if (r.veredicto) d.veredictos++;
    if (r.partidaId && (!d.partidas.has(r.partidaId))) d.partidas.set(r.partidaId, true);
  }
  for (const r of corregidas) { const k = f(r.fechaCorreccion); if (k) dia(k).correcciones++; }
  for (const i of informes) { const k = f(i.fecha); if (k) dia(k).informes++; }
  // «partidas» por día: cada partida se cuenta en el día de su PRIMERA ronda
  const primeraRonda = new Map();
  for (const r of rondas) if (r.partidaId && f(r.fecha) && (!primeraRonda.has(r.partidaId) || f(r.fecha) < primeraRonda.get(r.partidaId))) primeraRonda.set(r.partidaId, f(r.fecha));
  const partidasPorDia = contar([...primeraRonda.values()], (k) => k);
  m.porFecha = [...dias.values()].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map((d) => ({
    fecha: d.fecha, sesiones: d.sesiones, docentes: d.docentes.size, consultas: d.consultas, rondas: d.rondas, veredictos: d.veredictos,
    correcciones: d.correcciones, partidas: partidasPorDia.get(d.fecha) || 0, informes: d.informes,
  }));
  m.rangoFechas = m.porFecha.length ? [m.porFecha[0].fecha, m.porFecha[m.porFecha.length - 1].fecha] : null;
  return m;
}

// ── Salida ───────────────────────────────────────────────────────────────────
const lista = (mapa) => [...mapa.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—";
function formatear(m) {
  const L = [];
  const s = m.sesiones, c = m.consultas, r = m.rondas, g = m.metacognicion;
  L.push("MÉTRICAS DE USO · ÁRBITROS DE APRENDIZAJE (solo conteos agregados)");
  L.push(`Filtros: ${m.opciones.sinAdmin ? "sin sesiones de la cuenta de administración" : "todas las sesiones"}${m.opciones.desde ? ` · desde ${m.opciones.desde}` : ""}${m.opciones.hasta ? ` · hasta ${m.opciones.hasta}` : ""} · fechas en hora de Buenos Aires`);
  if (m.rangoFechas) L.push(`Rango con actividad: ${m.rangoFechas[0]} → ${m.rangoFechas[1]} (${m.porFecha.length} días con actividad)`);
  L.push("");
  L.push("SESIONES");
  L.push(`  Total de sesiones: ${s.total}   (creadas con la cuenta de administración, probables pruebas: ${s.delAdmin})`);
  L.push(`  Por área:   ${lista(s.porArea)}`);
  L.push(`  Por idioma: ${lista(s.porIdioma)}   (${s.idiomaSinCampo} sesiones sin campo de idioma cuentan como es)`);
  L.push(`  Docentes distintos (uid): ${s.docentesDistintos}   · sesiones sin docente asociado (creadas sin iniciar sesión): ${s.sinDocente}`);
  if (s.sinFecha) L.push(`  Sesiones sin fecha válida (no entran en el desglose por fecha): ${s.sinFecha}`);
  L.push("");
  L.push("RONDAS Y VEREDICTOS DEL ÁRBITRO");
  L.push(`  Rondas registradas: ${r.total}  (en ${r.partidas} partidas distintas y ${r.sesionesConRondas} sesiones)   Por estado: ${lista(r.porEstado)}`);
  L.push(`  Veredictos del árbitro en rondas (rondas que fueron al árbitro): ${r.veredictos}   Por resultado: ${lista(r.veredictosPorResultado)}`);
  L.push(`  Consultas al árbitro guardadas (incluye las anteriores al registro de rondas): ${c.total}  (${c.oral} del juego oral)  en ${c.sesionesConConsulta} sesiones`);
  if (c.sesionesConConsultaSinRondas) L.push(`    ⚠ ${c.sesionesConConsultaSinRondas} sesiones tienen consultas pero ninguna ronda: son anteriores al registro de rondas, así que sus veredictos y correcciones no se pueden desglosar.`);
  L.push("");
  L.push("CORRECCIONES DEL DOCENTE");
  L.push(`  Veredictos corregidos por el docente: ${r.corregidas} de ${r.veredictos}  (${r.pctCorregidas === null ? "sin veredictos" : r.pctCorregidas + " %"})`);
  L.push(`  Sesiones con al menos una corrección: ${r.sesionesConCorrecciones} · docentes que corrigieron: ${r.docentesQueCorrigieron}`);
  L.push("  Nota: solo se cuentan las correcciones vigentes; si el docente volvió al reparto del árbitro, la marca se borra y no queda registro.");
  L.push("");
  L.push("METACOGNICIÓN E INFORMES");
  L.push(`  Informes de metacognición enviados: ${g.total}  (modo competitivo, uno por partida con los 2 equipos: ${g.competitivo} · modo individual anterior, uno por alumno: ${g.individual})`);
  L.push(`  Sesiones con al menos un informe de metacognición: ${g.sesionesConInforme} · partidas con informe: ${g.partidasConInforme}`);
  L.push(`  Informes de sesión generados para el docente (IA): ${s.conInformeDeSesion}`);
  L.push("");
  L.push("NO SE PUEDEN SACAR (no se guardan, o el script no los lee a propósito)");
  L.push("  · Cantidad de alumnos o de equipos: los nombres de integrantes viven solo en los informes de metacognición y no se leen ni se cuentan aquí.");
  L.push("  · Visitas a la portada, clics y conversión: no pasan por Firestore (eso está en Analytics, si está activo).");
  L.push("  · Duración de la sesión o de la partida, y si una sesión «terminó»: no hay un campo de estado final.");
  L.push("  · Correcciones que el docente deshizo, y quién más usó el link de alumno: no se registran.");
  return L.join("\n");
}

const COLUMNAS = ["fecha", "sesiones", "docentes_que_crearon", "consultas_al_arbitro", "rondas", "veredictos_en_rondas", "correcciones_del_docente", "partidas", "informes_metacognicion"];
function aCsv(m) {
  const filas = m.porFecha.map((d) => [d.fecha, d.sesiones, d.docentes, d.consultas, d.rondas, d.veredictos, d.correcciones, d.partidas, d.informes].join(","));
  return [COLUMNAS.join(","), ...filas].join("\n") + "\n";
}

function leerArgs(argv) {
  const o = { sinAdmin: false, sinCsv: false };
  for (const a of argv) {
    if (a === "--sin-admin") o.sinAdmin = true;
    else if (a === "--sin-csv") o.sinCsv = true;
    else if (/^--desde=\d{4}-\d{2}-\d{2}$/.test(a)) o.desde = a.slice(8);
    else if (/^--hasta=\d{4}-\d{2}-\d{2}$/.test(a)) o.hasta = a.slice(8);
    else { console.error(`Argumento no reconocido: ${a}`); process.exit(2); }
  }
  return o;
}

async function main() {
  const o = leerArgs(process.argv.slice(2));
  const admin = require("firebase-admin");
  admin.initializeApp({ projectId: PROYECTO });
  const datos = await leerDatos(admin.firestore());
  const m = calcular(datos, { sinAdmin: o.sinAdmin, desde: o.desde, hasta: o.hasta });
  console.log(formatear(m));
  if (!o.sinCsv) {
    fs.mkdirSync(SALIDA, { recursive: true });
    const sello = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})/, "$1_");
    const archivo = path.join(SALIDA, `metricas-arbitro-${sello}.csv`);
    fs.writeFileSync(archivo, aCsv(m), "utf8");
    console.log(`\nCSV por fecha: ${path.relative(process.cwd(), archivo)}`);
  }
}

module.exports = { leerDatos, calcular, formatear, aCsv, fechaLocal, ADMIN_UID, COLUMNAS };
if (require.main === module) main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
