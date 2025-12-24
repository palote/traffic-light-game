// src/pages/admin/AdminMetricsPage.tsx

import { useEffect, useMemo, useState } from "react";
import { ref, get } from "firebase/database";
import { database } from "../../firebase.config";

type TeacherMetrics = {
  profile?: { uid?: string; email?: string };
  sessions?: Record<string, { loginAt?: number; logoutAt?: number }>;
  gamesCreated?: Record<string, { createdAt?: number; gameId?: string }>;
  lastAccessByGame?: Record<string, { lastAccessAt?: number } | number>;
};

export function AdminMetricsPage() {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Record<string, TeacherMetrics>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      const snap = await get(ref(database, "metrics/teachers"));
      setTeachers((snap.val() as any) ?? {});
      setLoading(false);
    }
    load();
  }, []);

  const rows = useMemo(() => {
    return Object.entries(teachers).map(([uid, t]) => {
      const email = t.profile?.email ?? "(sin email)";
      const sessionCount = t.sessions ? Object.keys(t.sessions).length : 0;
      const gamesCreatedCount = t.gamesCreated ? Object.keys(t.gamesCreated).length : 0;

      let lastLoginAt = 0;
      if (t.sessions) {
        for (const s of Object.values(t.sessions)) {
          if ((s.loginAt ?? 0) > lastLoginAt) lastLoginAt = s.loginAt ?? 0;
        }
      }

      let lastAccessAt = 0;
      const la = t.lastAccessByGame ?? {};
      for (const v of Object.values(la)) {
        const ts = typeof v === "number" ? v : ((v as any)?.lastAccessAt ?? 0);
        if (ts > lastAccessAt) lastAccessAt = ts;
      }

      return { uid, email, sessionCount, gamesCreatedCount, lastLoginAt, lastAccessAt };
    });
  }, [teachers]);

  const totals = useMemo(() => {
    const totalTeachers = rows.length;
    const totalSessions = rows.reduce((acc, r) => acc + r.sessionCount, 0);
    const totalGamesCreated = rows.reduce((acc, r) => acc + r.gamesCreatedCount, 0);
    return { totalTeachers, totalSessions, totalGamesCreated };
  }, [rows]);

  // ✅ NUEVO: Descargar como CSV (compatible con Excel)
  const handleDownloadCSV = () => {
    const headers = ["Email", "UID", "Sesiones", "Juegos Creados", "Último Login", "Último Acceso"];
    
    const csvRows = rows
      .sort((a, b) => (b.lastAccessAt ?? 0) - (a.lastAccessAt ?? 0))
      .map((r) => [
        r.email,
        r.uid,
        r.sessionCount,
        r.gamesCreatedCount,
        r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString() : "-",
        r.lastAccessAt ? new Date(r.lastAccessAt).toLocaleString() : "-",
      ]);

    // Crear contenido CSV
    const csvContent = [
      headers.join(","),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Agregar BOM para que Excel reconozca UTF-8
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

    // Descargar
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `metricas_docentes_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <div style={{ fontSize: 18 }}>Cargando métricas…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          📊 Admin Metrics
        </h1>
        
        <button
          onClick={handleDownloadCSV}
          style={{
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            backgroundColor: "#22c55e",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          📥 Descargar Excel
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Docentes" value={totals.totalTeachers} icon="👨‍🏫" color="#3b82f6" />
        <StatCard label="Sesiones totales" value={totals.totalSessions} icon="🔐" color="#8b5cf6" />
        <StatCard label="Juegos creados" value={totals.totalGamesCreated} icon="🎮" color="#22c55e" />
      </div>

      {/* Table */}
      <div style={{ 
        backgroundColor: "white", 
        borderRadius: 12, 
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <Th>Email</Th>
                <Th>UID</Th>
                <Th>Sesiones</Th>
                <Th>Juegos</Th>
                <Th>Último login</Th>
                <Th>Último acceso</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                    No hay datos de docentes todavía
                  </td>
                </tr>
              ) : (
                rows
                  .sort((a, b) => (b.lastAccessAt ?? 0) - (a.lastAccessAt ?? 0))
                  .map((r) => (
                    <tr key={r.uid} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <Td>{r.email}</Td>
                      <Td style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                        {r.uid.slice(0, 12)}…
                      </Td>
                      <Td>{r.sessionCount}</Td>
                      <Td>{r.gamesCreatedCount}</Td>
                      <Td>{formatTs(r.lastLoginAt)}</Td>
                      <Td>{formatTs(r.lastAccessAt)}</Td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <a 
          href="/setup" 
          style={{ color: "#3b82f6", textDecoration: "none", fontSize: 14 }}
        >
          ← Volver a Setup
        </a>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div style={{ 
      backgroundColor: "white",
      border: "1px solid #e2e8f0", 
      borderRadius: 12, 
      padding: 20, 
      minWidth: 180,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ 
      textAlign: "left", 
      padding: "14px 16px", 
      fontSize: 12, 
      fontWeight: 600,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    }}>
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ 
      padding: "14px 16px", 
      fontSize: 14,
      ...style 
    }}>
      {children}
    </td>
  );
}

function formatTs(ts?: number) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}