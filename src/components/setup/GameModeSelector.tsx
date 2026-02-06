// src/components/setup/GameModeSelector.tsx
// Pantalla inicial para seleccionar cómo se obtienen las consignas

import { useGameMode } from "../../contexts/GameModeContext";
import { useI18n } from "../../i18n";

export type QuestionSource = 'teacher-creates' | 'students-propose';

interface GameModeSelectorProps {
  onSelect: (source: QuestionSource) => void;
}

export function GameModeSelector({ onSelect }: GameModeSelectorProps) {
  const { theme } = useGameMode();
  const { language } = useI18n();

  console.log('🔍 GameModeSelector language:', language);
  
  const t = {
    title: language === 'es'
      ? '¿Cómo vas a obtener las consignas del juego?'
      : language === 'pt'
        ? 'Como você vai obter as perguntas do jogo?'
        : 'How will you get the game questions?',

    teacherCreates: {
      title: language === 'es' ? 'Yo las preparo' : language === 'pt' ? 'Eu preparo' : 'I prepare them',
      // ✅ NUEVO: Subtítulo descriptivo
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
      // ✅ NUEVO: Subtítulo descriptivo
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

  const cardStyle = (isHovered: boolean): React.CSSProperties => ({
    flex: 1,
    minWidth: 280,
    maxWidth: 400,
    padding: 28,
    backgroundColor: 'white',
    borderRadius: 16,
    border: `3px solid ${isHovered ? theme.primary : '#e2e8f0'}`,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    transform: isHovered ? 'translateY(-4px)' : 'none',
    boxShadow: isHovered
      ? `0 12px 24px ${theme.primary}30`
      : '0 4px 12px rgba(0,0,0,0.05)',
  });

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
      <div style={{
        textAlign: 'center',
        marginBottom: 40,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 800,
          color: '#1e293b',
        }}>
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
        {/* Opción 1: Profesor crea */}
        <div
          style={cardStyle(false)}
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
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: `${theme.primary}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            marginBottom: 16,
          }}>
            📝
          </div>

          <h2 style={{
            margin: '0 0 4px 0',
            fontSize: 22,
            fontWeight: 700,
            color: '#1e293b',
          }}>
            {t.teacherCreates.title}
          </h2>

          {/* ✅ NUEVO: Subtítulo */}
          <p style={{
            margin: '0 0 12px 0',
            fontSize: 14,
            fontWeight: 600,
            color: theme.primary,
          }}>
            {t.teacherCreates.subtitle}
          </p>

          <p style={{
            margin: '0 0 16px 0',
            fontSize: 14,
            color: '#64748b',
            lineHeight: 1.5,
          }}>
            {t.teacherCreates.description}
          </p>

          <ul style={{
            margin: 0,
            padding: '0 0 0 20px',
            fontSize: 13,
            color: '#475569',
          }}>
            {t.teacherCreates.bullets.map((bullet, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <span style={{ color: theme.primary }}>✓</span> {bullet}
              </li>
            ))}
          </ul>
        </div>

        {/* Opción 2: Alumnos proponen */}
        <div
          style={cardStyle(false)}
          onClick={() => onSelect('students-propose')}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#8b5cf6';
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(139, 92, 246, 0.3)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
          }}
        >
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            marginBottom: 16,
          }}>
            👥
          </div>

          <h2 style={{
            margin: '0 0 4px 0',
            fontSize: 22,
            fontWeight: 700,
            color: '#1e293b',
          }}>
            {t.studentsPropose.title}
          </h2>

          {/* ✅ NUEVO: Subtítulo */}
          <p style={{
            margin: '0 0 12px 0',
            fontSize: 14,
            fontWeight: 600,
            color: '#8b5cf6',
          }}>
            {t.studentsPropose.subtitle}
          </p>

          <p style={{
            margin: '0 0 16px 0',
            fontSize: 14,
            color: '#64748b',
            lineHeight: 1.5,
          }}>
            {t.studentsPropose.description}
          </p>

          <ul style={{
            margin: 0,
            padding: '0 0 0 20px',
            fontSize: 13,
            color: '#475569',
          }}>
            {t.studentsPropose.bullets.map((bullet, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <span style={{ color: '#8b5cf6' }}>✓</span> {bullet}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tip */}
      <div style={{
        marginTop: 32,
        maxWidth: 700,
        padding: '16px 20px',
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        border: '1px solid #fbbf24',
        fontSize: 13,
        color: '#92400e',
        lineHeight: 1.6,
        textAlign: 'center',
      }}>
        {t.tip}
      </div>
    </div>
  );
}
