// src/pages/DashboardPage.tsx
// ✅ Reorganizado: sección "El Juego" (cards grandes) + "Herramientas" (cards chicas)
// ✅ UX: TeacherStatsCard colapsable
// ✅ UX: Botón de video modal
// ✅ UX: HelpPanel y botón 📚 eliminados
// ✅ Webinars siguen viniendo de Firebase config (DashboardBanners)
// ✅ Botón "Compartir con la comunidad" en GameCard

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue, off, remove, get, query, orderByChild, equalTo } from "firebase/database";
import { database } from "../firebase.config";
import { useAuth } from "../contexts/AuthContext";
import { useGameMode, type GameMode } from "../contexts/GameModeContext";
import { useI18n, LanguageSelector } from "../i18n";
import { DashboardBanners } from "../components/DashboardBanners";
import { saveTeacherGame } from "../services/teacherLibraryService";
import type { NewTeacherGame } from "../types/teacherLibrary";

interface ActiveGame {
  id: string; name: string; subject: string; roomCode: string; status: string;
  currentStage: number; teamsCount: number; questionsCount: number; createdAt: number; gameMode: string;
}
interface TeacherStats {
  totalSessions: number; totalDurationSec: number; monthSessions: number;
  monthDurationSec: number; gamesCreated: number; gamesCompleted: number;
}

// ─── Strings del juego ────────────────────────────────────────────────────────

const GAME_CARDS_STRINGS = {
  newGame: {
    es: { title: "Comenzar juego nuevo", description: "Creá una actividad con IA y empezá a jugar en minutos con tu clase.", cta: "Crear →" },
    en: { title: "Start new game",       description: "Create an activity with AI and start playing in minutes.",           cta: "Create →" },
    pt: { title: "Começar novo jogo",    description: "Crie uma atividade com IA e comece a jogar em minutos com sua turma.", cta: "Criar →" },
  },
  community: {
    es: { title: "Actividades de la comunidad", description: "Usá actividades creadas y compartidas por otros docentes.", cta: "Explorar →" },
    en: { title: "Community activities",         description: "Use activities created and shared by other teachers.",       cta: "Explore →" },
    pt: { title: "Atividades da comunidade",     description: "Use atividades criadas e compartilhadas por outros professores.", cta: "Explorar →" },
  },
};

// ─── Herramientas docentes ────────────────────────────────────────────────────

const TOOLS = [
  { id: "rubric",        icon: "📐", route: "/rubric-generator",       color: "#f59e0b",
    es: { title: "Generador de Rúbricas",       desc: "Rúbricas alineadas a tus actividades con IA" },
    en: { title: "Rubric Generator",             desc: "Activity-aligned rubrics with AI" },
    pt: { title: "Gerador de Rubricas",          desc: "Rubricas alinhadas às suas atividades com IA" },
  },
  { id: "adapter",       icon: "✏️", route: "/consigna-adapter",       color: "#06b6d4",
    es: { title: "Adaptador de Consignas",       desc: "Tres niveles de dificultad en segundos" },
    en: { title: "Assignment Adapter",            desc: "Three difficulty levels in seconds" },
    pt: { title: "Adaptador de Enunciados",      desc: "Três níveis de dificuldade em segundos" },
  },
  { id: "informe",       icon: "📋", route: "/informe-generator",      color: "#10b981",
    es: { title: "Generador de Informes",        desc: "Informes pedagógicos listos para copiar" },
    en: { title: "Report Generator",              desc: "Pedagogical reports ready to copy" },
    pt: { title: "Gerador de Relatórios",        desc: "Relatórios pedagógicos prontos para copiar" },
  },
  { id: "presentismo",   icon: "📅", route: "/presentismo-generator",  color: "#0ea5e9",
    es: { title: "Planilla de Presentismo",      desc: "Dropdowns y colores automáticos" },
    en: { title: "Attendance Sheet",              desc: "Automatic dropdowns and color coding" },
    pt: { title: "Planilha de Presença",         desc: "Menus e cores automáticas" },
  },
  { id: "horario",       icon: "🗓️", route: "/horario-generator",      color: "#f59e0b",
    es: { title: "Generador de Horarios",        desc: "Horarios con dropdowns por materia" },
    en: { title: "Schedule Generator",            desc: "Schedules with subject dropdowns" },
    pt: { title: "Gerador de Horários",          desc: "Horários com menus por disciplina" },
  },
  { id: "presentacion",  icon: "📊", route: "/presentacion-generator", color: "#8b5cf6",
    es: { title: "Generador de Presentaciones",  desc: "PowerPoint con diseño profesional" },
    en: { title: "Presentation Generator",        desc: "PowerPoint with professional design" },
    pt: { title: "Gerador de Apresentações",     desc: "PowerPoint com design profissional" },
  },
  { id: "secuencia",     icon: "📚", route: "/secuencia-generator",    color: "#6366f1",
    es: { title: "Secuencias Didácticas",        desc: "Planificá clases completas con IA" },
    en: { title: "Lesson Sequences",              desc: "Plan complete lessons with AI" },
    pt: { title: "Sequências Didáticas",         desc: "Planeje aulas completas com IA" },
  },
  { id: "correccion",    icon: "✍️", route: "/correccion",              color: "#ec4899",
    es: { title: "Corrector con Rúbrica",        desc: "Evaluá trabajos escritos con criterios pedagógicos" },
    en: { title: "Rubric-Based Corrector",       desc: "Evaluate written work with pedagogical criteria" },
    pt: { title: "Corretor com Rubrica",         desc: "Avalie trabalhos escritos com critérios pedagógicos" },
  },
  { id: "planificacion-generator", icon: "📅", route: "/planificacion-generator", color: "#f97316", isNew: true,
    es: { title: "Generador de Planificaciones", desc: "Planificación docente completa con cronograma en Word" },
    en: { title: "Lesson Planner",               desc: "Complete teacher planning with Word timeline" },
    pt: { title: "Gerador de Planejamentos",     desc: "Planejamento docente completo com cronograma em Word" },
  },
  {
    id: "comparador-paises",
    title: "Comparador de Países",
    description: "Tabla comparativa con datos reales del Banco Mundial + análisis IA en Excel",
    icon: "🌍",
    path: "/comparador-paises",
    isNew: true,
  },
  {
    id: "ecuaciones-generator",
    title: "Generador de Ecuaciones",
    description: "Tabla de valores con fórmulas editables en Excel — cambiá parámetros en tiempo real",
    icon: "📊",
    path: "/ecuaciones-generator",
    isNew: true,
  },
  {
    id: "arbitro-lengua",
    title: "Árbitro de Lengua",
    description: "Práctica colaborativa: los alumnos debaten y la IA arbitra los desacuerdos",
    icon: "⚖️",
    path: "/arbitro-config",
    isNew: true,
  },
];

// ============================================
// ShareGameModal
// ============================================
function ShareGameModal({ game, user, onClose, onSuccess }: { game: ActiveGame; user: any; onClose: () => void; onSuccess: () => void; }) {
  const { language } = useI18n();
  const [title, setTitle] = useState(game.name || "");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("Matemática");
  const [grade, setGrade] = useState("6°");
  const [level, setLevel] = useState<"primary" | "secondary">("primary");
  const [topic, setTopic] = useState(game.subject || "");
  const [mainContents, setMainContents] = useState("");
  const [mainSkills, setMainSkills] = useState("");
  const [lang, setLang] = useState<"es" | "en" | "pt">((language as "es" | "en" | "pt") || "es");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSecondary = level === "secondary";
  const grades = isSecondary ? ["1°","2°","3°","4°","5°","6°"] : ["3°","4°","5°","6°","7°"];
  const areas = [{ id:"Lengua",label:"Lengua" },{ id:"Matemática",label:"Matemática" },{ id:"Ciencias Naturales",label:"Ciencias Naturales" },{ id:"Ciencias Sociales",label:"Ciencias Sociales" },{ id:"Otras",label:"Otras" }];
  const tx = {
    es: { title:"Compartir con la comunidad", subtitle:"Completá los datos para que otros docentes puedan encontrar tu juego.", titleLabel:"Título del juego *", descLabel:"Descripción", descPlaceholder:"¿De qué trata el juego?", levelLabel:"Nivel", primary:"Primaria", secondary:"Secundaria", areaLabel:"Área", gradeLabel:"Grado", topicLabel:"Tema", topicPlaceholder:"Ej: Resolución de problemas", contentsLabel:"Contenidos", contentsPlaceholder:"Ej: Suma, resta", skillsLabel:"Habilidades", skillsPlaceholder:"Ej: Comprensión lectora", langLabel:"Idioma", share:"Compartir", sharing:"Compartiendo...", cancel:"Cancelar", required:"El título es obligatorio", noQuestions:"No se encontraron preguntas" },
    en: { title:"Share with community", subtitle:"Fill in the details so other teachers can find your game.", titleLabel:"Game title *", descLabel:"Description", descPlaceholder:"What is this game about?", levelLabel:"Level", primary:"Primary", secondary:"Secondary", areaLabel:"Area", gradeLabel:"Grade", topicLabel:"Topic", topicPlaceholder:"E.g.: Problem solving", contentsLabel:"Contents", contentsPlaceholder:"E.g.: Addition", skillsLabel:"Skills", skillsPlaceholder:"E.g.: Reading", langLabel:"Language", share:"Share", sharing:"Sharing...", cancel:"Cancel", required:"Title is required", noQuestions:"No questions found" },
    pt: { title:"Compartilhar com a comunidade", subtitle:"Preencha os dados para que outros professores encontrem seu jogo.", titleLabel:"Título do jogo *", descLabel:"Descrição", descPlaceholder:"Sobre o que é o jogo?", levelLabel:"Nível", primary:"Fundamental", secondary:"Médio", areaLabel:"Área", gradeLabel:"Série", topicLabel:"Tema", topicPlaceholder:"Ex: Resolução de problemas", contentsLabel:"Conteúdos", contentsPlaceholder:"Ex: Soma", skillsLabel:"Habilidades", skillsPlaceholder:"Ex: Compreensão", langLabel:"Idioma", share:"Compartilhar", sharing:"Compartilhando...", cancel:"Cancelar", required:"O título é obrigatório", noQuestions:"Nenhuma pergunta encontrada" },
  };
  const uiLang = (language as string) in tx ? (language as keyof typeof tx) : "es";
  const t = tx[uiLang];
  const inputStyle: React.CSSProperties = { width:"100%", padding:"10px 14px", fontSize:14, borderRadius:10, border:"2px solid #e2e8f0", backgroundColor:"#f8fafc", boxSizing:"border-box", fontFamily:"inherit" };
  const labelStyle: React.CSSProperties = { display:"block", marginBottom:6, fontSize:13, fontWeight:600, color:"#475569" };

  const handleShare = async () => {
    if (!title.trim()) { setError(t.required); return; }
    setIsSaving(true); setError(null);
    try {
      const questionsSnap = await get(ref(database, `games/${game.id}/questions`));
      if (!questionsSnap.exists()) throw new Error(t.noQuestions);
      const questionsData = questionsSnap.val();
      const questions = Object.values(questionsData) as Array<{ text: string; hint?: string; suggestedStage?: number }>;
      const csvLines = ["text,hint,stage"];
      for (const q of questions) {
        csvLines.push(`"${(q.text||"").replace(/"/g,'""')}","${(q.hint||"").replace(/"/g,'""')}",${q.suggestedStage||1}`);
      }
      const gameData: NewTeacherGame = { title:title.trim(), description:description.trim(), gameMode:(game.gameMode as any)||"traffic-light", language:lang, area:area as any, subject:topic as any, grade:isSecondary?undefined:(grade as any), level:isSecondary?"secondary":undefined, topic:topic.trim(), mainContents:mainContents.trim(), mainSkills:mainSkills.trim(), visibility:"public" };
      await saveTeacherGame(user.uid, user.displayName||"Docente", user.email||"", gameData, csvLines.join("\n"));
      onSuccess(); onClose();
    } catch (err: any) { setError(err.message); }
    finally { setIsSaving(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10000, padding:20 }} onClick={onClose}>
      <div style={{ backgroundColor:"white", borderRadius:20, width:"100%", maxWidth:520, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:"linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", padding:"20px 24px", color:"white", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div><h3 style={{ margin:0, fontSize:18, fontWeight:700 }}>🌐 {t.title}</h3><p style={{ margin:"4px 0 0", fontSize:13, opacity:0.9 }}>{t.subtitle}</p></div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"white", width:32, height:32, borderRadius:"50%", fontSize:16, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ padding:24, overflowY:"auto", flex:1, display:"flex", flexDirection:"column", gap:16 }}>
          <div><label style={labelStyle}>{t.titleLabel}</label><input type="text" value={title} onChange={e=>setTitle(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>{t.descLabel}</label><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder={t.descPlaceholder} rows={2} style={{...inputStyle,resize:"vertical"}}/></div>
          <div><label style={labelStyle}>{t.levelLabel}</label>
            <div style={{ display:"flex", gap:10 }}>
              {(["primary","secondary"] as const).map(lv=>(
                <button key={lv} onClick={()=>{setLevel(lv);setGrade(lv==="secondary"?"1°":"6°");}} style={{ flex:1, padding:"10px", borderRadius:10, border:level===lv?"3px solid #8b5cf6":"2px solid #e2e8f0", backgroundColor:level===lv?"#ede9fe":"white", color:level===lv?"#7c3aed":"#475569", fontWeight:level===lv?700:400, cursor:"pointer", fontSize:14 }}>
                  {lv==="primary"?`🎒 ${t.primary}`:`🎓 ${t.secondary}`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><label style={labelStyle}>{t.areaLabel}</label><select value={area} onChange={e=>setArea(e.target.value)} style={{...inputStyle,cursor:"pointer"}}>{areas.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select></div>
            <div><label style={labelStyle}>{t.gradeLabel}</label><select value={grade} onChange={e=>setGrade(e.target.value)} style={{...inputStyle,cursor:"pointer"}}>{grades.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
          </div>
          <div><label style={labelStyle}>{t.topicLabel}</label><input type="text" value={topic} onChange={e=>setTopic(e.target.value)} placeholder={t.topicPlaceholder} style={inputStyle}/></div>
          <div><label style={labelStyle}>{t.contentsLabel}</label><input type="text" value={mainContents} onChange={e=>setMainContents(e.target.value)} placeholder={t.contentsPlaceholder} style={inputStyle}/></div>
          <div><label style={labelStyle}>{t.skillsLabel}</label><input type="text" value={mainSkills} onChange={e=>setMainSkills(e.target.value)} placeholder={t.skillsPlaceholder} style={inputStyle}/></div>
          <div><label style={labelStyle}>{t.langLabel}</label>
            <div style={{ display:"flex", gap:8 }}>
              {([{code:"es" as const,flag:"🇪🇸",label:"Español"},{code:"en" as const,flag:"🇺🇸",label:"English"},{code:"pt" as const,flag:"🇧🇷",label:"Português"}]).map(l=>(
                <button key={l.code} onClick={()=>setLang(l.code)} style={{ flex:1, padding:"8px", borderRadius:10, border:lang===l.code?"3px solid #8b5cf6":"2px solid #e2e8f0", backgroundColor:lang===l.code?"#ede9fe":"white", color:lang===l.code?"#7c3aed":"#475569", fontWeight:lang===l.code?700:400, cursor:"pointer", fontSize:12 }}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>
          {error && <div style={{ padding:"10px 14px", backgroundColor:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, fontSize:13, color:"#dc2626" }}>{error}</div>}
        </div>
        <div style={{ padding:"16px 24px", borderTop:"1px solid #e2e8f0", display:"flex", gap:10, flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1, padding:"12px", fontSize:14, fontWeight:600, borderRadius:10, border:"2px solid #e2e8f0", backgroundColor:"white", color:"#64748b", cursor:"pointer" }}>{t.cancel}</button>
          <button onClick={handleShare} disabled={isSaving||!title.trim()} style={{ flex:2, padding:"12px", fontSize:14, fontWeight:700, borderRadius:10, border:"none", background:isSaving||!title.trim()?"#94a3b8":"linear-gradient(135deg, #8b5cf6, #7c3aed)", color:"white", cursor:isSaving||!title.trim()?"not-allowed":"pointer" }}>
            {isSaving?`⏳ ${t.sharing}`:`🌐 ${t.share}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TeacherStatsCard
// ============================================
function TeacherStatsCard({ stats, loading, collapsed, onToggle }: { stats: TeacherStats|null; loading: boolean; collapsed: boolean; onToggle: ()=>void }) {
  const { language } = useI18n();
  const fmt = (s: number) => { if (s<60) return `${s}s`; if (s<3600) return `${Math.round(s/60)}m`; return `${Math.floor(s/3600)}h ${Math.round((s%3600)/60)}m`; };
  const texts = {
    es: { title:"Tu actividad", thisMonth:"Este mes", total:"Total", time:"Tiempo", sessions:"Sesiones", games:"Juegos", created:"creados", completed:"completados", loading:"⏳ Cargando estadísticas..." },
    en: { title:"Your activity", thisMonth:"This month", total:"Total", time:"Time", sessions:"Sessions", games:"Games", created:"created", completed:"completed", loading:"⏳ Loading statistics..." },
    pt: { title:"Sua atividade", thisMonth:"Este mês", total:"Total", time:"Tempo", sessions:"Sessões", games:"Jogos", created:"criados", completed:"completados", loading:"⏳ Carregando estatísticas..." },
  };
  const t = texts[language as keyof typeof texts] || texts.es;
  return (
    <div style={{ backgroundColor:"white", borderRadius:16, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", border:"1px solid #e2e8f0", marginBottom:24, overflow:"hidden" }}>
      <button onClick={onToggle} style={{ width:"100%", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:20 }}>📊</span>
          <span style={{ fontSize:16, fontWeight:700, color:"#1e293b" }}>{t.title}</span>
        </div>
        <span style={{ fontSize:12, color:"#64748b", display:"inline-block", transform:collapsed?"rotate(0deg)":"rotate(90deg)", transition:"transform 0.2s" }}>▶</span>
      </button>
      {!collapsed && (
        <div style={{ padding:"0 24px 24px 24px" }}>
          {loading ? <div style={{ textAlign:"center", color:"#1e40af", padding:16 }}>{t.loading}</div>
          : !stats ? null : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:16 }}>
                {[
                  { bg:"#dbeafe", label:`⏱️ ${t.time}`, val:fmt(stats.monthDurationSec), color:"#1e40af", sub:t.thisMonth },
                  { bg:"#dcfce7", label:`🔐 ${t.sessions}`, val:stats.monthSessions, color:"#166534", sub:t.thisMonth },
                  { bg:"#fde68a", label:`🎮 ${t.games}`, val:stats.gamesCreated, color:"#b45309", sub:t.created },
                  { bg:"#ddd6fe", label:`✅ ${t.games}`, val:stats.gamesCompleted, color:"#5b21b6", sub:t.completed },
                ].map((c,i) => (
                  <div key={i} style={{ padding:16, borderRadius:12, backgroundColor:c.bg, textAlign:"center" }}>
                    <div style={{ fontSize:12, color:"#1e40af", marginBottom:4 }}>{c.label}</div>
                    <div style={{ fontSize:24, fontWeight:700, color:c.color }}>{c.val}</div>
                    <div style={{ fontSize:11, color:"#1e40af" }}>{c.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid #e2e8f0", textAlign:"center", fontSize:12, color:"#1e40af" }}>
                {t.total}: {fmt(stats.totalDurationSec)} · {stats.totalSessions} {t.sessions.toLowerCase()}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// EvaluationsSection
// ============================================
function EvaluationsSection({ gamesWithEvaluations, t }: { gamesWithEvaluations: Array<{ gameId:string; gameName:string; subject?:string; evalCount:number }>; t: any }) {
  const navigate = useNavigate();
  if (gamesWithEvaluations.length === 0) return null;
  return (
    <div style={{ backgroundColor:"white", borderRadius:16, padding:20, marginBottom:24, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", border:"2px solid #8b5cf6" }}>
      <h3 style={{ margin:"0 0 16px 0", fontSize:18, fontWeight:700, color:"#1e293b" }}>📊 {t.dashboard.evaluationsTitle}</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {gamesWithEvaluations.slice(0,5).map(game => (
          <div key={game.gameId} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", backgroundColor:"#f8fafc", borderRadius:10, cursor:"pointer", transition:"all 0.2s" }}
            onClick={() => navigate(`/resultados/${game.gameId}?tab=autoevaluaciones`)}
            onMouseOver={e => { e.currentTarget.style.backgroundColor="#f1f5f9"; e.currentTarget.style.transform="translateX(4px)"; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor="#f8fafc"; e.currentTarget.style.transform="translateX(0)"; }}>
            <div>
              <div style={{ fontWeight:600, color:"#1e293b" }}>{game.gameName}</div>
              {game.subject && <div style={{ fontSize:12, color:"#1e40af" }}>{game.subject}</div>}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", backgroundColor:"#8b5cf6", color:"white", borderRadius:20, fontSize:13, fontWeight:700 }}>📝 {game.evalCount}</div>
              <span style={{ color:"#64748b" }}>→</span>
            </div>
          </div>
        ))}
      </div>
      {gamesWithEvaluations.length > 5 && <div style={{ textAlign:"center", marginTop:12 }}><span style={{ fontSize:13, color:"#1e40af" }}>+{gamesWithEvaluations.length-5} {t.dashboard.moreGames||"juegos más"}</span></div>}
    </div>
  );
}

// ============================================
// ModeSelectorModal
// ============================================
function ModeSelectorModal({ isOpen, onClose, onSelect, currentMode }: { isOpen:boolean; onClose:()=>void; onSelect:(m:GameMode)=>void; currentMode:GameMode }) {
  const { t } = useI18n();
  if (!isOpen) return null;
  const modes = [
    { id:"traffic-light" as GameMode, icon:"🚦", title:t.gameModes.trafficLight.title, subtitle:t.gameModes.trafficLight.subtitle, description:t.gameModes.trafficLight.description, ageRange:t.gameModes.trafficLight.ageRange, color:"#22c55e", bg:"#f0fdf4" },
    { id:"coopetition" as GameMode, icon:"🎯", title:t.gameModes.coopetition.title, subtitle:t.gameModes.coopetition.subtitle, description:t.gameModes.coopetition.description, ageRange:t.gameModes.coopetition.ageRange, color:"#6366f1", bg:"#eef2ff" },
  ];
  return (
    <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10000, padding:20 }}>
      <div style={{ backgroundColor:"white", borderRadius:24, padding:32, maxWidth:600, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <h2 style={{ margin:"0 0 8px 0", fontSize:24, fontWeight:800, color:"#1e293b", textAlign:"center" }}>{t.dashboard.selectGameMode}</h2>
        <p style={{ margin:"0 0 24px 0", fontSize:14, color:"#1e40af", textAlign:"center" }}>{t.dashboard.selectGameModeSubtitle}</p>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {modes.map(mode => (
            <button key={mode.id} onClick={() => { onSelect(mode.id); onClose(); }}
              style={{ display:"flex", alignItems:"center", gap:20, padding:20, borderRadius:16, border:currentMode===mode.id?`3px solid ${mode.color}`:"3px solid transparent", backgroundColor:mode.bg, cursor:"pointer", transition:"all 0.2s", textAlign:"left" }}
              onMouseOver={e => { e.currentTarget.style.transform="scale(1.02)"; e.currentTarget.style.boxShadow=`0 8px 24px ${mode.color}30`; }}
              onMouseOut={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
              <div style={{ width:64, height:64, borderRadius:16, backgroundColor:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, boxShadow:`0 4px 12px ${mode.color}20`, flexShrink:0 }}>{mode.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:18, fontWeight:700, color:"#1e293b", marginBottom:4 }}>{mode.title}</div>
                <div style={{ fontSize:13, color:mode.color, fontWeight:600, marginBottom:6 }}>{mode.subtitle}</div>
                <div style={{ fontSize:13, color:"#1e40af", lineHeight:1.4 }}>{mode.description}</div>
              </div>
              <div style={{ padding:"6px 12px", borderRadius:8, backgroundColor:mode.color, color:"white", fontSize:12, fontWeight:600, flexShrink:0 }}>{mode.ageRange}</div>
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ marginTop:24, width:"100%", padding:"12px 24px", fontSize:14, fontWeight:600, borderRadius:12, border:"2px solid #e2e8f0", backgroundColor:"white", color:"#1e40af", cursor:"pointer" }}>{t.common.cancel}</button>
      </div>
    </div>
  );
}

// ============================================
// GameCard
// ============================================
function GameCard({ game, onContinue, onDelete, onShare, selfEvalCount=0 }: { game:ActiveGame; onContinue:(g:ActiveGame)=>void; onDelete:(g:ActiveGame)=>void; onShare:(g:ActiveGame)=>void; selfEvalCount?:number }) {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getStatusInfo = () => {
    const { currentStage:stage, status } = game;
    if (["finished","ended","game_complete"].includes(status)) return { label:t.dashboard.status.finished, color:"#1e40af", bg:"#f1f5f9", icon:"✅" };
    if (stage===0||status==="stage0") {
      if (status==="proposal-collecting") return { label:t.dashboard.status.collectingProposals, color:"#8b5cf6", bg:"#ede9fe", icon:"📝" };
      if (status==="proposal-curating")   return { label:t.dashboard.status.curatingProposals,   color:"#7c3aed", bg:"#ede9fe", icon:"✂️" };
      return { label:t.dashboard.status.stage0Proposals, color:"#8b5cf6", bg:"#ede9fe", icon:"📝" };
    }
    if (stage===1||status==="stage1") return { label:t.dashboard.status.stage1Playing, color:"#166534", bg:"#dcfce7", icon:"🎮" };
    if (status==="transition")        return { label:t.dashboard.status.transitionStage2, color:"#b45309", bg:"#fef3c7", icon:"⏳" };
    if (stage===2||status==="stage2") return { label:t.dashboard.status.stage2Playing, color:"#1e40af", bg:"#dbeafe", icon:"🏆" };
    return { label:t.dashboard.status.preparing, color:"#1e40af", bg:"#f1f5f9", icon:"⚙️" };
  };

  const si = getStatusInfo();
  const isFinished = ["finished","ended","game_complete"].includes(game.status);
  const shareLabel = language==="es" ? "Compartir" : language==="pt" ? "Compartilhar" : "Share";

  const formatDate = (ts: number) => {
    const d=new Date(ts), now=new Date();
    const dm=Math.floor((now.getTime()-d.getTime())/60000), dh=Math.floor(dm/60), dd=Math.floor(dh/24);
    if (dm<60) return t.dashboard.time.minutesAgo(dm);
    if (dh<24) return t.dashboard.time.hoursAgo(dh);
    if (dd<7)  return t.dashboard.time.daysAgo(dd);
    return d.toLocaleDateString();
  };

  return (
    <div style={{ backgroundColor:"white", borderRadius:16, padding:20, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", border:"1px solid #e2e8f0" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div style={{ flex:1 }}>
          <h4 style={{ margin:"0 0 4px 0", fontSize:16, fontWeight:700, color:"#1e293b" }}>{game.name||t.dashboard.unnamedGame}</h4>
          {game.subject && <p style={{ margin:0, fontSize:13, color:"#1e40af" }}>{game.subject}</p>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:8, backgroundColor:si.bg, color:si.color, fontSize:12, fontWeight:600 }}>
          <span>{si.icon}</span><span>{si.label}</span>
        </div>
      </div>
      <div style={{ display:"flex", gap:16, marginBottom:16, fontSize:13, color:"#1e40af", flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}><span>🔑</span><span style={{ fontFamily:"monospace", fontWeight:600, color:"#1e293b" }}>{game.roomCode}</span></div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}><span>👥</span><span>{game.teamsCount} {t.common.teams}</span></div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}><span>❓</span><span>{game.questionsCount} {t.common.questions}</span></div>
        <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:"auto" }}><span>🕐</span><span>{formatDate(game.createdAt)}</span></div>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {!isFinished && (
          <button onClick={() => onContinue(game)} style={{ flex:1, padding:"10px 16px", fontSize:14, fontWeight:600, borderRadius:8, border:"none", background:"linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", color:"white", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, minWidth:100 }}>
            <span>▶️</span>{t.common.continueVerb}
          </button>
        )}
        {isFinished && <>
          <button onClick={() => navigate(`/resultados/${game.id}`)} style={{ flex:1, padding:"10px 16px", fontSize:14, fontWeight:600, borderRadius:8, border:"none", background:"linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color:"white", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, minWidth:100 }}>
            <span>📊</span>{t.dashboard.viewResults}
          </button>
          {selfEvalCount > 0 && (
            <button onClick={() => navigate(`/resultados/${game.id}?tab=autoevaluaciones`)} style={{ padding:"10px 16px", fontSize:14, fontWeight:600, borderRadius:8, border:"2px solid #8b5cf6", backgroundColor:"#f5f3ff", color:"#7c3aed", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <span>📝</span>{selfEvalCount}
            </button>
          )}
          {selfEvalCount === 0 && (
            <button onClick={() => navigate(`/stage2/classroom/${game.id}`)} style={{ padding:"10px 16px", fontSize:14, fontWeight:600, borderRadius:8, border:"2px solid #f59e0b", backgroundColor:"#fffbeb", color:"#b45309", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <span>🏆</span>{t.dashboard.goToPodium}
            </button>
          )}
        </>}
        <button onClick={() => onShare(game)} style={{ padding:"10px 14px", fontSize:13, fontWeight:600, borderRadius:8, border:"2px solid #c4b5fd", backgroundColor:"#f5f3ff", color:"#7c3aed", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
          🌐 {shareLabel}
        </button>
        {showDeleteConfirm ? <>
          <button onClick={() => { onDelete(game); setShowDeleteConfirm(false); }} style={{ padding:"10px 16px", fontSize:14, fontWeight:600, borderRadius:8, border:"none", backgroundColor:"#ef4444", color:"white", cursor:"pointer" }}>{t.common.confirm}</button>
          <button onClick={() => setShowDeleteConfirm(false)} style={{ padding:"10px 16px", fontSize:14, fontWeight:600, borderRadius:8, border:"1px solid #e2e8f0", backgroundColor:"white", color:"#1e40af", cursor:"pointer" }}>{t.common.cancel}</button>
        </> : (
          <button onClick={() => setShowDeleteConfirm(true)} style={{ padding:"10px 16px", fontSize:14, fontWeight:600, borderRadius:8, border:"1px solid #fecaca", backgroundColor:"#fef2f2", color:"#dc2626", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <span>🗑️</span>{!isFinished && t.common.delete}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { mode, setMode, getLocalizedTheme } = useGameMode();
  const { t, language } = useI18n();
  const theme = getLocalizedTheme(language);

  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showVideoModal,   setShowVideoModal]   = useState(false);
  const [videoLevel, setVideoLevel] = useState<'selector'|'primary'|'secondary'>('selector');
  const [statsCollapsed,   setStatsCollapsed]   = useState(true);
  const [activeGames,      setActiveGames]      = useState<ActiveGame[]>([]);
  const [loadingGames,     setLoadingGames]     = useState(true);
  const [teacherStats,     setTeacherStats]     = useState<TeacherStats|null>(null);
  const [loadingStats,     setLoadingStats]     = useState(true);
  const [selfEvalCounts,   setSelfEvalCounts]   = useState<Record<string,number>>({});
  const [gamesWithEvaluations, setGamesWithEvaluations] = useState<Array<{gameId:string;gameName:string;subject?:string;evalCount:number;completedAt?:number}>>([]);
  const [gameToShare,  setGameToShare]  = useState<ActiveGame|null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const gamesDataRef = useRef<Record<string,any>>({});

  useEffect(() => {
    if (!user?.uid) { setLoadingGames(false); return; }
    const gamesRef = query(ref(database,"games"), orderByChild("createdBy/uid"), equalTo(user.uid));
    onValue(gamesRef, snapshot => {
      if (!snapshot.exists()) { setActiveGames([]); gamesDataRef.current={}; setLoadingGames(false); return; }
      const data = snapshot.val();
      gamesDataRef.current = data;
      const games: ActiveGame[] = Object.entries(data).map(([id,gd]:any) => ({
        id, name:gd.config?.className||gd.config?.gameName||"", subject:gd.config?.subject||"",
        roomCode:gd.roomCode||"------", status:gd.status?.status||gd.status?.currentPhase||"unknown",
        currentStage:gd.status?.currentStage||0, teamsCount:gd.teams?Object.keys(gd.teams).length:0,
        questionsCount:gd.questions?Object.keys(gd.questions).length:0,
        createdAt:gd.config?.createdAt||gd.createdAt||Date.now(), gameMode:gd.config?.gameMode||"traffic-light",
      }));
      games.sort((a,b)=>b.createdAt-a.createdAt);
      setActiveGames(games); setLoadingGames(false);
    });
    return () => off(gamesRef);
  }, [user?.uid]);

  useEffect(() => {
    async function loadStats() {
      if (!user?.uid) { setLoadingStats(false); return; }
      try {
        const snap = await get(ref(database,`metrics/teachers/${user.uid}`));
        const md = snap.val();
        const gd = gamesDataRef.current;
        const sessions = md?.sessions ? Object.values(md.sessions) : [];
        const som = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        let totalDurationSec=0, monthDurationSec=0, monthSessions=0;
        for (const s of sessions as any[]) {
          const dur = s.durationSec||(s.loginAt&&s.logoutAt?Math.floor((s.logoutAt-s.loginAt)/1000):0);
          totalDurationSec+=dur;
          if (s.loginAt>=som) { monthSessions++; monthDurationSec+=dur; }
        }
        let gamesCreated=0, gamesCompleted=0;
        for (const g of Object.values(gd) as any[]) {
          gamesCreated++;
          if (["game_complete","finished","ended"].includes(g.status?.status)) gamesCompleted++;
        }
        setTeacherStats({ totalSessions:sessions.length, totalDurationSec, monthSessions, monthDurationSec, gamesCreated, gamesCompleted });
      } catch(e) { console.error(e); }
      setLoadingStats(false);
    }
    if (!loadingGames) loadStats();
  }, [user?.uid, loadingGames]);

  useEffect(() => {
    async function loadEvals() {
      const finished = activeGames.filter(g=>["finished","ended","game_complete"].includes(g.status));
      if (!finished.length) { setSelfEvalCounts({}); setGamesWithEvaluations([]); return; }
      const results = await Promise.all(finished.map(async game => {
        try { const s=await get(ref(database,`games/${game.id}/selfEvaluations`)); return { game, count:s.exists()?Object.keys(s.val()).length:0 }; }
        catch { return { game, count:0 }; }
      }));
      const counts:Record<string,number>={};
      const evals:typeof gamesWithEvaluations=[];
      for (const {game,count} of results) {
        counts[game.id]=count;
        if (count>0) evals.push({ gameId:game.id, gameName:game.name||"Sin nombre", subject:game.subject, evalCount:count, completedAt:game.createdAt });
      }
      evals.sort((a,b)=>b.evalCount-a.evalCount);
      setSelfEvalCounts(counts); setGamesWithEvaluations(evals);
    }
    if (!loadingGames&&activeGames.length>0) loadEvals();
  }, [activeGames, loadingGames]);

  const handleLogout = async () => { try { await logout(); navigate("/login"); } catch(e) { console.error(e); } };
  const handleContinueGame = (game: ActiveGame) => {
    if (game.currentStage===2||game.status==="stage2") { navigate(`/stage2/classroom/${game.id}`); return; }
    navigate(`/classroom/${game.id}`);
  };
  const handleDeleteGame = async (game: ActiveGame) => {
    try {
      await remove(ref(database,`games/${game.id}`));
      if (game.roomCode&&game.roomCode!=="------") await remove(ref(database,`roomCodes/${game.roomCode}`));
    } catch(e) { console.error(e); alert(t.errors.deletingGame); }
  };

  const lang = (language as string) in GAME_CARDS_STRINGS.newGame
    ? (language as keyof typeof GAME_CARDS_STRINGS.newGame) : "es";

  const ongoingGames  = activeGames.filter(g=>!["finished","ended","game_complete"].includes(g.status));
  const finishedGames = activeGames.filter(g=>["finished","ended","game_complete"].includes(g.status));

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(180deg, ${theme.cardHoverBg} 0%, #f8fafc 50%, #f1f5f9 100%)`, fontFamily:"'Segoe UI', system-ui, -apple-system, sans-serif" }}>

      {/* HEADER */}
      <header style={{ background:theme.primaryGradient, padding:"20px 32px", color:"white", boxShadow:`0 4px 20px ${theme.primary}40` }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:32 }}>{theme.icon}</span>
              <div>
                <h1 style={{ margin:0, fontSize:20, fontWeight:800 }}>{theme.name}</h1>
                <p style={{ margin:0, fontSize:12, opacity:0.9 }}>Donde aprendemos <strong>todos</strong> juntos</p>
              </div>
            </div>
            <button onClick={() => setShowModeSelector(true)} style={{ padding:"6px 12px", fontSize:12, fontWeight:600, borderRadius:8, border:"2px solid rgba(255,255,255,0.3)", backgroundColor:"rgba(255,255,255,0.1)", color:"white", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              ⚙️ {t.common.edit}
            </button>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <LanguageSelector compact />
            <span style={{ fontSize:14, opacity:0.9 }}>{user?.email}</span>
            {isAdmin && (
              <button onClick={() => navigate("/admin/metrics")} style={{ padding:"6px 12px", fontSize:12, fontWeight:600, borderRadius:8, border:"2px solid rgba(255,255,255,0.3)", backgroundColor:"rgba(255,255,255,0.1)", color:"white", cursor:"pointer" }}>
                ⚙️ {t.common.admin}
              </button>
            )}
            <button onClick={handleLogout} style={{ padding:"8px 16px", fontSize:14, fontWeight:600, borderRadius:8, border:"none", backgroundColor:"rgba(255,255,255,0.2)", color:"white", cursor:"pointer" }}>
              {t.auth.logout}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main style={{ maxWidth:1200, margin:"0 auto", padding:"48px 24px" }}>

        {/* Saludo */}
        <div style={{ marginBottom:40, textAlign:"center" }}>
          <h2 style={{ margin:"0 0 8px 0", fontSize:32, fontWeight:800, color:"#1e293b" }}>
            {t.dashboard.welcome} {user?.displayName?.split(" ")[0]||t.dashboard.teacherFallbackName}! 👋
          </h2>
          <p style={{ margin:"0 0 24px 0", fontSize:18, color:"#1e40af" }}>{t.dashboard.title}</p>
          <button onClick={() => { setVideoLevel('selector'); setShowVideoModal(true); }}
            style={{ padding:"14px 32px", fontSize:16, fontWeight:700, borderRadius:12, border:"none", background:"linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color:"white", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:10, boxShadow:"0 4px 16px rgba(239,68,68,0.4)" }}>
            ▶ {language==="es" ? "¿Cómo empezar? Ver video (2 min)" : language==="pt" ? "Como começar? Ver vídeo (2 min)" : "How to start? Watch video (2 min)"}
          </button>
        </div>

        {shareSuccess && (
          <div style={{ marginBottom:24, padding:"14px 20px", backgroundColor:"#f0fdf4", border:"2px solid #22c55e", borderRadius:12, fontSize:14, fontWeight:600, color:"#166534", display:"flex", alignItems:"center", gap:10 }}>
            ✅ {language==="es" ? "¡Juego compartido con la comunidad!" : "Game shared with the community!"}
          </div>
        )}

        <EvaluationsSection gamesWithEvaluations={gamesWithEvaluations} t={t} />

        {/* ══ SECCIÓN 1: EL JUEGO ══ */}
        <div style={{ marginBottom:48 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
            <span style={{ fontSize:24 }}>🚦</span>
            <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1e293b" }}>El Juego</h2>
            <div style={{ flex:1, height:2, backgroundColor:"#e2e8f0", borderRadius:2 }} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:24 }}>
            {/* Card juego nuevo */}
            <button onClick={() => navigate("/setup")}
              style={{ padding:32, borderRadius:20, border:"none", backgroundColor:"white", boxShadow:"0 4px 20px rgba(0,0,0,0.08)", cursor:"pointer", transition:"all 0.3s", textAlign:"left", display:"flex", flexDirection:"column", gap:16 }}
              onMouseOver={e => { e.currentTarget.style.transform="translateY(-8px)"; e.currentTarget.style.boxShadow=`0 20px 40px ${theme.primary}30`; }}
              onMouseOut={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.08)"; }}>
              <div style={{ width:64, height:64, borderRadius:16, background:theme.primaryGradient, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, boxShadow:`0 8px 24px ${theme.primary}40` }}>🚀</div>
              <div>
                <h3 style={{ margin:"0 0 8px 0", fontSize:20, fontWeight:700, color:"#1e293b" }}>{GAME_CARDS_STRINGS.newGame[lang].title}</h3>
                <p style={{ margin:0, fontSize:14, color:"#1e40af", lineHeight:1.5 }}>{GAME_CARDS_STRINGS.newGame[lang].description}</p>
              </div>
              <div style={{ marginTop:"auto", display:"flex", alignItems:"center", gap:8, color:theme.primary, fontWeight:600, fontSize:14 }}>{GAME_CARDS_STRINGS.newGame[lang].cta}</div>
            </button>

            {/* Card comunidad */}
            <button onClick={() => navigate("/library")}
              style={{ padding:32, borderRadius:20, border:"none", backgroundColor:"white", boxShadow:"0 4px 20px rgba(0,0,0,0.08)", cursor:"pointer", transition:"all 0.3s", textAlign:"left", display:"flex", flexDirection:"column", gap:16 }}
              onMouseOver={e => { e.currentTarget.style.transform="translateY(-8px)"; e.currentTarget.style.boxShadow="0 20px 40px #8b5cf630"; }}
              onMouseOut={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.08)"; }}>
              <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, boxShadow:"0 8px 24px #8b5cf640" }}>🌐</div>
              <div>
                <h3 style={{ margin:"0 0 8px 0", fontSize:20, fontWeight:700, color:"#1e293b" }}>{GAME_CARDS_STRINGS.community[lang].title}</h3>
                <p style={{ margin:0, fontSize:14, color:"#1e40af", lineHeight:1.5 }}>{GAME_CARDS_STRINGS.community[lang].description}</p>
              </div>
              <div style={{ marginTop:"auto", display:"flex", alignItems:"center", gap:8, color:"#8b5cf6", fontWeight:600, fontSize:14 }}>{GAME_CARDS_STRINGS.community[lang].cta}</div>
            </button>
          </div>
        </div>

        {/* ══ SECCIÓN 2: HERRAMIENTAS ══ */}
        <div style={{ marginBottom:40 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
            <span style={{ fontSize:24 }}>🛠️</span>
            <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"#1e293b" }}>
              {language==="es" ? "Herramientas para docentes" : language==="pt" ? "Ferramentas para docentes" : "Teacher tools"}
            </h2>
            <div style={{ flex:1, height:2, backgroundColor:"#e2e8f0", borderRadius:2 }} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:14 }}>
            {TOOLS.map(tool => {
              // Si el tool tiene estructura con idiomas (es, en, pt) entonces la usamos, si no, usamos tool directamente
              const hasTranslations = tool.es && tool.en && tool.pt;
              const toolLang = hasTranslations
                ? (tool[language as keyof typeof tool] as any || tool.es)
                : tool;
              return (
                <button key={tool.id} onClick={() => navigate(tool.path || tool.route)}
                  style={{ padding:"18px 20px", borderRadius:16, border:"1px solid #e2e8f0", backgroundColor:"white", boxShadow:"0 2px 8px rgba(0,0,0,0.05)", cursor:"pointer", transition:"all 0.2s", textAlign:"left", display:"flex", alignItems:"flex-start", gap:14 }}
                  onMouseOver={e => { e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow=`0 8px 24px ${tool.color}25`; e.currentTarget.style.borderColor=tool.color; }}
                  onMouseOut={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.05)"; e.currentTarget.style.borderColor="#e2e8f0"; }}>
                  <div style={{ width:40, height:40, borderRadius:10, backgroundColor:`${tool.color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                    {tool.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1e293b", marginBottom:3, lineHeight:1.3 }}>
                      {toolLang.title}
                      {tool.isNew && (
                        <span style={{ marginLeft:6, padding:"2px 6px", backgroundColor:"#f97316", color:"white", fontSize:9, fontWeight:700, borderRadius:10, display:"inline-block", verticalAlign:"middle" }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:11, color:"#64748b", lineHeight:1.4 }}>
                      {toolLang.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <DashboardBanners />

        <TeacherStatsCard stats={teacherStats} loading={loadingStats} collapsed={statsCollapsed} onToggle={() => setStatsCollapsed(!statsCollapsed)} />

        {/* MIS JUEGOS */}
        <div style={{ marginBottom:48 }}>
          <h3 style={{ margin:"0 0 20px 0", fontSize:20, fontWeight:700, color:"#1e293b", display:"flex", alignItems:"center", gap:8 }}>
            🎮 {t.dashboard.myGames}
            {ongoingGames.length>0 && <span style={{ padding:"2px 8px", borderRadius:12, backgroundColor:"#dcfce7", color:"#166534", fontSize:13, fontWeight:600 }}>{ongoingGames.length} {t.dashboard.active}</span>}
          </h3>
          {loadingGames ? (
            <div style={{ padding:40, textAlign:"center", color:"#1e40af" }}>⏳ {t.dashboard.loadingGames}</div>
          ) : activeGames.length===0 ? (
            <div style={{ padding:40, textAlign:"center", backgroundColor:"white", borderRadius:16, border:"2px dashed #e2e8f0" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🎲</div>
              <p style={{ margin:0, color:"#1e40af", fontSize:15 }}>{t.dashboard.noGamesCreated}</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {ongoingGames.length>0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {ongoingGames.map(game => (
                    <GameCard key={game.id} game={game} onContinue={handleContinueGame} onDelete={handleDeleteGame} onShare={setGameToShare} />
                  ))}
                </div>
              )}
              {finishedGames.length>0 && (
                <details style={{ marginTop:8 }}>
                  <summary style={{ cursor:"pointer", padding:"12px 16px", backgroundColor:"#f1f5f9", borderRadius:12, fontSize:14, fontWeight:600, color:"#1e40af", listStyle:"none", display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:12 }}>▶</span>{finishedGames.length} {t.dashboard.finishedGames}
                  </summary>
                  <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:12, paddingLeft:8 }}>
                    {finishedGames.map(game => (
                      <GameCard key={game.id} game={game} onContinue={handleContinueGame} onDelete={handleDeleteGame} onShare={setGameToShare} selfEvalCount={selfEvalCounts[game.id]||0} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </main>

      <footer style={{ padding:"24px", textAlign:"center", color:"#64748b", fontSize:14 }}>
        <button onClick={() => navigate("/about")} style={{ background:"none", border:"none", color:"#1e40af", cursor:"pointer", fontSize:14, textDecoration:"underline" }}>
          {t.dashboard.aboutThisProject}
        </button>
      </footer>

      <ModeSelectorModal isOpen={showModeSelector} onClose={() => setShowModeSelector(false)} onSelect={setMode} currentMode={mode} />

      {showVideoModal && (
        <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10000, padding:20 }} onClick={() => setShowVideoModal(false)}>
          <div style={{ backgroundColor:"white", borderRadius:20, width:"100%", maxWidth:800, boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"16px 24px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:700, color:"#1e293b" }}>
                {videoLevel==='selector' ? (language==="es"?"¿Para qué nivel?":language==="pt"?"Para qual nível?":"For which level?")
                  : videoLevel==='primary' ? (language==="es"?"▶ Primaria — Cómo empezar":"▶ Primary — How to start")
                  : (language==="es"?"▶ Secundaria — Cómo empezar":"▶ Secondary — How to start")}
              </h3>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {videoLevel !== 'selector' && (
                  <button onClick={() => setVideoLevel('selector')} style={{ fontSize:13, fontWeight:600, padding:"6px 12px", borderRadius:8, border:"1px solid #e2e8f0", backgroundColor:"white", color:"#64748b", cursor:"pointer" }}>
                    ← {language==="es"?"Cambiar":"Change"}
                  </button>
                )}
                <button onClick={() => setShowVideoModal(false)} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:"#64748b" }}>✕</button>
              </div>
            </div>
            {videoLevel==='selector' && (
              <div style={{ padding:32, display:"flex", gap:16 }}>
                {[{id:'primary' as const,icon:'🎒',label:language==="es"?"Primaria":"Primary",color:"#22c55e",bg:"#f0fdf4"},{id:'secondary' as const,icon:'🎓',label:language==="es"?"Secundaria":"Secondary",color:"#6366f1",bg:"#eef2ff"}].map(opt => (
                  <button key={opt.id} onClick={() => setVideoLevel(opt.id)}
                    style={{ flex:1, padding:28, borderRadius:16, border:`2px solid ${opt.color}`, backgroundColor:opt.bg, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:12, transition:"all 0.2s" }}
                    onMouseOver={e => { e.currentTarget.style.transform="scale(1.03)"; }}
                    onMouseOut={e => { e.currentTarget.style.transform="none"; }}>
                    <span style={{ fontSize:48 }}>{opt.icon}</span>
                    <span style={{ fontSize:18, fontWeight:700, color:opt.color }}>{opt.label}</span>
                    <span style={{ fontSize:13, color:"#64748b" }}>▶ ~1:20 min</span>
                  </button>
                ))}
              </div>
            )}
            {videoLevel !== 'selector' && (
              <div style={{ position:"relative", paddingBottom:"56.25%", height:0 }}>
                <iframe src={`https://www.youtube.com/embed/${videoLevel==='primary'?'thQmwp3uv64':'R5uNQJlBBck'}`}
                  style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", borderRadius:"0 0 20px 20px", border:"none" }}
                  allowFullScreen title="Tutorial" />
              </div>
            )}
          </div>
        </div>
      )}

      {gameToShare && user && (
        <ShareGameModal game={gameToShare} user={user} onClose={() => setGameToShare(null)} onSuccess={() => { setShareSuccess(true); setTimeout(() => setShareSuccess(false), 4000); }} />
      )}
    </div>
  );
}