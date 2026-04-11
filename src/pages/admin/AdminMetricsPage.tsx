// src/pages/admin/AdminMetricsPage.tsx
// ✅ ACTUALIZADO: Soporte para dos webinars independientes (primaria y secundaria)

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get, set } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";
import { ConnectionIndicator, ConnectionPeakChart } from "../../components/ConnectionIndicator";

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

type SortDir = 1 | -1;

export function AdminMetricsPage() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Record<string, TeacherMetrics>>({});
  const [referrals, setReferrals] = useState<Record<string, Referral>>({});
  const [webinarRegistrations, setWebinarRegistrations] = useState<Record<string, WebinarRegistration>>({});
  const [games, setGames] = useState<Record<string, GameData>>({});
  const [activeTab, setActiveTab] = useState<"teachers" | "referrals" | "webinars" | "analytics" | "config">("teachers");

  const [teacherSort, setTeacherSort] = useState<{ col: string; dir: SortDir }>({ col: "totalDurationSec", dir: -1 });
  const [teacherSearch, setTeacherSearch] = useState("");
  const [webinarSort, setWebinarSort] = useState<{ col: string; dir: SortDir }>({ col: "registeredAt", dir: -1 });
  const [webinarSearch, setWebinarSearch] = useState("");
  const [webinarExpFilter, setWebinarExpFilter] = useState("todos");
  const [referralSort, setReferralSort] = useState<{ col: string; dir: SortDir }>({ col: "createdAt", dir: -1 });

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
  const [webinarConfig2, setWebinarConfig2] = useState<WebinarConfig>({
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
      const [teachersSnap, referralsSnap, webinarsSnap, referralConfigSnap, webinarConfigSnap, webinarConfig2Snap, gamesSnap] = await Promise.all([
        get(ref(database, "metrics/teachers")),
        get(ref(database, "referrals")),
        get(ref(database, "webinarRegistrations")),
        get(ref(database, "config/referral")),
        get(ref(database, "config/webinar")),
        get(ref(database, "config/webinar2")),
        get(ref(database, "games")),
      ]);
      setTeachers((teachersSnap.val() as Record<string, TeacherMetrics>) ?? {});
      setReferrals((referralsSnap.val() as Record<string, Referral>) ?? {});
      setWebinarRegistrations((webinarsSnap.val() as Record<string, WebinarRegistration>) ?? {});
      setGames((gamesSnap.val() as Record<string, GameData>) ?? {});
      if (referralConfigSnap.exists()) setReferralConfig(referralConfigSnap.val());
      if (webinarConfigSnap.exists()) setWebinarConfig(webinarConfigSnap.val());
      if (webinarConfig2Snap.exists()) setWebinarConfig2(webinarConfig2Snap.val());
      setLoading(false);
    }
    load();
  }, []);

  const gamesCompletedByTeacher = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [, gameData] of Object.entries(games)) {
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
      let totalDurationSec = 0;
      for (const session of sessions) {
        if (session.durationSec) totalDurationSec += session.durationSec;
        else if (session.loginAt && session.logoutAt) totalDurationSec += Math.floor((session.logoutAt - session.loginAt) / 1000);
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

  const sortedTeachers = useMemo(() => {
    const q = teacherSearch.toLowerCase();
    let rows = q ? teacherRows.filter(r => r.email.toLowerCase().includes(q)) : [...teacherRows];
    rows.sort((a, b) => {
      const va = (a as any)[teacherSort.col] ?? 0;
      const vb = (b as any)[teacherSort.col] ?? 0;
      if (typeof va === "string") return va.localeCompare(vb) * teacherSort.dir;
      return (va - vb) * teacherSort.dir;
    });
    return rows;
  }, [teacherRows, teacherSort, teacherSearch]);

  const referralRows = useMemo(() => {
    return Object.entries(referrals).map(([id, data]) => ({ id, ...data }));
  }, [referrals]);

  const sortedReferrals = useMemo(() => {
    return [...referralRows].sort((a, b) => {
      const va = (a as any)[referralSort.col] ?? "";
      const vb = (b as any)[referralSort.col] ?? "";
      if (typeof va === "number") return (va - vb) * referralSort.dir;
      return String(va).localeCompare(String(vb)) * referralSort.dir;
    });
  }, [referralRows, referralSort]);

  const webinarRows = useMemo(() => {
    return Object.entries(webinarRegistrations).map(([id, data]) => ({ id, ...data }));
  }, [webinarRegistrations]);

  const sortedWebinar = useMemo(() => {
    const q = webinarSearch.toLowerCase();
    let rows = webinarRows.filter(r => {
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.school ?? "").toLowerCase().includes(q);
      const matchExp = webinarExpFilter === "todos" ? true :
        webinarExpFilter === "con-pregunta" ? !!r.questions :
        r.experience === webinarExpFilter;
      return matchSearch && matchExp;
    });
    rows.sort((a, b) => {
      const va = (a as any)[webinarSort.col] ?? "";
      const vb = (b as any)[webinarSort.col] ?? "";
      if (typeof va === "number") return (va - vb) * webinarSort.dir;
      return String(va).localeCompare(String(vb)) * webinarSort.dir;
    });
    return rows;
  }, [webinarRows, webinarSort, webinarSearch, webinarExpFilter]);

  const analytics = useMemo(() => {
    const totalTeachers = teacherRows.length;
    const totalSessions = teacherRows.reduce((acc, r) => acc + r.sessionCount, 0);
    const totalGamesCreated = teacherRows.reduce((acc, r) => acc + r.gamesCreatedCount, 0);
    const totalGamesCompleted = teacherRows.reduce((acc, r) => acc + r.gamesCompletedCount, 0);
    const totalDurationSec = teacherRows.reduce((acc, r) => acc + r.totalDurationSec, 0);
    const totalReferrals = referralRows.length;
    const totalWebinarRegs = webinarRows.length;
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
    const gamesByDay: Record<string, number> = {};
    for (const game of Object.values(games)) {
      const createdAt = game.config?.createdAt || game.createdAt;
      if (createdAt && createdAt >= thirtyDaysAgo) {
        const day = new Date(createdAt).toISOString().split("T")[0];
        gamesByDay[day] = (gamesByDay[day] || 0) + 1;
      }
    }
    const completionRate = totalGamesCreated > 0 ? Math.round((totalGamesCompleted / totalGamesCreated) * 100) : 0;
    const avgSessionMin = totalSessions > 0 ? Math.round(totalDurationSec / totalSessions / 60) : 0;
    return { totalTeachers, totalSessions, totalGamesCreated, totalGamesCompleted, totalDurationSec, totalReferrals, totalWebinarRegs, sessionsByDay, gamesByDay, completionRate, avgSessionMin };
  }, [teacherRows, referralRows, webinarRows, teachers, games]);

  const handleDownloadCSV = () => {
    const headers = ["Email", "UID", "Sesiones", "Tiempo (min)", "Juegos Creados", "Juegos Completados", "Último login", "Último acceso"];
    const csvRows = teacherRows
      .sort((a, b) => b.totalDurationSec - a.totalDurationSec)
      .map((r) => [r.email, r.uid, r.sessionCount, Math.round(r.totalDurationSec / 60), r.gamesCreatedCount, r.gamesCompletedCount, r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString() : "-", r.lastAccessAt ? new Date(r.lastAccessAt).toLocaleString() : "-"]);
    const csvContent = [headers.join(","), ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
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
        set(ref(database, "config/webinar2"), webinarConfig2),
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
    return new Date(ts).toLocaleString(language === "es" ? "es-AR" : language === "pt" ? "pt-BR" : "en-US", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const handleTeacherSort = (col: string) => {
    setTeacherSort(prev => ({ col, dir: prev.col === col ? (prev.dir === 1 ? -1 : 1) as SortDir : -1 }));
  };
  const handleWebinarSort = (col: string) => {
    setWebinarSort(prev => ({ col, dir: prev.col === col ? (prev.dir === 1 ? -1 : 1) as SortDir : -1 }));
  };
  const handleReferralSort = (col: string) => {
    setReferralSort(prev => ({ col, dir: prev.col === col ? (prev.dir === 1 ? -1 : 1) as SortDir : -1 }));
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📊 {t.admin.title}</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => navigate("/admin/library/bulk")} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, backgroundColor: "#8b5cf6", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
            📦 Bulk Upload
          </button>
          <button onClick={handleDownloadCSV} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, backgroundColor: "#22c55e", color: "white", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            📥 {t.admin.downloadExcel}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <StatCard label="Docentes" value={analytics.totalTeachers} icon="👨‍🏫" color="#3b82f6" />
        <StatCard label="Sesiones" value={analytics.totalSessions} icon="🔐" color="#8b5cf6" />
        <StatCard label="Tiempo total" value={formatDuration(analytics.totalDurationSec)} icon="⏱️" color="#06b6d4" isText />
        <StatCard label="Juegos creados" value={analytics.totalGamesCreated} icon="🎮" color="#22c55e" />
        <StatCard label="Completados" value={`${analytics.totalGamesCompleted} (${analytics.completionRate}%)`} icon="✅" color="#10b981" isText />
        <ConnectionIndicator compact />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <TabButton active={activeTab === "teachers"} onClick={() => setActiveTab("teachers")}>👨‍🏫 Docentes</TabButton>
        <TabButton active={activeTab === "analytics"} onClick={() => setActiveTab("analytics")}>📈 Analytics</TabButton>
        <TabButton active={activeTab === "referrals"} onClick={() => setActiveTab("referrals")}>👥 Referidos ({analytics.totalReferrals})</TabButton>
        <TabButton active={activeTab === "webinars"} onClick={() => setActiveTab("webinars")}>🎥 Webinar ({analytics.totalWebinarRegs})</TabButton>
        <TabButton active={activeTab === "config"} onClick={() => setActiveTab("config")}>⚙️ Configuración</TabButton>
      </div>

      <div style={{ backgroundColor: "white", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", overflow: "hidden" }}>

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>📈 Actividad últimos 30 días</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: "#64748b", marginBottom: 12 }}>Sesiones por día</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {Object.entries(analytics.sessionsByDay).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14).map(([day, count]) => (
                    <div key={day} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#64748b", width: 80 }}>{day.slice(5)}</span>
                      <div style={{ height: 20, backgroundColor: "#3b82f6", borderRadius: 4, width: `${Math.min(count * 20, 200)}px`, minWidth: 20, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
                        <span style={{ fontSize: 11, color: "white", fontWeight: 600 }}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: "#64748b", marginBottom: 12 }}>Juegos creados por día</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {Object.entries(analytics.gamesByDay).sort(([a], [b]) => b.localeCompare(a)).slice(0, 14).map(([day, count]) => (
                    <div key={day} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#64748b", width: 80 }}>{day.slice(5)}</span>
                      <div style={{ height: 20, backgroundColor: "#22c55e", borderRadius: 4, width: `${Math.min(count * 30, 200)}px`, minWidth: 20, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6 }}>
                        <span style={{ fontSize: 11, color: "white", fontWeight: 600 }}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 32, padding: 20, backgroundColor: "#f8fafc", borderRadius: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: "#64748b", marginBottom: 16 }}>Resumen</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
                <div><div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>{analytics.avgSessionMin}m</div><div style={{ fontSize: 12, color: "#64748b" }}>Promedio por sesión</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>{analytics.completionRate}%</div><div style={{ fontSize: 12, color: "#64748b" }}>Tasa de completado</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{analytics.totalReferrals}</div><div style={{ fontSize: 12, color: "#64748b" }}>Referidos totales</div></div>
                <div><div style={{ fontSize: 24, fontWeight: 700, color: "#ec4899" }}>{analytics.totalWebinarRegs}</div><div style={{ fontSize: 12, color: "#64748b" }}>Registros webinar</div></div>
              </div>
            </div>
            <div style={{ marginTop: 32 }}>
              <ConnectionIndicator />
              <div style={{ marginTop: 24 }}><ConnectionPeakChart days={30} /></div>
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === "config" && (
          <div style={{ padding: 24 }}>

            {/* Banner Referidos */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>👥 Banner de Referidos</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={referralConfig.active} onChange={(e) => setReferralConfig({ ...referralConfig, active: e.target.checked })} style={{ width: 20, height: 20, cursor: "pointer" }} />
                  <span style={{ fontWeight: 500 }}>Mostrar banner de referidos</span>
                </label>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>Recompensas (texto que se muestra)</label>
                  <input type="text" value={referralConfig.rewards} onChange={(e) => setReferralConfig({ ...referralConfig, rewards: e.target.value })} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "24px 0" }} />

            {/* Webinar 1 — Primaria */}
            <div style={{ marginBottom: 32, padding: 20, backgroundColor: "#f0fdf4", borderRadius: 12, border: "1px solid #86efac" }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: "#166534" }}>🟢 Webinar 1 — Primaria</h3>
              <p style={{ fontSize: 13, color: "#4b7c5b", marginTop: 0, marginBottom: 16 }}>Para docentes de nivel primario.</p>
              <WebinarConfigForm config={webinarConfig} setConfig={setWebinarConfig} />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "24px 0" }} />

            {/* Webinar 2 — Secundaria */}
            <div style={{ marginBottom: 32, padding: 20, backgroundColor: "#eff6ff", borderRadius: 12, border: "1px solid #93c5fd" }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: "#1e40af" }}>🔵 Webinar 2 — Secundaria</h3>
              <p style={{ fontSize: 13, color: "#3b5fad", marginTop: 0, marginBottom: 16 }}>Para docentes de nivel secundario.</p>
              <WebinarConfigForm config={webinarConfig2} setConfig={setWebinarConfig2} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button onClick={handleSaveConfig} disabled={configSaving} style={{ padding: "12px 24px", fontSize: 16, fontWeight: 600, backgroundColor: configSaving ? "#9ca3af" : "#3b82f6", color: "white", border: "none", borderRadius: 8, cursor: configSaving ? "not-allowed" : "pointer" }}>
                {configSaving ? "Guardando..." : "💾 Guardar configuración"}
              </button>
              {configSaved && <span style={{ color: "#10b981", fontWeight: 600 }}>✅ Guardado correctamente</span>}
            </div>

          </div>
        )}

        {/* Tables */}
        {activeTab !== "config" && activeTab !== "analytics" && (
          <div>
            {(activeTab === "teachers" || activeTab === "webinars") && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder={activeTab === "teachers" ? "Buscar por email..." : "Buscar por nombre, email o escuela..."}
                  value={activeTab === "teachers" ? teacherSearch : webinarSearch}
                  onChange={e => activeTab === "teachers" ? setTeacherSearch(e.target.value) : setWebinarSearch(e.target.value)}
                  style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: 13, minWidth: 220 }}
                />
                {activeTab === "webinars" && (
                  <>
                    {["todos", "Exploró", "Nunca usó", "con-pregunta"].map(f => (
                      <button key={f} onClick={() => setWebinarExpFilter(f)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, border: "1px solid #e2e8f0", backgroundColor: webinarExpFilter === f ? "#1e293b" : "white", color: webinarExpFilter === f ? "white" : "#64748b", cursor: "pointer", fontWeight: webinarExpFilter === f ? 600 : 400 }}>
                        {f === "con-pregunta" ? "Con pregunta" : f === "todos" ? "Todos" : f}
                      </button>
                    ))}
                  </>
                )}
                <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
                  {activeTab === "teachers" ? `${sortedTeachers.length} de ${teacherRows.length}` : `${sortedWebinar.length} de ${webinarRows.length}`}
                </span>
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              {activeTab === "teachers" && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      <ThSort label="Email" col="email" sort={teacherSort} onClick={handleTeacherSort} />
                      <ThSort label="Sesiones" col="sessionCount" sort={teacherSort} onClick={handleTeacherSort} />
                      <ThSort label="Tiempo total" col="totalDurationSec" sort={teacherSort} onClick={handleTeacherSort} />
                      <ThSort label="Creados" col="gamesCreatedCount" sort={teacherSort} onClick={handleTeacherSort} />
                      <ThSort label="Completados" col="gamesCompletedCount" sort={teacherSort} onClick={handleTeacherSort} />
                      <ThSort label="Último login" col="lastLoginAt" sort={teacherSort} onClick={handleTeacherSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeachers.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>{t.admin.noData}</td></tr>
                    ) : sortedTeachers.map((r) => (
                      <tr key={r.uid} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <Td>{r.email}</Td>
                        <Td>{r.sessionCount}</Td>
                        <Td style={{ fontWeight: 600, color: "#06b6d4" }}>{formatDuration(r.totalDurationSec)}</Td>
                        <Td>{r.gamesCreatedCount}</Td>
                        <Td>
                          <span style={{ padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: r.gamesCompletedCount > 0 ? "#d1fae5" : "#f1f5f9", color: r.gamesCompletedCount > 0 ? "#065f46" : "#64748b" }}>
                            {r.gamesCompletedCount}
                          </span>
                        </Td>
                        <Td>{formatTs(r.lastLoginAt)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "referrals" && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      <ThSort label="Fecha" col="createdAt" sort={referralSort} onClick={handleReferralSort} />
                      <ThSort label="Referidor" col="referrerName" sort={referralSort} onClick={handleReferralSort} />
                      <ThSort label="Referido" col="referredName" sort={referralSort} onClick={handleReferralSort} />
                      <ThSort label="Email Referido" col="referredEmail" sort={referralSort} onClick={handleReferralSort} />
                      <ThSort label="Escuela" col="referredSchool" sort={referralSort} onClick={handleReferralSort} />
                      <ThSort label="Estado" col="status" sort={referralSort} onClick={handleReferralSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReferrals.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No hay referidos todavía</td></tr>
                    ) : sortedReferrals.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <Td>{formatTs(r.createdAt)}</Td>
                        <Td><div style={{ fontSize: 14 }}>{r.referrerName || "-"}</div><div style={{ fontSize: 12, color: "#64748b" }}>{r.referrerEmail}</div></Td>
                        <Td>{r.referredName}</Td>
                        <Td>{r.referredEmail}</Td>
                        <Td>{r.referredSchool || "-"}</Td>
                        <Td><StatusBadge status={r.status} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "webinars" && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      <ThSort label="Fecha Registro" col="registeredAt" sort={webinarSort} onClick={handleWebinarSort} />
                      <ThSort label="Nombre" col="name" sort={webinarSort} onClick={handleWebinarSort} />
                      <ThSort label="Email" col="email" sort={webinarSort} onClick={handleWebinarSort} />
                      <ThSort label="Escuela" col="school" sort={webinarSort} onClick={handleWebinarSort} />
                      <ThSort label="Experiencia" col="experience" sort={webinarSort} onClick={handleWebinarSort} />
                      <Th>Preguntas</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedWebinar.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No hay registros</td></tr>
                    ) : sortedWebinar.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <Td>{formatTs(r.registeredAt)}</Td>
                        <Td>{r.name}</Td>
                        <Td>{r.email}</Td>
                        <Td>{r.school || "-"}</Td>
                        <Td><ExperienceBadge experience={r.experience} /></Td>
                        <Td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.questions || "-"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button onClick={() => navigate("/")} style={{ color: "#3b82f6", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>
          ← {t.admin.backToSetup}
        </button>
      </div>
    </div>
  );
}

// ── Componente reutilizable para formulario de webinar ──
function WebinarConfigForm({
  config,
  setConfig,
}: {
  config: WebinarConfig;
  setConfig: React.Dispatch<React.SetStateAction<WebinarConfig>>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={config.active} onChange={(e) => setConfig({ ...config, active: e.target.checked })} style={{ width: 20, height: 20, cursor: "pointer" }} />
        <span style={{ fontWeight: 500 }}>Mostrar banner de webinar</span>
      </label>
      <div>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>Título del webinar</label>
        <input type="text" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} placeholder="Ej: Primeros pasos con el Juego del Semáforo" style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>Tema (identificador interno)</label>
        <input type="text" value={config.topic} onChange={(e) => setConfig({ ...config, topic: e.target.value })} placeholder="Ej: primaria / secundaria" style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>Fecha y hora</label>
        <input type="datetime-local" value={config.date ? config.date.slice(0, 16) : ""} onChange={(e) => setConfig({ ...config, date: e.target.value + ":00" })} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
      </div>
      <div>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>Idioma del webinar (opcional)</label>
        <select value={config.language || ""} onChange={(e) => setConfig({ ...config, language: e.target.value })} style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box", background: "white" }}>
          <option value="">Todos los idiomas</option>
          <option value="es">Solo Español</option>
          <option value="en">Solo English</option>
          <option value="pt">Solo Português</option>
        </select>
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Si seleccionás un idioma, solo los usuarios con ese idioma verán el banner</p>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={config.requireFinishedGame || false} onChange={(e) => setConfig({ ...config, requireFinishedGame: e.target.checked })} style={{ width: 20, height: 20, cursor: "pointer" }} />
        <span style={{ fontWeight: 500 }}>Solo mostrar a docentes con al menos 1 juego completado</span>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={config.dismissible} onChange={(e) => setConfig({ ...config, dismissible: e.target.checked })} style={{ width: 20, height: 20, cursor: "pointer" }} />
        <span style={{ fontWeight: 500 }}>Permitir cerrar el banner</span>
      </label>
    </div>
  );
}

function ThSort({ label, col, sort, onClick }: { label: string; col: string; sort: { col: string; dir: SortDir }; onClick: (col: string) => void }) {
  const isActive = sort.col === col;
  return (
    <th onClick={() => onClick(col)} style={{ textAlign: "left", padding: "14px 16px", fontSize: 12, fontWeight: 600, color: isActive ? "#1e293b" : "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
      {label}
      <span style={{ marginLeft: 4, opacity: isActive ? 1 : 0.3, fontSize: 10 }}>
        {isActive ? (sort.dir === -1 ? "▼" : "▲") : "▲▼"}
      </span>
    </th>
  );
}

function StatCard({ label, value, icon, color, isText }: { label: string; value: string | number; icon: string; color: string; isText?: boolean }) {
  return (
    <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, minWidth: 140, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
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
    <button onClick={onClick} style={{ padding: "10px 16px", fontSize: 14, fontWeight: 600, backgroundColor: active ? "#3b82f6" : "white", color: active ? "white" : "#64748b", border: active ? "none" : "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}>
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
  return <span style={{ padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, backgroundColor: style.bg, color: style.color }}>{style.label}</span>;
}

function ExperienceBadge({ experience }: { experience: string }) {
  const labels: Record<string, string> = { none: "Nunca usó", explored: "Exploró", used: "Usó en clase", regular: "Usa regularmente" };
  const colors: Record<string, { bg: string; color: string }> = {
    none: { bg: "#f1f5f9", color: "#64748b" },
    explored: { bg: "#dbeafe", color: "#1e40af" },
    used: { bg: "#d1fae5", color: "#065f46" },
    regular: { bg: "#fef3c7", color: "#92400e" },
  };
  const label = labels[experience] || experience;
  const style = colors[experience] || colors.none;
  return <span style={{ padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, backgroundColor: style.bg, color: style.color }}>{label}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{children}</th>;
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "14px 16px", fontSize: 14, ...style }}>{children}</td>;
}