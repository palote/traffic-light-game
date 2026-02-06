// src/pages/admin/AdminMetricsPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get, set } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";

type TeacherMetrics = {
  profile?: { uid?: string; email?: string };
  sessions?: Record<string, { loginAt?: number; logoutAt?: number }>;
  gamesCreated?: Record<string, { createdAt?: number; gameId?: string }>;
  lastAccessByGame?: Record<string, { lastAccessAt?: number } | number>;
};

interface ReferralConfig {
  active: boolean;
  formUrl: string;
  rewards: string;
  requireFinishedGame?: boolean;  // ✅ AGREGADO
}

export function AdminMetricsPage() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Record<string, TeacherMetrics>>({});
  const [referralConfig, setReferralConfig] = useState<ReferralConfig>({
    active: false,
    formUrl: "",
    rewards: "",
    requireFinishedGame: false,
  });

  // Cargar métricas
  useEffect(() => {
    async function load() {
      setLoading(true);
      const snap = await get(ref(database, "metrics/teachers"));
      setTeachers((snap.val() as any) ?? {});
      setLoading(false);
    }
    load();
  }, []);

  // Cargar configuración de referidos
  useEffect(() => {
    async function loadReferralConfig() {
      try {
        const configRef = ref(database, "config/referral");
        const snap = await get(configRef);
        if (snap.exists()) {
          setReferralConfig(snap.val());
        }
      } catch (error) {
        console.error("Error loading referral config:", error);
      }
    }
    loadReferralConfig();
  }, []);

  // Guardar configuración de referidos
  const saveReferralConfig = async () => {
    try {
      const configRef = ref(database, "config/referral");
      await set(configRef, referralConfig);
      alert("Configuración guardada exitosamente");
    } catch (error) {
      console.error("Error saving referral config:", error);
      alert("Error al guardar la configuración");
    }
  };

  const rows = useMemo(() => {
    return Object.entries(teachers).map(([uid, data]) => {
      const email = data.profile?.email ?? "(no email)";
      const sessionCount = data.sessions ? Object.keys(data.sessions).length : 0;
      const gamesCreatedCount = data.gamesCreated ? Object.keys(data.gamesCreated).length : 0;

      let lastLoginAt = 0;
      if (data.sessions) {
        for (const s of Object.values(data.sessions)) {
          if ((s.loginAt ?? 0) > lastLoginAt) lastLoginAt = s.loginAt ?? 0;
        }
      }

      let lastAccessAt = 0;
      const la = data.lastAccessByGame ?? {};
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

  const handleDownloadCSV = () => {
    const headers = [t.admin.email, t.admin.uid, t.admin.sessions, t.admin.gamesCreated, t.admin.lastLogin, t.admin.lastAccess];
    
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

    const csvContent = [
      headers.join(","),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `metrics_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatTs = (ts?: number) => {
    if (!ts) return "-";
    return new Date(ts).toLocaleString(language === 'es' ? "es-AR" : "en-US", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <div style={{ fontSize: 18 }}>{t.common.loading}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          📊 {t.admin.title}
        </h1>
        
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => navigate("/admin/library/bulk")}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: "#8b5cf6",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            📦 Bulk Upload
          </button>
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
            📥 {t.admin.downloadExcel}
          </button>
        </div>
      </div>

      {/* Configuración de Referidos */}
      <div style={{ 
        backgroundColor: "white", 
        borderRadius: 12, 
        padding: 24,
        marginBottom: 24,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#1e293b" }}>
          ⚙️ Configuración de Referidos
        </h2>
        
        {/* Banner de Referidos */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={referralConfig.active}
              onChange={(e) => setReferralConfig(prev => ({ ...prev, active: e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 14, fontWeight: 500, color: "#475569" }}>
              Activar sistema de referidos
            </span>
          </label>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#64748b", marginBottom: 4 }}>
              URL del formulario
            </label>
            <input
              type="text"
              value={referralConfig.formUrl}
              onChange={(e) => setReferralConfig(prev => ({ ...prev, formUrl: e.target.value }))}
              placeholder="https://forms.google.com/..."
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#64748b", marginBottom: 4 }}>
              Recompensas (descripción)
            </label>
            <textarea
              value={referralConfig.rewards}
              onChange={(e) => setReferralConfig(prev => ({ ...prev, rewards: e.target.value }))}
              placeholder="Ej: Acceso premium por 6 meses + certificado"
              rows={2}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                fontSize: 14,
                resize: "vertical",
              }}
            />
          </div>

          {/* ✅ AGREGADO: Checkbox para requerir juego completado */}
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={referralConfig?.requireFinishedGame || false}
                onChange={(e) => setReferralConfig(prev => prev ? { ...prev, requireFinishedGame: e.target.checked } : prev)}
              />
              <span style={{ fontSize: 14, color: '#475569' }}>
                Solo mostrar a docentes con al menos 1 juego completado
              </span>
            </label>
          </div>

          <button
            onClick={saveReferralConfig}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              marginTop: 16,
            }}
          >
            💾 Guardar Configuración
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label={t.admin.teachers} value={totals.totalTeachers} icon="👨‍🏫" color="#3b82f6" />
        <StatCard label={t.admin.totalSessions} value={totals.totalSessions} icon="🔐" color="#8b5cf6" />
        <StatCard label={t.admin.gamesCreated} value={totals.totalGamesCreated} icon="🎮" color="#22c55e" />
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
                <Th>{t.admin.email}</Th>
                <Th>{t.admin.uid}</Th>
                <Th>{t.admin.sessions}</Th>
                <Th>{t.admin.games}</Th>
                <Th>{t.admin.lastLogin}</Th>
                <Th>{t.admin.lastAccess}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                    {t.admin.noData}
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
        <button 
          onClick={() => navigate("/")}
          style={{ 
            color: "#3b82f6", 
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ← {t.admin.backToSetup}
        </button>
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