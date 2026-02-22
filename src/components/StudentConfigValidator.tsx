// ============================================
// StudentConfigValidator.tsx
// Componente para validar cantidad de alumnos vs configuración de equipos
// Ubicación: src/components/StudentConfigValidator.tsx
// ============================================

import React from 'react';

interface StudentConfigValidatorProps {
  numberOfTeams: number;
  studentsPerTeam: number;
  uniqueStudentsCount: number;
  language: 'es' | 'en' | 'pt';
  onSuggestConfig?: (teams: number, perTeam: number) => void;
}

interface ValidationResult {
  status: 'perfect' | 'acceptable' | 'warning' | 'error';
  icon: string;
  message: string;
  suggestion?: string;
  suggestedTeams?: number;
  suggestedPerTeam?: number;
  canProceed: boolean;
}

export function StudentConfigValidator({
  numberOfTeams,
  studentsPerTeam,
  uniqueStudentsCount,
  language,
  onSuggestConfig,
}: StudentConfigValidatorProps) {
  
  const totalSlots = numberOfTeams * studentsPerTeam;
  const difference = uniqueStudentsCount - totalSlots;
  
  // Calcular configuración sugerida
  const calculateSuggestedConfig = (students: number): { teams: number; perTeam: number } => {
    // Intentar mantener equipos de 4-5 alumnos
    const idealPerTeam = 5;
    const minPerTeam = 3;
    const maxPerTeam = 6;
    
    // Probar diferentes combinaciones
    for (let perTeam = idealPerTeam; perTeam >= minPerTeam; perTeam--) {
      const teams = Math.ceil(students / perTeam);
      if (teams >= 2 && teams <= 10) {
        return { teams, perTeam };
      }
    }
    
    // Si no encontró, usar 5 por equipo
    return { 
      teams: Math.ceil(students / idealPerTeam), 
      perTeam: idealPerTeam 
    };
  };

  const getValidation = (): ValidationResult => {
    const texts = {
      es: {
        perfect: `✅ Perfecto: ${uniqueStudentsCount} alumnos para ${totalSlots} lugares`,
        acceptable: `⚠️ ${uniqueStudentsCount} alumnos para ${totalSlots} lugares. Algunos equipos tendrán menos integrantes.`,
        acceptableDetail: (min: number) => `Los equipos tendrán entre ${min} y ${studentsPerTeam} integrantes.`,
        warning: `🟡 Solo ${uniqueStudentsCount} alumnos para ${totalSlots} lugares. Muchos equipos quedarían incompletos.`,
        warningSuggestion: (teams: number, perTeam: number) => `💡 Sugerencia: ${teams} equipos de ${perTeam} alumnos`,
        error: `🔴 ${uniqueStudentsCount} alumnos pero solo ${totalSlots} lugares disponibles.`,
        errorDetail: `Aumentá la cantidad de equipos o alumnos por equipo.`,
        errorSuggestion: (teams: number, perTeam: number) => `💡 Configuración sugerida: ${teams} equipos de ${perTeam} alumnos`,
        tooFewStudents: `🔴 Muy pocos alumnos (${uniqueStudentsCount}). Necesitás al menos 6 para formar 2 equipos.`,
        noStudents: `📝 Ingresá los nombres de los alumnos para continuar.`,
      },
      en: {
        perfect: `✅ Perfect: ${uniqueStudentsCount} students for ${totalSlots} slots`,
        acceptable: `⚠️ ${uniqueStudentsCount} students for ${totalSlots} slots. Some teams will have fewer members.`,
        acceptableDetail: (min: number) => `Teams will have between ${min} and ${studentsPerTeam} members.`,
        warning: `🟡 Only ${uniqueStudentsCount} students for ${totalSlots} slots. Many teams would be incomplete.`,
        warningSuggestion: (teams: number, perTeam: number) => `💡 Suggestion: ${teams} teams of ${perTeam} students`,
        error: `🔴 ${uniqueStudentsCount} students but only ${totalSlots} available slots.`,
        errorDetail: `Increase the number of teams or students per team.`,
        errorSuggestion: (teams: number, perTeam: number) => `💡 Suggested config: ${teams} teams of ${perTeam} students`,
        tooFewStudents: `🔴 Too few students (${uniqueStudentsCount}). You need at least 6 to form 2 teams.`,
        noStudents: `📝 Enter student names to continue.`,
      },
      pt: {
        perfect: `✅ Perfeito: ${uniqueStudentsCount} alunos para ${totalSlots} lugares`,
        acceptable: `⚠️ ${uniqueStudentsCount} alunos para ${totalSlots} lugares. Algumas equipes terão menos integrantes.`,
        acceptableDetail: (min: number) => `As equipes terão entre ${min} e ${studentsPerTeam} integrantes.`,
        warning: `🟡 Apenas ${uniqueStudentsCount} alunos para ${totalSlots} lugares. Muitas equipes ficariam incompletas.`,
        warningSuggestion: (teams: number, perTeam: number) => `💡 Sugestão: ${teams} equipes de ${perTeam} alunos`,
        error: `🔴 ${uniqueStudentsCount} alunos mas apenas ${totalSlots} lugares disponíveis.`,
        errorDetail: `Aumente o número de equipes ou alunos por equipe.`,
        errorSuggestion: (teams: number, perTeam: number) => `💡 Configuração sugerida: ${teams} equipes de ${perTeam} alunos`,
        tooFewStudents: `🔴 Poucos alunos (${uniqueStudentsCount}). Você precisa de pelo menos 6 para formar 2 equipes.`,
        noStudents: `📝 Digite os nomes dos alunos para continuar.`,
      },
    };

    const t = texts[language];

    // Caso: no hay alumnos
    if (uniqueStudentsCount === 0) {
      return {
        status: 'warning',
        icon: '📝',
        message: t.noStudents,
        canProceed: false,
      };
    }

    // Caso: muy pocos alumnos (menos de 6)
    if (uniqueStudentsCount < 6) {
      return {
        status: 'error',
        icon: '🔴',
        message: t.tooFewStudents,
        canProceed: false,
      };
    }

    // Caso: más alumnos que lugares (ERROR - no puede continuar)
    if (difference > 0) {
      const suggested = calculateSuggestedConfig(uniqueStudentsCount);
      return {
        status: 'error',
        icon: '🔴',
        message: t.error,
        suggestion: t.errorSuggestion(suggested.teams, suggested.perTeam),
        suggestedTeams: suggested.teams,
        suggestedPerTeam: suggested.perTeam,
        canProceed: false,
      };
    }

    // Caso: exactamente igual (PERFECTO)
    if (difference === 0) {
      return {
        status: 'perfect',
        icon: '✅',
        message: t.perfect,
        canProceed: true,
      };
    }

    // Caso: faltan algunos alumnos pero es aceptable
    // Aceptable: hasta 2 alumnos menos por equipo
    const avgStudentsPerTeam = uniqueStudentsCount / numberOfTeams;
    const minStudentsInTeam = Math.floor(avgStudentsPerTeam);
    
    if (minStudentsInTeam >= studentsPerTeam - 2 && minStudentsInTeam >= 3) {
      return {
        status: 'acceptable',
        icon: '⚠️',
        message: t.acceptable,
        suggestion: t.acceptableDetail(minStudentsInTeam),
        canProceed: true,
      };
    }

    // Caso: faltan muchos alumnos (WARNING con sugerencia)
    const suggested = calculateSuggestedConfig(uniqueStudentsCount);
    return {
      status: 'warning',
      icon: '🟡',
      message: t.warning,
      suggestion: t.warningSuggestion(suggested.teams, suggested.perTeam),
      suggestedTeams: suggested.teams,
      suggestedPerTeam: suggested.perTeam,
      canProceed: true, // Puede continuar pero con advertencia
    };
  };

  const validation = getValidation();

  // Estilos según estado
  const getStyles = () => {
    switch (validation.status) {
      case 'perfect':
        return {
          bg: '#f0fdf4',
          border: '#86efac',
          text: '#166534',
        };
      case 'acceptable':
        return {
          bg: '#fefce8',
          border: '#fde047',
          text: '#a16207',
        };
      case 'warning':
        return {
          bg: '#fff7ed',
          border: '#fdba74',
          text: '#c2410c',
        };
      case 'error':
        return {
          bg: '#fef2f2',
          border: '#fca5a5',
          text: '#dc2626',
        };
    }
  };

  const styles = getStyles();

  // No mostrar nada si no hay alumnos
  if (uniqueStudentsCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        backgroundColor: styles.bg,
        borderRadius: 12,
        border: `2px solid ${styles.border}`,
      }}
    >
      {/* Mensaje principal */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: styles.text,
          marginBottom: validation.suggestion ? 8 : 0,
        }}
      >
        {validation.message}
      </div>

      {/* Sugerencia o detalle */}
      {validation.suggestion && (
        <div
          style={{
            fontSize: 13,
            color: styles.text,
            opacity: 0.9,
          }}
        >
          {validation.suggestion}
        </div>
      )}

      {/* Botón para aplicar sugerencia (solo si hay config sugerida) */}
      {validation.suggestedTeams && validation.suggestedPerTeam && onSuggestConfig && (
        <button
          onClick={() => onSuggestConfig(validation.suggestedTeams!, validation.suggestedPerTeam!)}
          style={{
            marginTop: 12,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            border: `2px solid ${styles.border}`,
            backgroundColor: 'white',
            color: styles.text,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ✨ {language === 'es' 
            ? 'Aplicar sugerencia' 
            : language === 'pt' 
            ? 'Aplicar sugestão' 
            : 'Apply suggestion'}
        </button>
      )}

      {/* Resumen visual */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: `1px solid ${styles.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748b',
        }}
      >
        <span>
          👥 {language === 'es' ? 'Alumnos' : language === 'pt' ? 'Alunos' : 'Students'}: <strong>{uniqueStudentsCount}</strong>
        </span>
        <span>
          📦 {language === 'es' ? 'Lugares' : language === 'pt' ? 'Lugares' : 'Slots'}: <strong>{totalSlots}</strong> ({numberOfTeams} × {studentsPerTeam})
        </span>
      </div>
    </div>
  );
}

// ============================================
// Hook para usar la validación en otros componentes
// ============================================

export function useStudentValidation(
  numberOfTeams: number,
  studentsPerTeam: number,
  uniqueStudentsCount: number
): { canProceed: boolean; status: 'perfect' | 'acceptable' | 'warning' | 'error' } {
  const totalSlots = numberOfTeams * studentsPerTeam;
  const difference = uniqueStudentsCount - totalSlots;

  // No hay alumnos
  if (uniqueStudentsCount === 0) {
    return { canProceed: false, status: 'warning' };
  }

  // Muy pocos alumnos
  if (uniqueStudentsCount < 6) {
    return { canProceed: false, status: 'error' };
  }

  // Más alumnos que lugares
  if (difference > 0) {
    return { canProceed: false, status: 'error' };
  }

  // Exactamente igual
  if (difference === 0) {
    return { canProceed: true, status: 'perfect' };
  }

  // Faltan algunos pero es aceptable
  const avgStudentsPerTeam = uniqueStudentsCount / numberOfTeams;
  const minStudentsInTeam = Math.floor(avgStudentsPerTeam);
  
  if (minStudentsInTeam >= studentsPerTeam - 2 && minStudentsInTeam >= 3) {
    return { canProceed: true, status: 'acceptable' };
  }

  // Faltan muchos
  return { canProceed: true, status: 'warning' };
}