// src/hooks/useConnectionCount.ts
// Cuenta conexiones activas + guarda el pico máximo diario en Firebase

import { useEffect, useRef, useState } from "react";
import { ref, onValue, onDisconnect, set, remove, push, get } from "firebase/database";
import { database } from "../firebase.config";

export interface ConnectionInfo {
  count: number;           // conexiones activas ahora mismo
  limit: number;           // límite del plan (100 para Spark)
  percentage: number;      // % de uso (0-100)
  status: "safe" | "warning" | "critical";
  isConnected: boolean;
  todayPeak: number;       // pico máximo del día de hoy
}

export interface DailyPeak {
  date: string;            // "2026-03-08"
  peak: number;
  updatedAt: number;
}

/**
 * @param trackSelf  - true para registrar este dispositivo como conexión activa
 * @param savePeaks  - true solo en el panel admin (evita que cada alumno intente guardar)
 */
export function useConnectionCount(
  trackSelf: boolean = true,
  savePeaks: boolean = false
): ConnectionInfo {
  const [count, setCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [todayPeak, setTodayPeak] = useState(0);
  const presenceRefRef = useRef<ReturnType<typeof ref> | null>(null);
  const lastSavedPeak = useRef(0);

  const LIMIT = 100;
  const PEAK_PATH = "_metrics/connectionPeaks";

  useEffect(() => {
    // 1. Leer el pico de hoy al montar
    const today = new Date().toISOString().split("T")[0];
    get(ref(database, `${PEAK_PATH}/${today}`)).then((snap) => {
      if (snap.exists()) {
        const peak = snap.val()?.peak ?? 0;
        setTodayPeak(peak);
        lastSavedPeak.current = peak;
      }
    }).catch(() => {}); // silencioso si no hay datos aún

    // 2. Escuchar estado de conexión de este dispositivo
    const connectedRef = ref(database, ".info/connected");
    const connectedUnsub = onValue(connectedRef, (snap) => {
      const connected = snap.val() === true;
      setIsConnected(connected);

      if (connected && trackSelf) {
        const presenceListRef = ref(database, "_presence");
        const myRef = push(presenceListRef);
        presenceRefRef.current = myRef;
        onDisconnect(myRef).remove();
        set(myRef, {
          connectedAt: Date.now(),
          ua: navigator.userAgent.substring(0, 80),
        });
      }
    });

    // 3. Escuchar el conteo total de presencia
    const presenceListRef = ref(database, "_presence");
    const presenceUnsub = onValue(presenceListRef, async (snap) => {
      const val = snap.val();
      const total = val ? Object.keys(val).length : 0;
      setCount(total);

      // 4. Guardar pico solo si savePeaks=true y es un nuevo máximo
      if (savePeaks && total > lastSavedPeak.current) {
        lastSavedPeak.current = total;
        setTodayPeak(total);

        const todayKey = new Date().toISOString().split("T")[0];
        try {
          await set(ref(database, `${PEAK_PATH}/${todayKey}`), {
            peak: total,
            updatedAt: Date.now(),
          });
        } catch {
          // falla silenciosa — no interrumpe la experiencia
        }
      }
    });

    return () => {
      connectedUnsub();
      presenceUnsub();
      if (presenceRefRef.current) {
        remove(presenceRefRef.current);
        presenceRefRef.current = null;
      }
    };
  }, [trackSelf, savePeaks]);

  const percentage = Math.round((count / LIMIT) * 100);
  const status: ConnectionInfo["status"] =
    percentage >= 85 ? "critical" :
    percentage >= 60 ? "warning" :
    "safe";

  return { count, limit: LIMIT, percentage, status, isConnected, todayPeak };
}

// ─── Hook separado para leer el historial de picos (solo admin) ───────────────

export function useConnectionPeakHistory(days: number = 30): DailyPeak[] {
  const [peaks, setPeaks] = useState<DailyPeak[]>([]);

  useEffect(() => {
    const peaksRef = ref(database, "_metrics/connectionPeaks");
    const unsub = onValue(peaksRef, (snap) => {
      const val = snap.val() as Record<string, { peak: number; updatedAt: number }> | null;
      if (!val) {
        setPeaks([]);
        return;
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split("T")[0];

      const list: DailyPeak[] = Object.entries(val)
        .filter(([date]) => date >= cutoffStr)
        .map(([date, data]) => ({ date, peak: data.peak, updatedAt: data.updatedAt }))
        .sort((a, b) => b.date.localeCompare(a.date));

      setPeaks(list);
    });

    return () => unsub();
  }, [days]);

  return peaks;
}