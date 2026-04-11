// src/components/setup/GameModeSelector.tsx
// Pantalla inicial para seleccionar cómo se obtienen las consignas
// ✅ NUEVO: "Los equipos proponen" (Stage 0) se desbloquea después del primer juego completo

import { useState, useEffect } from "react";
import { ref, query, orderByChild, equalTo, get } from "firebase/database";
import { database } from "../../firebase.config";
import { useGameMode } from "../../contexts/GameModeContext";
import { useI18n } from "../../i18n";
import { useAuth } from "../../contexts/AuthContext";

export type QuestionSource = 'teacher-creates' | 'students-propose';

interface GameModeSelectorProps {
  onSelect: (source: QuestionSource) => void;
}

const COMPLETED_STATUSES = ["game_complete", "finished", "ended"];

// ============================================
// Strings locales para el estado bloqueado
// ============================================
const LOCKED_STRINGS = {
  es: {
    locked: "🔒 Disponible después de tu primer juego completo",
    lockedHint: "Jugá una partida completa (Stage 1 + Stage 2) para desbloquear esta modalidad.",
  },
  en: {
    locked: "🔒 Available after your first complete game",
    lockedHint: "Play one full game (Stage 1 + Stage 2) to unlock this mode.",
  },
  pt: {
    locked: "🔒 Disponível após seu primeiro jogo completo",
    lockedHint: "Jogue uma partida completa (Stage 1 + Stage 2) para desbloquear este modo.",
  },
};

export function GameModeSelector({ onSelect }: GameModeSelectorProps) {
  const { theme } = useGameMode();
  const { language } = useI18n();
  const { user } = useAuth();

  const [hasCompletedGame, setHasCompletedGame] = useState<boolean | null>(null); // null = cargando

  // Verificar si el docente tiene al menos un juego completado
  useEffect(() => {
    if (!user?.uid) { setHasCompletedGame(false); return; }

    const checkCompletedGames = async () => {
      try {
        const gamesRef = query(
          ref(database, "games"),
          orderByChild("createdBy/uid"),
          equalTo(user.uid)
        );
        const snapshot = await get(gamesRef);
        if (!snapshot.exists()) { setHasCompletedGame(false); return; }

        const games = Object.values(snapshot.val()) as any[];
        const hasCompleted = games.some(
          (g) =>
            COMPLETED_STATUSES.includes(g.status?.status) &&
            (g.status?.currentStage >= 2 || g.status?.status === "game_complete")
        );
        setHasCompletedGame(hasCompleted);
      } catch (error) {
        console.error("Error checking completed games:", error);
        setHasCompletedGame(false);
      }
    };

    checkCompletedGames();
  }, [user?.uid]);

  const lang = (language as string) in LOCKED_STRINGS
    ? (language as keyof typeof LOCKED_STRINGS)
    : "es";

  const locked = LOCKED_STRINGS[lang];
  const stage0Locked = hasCompletedGame === false; // false = verificado y no tiene; null = cargando

  const t = {
    title: language === 'es'
      ? '¿Cómo vas a obtener las consignas del juego?'
      : language === 'pt'
        ? 'Como você vai obter as perguntas do jogo?'
        : 'How will you get the game questions?',

    teacherCreates: {
      title: language === 'es' ? 'Yo las preparo' : language === 'pt' ? 'Eu preparo' : 'I prepare them',
      subtitle: language === 'es'
        ? 'Vos creás todas las consignas'
        : language === 'pt'
          ? 'Você cria todas as perguntas'
          : 'You create all the questions',
      description: language === 'es'
        ? 'Creás las consignas con IA, manualmente o desde la biblioteca'
        : language === 'pt'
          ? 'Crie perguntas com IA, manualmente ou da biblioteca'
          : 'Create questions with AI, manually, or from the library',
      bullets: language === 'es'
        ? ['Primera vez con el juego', 'Cualquier tema', 'Control total del contenido']
        : language === 'pt'
          ? ['Primeira vez jogando', 'Qualquer tema', 'Controle total do conteúdo']
          : ['First time playing', 'Any topic', 'Full content control'],
    },

    studentsPropose: {
      title: language === 'es' ? 'Los equipos proponen' : language === 'pt' ? 'Equipes propõem' : 'Teams propose',
      subtitle: language === 'es'
        ? 'Los alumnos crean, vos curás'
        : language === 'pt'
          ? 'Os alunos criam, você cura'
          : 'Students create, you curate',
      description: language === 'es'
        ? 'Los equipos elaboran consignas basadas en el material. Vos curás y organizás el juego.'
        : language === 'pt'
          ? 'As equipes criam perguntas baseadas no material. Você cura e organiza o jogo.'
          : 'Teams create questions based on materials. You curate and organize the game.',
      bullets: language === 'es'
        ? ['Grupos con experiencia en el juego', 'Temas integradores o de cierre', 'Profundiza la comprensión']
        : language === 'pt'
          ? ['Grupos com experiência no jogo', 'Temas de integração ou fechamento', 'Aprofunda a compreensão']
          : ['Groups with game experience', 'Integration or closing topics', 'Deepens understanding'],
    },

    tip: language === 'es'
      ? '💡 Tip: La modalidad "Los equipos proponen" es ideal para repasos, cierres de unidad, o cuando querés que los alumnos profundicen creando, no solo respondiendo.'
      : language === 'pt'
        ? '💡 Dica: O modo "Equipes propõem" é ideal para revisões, fechamentos de unidade, ou quando você quer que os alunos aprofundem criando, não apenas respondendo.'
        : '💡 Tip: "Teams propose" mode is ideal for reviews, unit closures, or when you want students to deepen understanding by creating, not just answering.',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1e293b' }}>
          {t.title}
        </h1>
      </div>

      {/* Cards */}
      <div style={{
        display: 'flex',
        gap: 24,
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: 900,
        width: '100%',
      }}>
        {/* Opción 1: Profesor crea — siempre disponible */}
        <div
          style={{
            flex: 1, minWidth: 280, maxWidth: 400, padding: 28,
            backgroundColor: 'white', borderRadius: 16,
            border: `3px solid #e2e8f0`, cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
          onClick={() => onSelect('teacher-creates')}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = theme.primary;
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = `0 12px 24px ${theme.primary}30`;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            backgroundColor: `${theme.primary}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, marginBottom: 16,
          }}>
            📝
          </div>

          <h2 style={{ margin: '0 0 4px 0', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
            {t.teacherCreates.title}
          </h2>
          <p style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: theme.primary }}>
            {t.teacherCreates.subtitle}
          </p>
          <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
            {t.teacherCreates.description}
          </p>
          <ul style={{ margin: 0, padding: '0 0 0 20px', fontSize: 13, color: '#475569' }}>
            {t.teacherCreates.bullets.map((bullet, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <span style={{ color: theme.primary }}>✓</span> {bullet}
              </li>
            ))}
          </ul>
        </div>

        {/* Opción 2: Alumnos proponen — bloqueada hasta primer juego completo */}
        <div
          style={{
            flex: 1, minWidth: 280, maxWidth: 400, padding: 28,
            backgroundColor: stage0Locked ? '#f8fafc' : 'white',
            borderRadius: 16,
            border: `3px solid ${stage0Locked ? '#e2e8f0' : '#e2e8f0'}`,
            cursor: stage0Locked ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            opacity: stage0Locked ? 0.65 : 1,
            position: 'relative',
          }}
          onClick={() => { if (!stage0Locked) onSelect('students-propose'); }}
          onMouseOver={(e) => {
            if (stage0Locked) return;
            e.currentTarget.style.borderColor = '#8b5cf6';
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(139, 92, 246, 0.3)';
          }}
          onMouseOut={(e) => {
            if (stage0Locked) return;
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            backgroundColor: stage0Locked ? '#f1f5f9' : 'rgba(139, 92, 246, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, marginBottom: 16,
          }}>
            {stage0Locked ? '🔒' : '👥'}
          </div>

          <h2 style={{ margin: '0 0 4px 0', fontSize: 22, fontWeight: 700, color: stage0Locked ? '#94a3b8' : '#1e293b' }}>
            {t.studentsPropose.title}
          </h2>
          <p style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: stage0Locked ? '#94a3b8' : '#8b5cf6' }}>
            {t.studentsPropose.subtitle}
          </p>
          <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
            {t.studentsPropose.description}
          </p>
          <ul style={{ margin: '0 0 0 0', padding: '0 0 0 20px', fontSize: 13, color: '#94a3b8' }}>
            {t.studentsPropose.bullets.map((bullet, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <span style={{ color: stage0Locked ? '#cbd5e1' : '#8b5cf6' }}>✓</span> {bullet}
              </li>
            ))}
          </ul>

          {/* Mensaje de bloqueo */}
          {stage0Locked && (
            <div style={{
              marginTop: 20,
              padding: '12px 14px',
              backgroundColor: '#f1f5f9',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
            }}>
              <p style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                {locked.locked}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                {locked.lockedHint}
              </p>
            </div>
          )}

          {/* Indicador de carga */}
          {hasCompletedGame === null && (
            <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              ⏳
            </div>
          )}
        </div>
      </div>

      {/* Tip — solo visible si Stage 0 está desbloqueado */}
      {!stage0Locked && (
        <div style={{
          marginTop: 32, maxWidth: 700,
          padding: '16px 20px',
          backgroundColor: '#fef3c7',
          borderRadius: 12,
          border: '1px solid #fbbf24',
          fontSize: 13, color: '#92400e', lineHeight: 1.6, textAlign: 'center',
        }}>
          {t.tip}
        </div>
      )}
    </div>
  );
}