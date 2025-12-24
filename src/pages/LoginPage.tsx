// src/pages/LoginPage.tsx
// CON MEJORAS VISUALES 🎨

import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function friendlyAuthError(message: string) {
  const m = (message || "").toLowerCase();

  if (m.includes("auth/invalid-credential") || m.includes("wrong-password")) {
    return "Email o contraseña incorrectos.";
  }
  if (m.includes("auth/user-not-found")) return "No existe una cuenta con ese email.";
  if (m.includes("auth/email-already-in-use")) return "Ese email ya está registrado.";
  if (m.includes("auth/weak-password")) return "La contraseña es muy corta (mínimo 6 caracteres).";
  if (m.includes("auth/invalid-email")) return "El email no parece válido.";
  if (m.includes("auth/popup-closed-by-user")) return "Cerraste la ventana antes de completar el login.";
  if (m.includes("auth/cancelled-popup-request")) return "Se canceló el inicio de sesión. Probá de nuevo.";
  if (m.includes("auth/popup-blocked")) return "El navegador bloqueó el popup. Permití popups para este sitio.";
  if (m.includes("auth/account-exists-with-different-credential")) {
    return "Ese email ya existe con otro método. Probá iniciar con ese método.";
  }

  return "No se pudo completar la operación. Revisá los datos e intentá de nuevo.";
}

// 🎨 Estilos
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: "40px 32px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  logoContainer: {
    textAlign: "center" as const,
    marginBottom: 24,
  },
  logo: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: "#1e293b",
    textAlign: "center" as const,
  },
  subtitle: {
    margin: "8px 0 0 0",
    fontSize: 15,
    color: "#64748b",
    textAlign: "center" as const,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "20px 0",
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#e2e8f0",
    flex: 1,
  },
  dividerText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    fontSize: 16,
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    marginBottom: 16,
    transition: "border-color 0.2s, box-shadow 0.2s",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  googleBtn: {
    width: "100%",
    padding: "14px 20px",
    fontSize: 16,
    fontWeight: 600,
    backgroundColor: "white",
    color: "#1e293b",
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    transition: "all 0.2s",
    marginBottom: 8,
  },
  primaryBtn: {
    width: "100%",
    padding: "16px 20px",
    fontSize: 16,
    fontWeight: 700,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(102, 126, 234, 0.4)",
    transition: "all 0.2s",
    marginTop: 8,
  },
  linkBtn: {
    width: "100%",
    padding: "12px",
    fontSize: 14,
    fontWeight: 500,
    backgroundColor: "transparent",
    color: "#667eea",
    border: "none",
    cursor: "pointer",
    marginTop: 8,
  },
  error: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: 10,
    fontSize: 14,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  footer: {
    marginTop: 20,
    padding: "16px",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    textAlign: "center" as const,
  },
  footerText: {
    margin: 0,
    fontSize: 13,
    color: "#64748b",
  },
  disabledCard: {
    textAlign: "center" as const,
  },
};

export function LoginPage() {
  const {
    login,
    register,
    authRequired,
    loginWithGoogle,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const from = useMemo(() => {
    const st = location.state as { from?: string } | null;
    return st?.from || "/setup";
  }, [location.state]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);

    const e = email.trim();
    if (!e) return setError("Ingresá tu email.");
    if (!password) return setError("Ingresá tu contraseña.");

    setLoading(true);
    try {
      if (mode === "login") {
        await login(e, password);
      } else {
        await register(e, password);
      }
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(friendlyAuthError(msg));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(friendlyAuthError(msg));
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit();
  };

  // Auth desactivado
  if (!authRequired) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.disabledCard}>
            <div style={styles.logo}>🚦</div>
            <h1 style={styles.title}>Traffic Light Game</h1>
            <p style={{ ...styles.subtitle, marginTop: 16 }}>
              El login está desactivado en desarrollo
            </p>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
              <code>VITE_AUTH_REQUIRED=false</code>
            </p>
            <button
              style={{ ...styles.primaryBtn, marginTop: 24 }}
              onClick={() => navigate("/setup")}
            >
              Ir a crear juego
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo y título */}
        <div style={styles.logoContainer}>
          <div style={styles.logo}>🚦</div>
          <h1 style={styles.title}>Traffic Light Game</h1>
          <p style={styles.subtitle}>
            {mode === "login"
              ? "Ingresá como docente para continuar"
              : "Creá tu cuenta de docente"}
          </p>
        </div>

        {/* Botón Google */}
        <button
          style={{
            ...styles.googleBtn,
            opacity: loading ? 0.7 : 1,
          }}
          onClick={google}
          disabled={loading}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#f8fafc";
            e.currentTarget.style.borderColor = "#cbd5e1";
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
          Continuar con Google
        </button>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>o con email</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Error */}
        {error && (
          <div style={styles.error}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <label style={styles.label}>Email</label>
        <input
          style={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="docente@escuela.edu"
          autoComplete="email"
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            e.target.style.borderColor = "#667eea";
            e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e2e8f0";
            e.target.style.boxShadow = "none";
          }}
        />

        <label style={styles.label}>Contraseña</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            e.target.style.borderColor = "#667eea";
            e.target.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e2e8f0";
            e.target.style.boxShadow = "none";
          }}
        />

        {/* Submit */}
        <button
          style={{
            ...styles.primaryBtn,
            opacity: loading ? 0.7 : 1,
            transform: loading ? "none" : undefined,
          }}
          onClick={submit}
          disabled={loading}
          onMouseOver={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(102, 126, 234, 0.4)";
          }}
        >
          {loading ? "⏳ Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
        </button>

        {/* Toggle mode */}
        <button
          style={styles.linkBtn}
          onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
          disabled={loading}
        >
          {mode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Ingresá"}
        </button>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            🎓 Solo docentes necesitan login
          </p>
          <p style={{ ...styles.footerText, marginTop: 4 }}>
            Los alumnos acceden directamente con el código de sala
          </p>
        </div>
      </div>
    </div>
  );
}