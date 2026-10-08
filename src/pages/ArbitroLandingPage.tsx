// src/pages/ArbitroLandingPage.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useArbitroT, useTituloPagina, LanguageSelector } from "../i18n";
import { nombreVisible } from "../utils/arbitroNombres";
import { PALETA, AREA_COLORS } from "../utils/arbitroPalette";

// ─── Config por área ───────────────────────────────────────────────────────────

// Los nombres de área y de materia son claves estables; lo que se muestra sale de ta.areaNames / ta.materiaNames.
// i18n-clave
const AREAS: Record<string, {
  key: string;
  nombre: string;
  emoji: string;
  gradient: string;
  primary: string;
  light: string;
  border: string;
  materias: string[];
}> = {
  exactas: {
    key: "exactas",
    nombre: "Ciencias Exactas y Naturales",
    emoji: "🔬",
    ...AREA_COLORS.exactas,
    materias: ["Matemática", "Física", "Química", "Biología", "Estadística", "Informática"],
  },
  sociales: {
    key: "sociales",
    nombre: "Ciencias Sociales y Humanidades",
    emoji: "🌍",
    ...AREA_COLORS.sociales,
    materias: ["Historia", "Geografía", "Filosofía", "Economía", "Derecho", "Psicología"],
  },
  lenguajes: {
    key: "lenguajes",
    nombre: "Comunicación y Lenguajes",
    emoji: "💬",
    ...AREA_COLORS.lenguajes,
    materias: ["Lengua y Literatura", "Inglés", "Portugués", "Francés", "Comunicación"],
  },
  arte: {
    key: "arte",
    nombre: "Arte y Expresión",
    emoji: "🎨",
    ...AREA_COLORS.arte,
    materias: ["Plástica", "Música", "Teatro", "Educación Física", "Danza"],
  },
};

// ─── ComoFuncionaES ────────────────────────────────────────────────────────────

function ComoFuncionaES({ primary }: { primary: string }) {
  const ta = useArbitroT();
  const [open, setOpen] = useState(false);
  const etapas = [
    { numero: "1", titulo: ta.cfgHow1T, quien: ta.cfgHow1W, descripcion: ta.cfgHow1D },
    { numero: "2", titulo: ta.cfgHow2T, quien: ta.cfgHow2W, descripcion: ta.cfgHow2D },
    { numero: "3", titulo: ta.cfgHow3T, quien: ta.cfgHow3W, descripcion: ta.cfgHow3D },
    { numero: "4", titulo: ta.cfgHow4T, quien: ta.cfgHow4W, descripcion: ta.cfgHow4D },
    { numero: "5", titulo: ta.cfgHow5T, quien: ta.rulesStep5Who, descripcion: ta.rulesStep5Desc },
    { numero: "6", titulo: ta.cfgHow6T, quien: ta.cfgHow6W, descripcion: ta.cfgHow6D },
  ];
  return (
    <section style={{ backgroundColor: "white", borderRadius: 16, marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <h2 style={{ margin: 0 }}>
      <button
        onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, borderRadius: 16 }}
      >
        <span style={{ fontSize: 17, fontWeight: 800, color: "#1e293b" }}>{ta.cfgHowTitle}</span>
        <span aria-hidden="true" style={{ fontSize: 20, color: primary, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▾</span>
      </button>
      </h2>
      {open && (
        <div style={{ padding: "0 24px 20px", borderTop: "1px solid #e2e8f0" }}>
          {etapas.map((et) => (
            <div key={et.numero} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: `${primary}18`, color: primary, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {et.numero}
              </div>
              <div style={{ paddingTop: 2, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1e293b", lineHeight: 1.4 }}>{et.titulo}</h3>
                <div style={{ fontSize: 12, fontWeight: 600, color: primary, lineHeight: 1.4, marginTop: 2 }}>{et.quien}</div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.55, marginTop: 4 }}>{et.descripcion}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: "12px 14px", backgroundColor: "#f0fdf4", borderRadius: 10, border: "1px solid #86efac", fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
            {ta.landDone}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function ArbitroLandingPage() {
  const ta = useArbitroT();
  useTituloPagina(`${ta.landPageTitle} — ${ta.pageTitleSuffix}`);
  const { area } = useParams<{ area: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const [iniciandoSesion, setIniciandoSesion] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState("");

  // Acceso para docentes que ya usaron el árbitro antes: si no tienen sesión
  // iniciada, dispara el login con Google; si ya la tienen, va directo al
  // panel con sus sesiones anteriores.
  const handleAccesoDocente = async () => {
    if (user) { navigate("/arbitro-panel"); return; }
    setErrorAcceso("");
    setIniciandoSesion(true);
    try {
      await loginWithGoogle();
      navigate("/arbitro-panel");
    } catch {
      setErrorAcceso(ta.landErrLogin);
    }
    setIniciandoSesion(false);
  };

  // Cierre de sesión. Usa el logout del AuthContext (y no signOut de Firebase
  // directo) porque además de desloguear cierra la sesión de métricas del
  // docente — con signOut pelado esa sesión quedaría abierta para siempre.
  const handleCerrarSesion = async () => {
    setErrorAcceso("");
    setCerrandoSesion(true);
    try {
      await logout();
    } catch {
      setErrorAcceso(ta.landErrLogout);
    }
    setCerrandoSesion(false);
  };

  // ── Rehidratación de UTMs desde código de campaña corto (?c=v1|v2|v3) ──────
  useEffect(() => {
    const campaignCode = searchParams.get('c');

    if (campaignCode && /^v[123]$/.test(campaignCode)) {
      const currentArea = area || 'exactas';

      const campaignData: Record<string, { lista: string; area_mapping: Record<string, string> }> = {
        v1: {
          lista: 'historia_geografia',
          area_mapping: { exactas: 'v1_exactas', sociales: 'v1_sociales', lenguajes: 'v1_lenguajes', arte: 'v1_arte' },
        },
        v2: {
          lista: 'biologia_matematica',
          area_mapping: { exactas: 'v2_exactas', sociales: 'v2_sociales', lenguajes: 'v2_lenguajes', arte: 'v2_arte' },
        },
        v3: {
          lista: 'idiomas',
          area_mapping: { exactas: 'v3_exactas', sociales: 'v3_sociales', lenguajes: 'v3_lenguajes', arte: 'v3_arte' },
        },
      };

      const data = campaignData[campaignCode];
      if (data) {
        const utmContent = data.area_mapping[currentArea] || `${campaignCode}_${currentArea}`;
        const fullUtms =
          `utm_source=email` +
          `&utm_medium=outreach` +
          `&utm_campaign=arbitro_2026` +
          `&utm_content=${utmContent}` +
          `&utm_term=auto` +
          `&lista=${data.lista}`;

        window.history.replaceState({}, '', `${window.location.pathname}?${fullUtms}`);

        console.log('[Campaign Tracking] UTMs rehidratados:', {
          version: campaignCode,
          area: currentArea,
          lista: data.lista,
          utm_content: utmContent,
        });
      }
    }
  }, [searchParams, area]);
  // ─────────────────────────────────────────────────────────────────────────────

  const cfg = area ? AREAS[area] : null;

  // Área no reconocida → redirigir a config general
  if (!cfg) {
    navigate("/arbitro-config");
    return null;
  }


  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>

      {/* ── Hero ── */}
      <div style={{
        background: cfg.gradient,
        padding: "48px 24px 56px",
        textAlign: "center",
        color: "white",
        position: "relative",
      }}>
        {/* Selector de idioma de la interfaz (arriba a la izquierda; el acceso docente queda a la derecha) */}
        <div style={{ position: "absolute", top: 14, left: 16, zIndex: 10 }}>
          <LanguageSelector compact tone="onColor" />
        </div>
        {/* Acceso para docentes que ya usaron el árbitro.
            Con sesión iniciada: acceso al panel + cuenta vinculada + salir.
            Sin sesión: botón que dispara el login con Google. */}
        {!authLoading && (
          <div style={{
            position: "absolute",
            top: 14,
            right: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
            zIndex: 10,
            maxWidth: "min(60vw, 260px)",
          }}>
            {user ? (
              <>
                <Link
                  to="/arbitro-panel"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#ffffff",
                    textDecoration: "none",
                    backgroundColor: "rgba(0,0,0,0.25)",
                    padding: "5px 12px",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.7)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    whiteSpace: "nowrap",
                  }}>
                  {ta.cfgMySessions}
                </Link>
                <div style={{
                  fontSize: 12,
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  maxWidth: "100%",
                }}>
                  <span
                    title={user.email ?? undefined}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}>
                    👤 {user.email}
                  </span>
                  <button
                    onClick={handleCerrarSesion}
                    disabled={cerrandoSesion}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ffffff",
                      fontSize: 12,
                      cursor: cerrandoSesion ? "default" : "pointer",
                      padding: "4px 8px",
                      minHeight: 24,
                      borderRadius: 6,
                      fontWeight: 600,
                      textDecoration: "underline",
                      flexShrink: 0,
                    }}>
                    {cerrandoSesion ? ta.cfgLoggingOut : ta.cfgLogout}
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={handleAccesoDocente}
                disabled={iniciandoSesion}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#ffffff",
                  backgroundColor: "rgba(0,0,0,0.25)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  borderRadius: 20,
                  padding: "6px 14px",
                  cursor: iniciandoSesion ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}>
                {iniciandoSesion ? ta.landLoggingIn : ta.landUsedBefore}
              </button>
            )}
            {errorAcceso && (
              <div style={{ fontSize: 12, color: "#fecaca", textAlign: "right", maxWidth: 180 }}>{errorAcceso}</div>
            )}
          </div>
        )}

        <div style={{ fontSize: 56, marginBottom: 12 }}>{cfg.emoji}</div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>
          {ta.sesTitle}
        </div>
        <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 900, lineHeight: 1.2 }}>
          {nombreVisible(ta.areaNames, cfg.nombre)}
        </h1>
        <p style={{ margin: "0 auto", fontSize: 16, maxWidth: 560, lineHeight: 1.6 }}>
          {(ta as any)[`landDesc_${cfg.key}`]}
        </p>

        <button
          onClick={() => navigate(`/arbitro-config?area=${cfg.key}`)}
          style={{
            marginTop: 28,
            padding: "14px 36px",
            fontSize: 16,
            fontWeight: 800,
            borderRadius: 14,
            border: "none",
            backgroundColor: "white",
            color: cfg.primary,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            transition: "transform 0.2s",
          }}
          onMouseOver={e => (e.currentTarget.style.transform = "scale(1.04)")}
          onMouseOut={e => (e.currentTarget.style.transform = "none")}
        >
          {ta.landConfigure}
        </button>

        <div style={{ marginTop: 14, fontSize: 13 }}>
          {ta.landFree}
        </div>
      </div>

      {/* ── Contenido ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>


        {/* Cómo funciona — acordeón */}
        <ComoFuncionaES primary={cfg.primary} />

        {/* Materias */}
        <div style={{
          backgroundColor: cfg.light,
          border: `1px solid ${cfg.border}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 28,
        }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: cfg.primary }}>
            {ta.landSubjects}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {cfg.materias.map(m => (
              <span key={m} style={{
                padding: "5px 12px", borderRadius: 20,
                backgroundColor: "white",
                border: `1px solid ${cfg.border}`,
                fontSize: 13, color: "#374151", fontWeight: 500,
              }}>
                {nombreVisible(ta.materiaNames, m)}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: PALETA.grisOscuro, lineHeight: 1.5 }}>
            <strong>{ta.landExamples}</strong> {(ta as any)[`landEx_${cfg.key}`]}
          </div>
        </div>

        {/* CTA final */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <button
            onClick={() => navigate(`/arbitro-config?area=${cfg.key}`)}
            style={{
              padding: "16px 48px",
              fontSize: 16,
              fontWeight: 800,
              borderRadius: 14,
              border: "none",
              background: cfg.gradient,
              color: "white",
              cursor: "pointer",
              boxShadow: `0 6px 20px ${cfg.primary}35`,
              transition: "transform 0.2s",
            }}
            onMouseOver={e => (e.currentTarget.style.transform = "scale(1.04)")}
            onMouseOut={e => (e.currentTarget.style.transform = "none")}
          >
            {ta.landConfigureMine}
          </button>
          <div style={{ marginTop: 10, fontSize: 13, color: PALETA.grisOscuro }}>
            {ta.landFree}
          </div>
        </div>
      </div>
    </main>
  );
}