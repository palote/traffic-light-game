// src/components/ConnectionIndicator.tsx
// Indicador compacto/completo de conexiones activas.
// Importar también ConnectionPeakChart para el historial en AdminMetricsPage.

import { useConnectionCount, useConnectionPeakHistory } from "../hooks/useConnectionCount";
import type { DailyPeak } from "../hooks/useConnectionCount";

// ─── Indicador principal ──────────────────────────────────────────────────────

interface ConnectionIndicatorProps {
  compact?: boolean;
}

export function ConnectionIndicator({ compact = false }: ConnectionIndicatorProps) {
  // savePeaks=true: este componente es solo para el docente/admin
  const { count, limit, percentage, status, isConnected, todayPeak } =
    useConnectionCount(true, true);

  const colors = {
    safe:     { bar: "#22c55e", bg: "#dcfce7", text: "#166534", border: "#86efac" },
    warning:  { bar: "#f59e0b", bg: "#fef9c3", text: "#854d0e", border: "#fcd34d" },
    critical: { bar: "#ef4444", bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  };
  const c = colors[status];

  const statusLabel = {
    safe:     "✅ Normal",
    warning:  "⚠️ Atención",
    critical: "🚨 Límite cercano",
  }[status];

  const statusMessage = {
    safe:     "El juego funciona con normalidad.",
    warning:  "Más del 60% del cupo ocupado. Monitorear.",
    critical: "Cercano al límite. Nuevos dispositivos podrían no conectarse.",
  }[status];

  if (!isConnected) {
    return (
      <div style={{
        padding: compact ? "6px 10px" : "12px 16px",
        background: "#f3f4f6",
        borderRadius: 8,
        fontSize: 13,
        color: "#6b7280",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}>
        ⏳ Conectando...
      </div>
    );
  }

  // ── Versión compacta (para la fila de StatCards) ──
  if (compact) {
    return (
      <div style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 14px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        fontSize: 13,
        color: c.text,
        fontWeight: 600,
        minWidth: 140,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: c.bar, display: "inline-block", flexShrink: 0,
          }} />
          📡 {count} / {limit} ahora
        </div>
        {todayPeak > 0 && (
          <div style={{ fontSize: 11, opacity: 0.8, paddingLeft: 14 }}>
            Pico hoy: {todayPeak}
          </div>
        )}
      </div>
    );
  }

  // ── Versión completa (para la pestaña Analytics) ──
  return (
    <div style={{
      padding: 16,
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 12,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: c.text }}>
          📡 Conexiones activas
        </span>
        <span style={{
          fontSize: 12, fontWeight: 600, color: c.text,
          padding: "2px 8px", background: "rgba(255,255,255,0.6)", borderRadius: 10,
        }}>
          {statusLabel}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 800, color: c.text, lineHeight: 1 }}>
            {count}
            <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.7 }}> / {limit}</span>
          </div>
          <div style={{ fontSize: 11, color: c.text, opacity: 0.7, marginTop: 2 }}>
            en este momento
          </div>
        </div>
        {todayPeak > 0 && (
          <div style={{
            padding: "6px 12px",
            background: "rgba(255,255,255,0.5)",
            borderRadius: 8,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.text }}>{todayPeak}</div>
            <div style={{ fontSize: 11, color: c.text, opacity: 0.7 }}>pico hoy</div>
          </div>
        )}
      </div>

      {/* Barra de progreso */}
      <div style={{
        height: 8, background: "rgba(0,0,0,0.1)",
        borderRadius: 4, overflow: "hidden", marginBottom: 8,
      }}>
        <div style={{
          height: "100%",
          width: `${Math.min(percentage, 100)}%`,
          background: c.bar,
          borderRadius: 4,
          transition: "width 0.5s ease",
        }} />
      </div>

      <div style={{ fontSize: 12, color: c.text, opacity: 0.85 }}>
        {percentage}% del cupo — {statusMessage}
      </div>

      {status === "critical" && (
        <div style={{
          marginTop: 10, padding: "8px 12px",
          background: "rgba(239,68,68,0.15)",
          borderRadius: 8, fontSize: 12,
          color: "#7f1d1d", fontWeight: 500,
        }}>
          💡 Para eliminar este límite, activá el plan Blaze en Firebase Console.
        </div>
      )}
    </div>
  );
}

// ─── Gráfico de historial de picos (para pestaña Analytics) ──────────────────

interface ConnectionPeakChartProps {
  days?: number;
}

export function ConnectionPeakChart({ days = 30 }: ConnectionPeakChartProps) {
  const peaks = useConnectionPeakHistory(days);

  if (peaks.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
        No hay datos de picos aún. Se irán registrando a medida que uses el panel.
      </div>
    );
  }

  const maxPeak = Math.max(...peaks.map((p) => p.peak), 1);
  const LIMIT = 100;

  const getBarColor = (peak: number) => {
    const pct = (peak / LIMIT) * 100;
    if (pct >= 85) return "#ef4444";
    if (pct >= 60) return "#f59e0b";
    return "#22c55e";
  };

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 12,
      }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: "#64748b", margin: 0 }}>
          Pico de conexiones por día
        </h4>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#94a3b8" }}>
          <span>🟢 &lt;60%</span>
          <span>🟡 60–85%</span>
          <span>🔴 &gt;85%</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {peaks.map(({ date, peak }) => (
          <div key={date} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Fecha */}
            <span style={{
              fontSize: 12, color: "#64748b",
              width: 72, flexShrink: 0, textAlign: "right",
            }}>
              {date.slice(5)} {/* "MM-DD" */}
            </span>

            {/* Barra */}
            <div style={{
              flex: 1, height: 20, background: "#f1f5f9",
              borderRadius: 4, overflow: "hidden", position: "relative",
            }}>
              <div style={{
                height: "100%",
                width: `${(peak / Math.max(maxPeak, LIMIT)) * 100}%`,
                background: getBarColor(peak),
                borderRadius: 4,
                transition: "width 0.4s ease",
              }} />
              {/* Línea de límite en 100% si el max supera 60 */}
              {maxPeak >= 60 && (
                <div style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: `${(LIMIT / Math.max(maxPeak, LIMIT)) * 100}%`,
                  width: 1, background: "#ef4444", opacity: 0.4,
                }} />
              )}
            </div>

            {/* Número */}
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: getBarColor(peak), width: 28, textAlign: "right",
            }}>
              {peak}
            </span>
          </div>
        ))}
      </div>

      {/* Nota al pie */}
      <div style={{
        marginTop: 12, fontSize: 11, color: "#94a3b8",
        borderTop: "1px solid #f1f5f9", paddingTop: 8,
      }}>
        Límite del plan Spark: 100 conexiones simultáneas.
        La línea roja indica ese límite.
      </div>
    </div>
  );
}