// src/components/SelfEvalShareModal.tsx
// 📋 Modal para compartir links de autoevaluación por equipo
// ✅ ACTUALIZADO: Incluye campo para email del delegado por equipo
// Incluye: copiar links, enviar email a delegado, anunciar en Classroom

import { useState, useEffect, useMemo } from "react";
import {
  getCourses,
  createAnnouncement,
  type ClassroomCourse,
} from "../services/classroomService";
import type { Team, Player } from "../types/game";

interface SelfEvalShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  gameName: string;
  teams: Team[];
  language: "es" | "en" | "pt";
}

type ModalView = "links" | "classroom-select" | "classroom-preview" | "publishing" | "success" | "error";

export function SelfEvalShareModal({
  isOpen,
  onClose,
  gameId,
  gameName,
  teams,
  language,
}: SelfEvalShareModalProps) {
  const [view, setView] = useState<ModalView>("links");
  const [copiedTeamId, setCopiedTeamId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  
  // ✅ NUEVO: Estado para emails de delegados por equipo
  const [delegateEmails, setDelegateEmails] = useState<Record<string, string>>({});
  
  // Classroom states
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<ClassroomCourse | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string>("");

  const texts = {
    es: {
      title: "📋 Compartir Autoevaluación",
      subtitle: "Enviá el link correspondiente a cada equipo",
      teamMembers: "Integrantes",
      copyLink: "Copiar",
      copied: "✓ Copiado",
      sendEmail: "✉️ Enviar",
      sendToAll: "✉️ Enviar a todos",
      copyAll: "📋 Copiar todos los links",
      copiedAll: "✓ Todos copiados",
      announceClassroom: "📢 Anunciar en Google Classroom",
      noEmails: "Sin emails",
      close: "Cerrar",
      // ✅ NUEVO: Textos del delegado
      delegateEmail: "📧 Email del delegado (opcional):",
      delegatePlaceholder: "delegado@escuela.edu",
      delegateHint: "El delegado recibirá el link para compartir con su equipo",
      sendToDelegate: "✉️ Enviar al delegado",
      // Classroom
      selectCourse: "Seleccioná el curso",
      selectCourseHint: "El anuncio con todos los links se publicará en el curso",
      noCourses: "No se encontraron cursos",
      loading: "Cargando...",
      preview: "Vista previa del anuncio",
      publish: "📢 Publicar",
      publishing: "Publicando...",
      back: "← Volver",
      cancel: "Cancelar",
      success: "¡Anuncio publicado!",
      successHint: "Los alumnos recibirán una notificación",
      error: "Error",
      retry: "Reintentar",
      // Mensaje
      announcementTitle: "📝 ¡Hora de la autoevaluación!",
      announcementIntro: `Completá la autoevaluación del juego "${gameName}".`,
      announcementTeamInstruction: "Entrá al link de TU EQUIPO:",
      announcementReminder: "Recordá mencionar quién te ayudó y a quién ayudaste durante el juego.",
      emailSubject: "Autoevaluación",
      emailBody: "Completá tu autoevaluación en este link:",
      // ✅ NUEVO: Email del delegado
      delegateEmailSubject: "Autoevaluación - Delegado del equipo",
      delegateEmailIntro: "Hola,\n\nSos el delegado del equipo para la autoevaluación.\n\n📋 Tu responsabilidad:\n1. Compartí este link SOLO con tu equipo\n2. Asegurate de que cada uno complete su autoevaluación\n\n",
      delegateEmailTeamMembers: "👥 Integrantes de tu equipo:",
      delegateEmailLink: "🔗 Link del equipo",
      delegateEmailThanks: "\n\n¡Gracias por tu ayuda!",
    },
    en: {
      title: "📋 Share Self-Evaluation",
      subtitle: "Send the corresponding link to each team",
      teamMembers: "Members",
      copyLink: "Copy",
      copied: "✓ Copied",
      sendEmail: "✉️ Send",
      sendToAll: "✉️ Send to all",
      copyAll: "📋 Copy all links",
      copiedAll: "✓ All copied",
      announceClassroom: "📢 Announce on Google Classroom",
      noEmails: "No emails",
      close: "Close",
      // ✅ NEW: Delegate texts
      delegateEmail: "📧 Delegate's email (optional):",
      delegatePlaceholder: "delegate@school.edu",
      delegateHint: "The delegate will receive the link to share with their team",
      sendToDelegate: "✉️ Send to delegate",
      // Classroom
      selectCourse: "Select a course",
      selectCourseHint: "The announcement with all links will be posted to the course",
      noCourses: "No courses found",
      loading: "Loading...",
      preview: "Announcement preview",
      publish: "📢 Publish",
      publishing: "Publishing...",
      back: "← Back",
      cancel: "Cancel",
      success: "Announcement published!",
      successHint: "Students will receive a notification",
      error: "Error",
      retry: "Retry",
      // Message
      announcementTitle: "📝 Self-evaluation time!",
      announcementIntro: `Complete the self-evaluation for the game "${gameName}".`,
      announcementTeamInstruction: "Go to YOUR TEAM's link:",
      announcementReminder: "Remember to mention who helped you and who you helped during the game.",
      emailSubject: "Self-Evaluation",
      emailBody: "Complete your self-evaluation at this link:",
      // ✅ NEW: Delegate email
      delegateEmailSubject: "Self-Evaluation - Team Delegate",
      delegateEmailIntro: "Hello,\n\nYou are the team delegate for the self-evaluation.\n\n📋 Your responsibility:\n1. Share this link ONLY with your team\n2. Make sure everyone completes their self-evaluation\n\n",
      delegateEmailTeamMembers: "👥 Your team members:",
      delegateEmailLink: "🔗 Team link",
      delegateEmailThanks: "\n\nThank you for your help!",
    },
    pt: {
      title: "📋 Compartilhar Autoavaliação",
      subtitle: "Envie o link correspondente a cada equipe",
      teamMembers: "Integrantes",
      copyLink: "Copiar",
      copied: "✓ Copiado",
      sendEmail: "✉️ Enviar",
      sendToAll: "✉️ Enviar a todos",
      copyAll: "📋 Copiar todos os links",
      copiedAll: "✓ Todos copiados",
      announceClassroom: "📢 Anunciar no Google Classroom",
      noEmails: "Sem emails",
      close: "Fechar",
      // ✅ NOVO: Textos do delegado
      delegateEmail: "📧 Email do delegado (opcional):",
      delegatePlaceholder: "delegado@escola.edu",
      delegateHint: "O delegado receberá o link para compartilhar com sua equipe",
      sendToDelegate: "✉️ Enviar ao delegado",
      // Classroom
      selectCourse: "Selecione um curso",
      selectCourseHint: "O anúncio com todos os links será publicado no curso",
      noCourses: "Nenhum curso encontrado",
      loading: "Carregando...",
      preview: "Prévia do anúncio",
      publish: "📢 Publicar",
      publishing: "Publicando...",
      back: "← Voltar",
      cancel: "Cancelar",
      success: "Anúncio publicado!",
      successHint: "Os alunos receberão uma notificação",
      error: "Erro",
      retry: "Tentar novamente",
      // Message
      announcementTitle: "📝 Hora da autoavaliação!",
      announcementIntro: `Complete a autoavaliação do jogo "${gameName}".`,
      announcementTeamInstruction: "Acesse o link da SUA EQUIPE:",
      announcementReminder: "Lembre-se de mencionar quem te ajudou e quem você ajudou durante o jogo.",
      emailSubject: "Autoavaliação",
      emailBody: "Complete sua autoavaliação neste link:",
      // ✅ NOVO: Email do delegado
      delegateEmailSubject: "Autoavaliação - Delegado da equipe",
      delegateEmailIntro: "Olá,\n\nVocê é o delegado da equipe para a autoavaliação.\n\n📋 Sua responsabilidade:\n1. Compartilhe este link APENAS com sua equipe\n2. Certifique-se de que todos completem sua autoavaliação\n\n",
      delegateEmailTeamMembers: "👥 Integrantes da sua equipe:",
      delegateEmailLink: "🔗 Link da equipe",
      delegateEmailThanks: "\n\nObrigado pela ajuda!",
    },
  };

  const t = texts[language];

  // Base URL para los links
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.thetrafficlightgame.com";

  // Generar link por equipo
  const getTeamLink = (teamId: string) => `${baseUrl}/autoevaluacion/${gameId}/${teamId}`;

  // Obtener players de un team (manejar array u objeto)
  const getTeamPlayers = (team: Team): Player[] => {
    if (Array.isArray(team.players)) return team.players;
    return Object.values(team.players || {});
  };

  // Verificar si un equipo tiene emails (de Classroom)
  const teamHasClassroomEmails = (team: Team): boolean => {
    const players = getTeamPlayers(team);
    return players.some((p: any) => p.email);
  };

  // Obtener emails de un equipo (de Classroom)
  const getTeamEmails = (team: Team): string[] => {
    const players = getTeamPlayers(team);
    return players
      .filter((p: any) => p.email)
      .map((p: any) => p.email);
  };

  // ✅ NUEVO: Verificar si un equipo tiene email de delegado O emails de Classroom
  const teamCanSendEmail = (team: Team): boolean => {
    return !!delegateEmails[team.id]?.trim() || teamHasClassroomEmails(team);
  };

  // ✅ NUEVO: Actualizar email del delegado
  const handleDelegateEmailChange = (teamId: string, email: string) => {
    setDelegateEmails(prev => ({
      ...prev,
      [teamId]: email,
    }));
  };

  // Generar texto con todos los links
  const allLinksText = useMemo(() => {
    let text = `${t.announcementTitle}\n\n`;
    text += `${t.announcementIntro}\n\n`;
    text += `${t.announcementTeamInstruction}\n\n`;
    
    teams.forEach((team) => {
      const link = getTeamLink(team.id);
      text += `${team.name}: ${link}\n`;
    });
    
    text += `\n${t.announcementReminder}`;
    return text;
  }, [teams, gameId, t]);

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setView("links");
      setCopiedTeamId(null);
      setCopiedAll(false);
      setError("");
      setSelectedCourse(null);
      setDelegateEmails({}); // Reset delegate emails
    }
  }, [isOpen]);

  // Copiar link de un equipo
  const handleCopyTeamLink = async (teamId: string) => {
    const link = getTeamLink(teamId);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedTeamId(teamId);
      setTimeout(() => setCopiedTeamId(null), 2000);
    } catch (err) {
      console.error("Error copying:", err);
    }
  };

  // Copiar todos los links
  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(allLinksText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error("Error copying:", err);
    }
  };

  // ✅ ACTUALIZADO: Enviar email (a delegado o a todos)
  const handleSendEmail = (team: Team) => {
    const players = getTeamPlayers(team);
    const playerNames = players.map(p => p.name).join(", ");
    const link = getTeamLink(team.id);
    const delegateEmail = delegateEmails[team.id]?.trim();
    
    if (delegateEmail) {
      // Enviar al delegado con instrucciones especiales
      const subject = encodeURIComponent(`${t.delegateEmailSubject} - ${team.name}`);
      const body = encodeURIComponent(
        `${t.delegateEmailIntro}` +
        `${t.delegateEmailTeamMembers}\n${playerNames}\n\n` +
        `${t.delegateEmailLink} (${team.name}):\n${link}` +
        `${t.delegateEmailThanks}`
      );
      window.open(`mailto:${delegateEmail}?subject=${subject}&body=${body}`);
    } else {
      // Enviar a todos los emails de Classroom
      const emails = getTeamEmails(team);
      if (emails.length === 0) return;
      
      const subject = encodeURIComponent(`${t.emailSubject} - ${team.name}`);
      const body = encodeURIComponent(`${t.emailBody}\n\n${link}\n\n${t.announcementReminder}`);
      window.open(`mailto:${emails.join(",")}?subject=${subject}&body=${body}`);
    }
  };

  // Cargar cursos de Classroom
  const handleOpenClassroom = async () => {
    setView("classroom-select");
    setLoadingCourses(true);
    setError("");
    
    try {
      const coursesData = await getCourses();
      setCourses(coursesData);
    } catch (err: any) {
      setError(err.message || "Error loading courses");
      setView("error");
    } finally {
      setLoadingCourses(false);
    }
  };

  // Publicar anuncio en Classroom
  const handlePublish = async () => {
    if (!selectedCourse) return;
    
    setView("publishing");
    setError("");
    
    try {
      await createAnnouncement(selectedCourse.id, allLinksText);
      setView("success");
    } catch (err: any) {
      setError(err.message || "Error publishing");
      setView("error");
    }
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* ========== VISTA: LINKS ========== */}
        {view === "links" && (
          <>
            {/* Header */}
            <div style={headerStyle}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t.title}</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>{t.subtitle}</p>
              </div>
              <button onClick={onClose} style={closeButtonStyle}>✕</button>
            </div>

            {/* Lista de equipos */}
            <div style={{ padding: 20, maxHeight: "50vh", overflowY: "auto" }}>
              {teams.map((team) => {
                const players = getTeamPlayers(team);
                const hasClassroomEmails = teamHasClassroomEmails(team);
                const delegateEmail = delegateEmails[team.id] || "";
                const canSendEmail = teamCanSendEmail(team);
                const link = getTeamLink(team.id);
                const isCopied = copiedTeamId === team.id;

                return (
                  <div
                    key={team.id}
                    style={{
                      marginBottom: 16,
                      padding: 16,
                      backgroundColor: "#f8fafc",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {/* Nombre del equipo */}
                    <div style={{ 
                      fontWeight: 700, 
                      fontSize: 16, 
                      color: "#1e293b",
                      marginBottom: 8,
                    }}>
                      {team.name}
                    </div>

                    {/* Integrantes */}
                    <div style={{ 
                      fontSize: 13, 
                      color: "#64748b",
                      marginBottom: 12,
                    }}>
                      <span style={{ fontWeight: 600 }}>{t.teamMembers}:</span>{" "}
                      {players.map((p) => p.name).join(", ")}
                    </div>

                    {/* Link (truncado) */}
                    <div style={{
                      fontSize: 12,
                      color: "#3b82f6",
                      backgroundColor: "#eff6ff",
                      padding: "8px 12px",
                      borderRadius: 6,
                      marginBottom: 12,
                      wordBreak: "break-all",
                      fontFamily: "monospace",
                    }}>
                      {link}
                    </div>

                    {/* ✅ NUEVO: Campo de email del delegado */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ 
                        display: "block", 
                        fontSize: 12, 
                        color: "#64748b",
                        marginBottom: 6,
                      }}>
                        {t.delegateEmail}
                      </label>
                      <input
                        type="email"
                        value={delegateEmail}
                        onChange={(e) => handleDelegateEmailChange(team.id, e.target.value)}
                        placeholder={t.delegatePlaceholder}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          fontSize: 13,
                          borderRadius: 6,
                          border: "1px solid #e2e8f0",
                          backgroundColor: "white",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      {!hasClassroomEmails && !delegateEmail && (
                        <p style={{ 
                          margin: "6px 0 0", 
                          fontSize: 11, 
                          color: "#94a3b8",
                          fontStyle: "italic",
                        }}>
                          {t.delegateHint}
                        </p>
                      )}
                    </div>

                    {/* Botones */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleCopyTeamLink(team.id)}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          fontSize: 13,
                          fontWeight: 600,
                          borderRadius: 6,
                          border: "none",
                          backgroundColor: isCopied ? "#22c55e" : "#3b82f6",
                          color: "white",
                          cursor: "pointer",
                        }}
                      >
                        {isCopied ? t.copied : t.copyLink}
                      </button>

                      {canSendEmail ? (
                        <button
                          onClick={() => handleSendEmail(team)}
                          style={{
                            padding: "8px 12px",
                            fontSize: 13,
                            fontWeight: 600,
                            borderRadius: 6,
                            border: "1px solid #e2e8f0",
                            backgroundColor: "white",
                            color: "#475569",
                            cursor: "pointer",
                          }}
                        >
                          {delegateEmail ? t.sendToDelegate : (hasClassroomEmails ? t.sendToAll : t.sendEmail)}
                        </button>
                      ) : (
                        <span style={{ 
                          padding: "8px 12px", 
                          fontSize: 12, 
                          color: "#94a3b8",
                          display: "flex",
                          alignItems: "center",
                        }}>
                          {t.noEmails}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer con botones globales */}
            <div style={{ 
              padding: 20, 
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}>
              <button
                onClick={handleCopyAll}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: "2px solid #e2e8f0",
                  backgroundColor: copiedAll ? "#f0fdf4" : "white",
                  color: copiedAll ? "#16a34a" : "#475569",
                  cursor: "pointer",
                }}
              >
                {copiedAll ? t.copiedAll : t.copyAll}
              </button>

              <button
                onClick={handleOpenClassroom}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: "#4285f4",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                {t.announceClassroom}
              </button>

              <button
                onClick={onClose}
                style={{
                  width: "100%",
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: "transparent",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                {t.close}
              </button>
            </div>
          </>
        )}

        {/* ========== VISTA: SELECCIONAR CURSO ========== */}
        {view === "classroom-select" && (
          <>
            <div style={headerStyle}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t.selectCourse}</h2>
              <button onClick={onClose} style={closeButtonStyle}>✕</button>
            </div>

            <div style={{ padding: 20 }}>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>
                {t.selectCourseHint}
              </p>

              {loadingCourses ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <p style={{ color: "#64748b" }}>{t.loading}</p>
                </div>
              ) : courses.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <p style={{ color: "#64748b" }}>{t.noCourses}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => {
                        setSelectedCourse(course);
                        setView("classroom-preview");
                      }}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: "2px solid #e2e8f0",
                        backgroundColor: "white",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#1e293b" }}>{course.name}</div>
                      {course.section && (
                        <div style={{ fontSize: 13, color: "#64748b" }}>{course.section}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setView("links")}
                style={{ ...secondaryButtonStyle, marginTop: 16 }}
              >
                {t.back}
              </button>
            </div>
          </>
        )}

        {/* ========== VISTA: PREVIEW ANUNCIO ========== */}
        {view === "classroom-preview" && selectedCourse && (
          <>
            <div style={headerStyle}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t.preview}</h2>
              <button onClick={onClose} style={closeButtonStyle}>✕</button>
            </div>

            <div style={{ padding: 20 }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#64748b" }}>
                Curso: <strong>{selectedCourse.name}</strong>
              </p>

              <div style={{
                marginTop: 16,
                padding: 16,
                backgroundColor: "#f8fafc",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                whiteSpace: "pre-wrap",
                fontSize: 13,
                lineHeight: 1.6,
                color: "#334155",
                maxHeight: 300,
                overflowY: "auto",
              }}>
                {allLinksText}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button
                  onClick={() => setView("classroom-select")}
                  style={secondaryButtonStyle}
                >
                  {t.back}
                </button>
                <button
                  onClick={handlePublish}
                  style={{ ...primaryButtonStyle, flex: 1 }}
                >
                  {t.publish}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ========== VISTA: PUBLICANDO ========== */}
        {view === "publishing" && (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📤</div>
            <p style={{ color: "#64748b" }}>{t.publishing}</p>
          </div>
        )}

        {/* ========== VISTA: SUCCESS ========== */}
        {view === "success" && (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: "50%", 
              backgroundColor: "#dcfce7", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <span style={{ fontSize: 40 }}>✅</span>
            </div>
            <h3 style={{ margin: "0 0 8px", color: "#16a34a" }}>{t.success}</h3>
            <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14 }}>
              {t.successHint}
            </p>
            <button onClick={onClose} style={primaryButtonStyle}>
              {t.close}
            </button>
          </div>
        )}

        {/* ========== VISTA: ERROR ========== */}
        {view === "error" && (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: "50%", 
              backgroundColor: "#fef2f2", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <span style={{ fontSize: 40 }}>❌</span>
            </div>
            <h3 style={{ margin: "0 0 8px", color: "#dc2626" }}>{t.error}</h3>
            <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14 }}>
              {error}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={onClose} style={secondaryButtonStyle}>
                {t.cancel}
              </button>
              <button onClick={handleOpenClassroom} style={primaryButtonStyle}>
                {t.retry}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// ESTILOS
// ============================================

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: 16,
  width: "100%",
  maxWidth: 520,
  maxHeight: "90vh",
  overflow: "hidden",
  boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const closeButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: 20,
  cursor: "pointer",
  color: "#64748b",
  padding: 4,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 10,
  border: "none",
  backgroundColor: "#4285f4",
  color: "white",
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 10,
  border: "2px solid #e2e8f0",
  backgroundColor: "white",
  color: "#64748b",
  cursor: "pointer",
};