// src/pages/LibraryPage.tsx
// ✅ NUEVO: Modal de vista previa de preguntas antes de usar un juego
// ✅ NUEVO: Duplicar juego (copia editable)
// ✅ NUEVO: Botón "Guardar copia" en juegos de la comunidad

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useGameMode } from "../contexts/GameModeContext";
import { useI18n, LanguageSelector } from "../i18n";

import { TeacherGameCard } from "../components/library/TeacherGameCard";
import { EditGameModal } from "../components/library/EditGameModal";
import { ReportGameModal } from "../components/library/ReportGameModal";

import {
  getMyGames, getCommunityGames, deleteTeacherGame, updateTeacherGame,
  copyGameToMyLibrary, rateGame, getMyRating, getTeacherGameCSV,
  incrementGameUsage, getGameStats, reportGame,
} from "../services/teacherLibraryService";

import type { LibraryGameMode, PrimaryGrade, Area, Subject, LibraryLanguage } from "../types/library";
import { AREAS_ES, AREAS_EN, AREAS_PT, SUBJECTS_ES, SUBJECTS_EN, SUBJECTS_PT } from "../types/library";
import type { TeacherGame, TeacherLibraryFilters, ReportReason } from "../types/teacherLibrary";
import { TEACHER_LIMITS } from "../types/teacherLibrary";

type TabType = "my-games" | "community";

interface PreviewQuestion {
  id: string;
  text: string;
  hint?: string;
  suggestedStage?: 1 | 2;
}

// ============================================
// Helpers de encoding
// ============================================

function scoreText(text: string): number {
  const repl = (text.match(/\uFFFD/g) || []).length;
  const mojibake = (text.match(/\u00C3|\u00C2|\u00E2/g) || []).length;
  return repl * 10 + mojibake * 3;
}

function decodeArrayBufferBestEffort(buf: ArrayBuffer): { text: string } {
  const bytes = new Uint8Array(buf);
  const encodings = ["utf-8", "windows-1252", "iso-8859-1"] as const;
  const candidates = encodings.map((enc) => {
    let decoded = "";
    try { decoded = new TextDecoder(enc, { fatal: false }).decode(bytes); } catch { decoded = ""; }
    return { encoding: enc, score: scoreText(decoded), text: decoded };
  });
  const sorted = [...candidates].sort((a, b) => a.score - b.score);
  const bestScore = sorted[0]?.score ?? 0;
  const bestEncodings = sorted.filter((c) => c.score === bestScore).map((c) => c.encoding);
  const chosen = bestEncodings.includes("utf-8") ? "utf-8" : (sorted[0]?.encoding ?? "utf-8");
  const text = new TextDecoder(chosen, { fatal: false }).decode(bytes);
  return { text };
}

function parseCSVToQuestions(csvText: string): PreviewQuestion[] {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const questions: PreviewQuestion[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < lines[i].length; j++) {
      const ch = lines[i][j];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { row.push(current); current = ''; }
      else { current += ch; }
    }
    row.push(current);
    if (row[0]?.trim()) {
      questions.push({
        id: `q${i}`,
        text: row[0]?.trim() || '',
        hint: row[1]?.trim() || '',
        suggestedStage: row[2]?.trim() === '2' ? 2 : 1,
      });
    }
  }
  return questions;
}

function questionsToCSV(questions: PreviewQuestion[]): string {
  const lines = ['text,hint,stage'];
  for (const q of questions) {
    const text = `"${(q.text || '').replace(/"/g, '""')}"`;
    const hint = `"${(q.hint || '').replace(/"/g, '""')}"`;
    lines.push(`${text},${hint},${q.suggestedStage || 1}`);
  }
  return lines.join('\n');
}

// ============================================
// QuestionsPreviewModal
// ============================================

function QuestionsPreviewModal({
  game,
  onClose,
  onConfirm,
}: {
  game: TeacherGame;
  onClose: () => void;
  onConfirm: (csvContent: string, questions: PreviewQuestion[]) => void;
}) {
  const { language } = useI18n();
  const [questions, setQuestions] = useState<PreviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvContent, setCsvContent] = useState('');

  const lang = language as string;

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const file = await getTeacherGameCSV(game);
      const buf = await file.arrayBuffer();
      const { text } = decodeArrayBufferBestEffort(buf);
      setCsvContent(text);
      setQuestions(parseCSVToQuestions(text));
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const updatedCSV = questionsToCSV(questions);
    onConfirm(updatedCSV, questions);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: 20 }}
      onClick={onClose}>
      <div style={{ backgroundColor: 'white', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              👁️ {lang === 'es' ? 'Vista previa de preguntas' : 'Questions preview'}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, opacity: 0.9 }}>
              {game.title} · {lang === 'es' ? 'Podés editar o eliminar preguntas antes de usar el juego' : 'You can edit or remove questions before using'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
              <p>{lang === 'es' ? 'Cargando preguntas...' : 'Loading questions...'}</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1e40af' }}>
                ✏️ {lang === 'es'
                  ? 'Podés editar o eliminar preguntas antes de usar el juego. Los cambios son solo para esta sesión.'
                  : 'You can edit or remove questions. Changes apply to this session only.'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {questions.map((q, i) => (
                  <div key={q.id} style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ padding: '2px 8px', backgroundColor: '#6366f1', color: 'white', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 4 }}>{i + 1}</span>
                      <button
                        onClick={() => setQuestions(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ padding: '2px 7px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', flexShrink: 0, marginTop: 3 }}>✕</button>
                      <div style={{ flex: 1 }}>
                        <textarea
                          value={q.text}
                          onChange={(e) => setQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, text: e.target.value } : item))}
                          rows={2}
                          style={{ width: '100%', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', resize: 'vertical', fontFamily: 'inherit', backgroundColor: '#fff', boxSizing: 'border-box' }}
                        />
                        {q.hint && (
                          <div style={{ marginTop: 4, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                            💡 {q.hint}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{lang === 'es' ? 'Etapa:' : 'Stage:'}</span>
                          {([1, 2] as const).map(stage => (
                            <button key={stage}
                              onClick={() => setQuestions(prev => prev.map((item, idx) => idx === i ? { ...item, suggestedStage: stage } : item))}
                              style={{
                                padding: '2px 10px', fontSize: 11, fontWeight: 600, borderRadius: 20, border: 'none', cursor: 'pointer',
                                backgroundColor: (q.suggestedStage ?? 1) === stage ? (stage === 1 ? '#22c55e' : '#ef4444') : '#f1f5f9',
                                color: (q.suggestedStage ?? 1) === stage ? 'white' : '#94a3b8',
                              }}>
                              {stage === 1 ? `🟢 ${lang === 'es' ? 'Etapa 1' : 'Stage 1'}` : `🔴 ${lang === 'es' ? 'Etapa 2' : 'Stage 2'}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '12px', fontSize: 14, fontWeight: 600, borderRadius: 10, border: '2px solid #e2e8f0', backgroundColor: 'white', color: '#64748b', cursor: 'pointer' }}>
            {lang === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
          <button onClick={handleConfirm} disabled={loading || questions.length === 0}
            style={{ flex: 2, padding: '12px', fontSize: 14, fontWeight: 700, borderRadius: 10, border: 'none', background: loading || questions.length === 0 ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', cursor: loading || questions.length === 0 ? 'not-allowed' : 'pointer' }}>
            ▶ {lang === 'es' ? `Usar estas ${questions.length} preguntas` : `Use these ${questions.length} questions`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Strings locales
// ============================================

const COMMUNITY_EMPTY = {
  es: { title: "Todavía no hay actividades compartidas", description: "Cuando otros docentes compartan sus actividades, aparecerán acá. ¡Podés ser el primero en compartir la tuya desde \"Mis Juegos\"!" },
  en: { title: "No shared activities yet", description: "When other teachers share their activities, they'll appear here. You can be the first to share yours from \"My Games\"!" },
  pt: { title: "Ainda não há atividades compartilhadas", description: "Quando outros professores compartilharem suas atividades, elas aparecerão aqui." },
};

// ============================================
// MAIN COMPONENT
// ============================================

export function LibraryPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { theme } = useGameMode();
  const { t, language: appLang } = useI18n();

  const [activeTab, setActiveTab] = useState<TabType>("community");
  const [myGames, setMyGames] = useState<TeacherGame[]>([]);
  const [isLoadingMyGames, setIsLoadingMyGames] = useState(false);
  const [myStats, setMyStats] = useState({ privateCount: 0, publicCount: 0, totalUses: 0, avgRating: 0 });
  const [communityGames, setCommunityGames] = useState<TeacherGame[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [editingGame, setEditingGame] = useState<TeacherGame | null>(null);
  const [reportingGame, setReportingGame] = useState<TeacherGame | null>(null);
  const [previewGame, setPreviewGame] = useState<TeacherGame | null>(null);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const [gameMode, setGameMode] = useState<LibraryGameMode | "all">("all");
  const [grade, setGrade] = useState<PrimaryGrade | "all">("all");
  const [area, setArea] = useState<Area | "all">("all");
  const [subject, setSubject] = useState<Subject | "all">("all");
  const [language, setLanguage] = useState<LibraryLanguage | "all">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "rating" | "popular">("recent");

  useEffect(() => {
    if (activeTab === "my-games" && user) loadMyGames();
    else if (activeTab === "community") loadCommunityGames();
  }, [activeTab, user]);

  const loadMyGames = async () => {
    if (!user) return;
    setIsLoadingMyGames(true);
    try {
      const [games, stats] = await Promise.all([getMyGames(user.uid), getGameStats(user.uid)]);
      setMyGames(games);
      setMyStats(stats);
    } catch (error) { console.error("Error loading my games:", error); }
    finally { setIsLoadingMyGames(false); }
  };

  const loadCommunityGames = async () => {
    setIsLoadingCommunity(true);
    try {
      const filters: Partial<TeacherLibraryFilters> = {
        sortBy,
        ...(gameMode !== "all" && { gameMode }),
        ...(grade !== "all" && { grade }),
        ...(area !== "all" && { area }),
        ...(subject !== "all" && { subject }),
        ...(language !== "all" && { language }),
        ...(search && { search }),
      };
      const games = await getCommunityGames(filters);
      setCommunityGames(games);
      if (user) {
        const ratings: Record<string, number> = {};
        for (const game of games) {
          const rating = await getMyRating(game.id, user.uid);
          if (rating) ratings[game.id] = rating;
        }
        setMyRatings(ratings);
      }
    } catch (error) { console.error("Error loading community games:", error); }
    finally { setIsLoadingCommunity(false); }
  };

  useEffect(() => {
    if (activeTab === "community") loadCommunityGames();
  }, [gameMode, grade, area, subject, language, search, sortBy]);

  const filteredMyGames = useMemo(() => {
    return myGames.filter((game) => {
      if (gameMode !== "all" && game.gameMode !== gameMode) return false;
      if (grade !== "all" && game.grade !== grade) return false;
      if (area !== "all" && game.area !== area) return false;
      if (subject !== "all" && game.subject !== subject) return false;
      if (language !== "all" && game.language !== language) return false;
      if (search) {
        const sl = search.toLowerCase();
        if (!(game.title?.toLowerCase().includes(sl) || game.description?.toLowerCase().includes(sl) || game.topic?.toLowerCase().includes(sl))) return false;
      }
      return true;
    });
  }, [myGames, gameMode, grade, area, subject, language, search]);

  // ============================================
  // HANDLERS
  // ============================================

  // Abre vista previa antes de usar
  const handleUseTeacherGame = (game: TeacherGame) => {
    setPreviewGame(game);
  };

  // Confirma desde vista previa y navega al setup
  const handleConfirmPreview = (csvContent: string, questions: PreviewQuestion[]) => {
    if (!previewGame) return;
    setPreviewGame(null);
    incrementGameUsage(previewGame.id);
    navigate("/setup-traditional", {
      state: {
        fromLibrary: true,
        csvContent,
        csvFilename: previewGame.title + '.csv',
        csvTitle: previewGame.title,
        csvSubject: previewGame.subject || previewGame.area,
      },
    });
  };

  const handleDeleteTeacherGame = async (game: TeacherGame) => {
    if (!user) return;
    try {
      await deleteTeacherGame(game.id, user.uid, isAdmin);
      setMyGames((prev) => prev.filter((g) => g.id !== game.id));
      setCommunityGames((prev) => prev.filter((g) => g.id !== game.id));
      const stats = await getGameStats(user.uid);
      setMyStats(stats);
    } catch (error) { console.error("Error deleting game:", error); alert(t.errors.generic); }
  };

  const handleToggleVisibility = async (game: TeacherGame) => {
    if (!user) return;
    const newVisibility = game.visibility === "public" ? "private" : "public";
    if (newVisibility === "private" && myStats.privateCount >= TEACHER_LIMITS.maxPrivateGames) {
      alert(t.teacherLibrary.privateLimitReached); return;
    }
    try {
      await updateTeacherGame(game.id, user.uid, { visibility: newVisibility });
      setMyGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, visibility: newVisibility } : g)));
      const stats = await getGameStats(user.uid);
      setMyStats(stats);
    } catch (error) { console.error("Error updating visibility:", error); alert(t.errors.generic); }
  };

  // Copiar juego de la comunidad a mis juegos
  const handleCopyGame = async (game: TeacherGame) => {
    if (!user) return;
    if (myStats.privateCount >= TEACHER_LIMITS.maxPrivateGames) {
      alert(t.teacherLibrary.privateLimitReached); return;
    }
    try {
      await copyGameToMyLibrary(game.id, user.uid, user.displayName || t.dashboard.teacherFallbackName, user.email || "");
      alert(t.teacherLibrary.copySuccess + "\n" + t.teacherLibrary.copyAsPrivate);
      if (activeTab === "my-games") loadMyGames();
    } catch (error) { console.error("Error copying game:", error); alert(error instanceof Error ? error.message : t.errors.generic); }
  };

  // Duplicar juego propio — crea copia y abre editor
  const handleDuplicateGame = async (game: TeacherGame) => {
    if (!user) return;
    if (myStats.privateCount >= TEACHER_LIMITS.maxPrivateGames) {
      alert(t.teacherLibrary.privateLimitReached); return;
    }
    setLoadingItemId(game.id);
    try {
      await copyGameToMyLibrary(game.id, user.uid, user.displayName || "Docente", user.email || "");
      await loadMyGames();
      // Abre el editor en el juego recién copiado (aparece primero por fecha)
      const updated = await getMyGames(user.uid);
      const copy = updated[0]; // La copia es la más reciente
      if (copy) setEditingGame(copy);
    } catch (error) {
      console.error("Error duplicating game:", error);
      alert(appLang === 'es' ? 'Error al duplicar el juego' : 'Error duplicating game');
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleRateGame = async (game: TeacherGame, stars: number) => {
    if (!user || !user.email) { alert(t.errors.generic); return; }
    try {
      await rateGame(game.id, user.uid, user.email, stars);
      setMyRatings((prev) => ({ ...prev, [game.id]: stars }));
      loadCommunityGames();
    } catch (error) { console.error("Error rating game:", error); alert(error instanceof Error ? error.message : t.errors.generic); }
  };

  const handleReportGame = (game: TeacherGame) => setReportingGame(game);
  const handleEditGame = (game: TeacherGame) => setEditingGame(game);

  const handleSaveEdit = async (updates: Partial<TeacherGame>) => {
    if (!editingGame || !user) return;
    try {
      await updateTeacherGame(editingGame.id, user.uid, updates);
      setMyGames((prev) => prev.map((g) => (g.id === editingGame.id ? { ...g, ...updates, updatedAt: Date.now() } : g)));
      setEditingGame(null);
    } catch (error) { console.error("Error updating game:", error); throw error; }
  };

  const handleSubmitReport = async (reason: ReportReason, details?: string) => {
    if (!reportingGame || !user) return;
    try {
      await reportGame(reportingGame.id, user.uid, reason, details);
      loadCommunityGames();
    } catch (error) { console.error("Error reporting game:", error); throw error; }
  };

  // ============================================
  // RENDER
  // ============================================

  const showSubjectFilter = gameMode === "coopetition" || gameMode === "all";
  const showGradeFilter = gameMode === "traffic-light" || gameMode === "all";
  const isLoading = (activeTab === "my-games" && isLoadingMyGames) || (activeTab === "community" && isLoadingCommunity);
  const lang = appLang as keyof typeof COMMUNITY_EMPTY;
  const communityEmpty = COMMUNITY_EMPTY[lang] || COMMUNITY_EMPTY.es;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <header style={{ background: theme.primaryGradient, padding: "24px 32px", color: "white", boxShadow: `0 4px 20px ${theme.primary}40` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => navigate("/")} style={{ padding: "8px 12px", fontSize: 14, fontWeight: 600, backgroundColor: "rgba(255,255,255,0.2)", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
              ← {t.common.back}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 32 }}>🌐</span>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t.library.title}</h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LanguageSelector compact />
            <span style={{ fontSize: 14, opacity: 0.9 }}>{user?.email}</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, backgroundColor: "white", padding: 4, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {[
            { id: "community" as TabType, label: t.teacherLibrary.community, icon: "🌐" },
            { id: "my-games" as TabType, label: t.teacherLibrary.myGames, icon: "👤" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, padding: "14px 20px", fontSize: 15, fontWeight: 600, borderRadius: 10, border: "none", backgroundColor: activeTab === tab.id ? theme.primary : "transparent", color: activeTab === tab.id ? "white" : "#64748b", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {activeTab === "my-games" && user && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
            <StatCard value={myStats.privateCount} label={t.teacherLibrary.privateGames} sublabel={`/ ${TEACHER_LIMITS.maxPrivateGames}`} color="#6366f1" />
            <StatCard value={myStats.publicCount} label={t.teacherLibrary.publicGames} color="#22c55e" />
            <StatCard value={myStats.totalUses} label={t.teacherLibrary.totalUses} color="#f59e0b" />
            <StatCard value={myStats.avgRating ? myStats.avgRating.toFixed(1) : "-"} label={t.teacherLibrary.avgRating} color="#ec4899" />
          </div>
        )}

        {/* Filters */}
        <div style={{ backgroundColor: "white", borderRadius: 16, padding: 20, marginBottom: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
            <FilterSelect label={t.library.game} value={gameMode}
              onChange={(v) => { setGameMode(v as any); setGrade("all"); setSubject("all"); }}
              options={[{ value: "all", label: t.common.all }, { value: "traffic-light", label: `🚦 ${t.gameModes.trafficLight.title}` }, { value: "coopetition", label: `🎯 ${t.gameModes.coopetition.title}` }]} />
            {showGradeFilter && (
              <FilterSelect label={t.library.grade} value={grade} onChange={(v) => setGrade(v as any)}
                options={[{ value: "all", label: t.common.all }, ...["1", "2", "3", "4", "5", "6", "7"].map((g) => ({ value: g, label: (t.grades as any)[g] || g }))]} />
            )}
            <FilterSelect label={t.library.area} value={area} onChange={(v) => setArea(v as any)}
              options={[{ value: "all", label: t.common.all }, ...(appLang === "es" ? AREAS_ES : appLang === "pt" ? AREAS_PT : AREAS_EN).map((a) => ({ value: a, label: a }))]} />
            {showSubjectFilter && (
              <FilterSelect label={t.library.subject} value={subject} onChange={(v) => setSubject(v as any)}
                options={[{ value: "all", label: t.common.all }, ...(appLang === "es" ? SUBJECTS_ES : appLang === "pt" ? SUBJECTS_PT : SUBJECTS_EN).map((s) => ({ value: s, label: s }))]} />
            )}
            <FilterSelect label={t.setup.language} value={language} onChange={(v) => setLanguage(v as any)}
              options={[{ value: "all", label: t.common.all }, { value: "es", label: "🇪🇸 Español" }, { value: "en", label: "🇺🇸 English" }, { value: "pt", label: "🇧🇷 Português" }]} />
            {activeTab === "community" && (
              <FilterSelect label={t.teacherLibrary.sortBy} value={sortBy} onChange={(v) => setSortBy(v as any)}
                options={[{ value: "recent", label: t.teacherLibrary.recent }, { value: "rating", label: t.teacherLibrary.rating }, { value: "popular", label: t.teacherLibrary.popular }]} />
            )}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#64748b" }}>{t.common.search}</label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.library.searchPlaceholder}
                style={{ width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 8, border: "2px solid #e2e8f0", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? <LoadingState /> : (
          <>
            {activeTab === "community" && (
              communityGames.length === 0 ? (
                <EmptyState icon="🌐" title={communityEmpty.title} description={communityEmpty.description} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                  {communityGames.map((game) => (
                    <TeacherGameCard key={game.id} game={game}
                      onUse={handleUseTeacherGame}
                      onCopy={handleCopyGame}
                      onRate={handleRateGame}
                      onReport={handleReportGame}
                      onDelete={isAdmin ? handleDeleteTeacherGame : undefined}
                      myRating={myRatings[game.id]}
                      isLoading={loadingItemId === game.id}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )
            )}

            {activeTab === "my-games" && (
              filteredMyGames.length === 0 ? (
                <EmptyState icon="📝" title={t.teacherLibrary.noMyGames} description={t.teacherLibrary.noMyGamesDesc}
                  action={{ label: t.dashboard.createGame, onClick: () => navigate("/setup") }} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                  {filteredMyGames.map((game) => (
                    <TeacherGameCard key={game.id} game={game}
                      onUse={handleUseTeacherGame}
                      onEdit={handleEditGame}
                      onDelete={handleDeleteTeacherGame}
                      onDuplicate={handleDuplicateGame}
                      onToggleVisibility={handleToggleVisibility}
                      isLoading={loadingItemId === game.id}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )
            )}
          </>
        )}

        {isAdmin && (
          <div style={{ marginTop: 48, padding: 24, backgroundColor: "#fffbeb", borderRadius: 16, border: "2px solid #fbbf24" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 700, color: "#b45309" }}>⚙️ {t.library.adminTitle}</h3>
            <p style={{ margin: "0 0 16px 0", color: "#92400e", fontSize: 14 }}>{t.library.adminDesc}</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => navigate("/admin/library/upload")} style={{ padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "white", cursor: "pointer" }}>
                📤 {t.library.uploadSingle}
              </button>
              <button onClick={() => navigate("/admin/library/bulk")} style={{ padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", color: "white", cursor: "pointer" }}>
                📦 {t.library.bulkUpload}
              </button>
            </div>
          </div>
        )}
      </main>

      {editingGame && (
        <EditGameModal isOpen={!!editingGame} onClose={() => setEditingGame(null)} game={editingGame} onSave={handleSaveEdit} />
      )}
      {reportingGame && (
        <ReportGameModal isOpen={!!reportingGame} onClose={() => setReportingGame(null)} game={reportingGame} onSubmit={handleSubmitReport} />
      )}
      {previewGame && (
        <QuestionsPreviewModal game={previewGame} onClose={() => setPreviewGame(null)} onConfirm={handleConfirmPreview} />
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function StatCard({ value, label, sublabel, color }: { value: number | string; label: string; sublabel?: string; color: string }) {
  return (
    <div style={{ padding: "16px 20px", backgroundColor: "white", borderRadius: 12, border: `2px solid ${color}30`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, display: "flex", alignItems: "baseline", gap: 4 }}>
        {value}{sublabel && <span style={{ fontSize: 14, color: "#94a3b8" }}>{sublabel}</span>}
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#64748b" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 8, border: "2px solid #e2e8f0" }}>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

function LoadingState() {
  const { t } = useI18n();
  return (
    <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <p>{t.common.loading}</p>
    </div>
  );
}

function EmptyState({ icon, title, description, action }: { icon: string; title: string; description: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ textAlign: "center", padding: 64, backgroundColor: "white", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 700, color: "#1e293b" }}>{title}</h3>
      <p style={{ margin: "0 0 24px 0", fontSize: 15, color: "#64748b" }}>{description}</p>
      {action && (
        <button onClick={action.onClick} style={{ padding: "12px 24px", fontSize: 15, fontWeight: 600, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", color: "white", cursor: "pointer" }}>
          {action.label}
        </button>
      )}
    </div>
  );
}