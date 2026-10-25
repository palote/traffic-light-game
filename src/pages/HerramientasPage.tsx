// src/pages/HerramientasPage.tsx
// Herramientas para docentes ("/herramientas"): pública, todas las tarjetas a la vista (Etapa F).
// El listado de herramientas es el mismo de siempre (TOOLS), sin cambios en cuáles hay.

import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { getThemeByMode } from "../contexts/GameModeContext";
import { SiteHeader } from "../components/SiteHeader";

// i18n-clave: diccionario es/en/pt de la propia pantalla (los tres idiomas son obligatorios; lo controla verificar-textos-fijos)
const TOOLS = [
  {
    id: "rubric", icon: "📐", route: "/rubric-generator", color: "#f59e0b",
    es: { title: "Generador de Rúbricas", desc: "Rúbricas alineadas a tus actividades con IA" },
    en: { title: "Rubric Generator", desc: "Activity-aligned rubrics with AI" },
    pt: { title: "Gerador de Rubricas", desc: "Rubricas alinhadas às suas atividades com IA" }
  },
  {
    id: "adapter", icon: "✏️", route: "/consigna-adapter", color: "#06b6d4",
    es: { title: "Adaptador de Consignas", desc: "Tres niveles de dificultad en segundos" },
    en: { title: "Assignment Adapter", desc: "Three difficulty levels in seconds" },
    pt: { title: "Adaptador de Enunciados", desc: "Três níveis de dificuldade em segundos" }
  },
  {
    id: "informe", icon: "📋", route: "/informe-generator", color: "#10b981",
    es: { title: "Generador de Informes", desc: "Informes pedagógicos listos para copiar" },
    en: { title: "Report Generator", desc: "Pedagogical reports ready to copy" },
    pt: { title: "Gerador de Relatórios", desc: "Relatórios pedagógicos prontos para copiar" }
  },
  {
    id: "presentismo", icon: "📅", route: "/presentismo-generator", color: "#0ea5e9",
    es: { title: "Planilla de Presentismo", desc: "Ideal para registrar el presentismo del período" },
    en: { title: "Attendance Sheet", desc: "Ideal for recording period attendance" },
    pt: { title: "Planilha de Presença", desc: "Ideal para registrar presença do período" }
  },
  {
    id: "horario", icon: "🗓️", route: "/horario-generator", color: "#f59e0b",
    es: { title: "Generador de Horarios", desc: "Horarios con dropdowns por materia" },
    en: { title: "Schedule Generator", desc: "Schedules with subject dropdowns" },
    pt: { title: "Gerador de Horários", desc: "Horários com menus por disciplina" }
  },
  {
    id: "presentacion", icon: "📊", route: "/presentacion-generator", color: "#8b5cf6",
    es: { title: "Generador de Presentaciones", desc: "PowerPoint con diseño profesional" },
    en: { title: "Presentation Generator", desc: "PowerPoint with professional design" },
    pt: { title: "Gerador de Apresentações", desc: "PowerPoint com design profissional" }
  },
  {
    id: "secuencia", icon: "📚", route: "/secuencia-generator", color: "#6366f1",
    es: { title: "Secuencias Didácticas", desc: "Planificá clases completas con IA" },
    en: { title: "Lesson Sequences", desc: "Plan complete lessons with AI" },
    pt: { title: "Sequências Didáticas", desc: "Planeje aulas completas com IA" }
  },
  {
    id: "planificacion", icon: "📅", route: "/planificacion-generator", color: "#f97316",
    es: { title: "Generador de Planificaciones", desc: "Planificación docente completa con cronograma en Word" },
    en: { title: "Lesson Planner", desc: "Complete teacher planning with Word timeline" },
    pt: { title: "Gerador de Planejamentos", desc: "Planejamento docente completo com cronograma em Word" }
  },
  {
    id: "comparador", icon: "🌍", route: "/comparador-paises", color: "#14b8a6",
    es: { title: "Comparador de Países", desc: "Datos del Banco Mundial + análisis IA en Excel" },
    en: { title: "Country Comparator", desc: "World Bank data + AI analysis in Excel" },
    pt: { title: "Comparador de Países", desc: "Dados do Banco Mundial + análise IA em Excel" }
  },
  {
    id: "ecuaciones", icon: "📈", route: "/ecuaciones-generator", color: "#6366f1",
    es: { title: "Generador de Ecuaciones", desc: "Tabla de valores con fórmulas editables en Excel" },
    en: { title: "Equation Generator", desc: "Value table with editable formulas in Excel" },
    pt: { title: "Gerador de Equações", desc: "Tabela de valores com fórmulas editáveis em Excel" }
  },
  {
    id: "bingo-familiar",
    icon: "🎰",
    route: "/bingo-familiar",
    color: "#7B2D8B",
    es: { title: "Bingo Familiar",   desc: "Bingo para adultos y toda la familia" },
    en: { title: "Family Bingo",     desc: "Bingo for adults and the whole family" },
    pt: { title: "Bingo Familiar",   desc: "Bingo para adultos e toda a família"   },
  },
];

export function HerramientasPage() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  // Encabezado fijo (colores de primaria), igual que en "/": esta página no sigue ningún modo de juego.
  const headerTheme = getThemeByMode("traffic-light", language);

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${headerTheme.cardHoverBg} 0%, #f8fafc 50%, #f1f5f9 100%)`, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <SiteHeader theme={headerTheme} backTo="/" />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 800, color: "#1e293b" }}>
          {t.dashboard.toolsName}
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 }}>
          {TOOLS.map(tool => {
            const toolLang = (tool as any)[language] || (tool as any).es;
            return (
              <button key={tool.id} onClick={() => navigate(tool.route)}
                style={{ padding: "16px 18px", borderRadius: 14, border: "1px solid #e2e8f0", backgroundColor: "white", boxShadow: "0 2px 6px rgba(0,0,0,0.04)", cursor: "pointer", transition: "all 0.2s", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 12 }}
                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 6px 18px ${tool.color}22`; e.currentTarget.style.borderColor = tool.color; }}
                onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "#e2e8f0"; }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: `${tool.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {tool.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginBottom: 2, lineHeight: 1.3 }}>{toolLang.title}</div>
                  <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.35 }}>{toolLang.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
