// src/pages/LearningRefereeLandingPage.tsx
import { useNavigate, useParams } from "react-router-dom";
import { lazy, Suspense, useState } from "react";

// ─── Known area keys ───────────────────────────────────────────────────────────

const KNOWN_AREAS = ["exactas", "sociales", "lenguajes", "arte"];

// ─── Config per area ───────────────────────────────────────────────────────────

const AREAS: Record<string, {
  key: string;
  nombre: string;
  emoji: string;
  gradient: string;
  primary: string;
  light: string;
  border: string;
  materias: string[];
  descripcion: string;
  ejemplo: string;
}> = {
  exactas: {
    key: "exactas",
    nombre: "Exact and Natural Sciences",
    emoji: "🔬",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%)",
    primary: "#0ea5e9",
    light: "#f0f9ff",
    border: "#bae6fd",
    materias: ["Mathematics", "Physics", "Chemistry", "Biology", "Statistics", "Computer Science"],
    descripcion: "Students work in groups and debate. The AI only intervenes to referee when the group has a genuine disagreement they can't resolve on their own.",
    ejemplo: "equations, functions, chemical reactions, data analysis, physics problems...",
  },
  sociales: {
    key: "sociales",
    nombre: "Social Sciences and Humanities",
    emoji: "🌍",
    gradient: "linear-gradient(135deg, #f97316 0%, #b45309 100%)",
    primary: "#f97316",
    light: "#fff7ed",
    border: "#fed7aa",
    materias: ["History", "Geography", "Philosophy", "Economics", "Law", "Psychology"],
    descripcion: "Groups debate historical sources, philosophical concepts, or economic data. The AI gives a verdict only when the disagreement is genuine.",
    ejemplo: "historical sources, philosophical concepts, economic data, legal cases...",
  },
  lenguajes: {
    key: "lenguajes",
    nombre: "Communication and Languages",
    emoji: "💬",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
    primary: "#8b5cf6",
    light: "#faf5ff",
    border: "#e9d5ff",
    materias: ["Language and Literature", "English", "French", "Portuguese", "Communication"],
    descripcion: "Students debate text interpretation, grammar in context, or literary meaning. The AI arbitrates only when the group is genuinely stuck.",
    ejemplo: "text analysis, grammar in context, literary interpretation, written production...",
  },
  arte: {
    key: "arte",
    nombre: "Art and Expression",
    emoji: "🎨",
    gradient: "linear-gradient(135deg, #f43f5e 0%, #f97316 100%)",
    primary: "#f43f5e",
    light: "#fff1f2",
    border: "#fecdd3",
    materias: ["Visual Arts", "Music", "Theater", "Physical Education", "Dance"],
    descripcion: "Groups debate works, techniques, or expressive concepts. The AI referees only when there's a genuine disagreement between peers.",
    ejemplo: "artwork analysis, musical styles, expressive techniques, design elements...",
  },
};

// ─── HowItWorksEN ──────────────────────────────────────────────────────────────

function HowItWorksEN({ primary }: { primary: string }) {
  const [open, setOpen] = useState(false);
  const steps = [
    "The teacher signs in with Google, sets the topic, and the session is generated in seconds.",
    "Students form 2 teams and join the link from one device per team.",
    "One team asks the other an oral question out loud; the answering team responds out loud too.",
    "The asking team rates the answer: complete (1 point), incomplete (0.5), or incorrect (0). The game adds up the points automatically.",
    "If the answering team disagrees with the rating, they call the referee — its ruling decides the points for that round.",
    "At the end, each team completes a short reflection inside the game. The group is the protagonist.",
  ];
  return (
    <div style={{ backgroundColor: "white", borderRadius: 16, marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, borderRadius: 16 }}
      >
        <span style={{ fontSize: 17, fontWeight: 800, color: "#1e293b" }}>How does it work?</span>
        <span style={{ fontSize: 20, color: primary, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: "0 24px 20px", borderTop: "1px solid #e2e8f0" }}>
          {steps.map((txt, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: `${primary}18`, color: primary, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.55, paddingTop: 3 }}>{txt}</div>
            </div>
          ))}
          <div style={{ marginTop: 14, padding: "12px 14px", backgroundColor: "#fef9c3", borderRadius: 10, border: "1px solid #fde047", fontSize: 13, color: "#713f12", lineHeight: 1.6 }}>
            📚 <strong>Google Classroom report:</strong> the teacher posts an assignment with metacognition questions. Students respond using the summary of their referee interactions — the report goes directly to the teacher through Classroom.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lazy-load the session page for non-area params ───────────────────────────

const LearningRefereeSesionPage = lazy(() => import("./LearningRefereeSesionPage"));

// ─── Component ────────────────────────────────────────────────────────────────

export default function LearningRefereeLandingPage() {
  const { area } = useParams<{ area: string }>();
  const navigate = useNavigate();

  // If the param is not a known area, treat it as a sessionId
  if (area && !KNOWN_AREAS.includes(area)) {
    return (
      <Suspense fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)" }}>
          <div style={{ color: "white", fontSize: 18, fontWeight: 600 }}>⏳ Loading session…</div>
        </div>
      }>
        <LearningRefereeSesionPage />
      </Suspense>
    );
  }

  const cfg = area ? AREAS[area] : null;

  // Unknown area → redirect to config
  if (!cfg) {
    navigate("/learning-referee-config");
    return null;
  }

  return (
    <div style={{
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
      }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{cfg.emoji}</div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", opacity: 0.85, textTransform: "uppercase", marginBottom: 8 }}>
          Learning Referee
        </div>
        <h1 style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 900, lineHeight: 1.2 }}>
          {cfg.nombre}
        </h1>
        <p style={{ margin: "0 auto", fontSize: 16, opacity: 0.92, maxWidth: 560, lineHeight: 1.6 }}>
          {cfg.descripcion}
        </p>

        <button
          onClick={() => navigate(`/learning-referee-config?area=${cfg.key}`)}
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
          ⚖️ Configure a session →
        </button>

        <div style={{ marginTop: 14, fontSize: 13, opacity: 0.75 }}>
          Free · No registration required
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>

        {/* How does it work — accordion */}
        <HowItWorksEN primary={cfg.primary} />

        {/* Subjects */}
        <div style={{
          backgroundColor: cfg.light,
          border: `1px solid ${cfg.border}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: cfg.primary, marginBottom: 10 }}>
            Subjects available in this area
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {cfg.materias.map(m => (
              <span key={m} style={{
                padding: "5px 12px", borderRadius: 20,
                backgroundColor: "white",
                border: `1px solid ${cfg.border}`,
                fontSize: 13, color: "#374151", fontWeight: 500,
              }}>
                {m}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            <strong>Example topics:</strong> {cfg.ejemplo}
          </div>
        </div>

        {/* Materials download */}
        <div style={{
          backgroundColor: "white",
          borderRadius: 16,
          padding: 20,
          marginBottom: 28,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
            Don't have the materials yet?
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12, lineHeight: 1.5 }}>
            Download the free printable cards and score sheets to play with your class.
          </div>
          <a href="#" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#f1f5f9", color: "#374151",
            borderRadius: 10, padding: "0.55rem 1.2rem",
            fontSize: "0.9rem", fontWeight: 600,
            textDecoration: "none", border: "1.5px solid #e2e8f0",
          }}>
            ↓ Get the materials here
          </a>
        </div>

        {/* CTA final */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <button
            onClick={() => navigate(`/learning-referee-config?area=${cfg.key}`)}
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
            ⚖️ Configure a session →
          </button>
          <div style={{ marginTop: 10, fontSize: 13, color: "#94a3b8" }}>
            Free · No registration required · Just one device per group
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", paddingBottom: 24 }}>
          Developed by Pablo Parente ·{" "}
          <a href="https://www.linkedin.com/in/pablo-parente" target="_blank" rel="noreferrer" style={{ color: "#0ea5e9" }}>
            LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}
