// src/pages/LibraryPage.tsx
// Página de biblioteca con tabs: Mis Juegos / Comunidad / Oficial

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useGameMode } from "../contexts/GameModeContext";
import { useI18n, LanguageSelector } from "../i18n";

// Components
import { LibraryCard } from "../components/library/LibraryCard";
import { TeacherGameCard } from "../components/library/TeacherGameCard";
import { EditGameModal } from "../components/library/EditGameModal";
import { ReportGameModal } from "../components/library/ReportGameModal";

// ✅ Services
import {
  getAllLibraryItems,
  deleteLibraryItem,
  downloadCSVContent, // ✅ usa decoding robusto directo (bytes + TextDecoder)
} from "../services/libraryService";

import {
  getMyGames,
  getCommunityGames,
  deleteTeacherGame,
  updateTeacherGame,
  copyGameToMyLibrary,
  rateGame,
  getMyRating,
  getTeacherGameCSV,
  incrementGameUsage,
  getGameStats,
  reportGame,
} from "../services/teacherLibraryService";

// Types
import type {
  CSVLibraryItem,
  LibraryGameMode,
  PrimaryGrade,
  Area,
  Subject,
  LibraryLanguage,
} from "../types/library";
import { PRIMARY_GRADES, AREAS_ES, AREAS_EN, AREAS_PT, SUBJECTS_ES, SUBJECTS_EN, SUBJECTS_PT } from "../types/library";
import type { TeacherGame, TeacherLibraryFilters, ReportReason } from "../types/teacherLibrary";
import { TEACHER_LIMITS } from "../types/teacherLibrary";

type TabType = "my-games" | "community" | "official";

/**
 * =========================================================
 * ✅ Helpers de diagnóstico/encoding (best effort)
 * Igual criterio que venimos usando: detectar "basura"
 * y (si hace falta) elegir la decodificación con mejor score.
 * =========================================================
 */
function hasVisibleBadReplacement(text: string): boolean {
  // \uFFFD es el "replacement character" que aparece cuando hay encoding inválido
  return /\uFFFD/.test(text);
}

function hasMojibakeMarkers(text: string): boolean {
  // típicos cuando se ve "DecÃ­", "Â¿", "â€”", etc.
  // \u00C3 = Ã, \u00C2 = Â, \u00E2 = â
  return /\u00C3|\u00C2|\u00E2/.test(text);
}

function scoreText(text: string): number {
  const repl = (text.match(/\uFFFD/g) || []).length;
  const mojibake = (text.match(/\u00C3|\u00C2|\u00E2/g) || []).length;
  return repl * 10 + mojibake * 3;
}

function decodeArrayBufferBestEffort(buf: ArrayBuffer): {
  text: string;
  chosen: string;
  candidates: Array<{ encoding: string; score: number; sample: string; hasBad: boolean }>;
} {
  const bytes = new Uint8Array(buf);
  const encodings = ["utf-8", "windows-1252", "iso-8859-1"] as const;

  const candidates = encodings.map((enc) => {
    let decoded = "";
    try {
      decoded = new TextDecoder(enc, { fatal: false }).decode(bytes);
    } catch {
      decoded = "";
    }
    return {
      encoding: enc,
      score: scoreText(decoded),
      hasBad: hasVisibleBadReplacement(decoded) || hasMojibakeMarkers(decoded),
      sample: decoded.slice(0, 140),
    };
  });

  const sorted = [...candidates].sort((a, b) => a.score - b.score);
  const bestScore = sorted[0]?.score ?? 0;
  const bestEncodings = sorted.filter((c) => c.score === bestScore).map((c) => c.encoding);

  // Preferir utf-8 si empata, si no el mejor score
  const chosen = bestEncodings.includes("utf-8") ? "utf-8" : (sorted[0]?.encoding ?? "utf-8");
  const text = new TextDecoder(chosen, { fatal: false }).decode(bytes);

  return { text, chosen, candidates };
}

export function LibraryPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { mode: currentGameMode, theme } = useGameMode();
  const { t, language: appLang } = useI18n();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("official");

  // Official library state
  const [officialItems, setOfficialItems] = useState<CSVLibraryItem[]>([]);
  const [isLoadingOfficial, setIsLoadingOfficial] = useState(true);

  // My games state
  const [myGames, setMyGames] = useState<TeacherGame[]>([]);
  const [isLoadingMyGames, setIsLoadingMyGames] = useState(false);
  const [myStats, setMyStats] = useState({ privateCount: 0, publicCount: 0, totalUses: 0, avgRating: 0 });

  // Community state
  const [communityGames, setCommunityGames] = useState<TeacherGame[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});

  // Modal state
  const [editingGame, setEditingGame] = useState<TeacherGame | null>(null);
  const [reportingGame, setReportingGame] = useState<TeacherGame | null>(null);

  // Loading state
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  // Filters (shared)
  const [gameMode, setGameMode] = useState<LibraryGameMode | "all">("all");
  const [grade, setGrade] = useState<PrimaryGrade | "all">("all");
  const [area, setArea] = useState<Area | "all">("all");
  const [subject, setSubject] = useState<Subject | "all">("all");
  const [language, setLanguage] = useState<LibraryLanguage | "all">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "rating" | "popular">("recent");

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "official") {
      loadOfficialItems();
    } else if (activeTab === "my-games" && user) {
      loadMyGames();
    } else if (activeTab === "community") {
      loadCommunityGames();
    }
  }, [activeTab, user]);

  const loadOfficialItems = async () => {
    setIsLoadingOfficial(true);
    try {
      const data = await getAllLibraryItems();
      setOfficialItems(data);
    } catch (error) {
      console.error("Error loading official library:", error);
    } finally {
      setIsLoadingOfficial(false);
    }
  };

  const loadMyGames = async () => {
    if (!user) return;
    setIsLoadingMyGames(true);
    try {
      const [games, stats] = await Promise.all([getMyGames(user.uid), getGameStats(user.uid)]);
      setMyGames(games);
      setMyStats(stats);
    } catch (error) {
      console.error("Error loading my games:", error);
    } finally {
      setIsLoadingMyGames(false);
    }
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

      // Load my ratings for these games
      if (user) {
        const ratings: Record<string, number> = {};
        for (const game of games) {
          const rating = await getMyRating(game.id, user.uid);
          if (rating) ratings[game.id] = rating;
        }
        setMyRatings(ratings);
      }
    } catch (error) {
      console.error("Error loading community games:", error);
    } finally {
      setIsLoadingCommunity(false);
    }
  };

  // Reload community when filters change
  useEffect(() => {
    if (activeTab === "community") {
      loadCommunityGames();
    }
  }, [gameMode, grade, area, subject, language, search, sortBy]);

  // Filter official items locally
  const filteredOfficialItems = useMemo(() => {
    return officialItems.filter((item) => {
      if (gameMode !== "all" && item.gameMode !== gameMode) return false;
      if (grade !== "all" && item.grade !== grade) return false;
      if (area !== "all" && item.area !== area) return false;
      if (subject !== "all" && item.subject !== subject) return false;
      if (language !== "all" && item.language !== language) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        const match =
          item.title?.toLowerCase().includes(searchLower) ||
          item.topic?.toLowerCase().includes(searchLower) ||
          item.mainContents?.toLowerCase().includes(searchLower);
        if (!match) return false;
      }
      return true;
    });
  }, [officialItems, gameMode, grade, area, subject, language, search]);

  /**
   * ✅ Ordenar items OFICIALES para priorizar coincidencias con el usuario:
   * - 2 puntos: coincide idioma Y modo actual
   * - 1 punto: coincide idioma O modo actual
   * - 0 puntos: no coincide
   * Mantener orden original dentro de cada grupo (estable por índice).
   *
   * NOTA: se aplica sobre filteredOfficialItems para NO tocar el filtrado existente.
   */
  const sortedOfficialItems = useMemo(() => {
    return filteredOfficialItems
      .map((item, idx) => {
        const score =
          (item.language === appLang ? 1 : 0) +
          (item.gameMode === currentGameMode ? 1 : 0);

        return { item, idx, score };
      })
      .sort((a, b) => {
        const byScore = b.score - a.score; // mayor score primero
        if (byScore !== 0) return byScore;
        return a.idx - b.idx; // estable: mantiene orden original
      })
      .map(({ item }) => item);
  }, [filteredOfficialItems, appLang, currentGameMode]);

  // Filter my games locally
  const filteredMyGames = useMemo(() => {
    return myGames.filter((game) => {
      if (gameMode !== "all" && game.gameMode !== gameMode) return false;
      if (grade !== "all" && game.grade !== grade) return false;
      if (area !== "all" && game.area !== area) return false;
      if (subject !== "all" && game.subject !== subject) return false;
      if (language !== "all" && game.language !== language) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        const match =
          game.title?.toLowerCase().includes(searchLower) ||
          game.description?.toLowerCase().includes(searchLower) ||
          game.topic?.toLowerCase().includes(searchLower);
        if (!match) return false;
      }
      return true;
    });
  }, [myGames, gameMode, grade, area, subject, language, search]);

  // ============================================
  // HANDLERS - Official Library
  // ============================================

  const handleUseOfficialItem = async (item: CSVLibraryItem) => {
    setLoadingItemId(item.id);
    try {
      // ✅ IMPORTANTE: NO usar FileReader/readAsText acá.
      // ✅ Usar decoding robusto del service (bytes + TextDecoder + fixEncoding)
      const csvContent = await downloadCSVContent(item.storagePath);

      console.log("🧪 [LibraryPage] official encoding check", {
        storagePath: item.storagePath,
        hasReplacement: csvContent.includes("\uFFFD"),
        hasMojibake: hasMojibakeMarkers(csvContent),
        score: scoreText(csvContent),
        sample: csvContent.slice(0, 180),
      });

      // ✅ Pasar todo en location.state (no depender de sessionStorage)
      navigate("/setup-traditional", {
        state: {
          fromLibrary: true,
          csvContent,
          csvFilename:
            item.fileName ||
            `${(item.title || item.topic || "archivo").replace(/\s+/g, "_")}.csv`,
          csvTitle: item.title || item.topic,
          csvSubject: item.subject || item.area,
          // ✅ NUEVO: pasar sourceTextPath si existe
          sourceTextPath: item.sourceTextPath || null,
        },
      });
    } catch (error) {
      console.error("Error loading CSV:", error);
      alert(t.errors.loadingCSV);
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleDeleteOfficialItem = async (item: CSVLibraryItem) => {
    try {
      await deleteLibraryItem(item.id);
      setOfficialItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error) {
      console.error("Error deleting item:", error);
      alert(t.errors.generic);
    }
  };

  // ============================================
  // HANDLERS - Teacher Games
  // ============================================

  const handleUseTeacherGame = async (game: TeacherGame) => {
    setLoadingItemId(game.id);
    try {
      // ✅ FIX IMPORTANTE:
      // getTeacherGameCSV() te devuelve un File; si ese File fue creado desde string roto,
      // el readAsText te mata acentos. Entonces: leer bytes + TextDecoder best-effort.
      const file = await getTeacherGameCSV(game);

      const buf = await file.arrayBuffer();
      const decoded = decodeArrayBufferBestEffort(buf);

      console.log("🧪 [LibraryPage] teacher decode candidates", {
        fileName: file.name,
        gameId: game.id,
        chosen: decoded.chosen,
        candidates: decoded.candidates,
      });

      const csvContent = decoded.text;

      // ✅ Enviar por state (recomendado) y mantener sessionStorage como fallback
      sessionStorage.setItem("library_csv_content", csvContent);
      sessionStorage.setItem("library_csv_filename", file.name);
      sessionStorage.setItem("library_csv_title", game.title);
      sessionStorage.setItem("library_csv_subject", game.subject || game.area);

      // Increment usage
      incrementGameUsage(game.id);

      // ✅ Importante: tu setup-traditional es el que ya está procesando csvContent en state
      navigate("/setup-traditional", {
        state: {
          fromLibrary: true,
          csvContent,
          csvFilename: file.name,
          csvTitle: game.title,
          csvSubject: game.subject || game.area,
        },
      });
    } catch (error) {
      console.error("Error loading CSV:", error);
      alert(t.errors.loadingCSV);
    } finally {
      setLoadingItemId(null);
    }
  };

  const handleDeleteTeacherGame = async (game: TeacherGame) => {
    if (!user) return;
    try {
      await deleteTeacherGame(game.id, user.uid, isAdmin);  // ← Agregar isAdmin
      setMyGames((prev) => prev.filter((g) => g.id !== game.id));
      setCommunityGames((prev) => prev.filter((g) => g.id !== game.id));  // ← También limpiar de comunidad
      // Refresh stats
      const stats = await getGameStats(user.uid);
      setMyStats(stats);
    } catch (error) {
      console.error("Error deleting game:", error);
      alert(t.errors.generic);
    }
  };
  const handleToggleVisibility = async (game: TeacherGame) => {
    if (!user) return;
    const newVisibility = game.visibility === "public" ? "private" : "public";

    // Check limits if making private
    if (newVisibility === "private" && myStats.privateCount >= TEACHER_LIMITS.maxPrivateGames) {
      alert(t.teacherLibrary.privateLimitReached);
      return;
    }

    try {
      await updateTeacherGame(game.id, user.uid, { visibility: newVisibility });
      setMyGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, visibility: newVisibility } : g))
      );
      // Refresh stats
      const stats = await getGameStats(user.uid);
      setMyStats(stats);
    } catch (error) {
      console.error("Error updating visibility:", error);
      alert(t.errors.generic);
    }
  };

  const handleCopyGame = async (game: TeacherGame) => {
    if (!user) return;

    // Check limits
    if (myStats.privateCount >= TEACHER_LIMITS.maxPrivateGames) {
      alert(t.teacherLibrary.privateLimitReached);
      return;
    }

    try {
      await copyGameToMyLibrary(
        game.id,
        user.uid,
        user.displayName || t.dashboard.teacherFallbackName,
        user.email || ""
      );
      alert(t.teacherLibrary.copySuccess + "\n" + t.teacherLibrary.copyAsPrivate);
      // Refresh my games
      loadMyGames();
    } catch (error) {
      console.error("Error copying game:", error);
      alert(error instanceof Error ? error.message : t.errors.generic);
    }
  };

  const handleRateGame = async (game: TeacherGame, stars: number) => {
    if (!user || !user.email) {
      console.error('User or user email not available for rating');
      alert(t.errors.generic);
      return;
    }

    try {
      await rateGame(game.id, user.uid, user.email, stars);
      setMyRatings((prev) => ({ ...prev, [game.id]: stars }));
      loadCommunityGames();
    } catch (error) {
      console.error("Error rating game:", error);
      alert(error instanceof Error ? error.message : t.errors.generic);
    }
  };

  const handleReportGame = (game: TeacherGame) => {
    setReportingGame(game);
  };

  const handleEditGame = (game: TeacherGame) => {
    setEditingGame(game);
  };

  const handleSaveEdit = async (updates: Partial<TeacherGame>) => {
    if (!editingGame || !user) return;

    try {
      await updateTeacherGame(editingGame.id, user.uid, updates);
      setMyGames((prev) =>
        prev.map((g) =>
          g.id === editingGame.id ? { ...g, ...updates, updatedAt: Date.now() } : g
        )
      );
      setEditingGame(null);
    } catch (error) {
      console.error("Error updating game:", error);
      throw error;
    }
  };

  const handleSubmitReport = async (reason: ReportReason, details?: string) => {
    if (!reportingGame || !user) return;

    try {
      await reportGame(reportingGame.id, user.uid, reason, details);
      // Optionally refresh community games to hide highly reported ones
      loadCommunityGames();
    } catch (error) {
      console.error("Error reporting game:", error);
      throw error;
    }
  };

  // ============================================
  // RENDER
  // ============================================

  const showSubjectFilter = gameMode === "coopetition" || gameMode === "all";
  const showGradeFilter = gameMode === "traffic-light" || gameMode === "all";
  const isLoading =
    (activeTab === "official" && isLoadingOfficial) ||
    (activeTab === "my-games" && isLoadingMyGames) ||
    (activeTab === "community" && isLoadingCommunity);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: theme.primaryGradient,
          padding: "24px 32px",
          color: "white",
          boxShadow: `0 4px 20px ${theme.primary}40`,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => navigate("/")}
              style={{
                padding: "8px 12px",
                fontSize: 14,
                fontWeight: 600,
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              ← {t.common.back}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 32 }}>📚</span>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
                {t.library.title}
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LanguageSelector compact />
            <span style={{ fontSize: 14, opacity: 0.9 }}>{user?.email}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 24,
            backgroundColor: "white",
            padding: 4,
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          {[
            { id: "my-games" as TabType, label: t.teacherLibrary.myGames, icon: "👤" },
            { id: "community" as TabType, label: t.teacherLibrary.community, icon: "🌐" },
            { id: "official" as TabType, label: t.teacherLibrary.official, icon: "📚" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "14px 20px",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                border: "none",
                backgroundColor: activeTab === tab.id ? theme.primary : "transparent",
                color: activeTab === tab.id ? "white" : "#64748b",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* My Games Stats */}
        {activeTab === "my-games" && user && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <StatCard
              value={myStats.privateCount}
              label={t.teacherLibrary.privateGames}
              sublabel={`/ ${TEACHER_LIMITS.maxPrivateGames}`}
              color="#6366f1"
            />
            <StatCard
              value={myStats.publicCount}
              label={t.teacherLibrary.publicGames}
              color="#22c55e"
            />
            <StatCard
              value={myStats.totalUses}
              label={t.teacherLibrary.totalUses}
              color="#f59e0b"
            />
            <StatCard
              value={myStats.avgRating ? myStats.avgRating.toFixed(1) : "-"}
              label={t.teacherLibrary.avgRating}
              color="#ec4899"
            />
          </div>
        )}

        {/* Filters */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 16,
            }}
          >
            {/* Game Mode */}
            <FilterSelect
              label={t.library.game}
              value={gameMode}
              onChange={(v) => {
                setGameMode(v as any);
                setGrade("all");
                setSubject("all");
              }}
              options={[
                { value: "all", label: t.common.all },
                { value: "traffic-light", label: `🚦 ${t.gameModes.trafficLight.title}` },
                { value: "coopetition", label: `🎯 ${t.gameModes.coopetition.title}` },
              ]}
            />

            {/* Grade */}
            {showGradeFilter && (
              <FilterSelect
                label={t.library.grade}
                value={grade}
                onChange={(v) => setGrade(v as any)}
                options={[
                  { value: "all", label: t.common.all },
                  ...PRIMARY_GRADES.map((g) => ({
                    value: g,
                    label: (t.grades as any)[g] || g
                  })),
                ]}
              />
            )}

            {/* Area */}
            <FilterSelect
              label={t.library.area}
              value={area}
              onChange={(v) => setArea(v as any)}
              options={[
                { value: "all", label: t.common.all },
                ...(appLang === "es" ? AREAS_ES : appLang === "pt" ? AREAS_PT : AREAS_EN).map((a) => ({ value: a, label: a })),
              ]}
            />

            {/* Subject */}
            {showSubjectFilter && (
              <FilterSelect
                label={t.library.subject}
                value={subject}
                onChange={(v) => setSubject(v as any)}
                options={[
                  { value: "all", label: t.common.all },
                  ...(appLang === "es" ? SUBJECTS_ES : appLang === "pt" ? SUBJECTS_PT : SUBJECTS_EN).map((s) => ({
                    value: s,
                    label: s,
                  })),
                ]}
              />
            )}

            {/* Language */}
            <FilterSelect
              label={t.setup.language}
              value={language}
              onChange={(v) => setLanguage(v as any)}
              options={[
                { value: "all", label: t.common.all },
                { value: "es", label: "🇪🇸 Español" },
                { value: "en", label: "🇺🇸 English" },
                { value: "pt", label: "🇧🇷 Português" },
              ]}
            />

            {/* Sort (only for community) */}
            {activeTab === "community" && (
              <FilterSelect
                label={t.teacherLibrary.sortBy}
                value={sortBy}
                onChange={(v) => setSortBy(v as any)}
                options={[
                  { value: "recent", label: t.teacherLibrary.recent },
                  { value: "rating", label: t.teacherLibrary.rating },
                  { value: "popular", label: t.teacherLibrary.popular },
                ]}
              />
            )}

            {/* Search */}
            <div style={{ gridColumn: "span 2" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#64748b",
                }}
              >
                {t.common.search}
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.library.searchPlaceholder}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  borderRadius: 8,
                  border: "2px solid #e2e8f0",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            {/* MY GAMES TAB */}
            {activeTab === "my-games" &&
              (filteredMyGames.length === 0 ? (
                <EmptyState
                  icon="📝"
                  title={t.teacherLibrary.noMyGames}
                  description={t.teacherLibrary.noMyGamesDesc}
                  action={{
                    label: t.dashboard.createGame,
                    onClick: () => navigate("/setup"),
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 20,
                  }}
                >
                  {filteredMyGames.map((game) => (
                    <TeacherGameCard
                      key={game.id}
                      game={game}
                      onUse={handleUseTeacherGame}
                      onEdit={handleEditGame}
                      onDelete={handleDeleteTeacherGame}
                      onToggleVisibility={handleToggleVisibility}
                      isLoading={loadingItemId === game.id}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              ))}

            {/* COMMUNITY TAB */}
            {activeTab === "community" &&
              (communityGames.length === 0 ? (
                <EmptyState
                  icon="🌐"
                  title={t.teacherLibrary.noCommunityGames}
                  description={t.teacherLibrary.noCommunityGamesDesc}
                />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 20,
                  }}
                >
                  {communityGames.map((game) => (
                    <TeacherGameCard
                      key={game.id}
                      game={game}
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
              ))}

            {/* OFFICIAL TAB */}
            {activeTab === "official" &&
              (filteredOfficialItems.length === 0 ? (
                <EmptyState icon="📚" title={t.library.noResults} description="" />
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 20,
                  }}
                >
                  {sortedOfficialItems.map((item) => (
                    <LibraryCard
                      key={item.id}
                      item={item}
                      onUse={handleUseOfficialItem}
                      onDelete={isAdmin ? handleDeleteOfficialItem : undefined}
                      onRefresh={loadOfficialItems}
                      isLoading={loadingItemId === item.id}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              ))}
          </>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <div
            style={{
              marginTop: 48,
              padding: 24,
              backgroundColor: "#fffbeb",
              borderRadius: 16,
              border: "2px solid #fbbf24",
            }}
          >
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: 18,
                fontWeight: 700,
                color: "#b45309",
              }}
            >
              ⚙️ {t.library.adminTitle}
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#92400e", fontSize: 14 }}>
              {t.library.adminDesc}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/admin/library/upload")}
                style={{
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                📤 {t.library.uploadSingle}
              </button>
              <button
                onClick={() => navigate("/admin/library/bulk")}
                style={{
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                📦 {t.library.bulkUpload}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Edit Game Modal */}
      {editingGame && (
        <EditGameModal
          isOpen={!!editingGame}
          onClose={() => setEditingGame(null)}
          game={editingGame}
          onSave={handleSaveEdit}
        />
      )}

      {/* Report Game Modal */}
      {reportingGame && (
        <ReportGameModal
          isOpen={!!reportingGame}
          onClose={() => setReportingGame(null)}
          game={reportingGame}
          onSubmit={handleSubmitReport}
        />
      )}
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function StatCard({
  value,
  label,
  sublabel,
  color,
}: {
  value: number | string;
  label: string;
  sublabel?: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "16px 20px",
        backgroundColor: "white",
        borderRadius: 12,
        border: `2px solid ${color}30`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color,
          display: "flex",
          alignItems: "baseline",
          gap: 4,
        }}
      >
        {value}
        {sublabel && <span style={{ fontSize: 14, color: "#94a3b8" }}>{sublabel}</span>}
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#64748b" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: 14,
          borderRadius: 8,
          border: "2px solid #e2e8f0",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
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

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 64,
        backgroundColor: "white",
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 700, color: "#1e293b" }}>{title}</h3>
      <p style={{ margin: "0 0 24px 0", fontSize: 15, color: "#64748b" }}>{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: "white",
            cursor: "pointer",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}