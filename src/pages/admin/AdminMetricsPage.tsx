// src/pages/admin/AdminMetricsPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get, set } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";

type TeacherMetrics = {
  profile?: { uid?: string; email?: string };
  sessions?: Record<string, { loginAt?: number; logoutAt?: number; durationSec?: number }>;
  gamesCreated?: Record<string, boolean>;
  lastAccessByGame?: Record<string, number>;
};

type Referral = {
  referrerId: string;
  referrerEmail: string;
  referrerName: string;
  referredName: string;
  referredEmail: string;
  referredSchool?: string;
  message?: string;
  status: string;
  createdAt: number;
};

type WebinarRegistration = {
  userId?: string;
  name: string;
  email: string;
  school?: string;
  experience: string;
  questions?: string;
  webinarDate?: string;
  webinarTopic?: string;
  registeredAt: number;
};

type ReferralConfig = {
  active: boolean;
  formUrl: string;
  rewards: string;
};

type WebinarConfig = {
  active: boolean;
  title: string;
  topic: string;
  date: string;
  timezone: string;
  formUrl: string;
  dismissible: boolean;
  language?: string;
  requireFinishedGame?: boolean;
};

type GameData = {
  config?: { createdAt?: number };
  status?: { status?: string };
  createdAt?: number;
  createdBy?: { uid?: string };
};

export function AdminMetricsPage() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Record<string, TeacherMetrics>>({});
  const [referrals, setReferrals] = useState<Record<string, Referral>>({});
  const [webinarRegistrations, setWebinarRegistrations] = useState<Record<string, WebinarRegistration>>({});
  const [games, setGames] = useState<Record<string, GameData>>({});
  const [activeTab, setActiveTab] = useState<"teachers" | "referrals" | "webinars" | "analytics" | "config">("teachers");

  // Config states
  const [referralConfig, setReferralConfig] = useState<ReferralConfig>({
    active: true,
    formUrl: "/referir",
    rewards: "🎴 Kit de tarjetas PDF + 🌟 Insignia de colaborador",
  });
  const [webinarConfig, setWebinarConfig] = useState<WebinarConfig>({
    active: false,
    title: "",
    topic: "",
    date: "",
    timezone: "America/Argentina/Buenos_Aires",
    formUrl: "/webinar-registro",
    dismissible: true,
    language: "",
    requireFinishedGame: false,
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [teachersSnap, referralsSnap, webinarsSnap, referralConfigSnap, webinarConfigSnap, gamesSnap] = await Promise.all([
        get(ref(database, "metrics/teachers")),
        get(ref(database, "referrals")),
        get(ref(database, "webinarRegistrations")),
        get(ref(database, "config/referral")),
        get(ref(database, "config/webinar")),
        get(ref(database, "games")),
      ]);

      setTeachers((teachersSnap.val() as Record<string, TeacherMetrics>) ?? {});
      setReferrals((referralsSnap.val() as Record<string, Referral>) ?? {});
      setWebinarRegistrations((webinarsSnap.val() as Record<string, WebinarRegistration>) ?? {});
      setGames((gamesSnap.val() as Record<string, GameData>) ?? {});

      if (referralConfigSnap.exists()) {
        setReferralConfig(referralConfigSnap.val());
      }
      if (webinarConfigSnap.exists()) {
        setWebinarConfig(webinarConfigSnap.val());
      }

      setLoading(false);
    }
    load();
  }, []);

  // Calcular juegos completados por docente
  const gamesCompletedByTeacher = useMemo(() => {
    const result: Record<string, number> = {};
    
    for (const [gameId, gameData] of Object.entries(games)) {
      const creatorUid = gameData.createdBy?.uid;
      const status = gameData.status?.status;
      
      if (creatorUid && status === "game_complete") {
        result[creatorUid] = (result[creatorUid] || 0) + 1;
      }
    }
    
    return result;
  }, [games]);

  const teacherRows = useMemo(() => {
    return Object.entries(teachers).map(([uid, data]) => {
      const email = data.profile?.email ?? "(no email)";
      const sessions = data.sessions ? Object.values(data.sessions) : [];
      const sessionCount = sessions.length;
      const gamesCreatedCount = data.gamesCreated ? Object.keys(data.gamesCreated).length : 0;
      const gamesCompletedCount = gamesCompletedByTeacher[uid] || 0;

      // Calcular tiempo total de uso
      let totalDurationSec = 0;
      for (const session of sessions) {
        if (session.durationSec) {
          totalDurationSec += session.durationSec;
        } else if (session.loginAt && session.logoutAt) {
          totalDurationSec += Math.floor((session.logoutAt - session.loginAt) / 1000);
        }
      }

      let lastLoginAt = 0;
      for (const s of sessions) {
        if ((s.loginAt ?? 0) > lastLoginAt) lastLoginAt = s.loginAt ?? 0;
      }

      let lastAccessAt = 0;
      const la = data.lastAccessByGame ?? {};
      for (const ts of Object.values(la)) {
        if (typeof ts === "number" && ts > lastAccessAt) lastAccessAt = ts;
      }

      return { uid, email, sessionCount, gamesCreatedCount, gamesCompletedCount, totalDurationSec, lastLoginAt, lastAccessAt };
    });
  }, [teachers, gamesCompletedByTeacher]);

  const referralRows = useMemo(() => {
    return Object.entries(referrals)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [referrals]);

  const webinarRows = useMemo(() => {
    return Object.entries(webinarRegistrations)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => (b.registeredAt ?? 0) - (a.registeredAt ?? 0));
  }, [webinarRegistrations]);

  // Analytics globales
  const analytics = useMemo(() => {
    const totalTeachers = teacherRows.length;
    const totalSessions = teacherRows.reduce((acc, r) => acc + r.sessionCount, 0);
    const totalGamesCreated = teacherRows.reduce((acc, r) => acc + r.gamesCreatedCount, 0);
    const totalGamesCompleted = teacherRows.reduce((acc, r) => acc + r.gamesCompletedCount, 0);
    const totalDurationSec = teacherRows.reduce((acc, r) => acc + r.totalDurationSec, 0);
    const totalReferrals = referralRows.length;
    const totalWebinarRegs = webinarRows.length;

    // Calcular sesiones por día (últimos 30 días)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sessionsByDay: Record<string, number> = {};

    for (const teacher of Object.values(teachers)) {
      for (const session of Object.values(teacher.sessions || {})) {
        if (session.loginAt && session.loginAt >= thirtyDaysAgo) {
          const day = new Date(session.loginAt).toISOString().split("T")[0];
          sessionsByDay[day] = (sessionsByDay[day] || 0) + 1;
        }
      }
    }

    // Juegos creados por día (últimos 30 días)
    const gamesByDay: Record<string, number> = {};
    for (const game of Object.values(games)) {
      const createdAt = game.config?.createdAt || game.createdAt;
      if (createdAt && createdAt >= thirtyDaysAgo) {
        const day = new Date(createdAt).toISOString().split("T")[0];
        gamesByDay[day] = (gamesByDay[day] || 0) + 1;
      }
    }

    // Tasa de completado
    const completionRate = totalGamesCreated > 0 ? Math.round((totalGamesCompleted / totalGamesCreated) * 100) : 0;

    // Promedio de tiempo por sesión
    const avgSessionMin = totalSessions > 0 ? Math.round(totalDurationSec / totalSessions / 60) : 0;

    return {
      totalTeachers,
      totalSessions,
      totalGamesCreated,
      totalGamesCompleted,
      totalDurationSec,
      totalReferrals,
      totalWebinarRegs,
      sessionsByDay,
      gamesByDay,
      completionRate,
      avgSessionMin,
    };
  }, [teacherRows, referralRows, webinarRows, teachers, games]);

  const handleDownloadCSV = () => {
    const headers = ["Email", "UID", "Sesiones", "Tiempo (min)", "Juegos Creados", "Juegos Completados", "Último login", "Último acceso"];

    const csvRows = teacherRows
      .sort((a, b) => b.totalDurationSec - a.totalDurationSec)
      .map((r) => [
        r.email,
        r.uid,
        r.sessionCount,
        Math.round(r.totalDurationSec / 60),
        r.gamesCreatedCount,
        r.gamesCompletedCount,
        r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString() : "-",
        r.lastAccessAt ? new Date(r.lastAccessAt).toLocaleString() : "-",
      ]);

    const csvContent = [headers.join(","), ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

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

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setConfigSaved(false);

    try {
      await Promise.all([
        set(ref(database, "config/referral"), referralConfig),
        set(ref(database, "config/webinar"), webinarConfig),
      ]);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (error) {
      console.error("Error saving config:", error);
      alert("Error al guardar la configuración");
    }

    setConfigSaving(false);
  };

  const formatTs = (ts?: number) => {
    if (!ts) return "-";
    return new Date(ts).toLocaleString(language === "es" ? "es-AR" : language === "pt" ? "pt-BR" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
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
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📊 {t.admin.title}</h1>

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

      {/* Stats Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Docentes" value={analytics.totalTeachers} icon="👨‍🏫" color="#3b82f6" />
        <StatCard label="Sesiones" value={analytics.totalSessions} icon="🔐" color="#8b5cf6" />
        <StatCard label="Tiempo total" value={formatDuration(analytics.totalDurationSec)} icon="⏱️" color="#06b6d4" isText />
        <StatCard label="Juegos creados" value={analytics.totalGamesCreated} icon="🎮" color="#22c55e" />
        <StatCard label="Completados" value={`${analytics.totalGamesCompleted} (${analytics.completionRate}%)`} icon="✅" color="#10b981" isText />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <TabButton active={activeTab === "teachers"} onClick={() => setActiveTab("teachers")}>
          👨‍🏫 Docentes
        </TabButton>
        <TabButton active={activeTab === "analytics"} onClick={() => setActiveTab("analytics")}>
          📈 Analytics
        </TabButton>
        <TabButton active={activeTab === "referrals"} onClick={() => setActiveTab("referrals")}>
          👥 Referidos ({analytics.totalReferrals})
        </TabButton>
        <TabButton active={activeTab === "webinars"} onClick={() => setActiveTab("webinars")}>
          🎥 Webinar ({analytics.totalWebinarRegs})
        </TabButton>
        <TabButton active={activeTab === "config"} onClick={() => setActiveTab("config")}>
          ⚙️ Configuración
        </TabButton>
      </div>

      {/* Content */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>📈 Actividad últimos 30 días</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              {/* Sesiones por día */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: "#64748b", marginBottom: 12 }}>Sesiones por día</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {Object.entries(analytics.sessionsByDay)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 14)
                    .map(([day, count]) => (
                      <div key={day} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#64748b", width: 80 }}>{day.slice(5)}</span>
                        <div
                          style={{
                            height: 20,
                            backgroundColor: "#3b82f6",
                            borderRadius: 4,
                            width: `${Math.min(count * 20, 200)}px`,
                            minWidth: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            paddingRight: 6,
                          }}
                        >
                          <span style={{ fontSize: 11, color: "white", fontWeight: 600 }}>{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Juegos por día */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: "#64748b", marginBottom: 12 }}>Juegos creados por día</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {Object.entries(analytics.gamesByDay)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 14)
                    .map(([day, count]) => (
                      <div key={day} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#64748b", width: 80 }}>{day.slice(5)}</span>
                        <div
                          style={{
                            height: 20,
                            backgroundColor: "#22c55e",
                            borderRadius: 4,
                            width: `${Math.min(count * 30, 200)}px`,
                            minWidth: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            paddingRight: 6,
                          }}
                        >
                          <span style={{ fontSize: 11, color: "white", fontWeight: 600 }}>{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Resumen */}
            <div style={{ marginTop: 32, padding: 20, backgroundColor: "#f8fafc", borderRadius: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: "#64748b", marginBottom: 16 }}>Resumen</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>{analytics.avgSessionMin}m</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Promedio por sesión</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>{analytics.completionRate}%</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Tasa de completado</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{analytics.totalReferrals}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Referidos totales</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#ec4899" }}>{analytics.totalWebinarRegs}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Registros webinar</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === "config" && (
          <div style={{ padding: 24 }}>
            {/* Referral Config */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                👥 Banner de Referidos
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={referralConfig.active}
                    onChange={(e) => setReferralConfig({ ...referralConfig, active: e.target.checked })}
                    style={{ width: 20, height: 20, cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: 500 }}>Mostrar banner de referidos</span>
                </label>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>
                    Recompensas (texto que se muestra)
                  </label>
                  <input
                    type="text"
                    value={referralConfig.rewards}
                    onChange={(e) => setReferralConfig({ ...referralConfig, rewards: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "24px 0" }} />

            {/* Webinar Config */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                🎥 Banner de Webinar
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={webinarConfig.active}
                    onChange={(e) => setWebinarConfig({ ...webinarConfig, active: e.target.checked })}
                    style={{ width: 20, height: 20, cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: 500 }}>Mostrar banner de webinar</span>
                </label>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>Título del webinar</label>
                  <input
                    type="text"
                    value={webinarConfig.title}
                    onChange={(e) => setWebinarConfig({ ...webinarConfig, title: e.target.value })}
                    placeholder="Ej: Primeros pasos con el Juego del Semáforo"
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>Tema (identificador interno)</label>
                  <input
                    type="text"
                    value={webinarConfig.topic}
                    onChange={(e) => setWebinarConfig({ ...webinarConfig, topic: e.target.value })}
                    placeholder="Ej: traffic-light-basics"
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>Fecha y hora</label>
                  <input
                    type="datetime-local"
                    value={webinarConfig.date ? webinarConfig.date.slice(0, 16) : ""}
                    onChange={(e) => setWebinarConfig({ ...webinarConfig, date: e.target.value + ":00" })}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>Idioma del webinar (opcional)</label>
                  <select
                    value={webinarConfig.language || ""}
                    onChange={(e) => setWebinarConfig({ ...webinarConfig, language: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      fontSize: 14,
                      boxSizing: "border-box",
                      background: "white",
                    }}
                  >
                    <option value="">Todos los idiomas</option>
                    <option value="es">Solo Español</option>
                    <option value="en">Solo English</option>
                    <option value="pt">Solo Português</option>
                  </select>
                  <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Si seleccionás un idioma, solo los usuarios con ese idioma verán el banner
                  </p>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={webinarConfig.requireFinishedGame || false}
                    onChange={(e) => setWebinarConfig({ ...webinarConfig, requireFinishedGame: e.target.checked })}
                    style={{ width: 20, height: 20, cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: 500 }}>Solo mostrar a docentes con al menos 1 juego completado</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={webinarConfig.dismissible}
                    onChange={(e) => setWebinarConfig({ ...webinarConfig, dismissible: e.target.checked })}
                    style={{ width: 20, height: 20, cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: 500 }}>Permitir cerrar el banner</span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={handleSaveConfig}
                disabled={configSaving}
                style={{
                  padding: "12px 24px",
                  fontSize: 16,
                  fontWeight: 600,
                  backgroundColor: configSaving ? "#9ca3af" : "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: configSaving ? "not-allowed" : "pointer",
                }}
              >
                {configSaving ? "Guardando..." : "💾 Guardar configuración"}
              </button>

              {configSaved && (
                <span style={{ color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  ✅ Guardado correctamente
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tables */}
        {activeTab !== "config" && activeTab !== "analytics" && (
          <div style={{ overflowX: "auto" }}>
            {activeTab === "teachers" && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    <Th>Email</Th>
                    <Th>Sesiones</Th>
                    <Th>Tiempo total</Th>
                    <Th>Creados</Th>
                    <Th>Completados</Th>
                    <Th>Último login</Th>
                  </tr>
                </thead>
                <tbody>
                  {teacherRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                        {t.admin.noData}
                      </td>
                    </tr>
                  ) : (
                    teacherRows
                      .sort((a, b) => b.totalDurationSec - a.totalDurationSec)
                      .map((r) => (
                        <tr key={r.uid} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <Td>{r.email}</Td>
                          <Td>{r.sessionCount}</Td>
                          <Td style={{ fontWeight: 600, color: "#06b6d4" }}>{formatDuration(r.totalDurationSec)}</Td>
                          <Td>{r.gamesCreatedCount}</Td>
                          <Td>
                            <span
                              style={{
                                padding: "4px 8px",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                backgroundColor: r.gamesCompletedCount > 0 ? "#d1fae5" : "#f1f5f9",
                                color: r.gamesCompletedCount > 0 ? "#065f46" : "#64748b",
                              }}
                            >
                              {r.gamesCompletedCount}
                            </span>
                          </Td>
                          <Td>{formatTs(r.lastLoginAt)}</Td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "referrals" && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    <Th>Fecha</Th>
                    <Th>Referidor</Th>
                    <Th>Referido</Th>
                    <Th>Email Referido</Th>
                    <Th>Escuela</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {referralRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                        No hay referidos todavía
                      </td>
                    </tr>
                  ) : (
                    referralRows.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <Td>{formatTs(r.createdAt)}</Td>
                        <Td>
                          <div style={{ fontSize: 14 }}>{r.referrerName || "-"}</div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>{r.referrerEmail}</div>
                        </Td>
                        <Td>{r.referredName}</Td>
                        <Td>{r.referredEmail}</Td>
                        <Td>{r.referredSchool || "-"}</Td>
                        <Td>
                          <StatusBadge status={r.status} />
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "webinars" && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    <Th>Fecha Registro</Th>
                    <Th>Nombre</Th>
                    <Th>Email</Th>
                    <Th>Escuela</Th>
                    <Th>Experiencia</Th>
                    <Th>Preguntas</Th>
                  </tr>
                </thead>
                <tbody>
                  {webinarRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                        No hay registros de webinar todavía
                      </td>
                    </tr>
                  ) : (
                    webinarRows.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <Td>{formatTs(r.registeredAt)}</Td>
                        <Td>{r.name}</Td>
                        <Td>{r.email}</Td>
                        <Td>{r.school || "-"}</Td>
                        <Td>
                          <ExperienceBadge experience={r.experience} />
                        </Td>
                        <Td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.questions || "-"}
                        </Td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
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

function StatCard({ label, value, icon, color, isText }: { label: string; value: string | number; icon: string; color: string; isText?: boolean }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 20,
        minWidth: 140,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
      </div>
      <div style={{ fontSize: isText ? 20 : 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 16px",
        fontSize: 14,
        fontWeight: 600,
        backgroundColor: active ? "#3b82f6" : "white",
        color: active ? "white" : "#64748b",
        border: active ? "none" : "1px solid #e2e8f0",
        borderRadius: 8,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "#fef3c7", color: "#92400e", label: "Pendiente" },
    contacted: { bg: "#dbeafe", color: "#1e40af", label: "Contactado" },
    registered: { bg: "#d1fae5", color: "#065f46", label: "Registrado" },
    rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rechazado" },
  };

  const style = styles[status] || styles.pending;

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  );
}

function ExperienceBadge({ experience }: { experience: string }) {
  const labels: Record<string, string> = {
    none: "Nunca usó",
    explored: "Exploró",
    used: "Usó en clase",
    regular: "Usa regularmente",
  };

  const colors: Record<string, { bg: string; color: string }> = {
    none: { bg: "#f1f5f9", color: "#64748b" },
    explored: { bg: "#dbeafe", color: "#1e40af" },
    used: { bg: "#d1fae5", color: "#065f46" },
    regular: { bg: "#fef3c7", color: "#92400e" },
  };

  const label = labels[experience] || experience;
  const style = colors[experience] || colors.none;

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
      }}
    >
      {label}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "14px 16px",
        fontSize: 12,
        fontWeight: 600,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td
      style={{
        padding: "14px 16px",
        fontSize: 14,
        ...style,
      }}
    >
      {children}
    </td>
  );
}