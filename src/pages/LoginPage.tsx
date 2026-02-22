// src/pages/LoginPage.tsx
// Página de login con Google

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n, LanguageSelector } from "../i18n";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, loginWithGoogle, loading } = useAuth();
  const { t, language } = useI18n();

  // Traducciones locales, ahora incluye footer
  const pageTexts = {
    title: language === 'es' 
      ? 'El Juego del Semáforo' 
      : language === 'pt' 
      ? 'O Jogo do Semáforo' 
      : 'Traffic Light Game',
    subtitle: language === 'es'
      ? 'Juego educativo de competencia colaborativa'
      : language === 'pt'
      ? 'Jogo educativo de competição colaborativa'
      : 'Collaborative competition educational game',
    features: {
      title: language === 'es' 
        ? '✨ Características' 
        : language === 'pt' 
        ? '✨ Recursos' 
        : '✨ Features',
      items: language === 'es' 
        ? [
            'Creá juegos interactivos de preguntas',
            'Competencia por equipos',
            'Puntuación en tiempo real',
            'Biblioteca de preguntas incluida',
          ]
        : language === 'pt'
        ? [
            'Crie jogos interativos de perguntas',
            'Competição por equipes',
            'Pontuação em tempo real',
            'Biblioteca de perguntas incluída',
          ]
        : [
            'Create interactive quiz games',
            'Team-based competition',
            'Real-time scoring',
            'Question library included',
          ],
    },
    footer: {
      privacy: language === 'es' 
        ? 'Política de Privacidad' 
        : language === 'pt' 
        ? 'Política de Privacidade' 
        : 'Privacy Policy',
      copyright: language === 'es' 
        ? 'El Juego del Semáforo' 
        : language === 'pt' 
        ? 'O Jogo do Semáforo' 
        : 'The Traffic Light Game',
    },
  };

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (user && !loading) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}>
        <div style={{ color: "white", fontSize: 20 }}>
          {t.common.loading}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      padding: 20,
    }}>
      {/* Language selector in corner */}
      <div style={{ position: "absolute", top: 20, right: 20 }}>
        <LanguageSelector compact />
      </div>

      <div style={{
        backgroundColor: "white",
        borderRadius: 24,
        padding: "48px 40px",
        maxWidth: 420,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Logo */}
        <div style={{
          fontSize: 64,
          marginBottom: 16,
        }}>
          🚦
        </div>

        {/* Título principal en el idioma seleccionado */}
        <h1 style={{
          margin: "0 0 8px 0",
          fontSize: 28,
          fontWeight: 800,
          color: "#1e293b",
        }}>
          {pageTexts.title}
        </h1>

        {/* Subtítulo */}
        <p style={{
          margin: "0 0 32px 0",
          fontSize: 14,
          color: "#64748b",
        }}>
          {pageTexts.subtitle}
        </p>

        {/* Google Login Button */}
        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            padding: "14px 24px",
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 12,
            border: "2px solid #e2e8f0",
            backgroundColor: "white",
            color: "#1e293b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc";
            e.currentTarget.style.borderColor = "#667eea";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t.auth.loginWithGoogle}
        </button>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          margin: "32px 0",
        }}>
          <div style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
          <span style={{ color: "#94a3b8", fontSize: 12 }}>
            {t.common.or}
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
        </div>

        {/* Features */}
        <div style={{
          textAlign: "left",
          backgroundColor: "#f8fafc",
          borderRadius: 12,
          padding: 20,
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 12,
          }}>
            {pageTexts.features.title}
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: 20,
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.8,
          }}>
            {pageTexts.features.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Footer discreto con link a privacidad - AHORA DENTRO DE REACT */}
        <div style={{
          marginTop: 24,
          textAlign: 'center',
          fontSize: 11,
          color: '#9ca3af',
          borderTop: '1px solid #e2e8f0',
          paddingTop: 16,
        }}>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#9ca3af', textDecoration: 'none' }}
          >
            {pageTexts.footer.privacy}
          </a>
          {' · '}
          <span>© 2026 {pageTexts.footer.copyright}</span>
        </div>
      </div>
    </div>
  );
}