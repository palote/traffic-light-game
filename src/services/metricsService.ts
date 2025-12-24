// src/services/metricsService.ts
import { ref, push, set, update, serverTimestamp, get } from "firebase/database";
import type { User } from "firebase/auth";
import { database } from "../firebase.config";

const METRICS_ROOT = "metrics/teachers";

function nowMs() {
  return Date.now();
}

export async function startTeacherSession(user: User): Promise<string> {
  const uid = user.uid;
  const email = user.email ?? "";

  // 1) profile (liviano, se pisa)
  await update(ref(database, `${METRICS_ROOT}/${uid}/profile`), {
    uid,
    email,
    updatedAt: serverTimestamp(),
  });

  // 2) nueva sesión
  const sessionRef = push(ref(database, `${METRICS_ROOT}/${uid}/sessions`));
  const sessionId = sessionRef.key;

  if (!sessionId) {
    throw new Error("No se pudo crear sessionId (push key null).");
  }

  await set(sessionRef, {
    sessionId,
    uid,
    email,
    loginAt: nowMs(),
    logoutAt: null,
    durationSec: null,
  });

  return sessionId;
}

export async function endTeacherSession(
  uid: string,
  sessionId: string
): Promise<void> {
  const base = `${METRICS_ROOT}/${uid}/sessions/${sessionId}`;
  const logoutAt = nowMs();

  // Leemos loginAt para calcular durationSec (opcional pero útil)
  let durationSec: number | null = null;
  try {
    const snap = await get(ref(database, base));
    const data = snap.val() as { loginAt?: number } | null;
    const loginAt = typeof data?.loginAt === "number" ? data.loginAt : null;

    if (loginAt != null) {
      durationSec = Math.max(0, Math.floor((logoutAt - loginAt) / 1000));
    }
  } catch {
    // Si falla la lectura, igual guardamos logoutAt
    durationSec = null;
  }

  await update(ref(database), {
    [`${base}/logoutAt`]: logoutAt,
    ...(durationSec != null ? { [`${base}/durationSec`]: durationSec } : {}),
  });
}

export async function markGameCreated(uid: string, gameId: string): Promise<void> {
  const now = nowMs();
  await update(ref(database), {
    [`${METRICS_ROOT}/${uid}/gamesCreated/${gameId}`]: true,
    [`${METRICS_ROOT}/${uid}/lastAccessByGame/${gameId}`]: now,
  });
}

export async function markGameAccess(uid: string, gameId: string): Promise<void> {
  const now = nowMs();
  await update(ref(database), {
    [`${METRICS_ROOT}/${uid}/lastAccessByGame/${gameId}`]: now,
  });
}
