// src/components/PostGame/StudentSelfEvalForm.tsx
// 📝 Formulario de autoevaluación individual para estudiantes
// ✅ ACTUALIZADO: Mejor manejo de errores y logging

import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { database } from "../../firebase.config";
import { useI18n } from "../../i18n";
import type { Team, Player, PedagogicalDevices } from "../../types/game";

interface StudentSelfEvalFormProps {
  gameId: string;
  teamId: string;
  playerId: string;
  onComplete?: () => void;
}

// Estado del formulario
interface FormData {
  whatLearned: string;
  helpedBy: string[];
  helpedOthers: string[];
  difficultyRating: number | null;
  confidenceBefore: number | null;
  confidenceAfter: number | null;
}

export function StudentSelfEvalForm({
  gameId,
  teamId,
  playerId,
  onComplete,
}: StudentSelfEvalFormProps) {
  const { language } = useI18n();

  // Estados de carga
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos del juego
  const [playerName, setPlayerName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [allPlayers, setAllPlayers] = useState<Array<{ id: string; name: string; teamId: string; teamName: string }>>([]);
  const [includeMetacognition, setIncludeMetacognition] = useState(false);

  // Formulario
  const [formData, setFormData] = useState<FormData>({
    whatLearned: "",
    helpedBy: [],
    helpedOthers: [],
    difficultyRating: null,
    confidenceBefore: null,
    confidenceAfter: null,
  });

  // Paso actual (para mobile-friendly wizard)
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = includeMetacognition ? 4 : 3;

  const texts = {
    es: {
      title: "Autoevaluación",
      subtitle: "Reflexioná sobre tu participación en el juego",
      loading: "Cargando...",
      alreadySubmitted: "Ya enviaste tu autoevaluación",
      alreadySubmittedDesc: "Gracias por participar. Tu docente revisará las respuestas.",
      
      // Step 1
      step1Title: "¿Qué aprendiste?",
      step1Desc: "Contanos qué cosas nuevas descubriste o entendiste mejor",
      whatLearnedPlaceholder: "Durante el juego aprendí que...",
      
      // Step 2
      step2Title: "¿Quién te ayudó?",
      step2Desc: "Seleccioná a los compañeros que te ayudaron a entender algo",
      noOneHelped: "Nadie me ayudó / Trabajé solo",
      
      // Step 3
      step3Title: "¿A quién ayudaste?",
      step3Desc: "Seleccioná a los compañeros a quienes explicaste algo",
      didntHelpAnyone: "No ayudé a nadie",
      
      // Step 4 (metacognición)
      step4Title: "Reflexión final",
      difficultyQuestion: "¿Qué tan difícil fue el tema?",
      difficultyLabels: ["Muy fácil", "Fácil", "Normal", "Difícil", "Muy difícil"],
      confidenceBeforeQuestion: "Antes del juego, ¿cuánto sabías del tema?",
      confidenceAfterQuestion: "Después del juego, ¿cuánto sentís que sabés?",
      confidenceLabels: ["Nada", "Poco", "Algo", "Bastante", "Mucho"],
      
      // Navigation
      next: "Siguiente →",
      previous: "← Anterior",
      submit: "✅ Enviar",
      
      // Validation
      pleaseWrite: "Por favor escribí algo antes de continuar",
      
      // Success
      thankYou: "¡Gracias!",
      successMessage: "Tu autoevaluación fue enviada correctamente.",
      closeWindow: "Podés cerrar esta página.",
      
      // Errors
      errorLoading: "Error al cargar los datos",
      errorSubmitting: "Error al enviar. Intentá de nuevo.",
      
      // Misc
      step: "Paso",
      of: "de",
      myTeam: "Mi equipo",
      otherTeams: "Otros equipos",
    },
    en: {
      title: "Self-Evaluation",
      subtitle: "Reflect on your participation in the game",
      loading: "Loading...",
      alreadySubmitted: "You already submitted your self-evaluation",
      alreadySubmittedDesc: "Thanks for participating. Your teacher will review the responses.",
      
      step1Title: "What did you learn?",
      step1Desc: "Tell us what new things you discovered or understood better",
      whatLearnedPlaceholder: "During the game I learned that...",
      
      step2Title: "Who helped you?",
      step2Desc: "Select classmates who helped you understand something",
      noOneHelped: "Nobody helped me / I worked alone",
      
      step3Title: "Who did you help?",
      step3Desc: "Select classmates you explained something to",
      didntHelpAnyone: "I didn't help anyone",
      
      step4Title: "Final reflection",
      difficultyQuestion: "How difficult was the topic?",
      difficultyLabels: ["Very easy", "Easy", "Normal", "Hard", "Very hard"],
      confidenceBeforeQuestion: "Before the game, how much did you know?",
      confidenceAfterQuestion: "After the game, how much do you feel you know?",
      confidenceLabels: ["Nothing", "Little", "Some", "Quite a bit", "A lot"],
      
      next: "Next →",
      previous: "← Previous",
      submit: "✅ Submit",
      
      pleaseWrite: "Please write something before continuing",
      
      thankYou: "Thank you!",
      successMessage: "Your self-evaluation was submitted successfully.",
      closeWindow: "You can close this page.",
      
      errorLoading: "Error loading data",
      errorSubmitting: "Error submitting. Please try again.",
      
      step: "Step",
      of: "of",
      myTeam: "My team",
      otherTeams: "Other teams",
    },
    pt: {
      title: "Autoavaliação",
      subtitle: "Reflita sobre sua participação no jogo",
      loading: "Carregando...",
      alreadySubmitted: "Você já enviou sua autoavaliação",
      alreadySubmittedDesc: "Obrigado por participar. Seu professor revisará as respostas.",
      
      step1Title: "O que você aprendeu?",
      step1Desc: "Conte-nos o que você descobriu ou entendeu melhor",
      whatLearnedPlaceholder: "Durante o jogo eu aprendi que...",
      
      step2Title: "Quem te ajudou?",
      step2Desc: "Selecione os colegas que te ajudaram a entender algo",
      noOneHelped: "Ninguém me ajudou / Trabalhei sozinho",
      
      step3Title: "Quem você ajudou?",
      step3Desc: "Selecione os colegas para quem você explicou algo",
      didntHelpAnyone: "Não ajudei ninguém",
      
      step4Title: "Reflexão final",
      difficultyQuestion: "Quão difícil foi o tema?",
      difficultyLabels: ["Muito fácil", "Fácil", "Normal", "Difícil", "Muito difícil"],
      confidenceBeforeQuestion: "Antes do jogo, quanto você sabia sobre o tema?",
      confidenceAfterQuestion: "Depois do jogo, quanto você sente que sabe?",
      confidenceLabels: ["Nada", "Pouco", "Algo", "Bastante", "Muito"],
      
      next: "Próximo →",
      previous: "← Anterior",
      submit: "✅ Enviar",
      
      pleaseWrite: "Por favor escreva algo antes de continuar",
      
      thankYou: "Obrigado!",
      successMessage: "Sua autoavaliação foi enviada com sucesso.",
      closeWindow: "Você pode fechar esta página.",
      
      errorLoading: "Erro ao carregar dados",
      errorSubmitting: "Erro ao enviar. Tente novamente.",
      
      step: "Passo",
      of: "de",
      myTeam: "Minha equipe",
      otherTeams: "Outras equipes",
    },
  };

  const t = texts[language] || texts.es;

  // Cargar datos del juego
  useEffect(() => {
    console.log("🔵 [StudentSelfEvalForm] Initializing with:", { gameId, teamId, playerId });
    
    const loadGameData = async () => {
      try {
        // Verificar si ya envió
        const existingEvalSnap = await get(
          ref(database, `games/${gameId}/selfEvaluations/${playerId}`)
        );
        if (existingEvalSnap.exists()) {
          console.log("🟡 [StudentSelfEvalForm] Already submitted");
          setSubmitted(true);
          setLoading(false);
          return;
        }

        // Cargar config para saber si incluir metacognición
        const configSnap = await get(ref(database, `games/${gameId}/config`));
        if (configSnap.exists()) {
          const config = configSnap.val();
          const devices: PedagogicalDevices | undefined = config.pedagogicalDevices;
          const hasMetacognition = devices?.selfEvaluation?.includeMetacognition ?? false;
          console.log("🔵 [StudentSelfEvalForm] includeMetacognition:", hasMetacognition);
          setIncludeMetacognition(hasMetacognition);
        }

        // Cargar equipos y jugadores
        const teamsSnap = await get(ref(database, `games/${gameId}/teams`));
        if (teamsSnap.exists()) {
          const teamsData = teamsSnap.val();
          const teams: Team[] = Array.isArray(teamsData) 
            ? teamsData 
            : Object.values(teamsData);

          console.log("🔵 [StudentSelfEvalForm] Teams loaded:", teams.length);

          const players: Array<{ id: string; name: string; teamId: string; teamName: string }> = [];

          teams.forEach((team) => {
            const teamPlayers: Player[] = Array.isArray(team.players)
              ? team.players
              : Object.values(team.players || {});

            teamPlayers.forEach((player) => {
              // Encontrar el jugador actual
              if (player.id === playerId) {
                setPlayerName(player.name);
                setTeamName(team.name);
                console.log("🔵 [StudentSelfEvalForm] Found current player:", player.name, "in team:", team.name);
              }
              
              // Agregar a la lista (excepto el jugador actual)
              if (player.id !== playerId) {
                players.push({
                  id: player.id,
                  name: player.name,
                  teamId: team.id,
                  teamName: team.name,
                });
              }
            });
          });

          setAllPlayers(players);
        }

        setLoading(false);
      } catch (err) {
        console.error("🔴 [StudentSelfEvalForm] Error loading game data:", err);
        setError(t.errorLoading);
        setLoading(false);
      }
    };

    loadGameData();
  }, [gameId, playerId, t.errorLoading]);

  // Manejar selección de compañeros
  const togglePlayer = (field: "helpedBy" | "helpedOthers", targetPlayerId: string) => {
    setFormData((prev) => {
      const current = prev[field];
      const isSelected = current.includes(targetPlayerId);
      
      return {
        ...prev,
        [field]: isSelected
          ? current.filter((id) => id !== targetPlayerId)
          : [...current, targetPlayerId],
      };
    });
  };

  // Validación por paso
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.whatLearned.trim().length >= 10;
      case 2:
      case 3:
        return true; // Opcional seleccionar compañeros
      case 4:
        return true; // Metacognición también opcional
      default:
        return true;
    }
  };

  // ✅ ENVIAR FORMULARIO - con mejor manejo de errores
  const handleSubmit = async () => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const evalData = {
        odgId: playerId,
        playerId: playerId,
        playerName,
        teamId,
        teamName,
        whatLearned: formData.whatLearned.trim(),
        helpedBy: formData.helpedBy,
        helpedOthers: formData.helpedOthers,
        submittedAt: Date.now(),
        validated: false,
        // Metacognición (si aplica)
        ...(includeMetacognition && {
          difficultyRating: formData.difficultyRating,
          confidenceBefore: formData.confidenceBefore,
          confidenceAfter: formData.confidenceAfter,
        }),
      };

      const evalPath = `games/${gameId}/selfEvaluations/${playerId}`;
      console.log("🔵 [StudentSelfEvalForm] Saving to:", evalPath);
      console.log("🔵 [StudentSelfEvalForm] Data:", JSON.stringify(evalData, null, 2));

      await set(ref(database, evalPath), evalData);

      console.log("✅ [StudentSelfEvalForm] Saved successfully!");
      setSubmitted(true);
      onComplete?.();
    } catch (err: any) {
      console.error("🔴 [StudentSelfEvalForm] Error submitting:", err);
      console.error("🔴 [StudentSelfEvalForm] Error code:", err?.code);
      console.error("🔴 [StudentSelfEvalForm] Error message:", err?.message);
      
      // Mostrar error más descriptivo
      if (err?.code === "PERMISSION_DENIED") {
        setError("Error de permisos. Contactá a tu docente.");
      } else {
        setError(t.errorSubmitting + " " + (err?.message || ""));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Componente de rating
  const RatingSelector = ({
    value,
    onChange,
    labels,
  }: {
    value: number | null;
    onChange: (val: number) => void;
    labels: string[];
  }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            border: value === num ? "3px solid #3b82f6" : "2px solid #e2e8f0",
            backgroundColor: value === num ? "#eff6ff" : "white",
            color: value === num ? "#3b82f6" : "#64748b",
            fontSize: 20,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {num}
        </button>
      ))}
    </div>
  );

  // Componente selector de compañeros
  const PlayerSelector = ({
    field,
    noneLabel,
  }: {
    field: "helpedBy" | "helpedOthers";
    noneLabel: string;
  }) => {
    const selected = formData[field];
    const myTeamPlayers = allPlayers.filter((p) => p.teamId === teamId);
    const otherPlayers = allPlayers.filter((p) => p.teamId !== teamId);

    return (
      <div>
        {/* Mi equipo */}
        {myTeamPlayers.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
              {t.myTeam}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {myTeamPlayers.map((player) => {
                const isSelected = selected.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => togglePlayer(field, player.id)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 20,
                      border: isSelected ? "2px solid #3b82f6" : "2px solid #e2e8f0",
                      backgroundColor: isSelected ? "#eff6ff" : "white",
                      color: isSelected ? "#3b82f6" : "#334155",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {isSelected && "✓ "}{player.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Otros equipos */}
        {otherPlayers.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
              {t.otherTeams}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {otherPlayers.map((player) => {
                const isSelected = selected.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => togglePlayer(field, player.id)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 20,
                      border: isSelected ? "2px solid #22c55e" : "2px solid #e2e8f0",
                      backgroundColor: isSelected ? "#f0fdf4" : "white",
                      color: isSelected ? "#16a34a" : "#334155",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {isSelected && "✓ "}{player.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Opción "nadie" */}
        <button
          type="button"
          onClick={() => setFormData((prev) => ({ ...prev, [field]: [] }))}
          style={{
            padding: "10px 16px",
            borderRadius: 20,
            border: selected.length === 0 ? "2px solid #f59e0b" : "2px solid #e2e8f0",
            backgroundColor: selected.length === 0 ? "#fef3c7" : "white",
            color: selected.length === 0 ? "#b45309" : "#64748b",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            width: "100%",
            marginTop: 8,
          }}
        >
          {noneLabel}
        </button>
      </div>
    );
  };

  // ========== RENDERS ==========

  // Loading
  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <p style={{ color: "#64748b" }}>{t.loading}</p>
        </div>
      </div>
    );
  }

  // Ya enviado
  if (submitted) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: "0 0 8px", color: "#1e293b", fontSize: 24 }}>{t.thankYou}</h2>
          <p style={{ color: "#22c55e", fontWeight: 600, marginBottom: 8 }}>
            {t.successMessage}
          </p>
          <p style={{ color: "#64748b", fontSize: 14 }}>{t.closeWindow}</p>
        </div>
      </div>
    );
  }

  // Formulario
  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📝</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1e293b" }}>
          {t.title}
        </h1>
        <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14 }}>
          {playerName} • {teamName}
        </p>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              style={{
                width: currentStep > i ? 40 : 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: currentStep > i ? "#3b82f6" : "#e2e8f0",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
        <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
          {t.step} {currentStep} {t.of} {totalSteps}
        </p>
      </div>

      {/* Step Content */}
      <div style={{ flex: 1, minHeight: 300 }}>
        {/* Step 1: ¿Qué aprendiste? */}
        {currentStep === 1 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
              {t.step1Title}
            </h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>{t.step1Desc}</p>
            <textarea
              value={formData.whatLearned}
              onChange={(e) => setFormData((prev) => ({ ...prev, whatLearned: e.target.value }))}
              placeholder={t.whatLearnedPlaceholder}
              rows={6}
              style={{
                width: "100%",
                padding: 16,
                fontSize: 16,
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            {formData.whatLearned.length > 0 && formData.whatLearned.length < 10 && (
              <p style={{ color: "#f59e0b", fontSize: 13, marginTop: 8 }}>
                {t.pleaseWrite}
              </p>
            )}
          </div>
        )}

        {/* Step 2: ¿Quién te ayudó? */}
        {currentStep === 2 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
              {t.step2Title}
            </h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>{t.step2Desc}</p>
            <PlayerSelector field="helpedBy" noneLabel={t.noOneHelped} />
          </div>
        )}

        {/* Step 3: ¿A quién ayudaste? */}
        {currentStep === 3 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
              {t.step3Title}
            </h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>{t.step3Desc}</p>
            <PlayerSelector field="helpedOthers" noneLabel={t.didntHelpAnyone} />
          </div>
        )}

        {/* Step 4: Metacognición (si aplica) */}
        {currentStep === 4 && includeMetacognition && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>
              {t.step4Title}
            </h2>

            {/* Dificultad */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontWeight: 600, color: "#334155", marginBottom: 12, textAlign: "center" }}>
                {t.difficultyQuestion}
              </p>
              <RatingSelector
                value={formData.difficultyRating}
                onChange={(val) => setFormData((prev) => ({ ...prev, difficultyRating: val }))}
                labels={t.difficultyLabels}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
                <span>{t.difficultyLabels[0]}</span>
                <span>{t.difficultyLabels[4]}</span>
              </div>
            </div>

            {/* Confianza antes */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontWeight: 600, color: "#334155", marginBottom: 12, textAlign: "center" }}>
                {t.confidenceBeforeQuestion}
              </p>
              <RatingSelector
                value={formData.confidenceBefore}
                onChange={(val) => setFormData((prev) => ({ ...prev, confidenceBefore: val }))}
                labels={t.confidenceLabels}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
                <span>{t.confidenceLabels[0]}</span>
                <span>{t.confidenceLabels[4]}</span>
              </div>
            </div>

            {/* Confianza después */}
            <div>
              <p style={{ fontWeight: 600, color: "#334155", marginBottom: 12, textAlign: "center" }}>
                {t.confidenceAfterQuestion}
              </p>
              <RatingSelector
                value={formData.confidenceAfter}
                onChange={(val) => setFormData((prev) => ({ ...prev, confidenceAfter: val }))}
                labels={t.confidenceLabels}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
                <span>{t.confidenceLabels[0]}</span>
                <span>{t.confidenceLabels[4]}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        {currentStep > 1 && (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => prev - 1)}
            style={{
              flex: 1,
              padding: "14px 24px",
              fontSize: 16,
              fontWeight: 600,
              backgroundColor: "#f1f5f9",
              color: "#334155",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            {t.previous}
          </button>
        )}

        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => prev + 1)}
            disabled={!canProceed()}
            style={{
              flex: 1,
              padding: "14px 24px",
              fontSize: 16,
              fontWeight: 600,
              backgroundColor: canProceed() ? "#3b82f6" : "#e2e8f0",
              color: canProceed() ? "white" : "#94a3b8",
              border: "none",
              borderRadius: 12,
              cursor: canProceed() ? "pointer" : "not-allowed",
            }}
          >
            {t.next}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !canProceed()}
            style={{
              flex: 1,
              padding: "14px 24px",
              fontSize: 16,
              fontWeight: 700,
              backgroundColor: submitting ? "#9ca3af" : "#22c55e",
              color: "white",
              border: "none",
              borderRadius: 12,
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            {submitting ? "..." : t.submit}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p style={{ color: "#dc2626", textAlign: "center", marginTop: 12, fontSize: 14 }}>
          {error}
        </p>
      )}
    </div>
  );
}

// Estilos del contenedor principal
const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f8fafc",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  maxWidth: 500,
  margin: "0 auto",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};