// src/pages/WebinarRegistrationPage.tsx
// VERSIÓN ACTUALIZADA - Reemplazar el archivo completo

import { useState, useEffect } from "react";
import { ref, push, get, serverTimestamp } from "firebase/database";
import { database } from "../firebase.config";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";

interface WebinarConfig {
  active: boolean;
  title: string;
  topic: string;
  date: string;
  timezone: string;
}

export function WebinarRegistrationPage() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [webinarConfig, setWebinarConfig] = useState<WebinarConfig | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    teachingLevel: "", // Nuevo campo
    school: "",
    experience: "none",
    questions: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "no-webinar">("idle");

  useEffect(() => {
    const fetchWebinarConfig = async () => {
      try {
        const configRef = ref(database, "config/webinar");
        const snapshot = await get(configRef);
        if (snapshot.exists()) {
          const config = snapshot.val();
          if (config.active) {
            setWebinarConfig(config);
          } else {
            setStatus("no-webinar");
          }
        } else {
          setStatus("no-webinar");
        }
      } catch (error) {
        console.error("Error fetching webinar config:", error);
        setStatus("no-webinar");
      }
    };

    fetchWebinarConfig();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.displayName || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    const locale = language === "pt" ? "pt-BR" : language === "en" ? "en-US" : "es-AR";
    return date.toLocaleDateString(locale, options);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const registrationsRef = ref(database, "webinarRegistrations");
      await push(registrationsRef, {
        odriUserId: user?.uid || null,
        ...formData,
        webinarDate: webinarConfig?.date,
        webinarTopic: webinarConfig?.topic,
        registeredAt: serverTimestamp(),
        language: language, // Guardar idioma del usuario
      });

      setStatus("success");
    } catch (error) {
      console.error("Error submitting registration:", error);
      setStatus("error");
    }
  };

  // ============================================
  // PANTALLA: No hay webinar
  // ============================================
  if (status === "no-webinar") {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
        <div
          style={{
            maxWidth: 500,
            margin: "60px auto",
            background: "white",
            borderRadius: 16,
            padding: 40,
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>📅</div>
          <h1 style={{ color: "#64748b", marginBottom: 8 }}>{t.webinar.noWebinar}</h1>
          <p style={{ color: "#94a3b8", marginBottom: 24 }}>{t.webinar.noWebinarDesc}</p>
          <a
            href="/dashboard"
            style={{
              display: "inline-block",
              background: "#3b82f6",
              color: "white",
              padding: "12px 24px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {t.webinar.backToDashboard}
          </a>
        </div>
      </div>
    );
  }

  // ============================================
  // PANTALLA: Éxito - MEJORADA con links a juegos
  // ============================================
  if (status === "success") {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
        <div
          style={{
            maxWidth: 500,
            margin: "60px auto",
            background: "white",
            borderRadius: 16,
            padding: 40,
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h1 style={{ color: "#10b981", marginBottom: 8, fontSize: 24 }}>{t.webinar.successTitle}</h1>
          <p style={{ color: "#64748b", marginBottom: 16 }}>{t.webinar.successMessage}</p>
          
          {webinarConfig && (
            <div
              style={{
                background: "#eff6ff",
                borderRadius: 12,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <div style={{ fontWeight: 600, color: "#1e40af", marginBottom: 8 }}>
                {webinarConfig.title}
              </div>
              <div style={{ color: "#3b82f6", fontSize: 14 }}>
                {formatDate(webinarConfig.date)} {t.webinar.timezone}
              </div>
            </div>
          )}
          
          {/* Links a los juegos */}
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>
            {t.webinar.successReminder}
          </p>
          
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 }}>
            <a
              href="https://www.thetrafficlightgame.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 20px",
                background: "#f0fdf4",
                border: "2px solid #22c55e",
                borderRadius: 10,
                color: "#15803d",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {t.webinar.successLinkPrimary}
            </a>
            <a
              href="https://www.thecoopetitiongame.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 20px",
                background: "#eef2ff",
                border: "2px solid #6366f1",
                borderRadius: 10,
                color: "#4338ca",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {t.webinar.successLinkSecondary}
            </a>
          </div>
          
          <a
            href="/dashboard"
            style={{
              display: "inline-block",
              background: "#3b82f6",
              color: "white",
              padding: "12px 24px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            {t.webinar.backToDashboard}
          </a>
        </div>
      </div>
    );
  }

  // ============================================
  // PANTALLA: Cargando
  // ============================================
  if (!webinarConfig) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#64748b" }}>{t.common.loading}</div>
      </div>
    );
  }

  // ============================================
  // PANTALLA: Formulario
  // ============================================
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
      <div
        style={{
          maxWidth: 500,
          margin: "40px auto",
          background: "white",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎥</div>
          <h1 style={{ margin: 0, color: "#1e293b", fontSize: 24 }}>{t.webinar.title}</h1>
        </div>

        {/* Info del webinar con timezone */}
        <div
          style={{
            background: "#eff6ff",
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 600, color: "#1e40af", marginBottom: 8 }}>
            {webinarConfig.title}
          </div>
          <div style={{ color: "#3b82f6", fontSize: 14 }}>
            <strong>{t.webinar.dateLabel}:</strong> {formatDate(webinarConfig.date)}
          </div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            {t.webinar.timezone}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nombre */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>
              {t.webinar.name} *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>
              {t.webinar.email} *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* NUEVO: Nivel de enseñanza */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>
              {t.webinar.teachingLevel} *
            </label>
            <select
              required
              value={formData.teachingLevel}
              onChange={(e) => setFormData({ ...formData, teachingLevel: e.target.value })}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 16,
                boxSizing: "border-box",
                background: "white",
              }}
            >
              <option value="">-- Seleccionar --</option>
              <option value="primary">{t.webinar.levelPrimary}</option>
              <option value="secondary">{t.webinar.levelSecondary}</option>
              <option value="higher">{t.webinar.levelHigher}</option>
              <option value="other">{t.webinar.levelOther}</option>
            </select>
          </div>

          {/* Escuela/Institución (ahora opcional en el label) */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>
              {t.webinar.school}
            </label>
            <input
              type="text"
              value={formData.school}
              onChange={(e) => setFormData({ ...formData, school: e.target.value })}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Experiencia (textos mejorados) */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>
              {t.webinar.experience}
            </label>
            <select
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 16,
                boxSizing: "border-box",
                background: "white",
              }}
            >
              <option value="none">{t.webinar.experienceNone}</option>
              <option value="explored">{t.webinar.experienceExplored}</option>
              <option value="used">{t.webinar.experienceUsed}</option>
              <option value="regular">{t.webinar.experienceRegular}</option>
            </select>
          </div>

          {/* Preguntas */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#374151" }}>
              {t.webinar.questions}
            </label>
            <textarea
              value={formData.questions}
              onChange={(e) => setFormData({ ...formData, questions: e.target.value })}
              placeholder={t.webinar.questionsPlaceholder}
              rows={3}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 16,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Error */}
          {status === "error" && (
            <div
              style={{
                background: "#fef2f2",
                color: "#dc2626",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {t.webinar.errorMessage}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === "loading"}
            style={{
              width: "100%",
              padding: 14,
              background: status === "loading" ? "#9ca3af" : "#8b5cf6",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: status === "loading" ? "not-allowed" : "pointer",
            }}
          >
            {status === "loading" ? t.webinar.sending : t.webinar.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
