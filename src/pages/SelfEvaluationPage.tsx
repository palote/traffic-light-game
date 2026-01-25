// src/pages/SelfEvaluationPage.tsx
// 📝 Formulario de autoevaluación individual para alumnos

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ref, get, push } from "firebase/database";
import { database } from "../firebase.config";
import { useI18n } from "../i18n";

interface TeamMember {
  id: string;
  name: string;
}

interface HelpBlock {
  concept: string;
  fromWho: string[];
  description: string;
}

interface GiveHelpBlock {
  concept: string;
  toWho: string[];
  description: string;
}

export function SelfEvaluationPage() {
  const { gameId, teamId } = useParams<{ gameId: string; teamId: string }>();
  const { language } = useI18n();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Datos del juego/equipo
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [gameName, setGameName] = useState("");

  // Formulario
  const [studentName, setStudentName] = useState("");
  const [customName, setCustomName] = useState("");

  // Bloques de "Recibí ayuda"
  const [receivedHelp, setReceivedHelp] = useState<HelpBlock[]>([
    { concept: "", fromWho: [], description: "" },
  ]);

  // Bloques de "Di ayuda"
  const [gaveHelp, setGaveHelp] = useState<GiveHelpBlock[]>([
    { concept: "", toWho: [], description: "" },
  ]);

  const texts = {
    es: {
      title: "Autoevaluación",
      subtitle: "Reflexioná sobre tu aprendizaje en el juego",
      teamLabel: "Equipo",
      gameLabel: "Juego",
      whoAreYou: "¿Quién sos?",
      selectName: "Seleccioná tu nombre",
      otherName: "Otro (escribí tu nombre)",
      writeYourName: "Escribí tu nombre",
      
      receivedHelpTitle: "🤝 Ayuda que recibiste",
      receivedHelpDesc: "¿Qué conceptos o ideas pudiste comprender mejor durante el juego gracias a la ayuda de otros?",
      conceptLabel: "¿Qué concepto o idea comprendiste mejor?",
      conceptPlaceholder: "Ej: Entendí cómo funciona la fotosíntesis",
      fromWhoLabel: "¿De quién recibiste ayuda?",
      descriptionLabel: "Describí cómo sucedió ese aprendizaje",
      descriptionPlaceholder: "Contá con la mayor cantidad de detalles posible cómo te ayudaron",
      
      gaveHelpTitle: "💡 Ayuda que diste",
      gaveHelpDesc: "¿Qué conceptos o ideas ayudaste a que otra persona comprenda?",
      conceptGaveLabel: "¿Qué concepto o idea ayudaste a comprender?",
      conceptGavePlaceholder: "Ej: Expliqué cómo se calcula el área",
      toWhoLabel: "¿A quién ayudaste?",
      gaveDescriptionLabel: "Describí cómo sucedió ese aprendizaje",
      gaveDescriptionPlaceholder: "Contá con la mayor cantidad de detalles posible cómo ayudaste",
      
      addBlock: "+ Agregar otro",
      removeBlock: "Eliminar",
      submit: "Enviar autoevaluación",
      submitting: "Enviando...",
      
      successTitle: "¡Gracias!",
      successMessage: "Tu autoevaluación fue enviada correctamente.",
      successSubtitle: "Podés cerrar esta página.",
      
      errorNotFound: "No se encontró el juego o equipo",
      errorNotActive: "La autoevaluación no está activa para este juego",
      errorSubmit: "Error al enviar. Intentá de nuevo.",
      errorSelectName: "Por favor, seleccioná o escribí tu nombre",
      
      anonymous: "Anónimo",
      selectMembers: "Seleccioná uno o más compañeros",
    },
    en: {
      title: "Self-Evaluation",
      subtitle: "Reflect on your learning during the game",
      teamLabel: "Team",
      gameLabel: "Game",
      whoAreYou: "Who are you?",
      selectName: "Select your name",
      otherName: "Other (write your name)",
      writeYourName: "Write your name",
      
      receivedHelpTitle: "🤝 Help you received",
      receivedHelpDesc: "What concepts or ideas did you understand better during the game thanks to others' help?",
      conceptLabel: "What concept or idea did you understand better?",
      conceptPlaceholder: "E.g.: I understood how photosynthesis works",
      fromWhoLabel: "Who helped you?",
      descriptionLabel: "Describe how that learning happened",
      descriptionPlaceholder: "Tell with as much detail as possible how they helped you",
      
      gaveHelpTitle: "💡 Help you gave",
      gaveHelpDesc: "What concepts or ideas did you help someone else understand?",
      conceptGaveLabel: "What concept or idea did you help understand?",
      conceptGavePlaceholder: "E.g.: I explained how to calculate the area",
      toWhoLabel: "Who did you help?",
      gaveDescriptionLabel: "Describe how that learning happened",
      gaveDescriptionPlaceholder: "Tell with as much detail as possible how you helped",
      
      addBlock: "+ Add another",
      removeBlock: "Remove",
      submit: "Submit self-evaluation",
      submitting: "Submitting...",
      
      successTitle: "Thank you!",
      successMessage: "Your self-evaluation was submitted successfully.",
      successSubtitle: "You can close this page.",
      
      errorNotFound: "Game or team not found",
      errorNotActive: "Self-evaluation is not active for this game",
      errorSubmit: "Error submitting. Please try again.",
      errorSelectName: "Please select or write your name",
      
      anonymous: "Anonymous",
      selectMembers: "Select one or more teammates",
    },
    pt: {
      title: "Autoavaliação",
      subtitle: "Reflita sobre seu aprendizado no jogo",
      teamLabel: "Equipe",
      gameLabel: "Jogo",
      whoAreYou: "Quem é você?",
      selectName: "Selecione seu nome",
      otherName: "Outro (escreva seu nome)",
      writeYourName: "Escreva seu nome",
      
      receivedHelpTitle: "🤝 Ajuda que você recebeu",
      receivedHelpDesc: "Que conceitos ou ideias você conseguiu entender melhor durante o jogo graças à ajuda de outros?",
      conceptLabel: "Que conceito ou ideia você entendeu melhor?",
      conceptPlaceholder: "Ex: Entendi como funciona a fotossíntese",
      fromWhoLabel: "De quem você recebeu ajuda?",
      descriptionLabel: "Descreva como aconteceu esse aprendizado",
      descriptionPlaceholder: "Conte com o máximo de detalhes possível como te ajudaram",
      
      gaveHelpTitle: "💡 Ajuda que você deu",
      gaveHelpDesc: "Que conceitos ou ideias você ajudou outra pessoa a entender?",
      conceptGaveLabel: "Que conceito ou ideia você ajudou a entender?",
      conceptGavePlaceholder: "Ex: Expliquei como calcular a área",
      toWhoLabel: "Quem você ajudou?",
      gaveDescriptionLabel: "Descreva como aconteceu esse aprendizado",
      gaveDescriptionPlaceholder: "Conte com o máximo de detalhes possível como você ajudou",
      
      addBlock: "+ Adicionar outro",
      removeBlock: "Remover",
      submit: "Enviar autoavaliação",
      submitting: "Enviando...",
      
      successTitle: "Obrigado!",
      successMessage: "Sua autoavaliação foi enviada com sucesso.",
      successSubtitle: "Você pode fechar esta página.",
      
      errorNotFound: "Jogo ou equipe não encontrado",
      errorNotActive: "A autoavaliação não está ativa para este jogo",
      errorSubmit: "Erro ao enviar. Tente novamente.",
      errorSelectName: "Por favor, selecione ou escreva seu nome",
      
      anonymous: "Anônimo",
      selectMembers: "Selecione um ou mais colegas",
    },
  };

  const t = texts[language] || texts.es;

  // Cargar datos del juego y equipo
  useEffect(() => {
    async function loadData() {
      if (!gameId || !teamId) {
        setError(t.errorNotFound);
        setLoading(false);
        return;
      }

      try {
        const gameSnap = await get(ref(database, `games/${gameId}`));
        
        if (!gameSnap.exists()) {
          setError(t.errorNotFound);
          setLoading(false);
          return;
        }

        const gameData = gameSnap.val();

        // Verificar que la autoevaluación esté activa
        if (!gameData.selfEvaluationActive) {
          setError(t.errorNotActive);
          setLoading(false);
          return;
        }

        // Obtener nombre del juego
        setGameName(gameData.config?.className || gameData.config?.gameName || "");

        // Obtener datos del equipo
        const teamsData = gameData.teams;
        let teamData = null;

        if (teamsData) {
          if (teamsData[teamId]) {
            teamData = teamsData[teamId];
          } else if (Array.isArray(teamsData)) {
            teamData = teamsData.find((t: any) => t?.id === teamId);
          } else {
            teamData = Object.values(teamsData).find((t: any) => (t as any)?.id === teamId);
          }
        }

        if (!teamData) {
          setError(t.errorNotFound);
          setLoading(false);
          return;
        }

        setTeamName((teamData as any).name || teamId);

        // Obtener miembros del equipo
        const members: TeamMember[] = [];
        const playersData = (teamData as any).players;
        
        if (playersData) {
          if (Array.isArray(playersData)) {
            playersData.forEach((p: any, index: number) => {
              if (p?.name) {
                members.push({ id: `player-${index}`, name: p.name });
              }
            });
          } else if (typeof playersData === "object") {
            Object.entries(playersData).forEach(([key, p]: [string, any]) => {
              if (p?.name) {
                members.push({ id: key, name: p.name });
              }
            });
          }
        }

        // Si no hay jugadores registrados, agregar opción genérica
        if (members.length === 0) {
          // Crear miembros genéricos basados en studentsPerTeam
          const studentsPerTeam = gameData.config?.studentsPerTeam || 4;
          for (let i = 1; i <= studentsPerTeam; i++) {
            members.push({ id: `student-${i}`, name: `Estudiante ${i}` });
          }
        }

        setTeamMembers(members);
        setLoading(false);
      } catch (err) {
        console.error("Error loading game data:", err);
        setError(t.errorNotFound);
        setLoading(false);
      }
    }

    loadData();
  }, [gameId, teamId, t.errorNotFound, t.errorNotActive]);

  // Handlers para bloques de ayuda recibida
  const updateReceivedHelp = (index: number, field: keyof HelpBlock, value: any) => {
    setReceivedHelp((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addReceivedHelpBlock = () => {
    if (receivedHelp.length < 3) {
      setReceivedHelp((prev) => [...prev, { concept: "", fromWho: [], description: "" }]);
    }
  };

  const removeReceivedHelpBlock = (index: number) => {
    if (receivedHelp.length > 1) {
      setReceivedHelp((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Handlers para bloques de ayuda dada
  const updateGaveHelp = (index: number, field: keyof GiveHelpBlock, value: any) => {
    setGaveHelp((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addGaveHelpBlock = () => {
    if (gaveHelp.length < 3) {
      setGaveHelp((prev) => [...prev, { concept: "", toWho: [], description: "" }]);
    }
  };

  const removeGaveHelpBlock = (index: number) => {
    if (gaveHelp.length > 1) {
      setGaveHelp((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Toggle miembro en lista
  const toggleMember = (
    blockType: "received" | "gave",
    blockIndex: number,
    memberName: string
  ) => {
    if (blockType === "received") {
      setReceivedHelp((prev) => {
        const updated = [...prev];
        const current = updated[blockIndex].fromWho;
        if (current.includes(memberName)) {
          updated[blockIndex].fromWho = current.filter((n) => n !== memberName);
        } else {
          updated[blockIndex].fromWho = [...current, memberName];
        }
        return updated;
      });
    } else {
      setGaveHelp((prev) => {
        const updated = [...prev];
        const current = updated[blockIndex].toWho;
        if (current.includes(memberName)) {
          updated[blockIndex].toWho = current.filter((n) => n !== memberName);
        } else {
          updated[blockIndex].toWho = [...current, memberName];
        }
        return updated;
      });
    }
  };

  // Enviar formulario
  const handleSubmit = async () => {
    const finalName = studentName === "__other__" ? customName.trim() : studentName;

    if (!finalName) {
      alert(t.errorSelectName);
      return;
    }

    setSubmitting(true);

    try {
      const evaluationData = {
        gameId,
        teamId,
        teamName,
        studentName: finalName,
        receivedHelp: receivedHelp.filter((h) => h.concept.trim() || h.description.trim()),
        gaveHelp: gaveHelp.filter((h) => h.concept.trim() || h.description.trim()),
        submittedAt: Date.now(),
        language,
      };

      await push(ref(database, `selfEvaluations/${gameId}`), evaluationData);

      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting evaluation:", err);
      alert(t.errorSubmit);
    }

    setSubmitting(false);
  };

  // Pantalla de carga
  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <div style={{ fontSize: 18, color: "#64748b" }}>Cargando...</div>
        </div>
      </div>
    );
  }

  // Pantalla de error
  if (error) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <div style={{ fontSize: 18, color: "#dc2626" }}>{error}</div>
        </div>
      </div>
    );
  }

  // Pantalla de éxito
  if (submitted) {
    return (
      <div style={containerStyle}>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 24,
            padding: 40,
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h1 style={{ margin: "0 0 8px 0", fontSize: 28, fontWeight: 800, color: "#22c55e" }}>
            {t.successTitle}
          </h1>
          <p style={{ margin: "0 0 8px 0", fontSize: 16, color: "#374151" }}>{t.successMessage}</p>
          <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>{t.successSubtitle}</p>
        </div>
      </div>
    );
  }

  // Formulario principal
  return (
    <div style={containerStyle}>
      <div style={formContainerStyle}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📝</div>
          <h1 style={{ margin: "0 0 4px 0", fontSize: 24, fontWeight: 800, color: "#1e293b" }}>
            {t.title}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>{t.subtitle}</p>
        </div>

        {/* Info del juego/equipo */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={infoBadgeStyle}>
            <span style={{ fontSize: 12, color: "#64748b" }}>{t.gameLabel}</span>
            <span style={{ fontWeight: 600 }}>{gameName || "—"}</span>
          </div>
          <div style={infoBadgeStyle}>
            <span style={{ fontSize: 12, color: "#64748b" }}>{t.teamLabel}</span>
            <span style={{ fontWeight: 600 }}>{teamName}</span>
          </div>
        </div>

        {/* Quién sos */}
        <div style={sectionStyle}>
          <label style={labelStyle}>{t.whoAreYou}</label>
          <select
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            style={selectStyle}
          >
            <option value="">{t.selectName}</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.name}>
                {member.name}
              </option>
            ))}
            <option value="__other__">{t.otherName}</option>
          </select>

          {studentName === "__other__" && (
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={t.writeYourName}
              style={{ ...inputStyle, marginTop: 8 }}
            />
          )}
        </div>

        {/* Sección: Ayuda recibida */}
        <div style={{ ...sectionStyle, backgroundColor: "#f0fdf4", border: "2px solid #22c55e" }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#15803d" }}>
            {t.receivedHelpTitle}
          </h2>
          <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#64748b" }}>{t.receivedHelpDesc}</p>

          {receivedHelp.map((block, index) => (
            <div key={index} style={blockStyle}>
              {receivedHelp.length > 1 && (
                <button
                  onClick={() => removeReceivedHelpBlock(index)}
                  style={removeButtonStyle}
                  type="button"
                >
                  ✕
                </button>
              )}

              <label style={labelStyle}>{t.conceptLabel}</label>
              <input
                type="text"
                value={block.concept}
                onChange={(e) => updateReceivedHelp(index, "concept", e.target.value)}
                placeholder={t.conceptPlaceholder}
                style={inputStyle}
              />

              <label style={{ ...labelStyle, marginTop: 12 }}>{t.fromWhoLabel}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {teamMembers
                  .filter((m) => m.name !== studentName && m.name !== customName)
                  .map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember("received", index, member.name)}
                      style={{
                        ...chipStyle,
                        backgroundColor: block.fromWho.includes(member.name) ? "#22c55e" : "#e2e8f0",
                        color: block.fromWho.includes(member.name) ? "white" : "#374151",
                      }}
                    >
                      {member.name}
                    </button>
                  ))}
              </div>

              <label style={labelStyle}>{t.descriptionLabel}</label>
              <textarea
                value={block.description}
                onChange={(e) => updateReceivedHelp(index, "description", e.target.value)}
                placeholder={t.descriptionPlaceholder}
                rows={3}
                style={textareaStyle}
              />
            </div>
          ))}

          {receivedHelp.length < 3 && (
            <button onClick={addReceivedHelpBlock} style={addButtonStyle} type="button">
              {t.addBlock}
            </button>
          )}
        </div>

        {/* Sección: Ayuda dada */}
        <div style={{ ...sectionStyle, backgroundColor: "#eff6ff", border: "2px solid #3b82f6" }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#1d4ed8" }}>
            {t.gaveHelpTitle}
          </h2>
          <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#64748b" }}>{t.gaveHelpDesc}</p>

          {gaveHelp.map((block, index) => (
            <div key={index} style={blockStyle}>
              {gaveHelp.length > 1 && (
                <button
                  onClick={() => removeGaveHelpBlock(index)}
                  style={removeButtonStyle}
                  type="button"
                >
                  ✕
                </button>
              )}

              <label style={labelStyle}>{t.conceptGaveLabel}</label>
              <input
                type="text"
                value={block.concept}
                onChange={(e) => updateGaveHelp(index, "concept", e.target.value)}
                placeholder={t.conceptGavePlaceholder}
                style={inputStyle}
              />

              <label style={{ ...labelStyle, marginTop: 12 }}>{t.toWhoLabel}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {teamMembers
                  .filter((m) => m.name !== studentName && m.name !== customName)
                  .map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember("gave", index, member.name)}
                      style={{
                        ...chipStyle,
                        backgroundColor: block.toWho.includes(member.name) ? "#3b82f6" : "#e2e8f0",
                        color: block.toWho.includes(member.name) ? "white" : "#374151",
                      }}
                    >
                      {member.name}
                    </button>
                  ))}
              </div>

              <label style={labelStyle}>{t.gaveDescriptionLabel}</label>
              <textarea
                value={block.description}
                onChange={(e) => updateGaveHelp(index, "description", e.target.value)}
                placeholder={t.gaveDescriptionPlaceholder}
                rows={3}
                style={textareaStyle}
              />
            </div>
          ))}

          {gaveHelp.length < 3 && (
            <button onClick={addGaveHelpBlock} style={addButtonStyle} type="button">
              {t.addBlock}
            </button>
          )}
        </div>

        {/* Botón enviar */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: "100%",
            padding: 18,
            fontSize: 18,
            fontWeight: 700,
            backgroundColor: submitting ? "#94a3b8" : "#8b5cf6",
            color: "white",
            border: "none",
            borderRadius: 12,
            cursor: submitting ? "not-allowed" : "pointer",
            marginTop: 8,
          }}
        >
          {submitting ? t.submitting : t.submit}
        </button>
      </div>
    </div>
  );
}

// Estilos
const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#f1f5f9",
  padding: 16,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
};

const formContainerStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 20,
  padding: 24,
  maxWidth: 500,
  width: "100%",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  marginTop: 16,
  marginBottom: 32,
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  fontSize: 15,
  borderRadius: 8,
  border: "2px solid #e2e8f0",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  fontSize: 15,
  borderRadius: 8,
  border: "2px solid #e2e8f0",
  backgroundColor: "white",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  fontSize: 15,
  borderRadius: 8,
  border: "2px solid #e2e8f0",
  fontFamily: "inherit",
  resize: "vertical",
  boxSizing: "border-box",
};

const blockStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 10,
  padding: 16,
  marginBottom: 12,
  position: "relative",
};

const chipStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s",
};

const addButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  fontSize: 14,
  fontWeight: 600,
  backgroundColor: "transparent",
  color: "#64748b",
  border: "2px dashed #cbd5e1",
  borderRadius: 8,
  cursor: "pointer",
};

const removeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 24,
  height: 24,
  borderRadius: "50%",
  backgroundColor: "#fee2e2",
  color: "#dc2626",
  border: "none",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const infoBadgeStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  backgroundColor: "#f1f5f9",
  borderRadius: 8,
  padding: "8px 16px",
};