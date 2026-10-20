// Resumen de partidas de una sesión del Árbitro de Aprendizaje, para correr en PRODUCCIÓN — pensado para
// después de jugar varias partidas a la vez bajo el mismo código, y confirmar que no se mezclaron entre sí.
//
// SOLO LECTURA: únicamente hace get()/select() sobre sesiones_arbitro/{id} y su subcolección "rondas"; nunca
// escribe, actualiza ni borra nada.
//
// ALCANCE: solo lee la sesión cuyo id se pasa por línea de comandos — nunca hace un query ni un
// collectionGroup sobre toda la base.
//
// A diferencia de comprobar-etapa2-produccion.cjs, este script SÍ pide y muestra los nombres de equipo
// (equipoPregunta/equipoResponde): es justamente lo que hace falta para reconocer, a simple vista, qué
// partida es cuál cuando se juegan varias con el mismo código. No son datos personales de los alumnos (el
// sistema nunca guarda integrantes, solo el nombre que el equipo eligió para esa partida).
//
// Por partida, imprime: los nombres de equipo que aparecieron (como equipoPregunta o equipoResponde), la
// cantidad de rondas, el rango de números de ronda, y si la numeración es consecutiva (1, 2, 3, ... sin
// huecos ni repetidos — una partida no consecutiva suele indicar rondas de otra partida mezcladas, o rondas
// perdidas).
//
// A propósito NO se llama verificar-*.cjs: no es parte de la batería de regresión (necesita credenciales y
// datos reales de producción, no el Firestore simulado que usan los verificar-*.cjs).
//
// Uso (desde functions/, después de "npm run build"):
//   node scripts/resumen-partidas.cjs SESSION_ID
// Credenciales: las de Google por defecto (gcloud auth application-default login, o GOOGLE_APPLICATION_CREDENTIALS).
"use strict";

const PROYECTO = "traffic-ligths-game";

/** true si numeros, ordenados, son exactamente 1,2,3,...,N sin huecos ni repetidos. */
function esConsecutiva(numeros) {
  const ordenados = [...numeros].sort((a, b) => a - b);
  for (let i = 0; i < ordenados.length; i++) {
    if (ordenados[i] !== i + 1) return false;
  }
  return true;
}

/** Arma el resumen por partida a partir de las rondas de UNA sesión (ya leídas de Firestore). */
function resumirPartidas(rondas) {
  const porPartida = new Map();
  for (const r of rondas) {
    if (!porPartida.has(r.partidaId)) porPartida.set(r.partidaId, []);
    porPartida.get(r.partidaId).push(r);
  }
  // Primer creadoEn visto por partida, para ordenar el resumen por cuándo empezó cada una — mismo criterio
  // que usa leerRondasYTotales (index.ts) para ordenar las rondas de una sesión.
  const primera = new Map();
  for (const r of rondas) {
    if (!primera.has(r.partidaId) || r.creadoEn < primera.get(r.partidaId)) primera.set(r.partidaId, r.creadoEn);
  }

  const filas = [];
  for (const [partidaId, rs] of porPartida) {
    rs.sort((a, b) => a.ronda - b.ronda);
    const equipos = new Set();
    for (const r of rs) {
      if (r.equipoPregunta) equipos.add(r.equipoPregunta);
      if (r.equipoResponde) equipos.add(r.equipoResponde);
    }
    const numeros = rs.map((r) => r.ronda);
    filas.push({
      partidaId,
      equipos: [...equipos].join(" / "),
      rondas: rs.length,
      primeraRonda: Math.min(...numeros),
      ultimaRonda: Math.max(...numeros),
      consecutiva: esConsecutiva(numeros) ? "sí" : "NO",
    });
  }
  filas.sort((a, b) => (primera.get(a.partidaId) < primera.get(b.partidaId) ? -1 : primera.get(a.partidaId) > primera.get(b.partidaId) ? 1 : 0));
  return filas;
}

async function leerRondas(sessionRef) {
  const snap = await sessionRef.collection("rondas")
    .select("partidaId", "ronda", "equipoPregunta", "equipoResponde", "creadoEn")
    .get();
  return snap.docs.map((d) => d.data());
}

async function main() {
  const id = process.argv[2];
  if (!id || !id.trim()) {
    console.error("Uso: node scripts/resumen-partidas.cjs SESSION_ID");
    console.error("No se pasó ningún id: no se tocó Firestore.");
    process.exit(2);
  }

  const admin = require("firebase-admin");
  admin.initializeApp({ projectId: PROYECTO });
  const db = admin.firestore();

  const sessionRef = db.collection("sesiones_arbitro").doc(id);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    console.error(`La sesión ${id} no existe.`);
    process.exit(2);
  }

  const rondas = await leerRondas(sessionRef);
  if (rondas.length === 0) {
    console.log(`La sesión ${id} todavía no tiene ninguna ronda registrada.`);
    process.exit(0);
  }

  const filas = resumirPartidas(rondas);
  console.table(filas);
  console.log(`${filas.length} partida(s) en la sesión ${id}, ${rondas.length} ronda(s) en total.`);
  const conProblemas = filas.filter((f) => f.consecutiva === "NO");
  if (conProblemas.length > 0) {
    console.log(`⚠️  ${conProblemas.length} partida(s) con numeración NO consecutiva: revisalas.`);
  }
  process.exit(0);
}

module.exports = { resumirPartidas, esConsecutiva, leerRondas };
if (require.main === module) main().catch((e) => { console.error("ERROR:", e.message || e); process.exit(1); });
