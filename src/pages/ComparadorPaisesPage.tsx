import { useState, useRef, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";
import { useGameMode } from "../contexts/GameModeContext";

const COUNTRIES = [
  { name: "Argentina", iso2: "AR", wb: "AR" }, { name: "Bolivia", iso2: "BO", wb: "BO" },
  { name: "Brasil", iso2: "BR", wb: "BR" }, { name: "Chile", iso2: "CL", wb: "CL" },
  { name: "Colombia", iso2: "CO", wb: "CO" }, { name: "Costa Rica", iso2: "CR", wb: "CR" },
  { name: "Cuba", iso2: "CU", wb: "CU" }, { name: "Ecuador", iso2: "EC", wb: "EC" },
  { name: "El Salvador", iso2: "SV", wb: "SV" }, { name: "Guatemala", iso2: "GT", wb: "GT" },
  { name: "Honduras", iso2: "HN", wb: "HN" }, { name: "México", iso2: "MX", wb: "MX" },
  { name: "Nicaragua", iso2: "NI", wb: "NI" }, { name: "Panamá", iso2: "PA", wb: "PA" },
  { name: "Paraguay", iso2: "PY", wb: "PY" }, { name: "Perú", iso2: "PE", wb: "PE" },
  { name: "Uruguay", iso2: "UY", wb: "UY" }, { name: "Venezuela", iso2: "VE", wb: "VE" },
  { name: "República Dominicana", iso2: "DO", wb: "DO" }, { name: "Haití", iso2: "HT", wb: "HT" },
  { name: "Estados Unidos", iso2: "US", wb: "US" }, { name: "Canadá", iso2: "CA", wb: "CA" },
  { name: "Alemania", iso2: "DE", wb: "DE" }, { name: "Francia", iso2: "FR", wb: "FR" },
  { name: "Italia", iso2: "IT", wb: "IT" }, { name: "España", iso2: "ES", wb: "ES" },
  { name: "Reino Unido", iso2: "GB", wb: "GB" }, { name: "Países Bajos", iso2: "NL", wb: "NL" },
  { name: "Portugal", iso2: "PT", wb: "PT" }, { name: "Suecia", iso2: "SE", wb: "SE" },
  { name: "Noruega", iso2: "NO", wb: "NO" }, { name: "Finlandia", iso2: "FI", wb: "FI" },
  { name: "Dinamarca", iso2: "DK", wb: "DK" }, { name: "Suiza", iso2: "CH", wb: "CH" },
  { name: "Polonia", iso2: "PL", wb: "PL" }, { name: "Grecia", iso2: "GR", wb: "GR" },
  { name: "Rusia", iso2: "RU", wb: "RU" }, { name: "Ucrania", iso2: "UA", wb: "UA" },
  { name: "Turquía", iso2: "TR", wb: "TR" }, { name: "China", iso2: "CN", wb: "CN" },
  { name: "Japón", iso2: "JP", wb: "JP" }, { name: "India", iso2: "IN", wb: "IN" },
  { name: "Corea del Sur", iso2: "KR", wb: "KR" }, { name: "Indonesia", iso2: "ID", wb: "ID" },
  { name: "Tailandia", iso2: "TH", wb: "TH" }, { name: "Vietnam", iso2: "VN", wb: "VN" },
  { name: "Filipinas", iso2: "PH", wb: "PH" }, { name: "Bangladesh", iso2: "BD", wb: "BD" },
  { name: "Pakistán", iso2: "PK", wb: "PK" }, { name: "Singapur", iso2: "SG", wb: "SG" },
  { name: "Australia", iso2: "AU", wb: "AU" }, { name: "Nueva Zelanda", iso2: "NZ", wb: "NZ" },
  { name: "Sudáfrica", iso2: "ZA", wb: "ZA" }, { name: "Nigeria", iso2: "NG", wb: "NG" },
  { name: "Egipto", iso2: "EG", wb: "EG" }, { name: "Marruecos", iso2: "MA", wb: "MA" },
  { name: "Etiopía", iso2: "ET", wb: "ET" }, { name: "Kenya", iso2: "KE", wb: "KE" },
  { name: "Ghana", iso2: "GH", wb: "GH" }, { name: "Tanzania", iso2: "TZ", wb: "TZ" },
  { name: "Arabia Saudita", iso2: "SA", wb: "SA" }, { name: "Israel", iso2: "IL", wb: "IL" },
  { name: "Irán", iso2: "IR", wb: "IR" },
];

const REGIONS = [
  { name: "América Latina y el Caribe", wb: "LAC" },
  { name: "América del Norte", wb: "NAC" },
  { name: "Europa y Asia Central", wb: "ECS" },
  { name: "Asia Oriental y el Pacífico", wb: "EAS" },
  { name: "Asia Meridional", wb: "SAS" },
  { name: "África Subsahariana", wb: "SSF" },
  { name: "Medio Oriente y Norte de África", wb: "MEA" },
  { name: "Mundo", wb: "WLD" },
];

const DIMENSIONS = [
  {
    id: "geografica", label: "🌍 Geográfica", desc: "Superficie, capital, región, idiomas",
    onlyCountries: true,
    activeClass: "border-green-500 bg-green-50",
    checkColor: "accent-green-600",
    indicators: [
      { id: "area", label: "Superficie (km²)", default: true },
      { id: "capital", label: "Capital", default: true },
      { id: "region", label: "Región / Subregión", default: true },
      { id: "languages", label: "Idiomas oficiales", default: true },
      { id: "bordersCount", label: "Nº de países limítrofes", default: false },
    ],
  },
  {
    id: "demografica", label: "👥 Demográfica", desc: "Población, urbanización, esperanza de vida",
    activeClass: "border-blue-500 bg-blue-50",
    checkColor: "accent-blue-600",
    indicators: [
      { id: "SP.POP.TOTL", label: "Población total", default: true },
      { id: "SP.POP.GROW", label: "Crecimiento poblacional (%)", default: true },
      { id: "SP.URB.TOTL.IN.ZS", label: "Urbanización (%)", default: true },
      { id: "SP.DYN.LE00.IN", label: "Esperanza de vida (años)", default: true },
      { id: "SP.DYN.TFRT.IN", label: "Tasa de fecundidad", default: false },
    ],
  },
  {
    id: "economica", label: "💰 Económica", desc: "PIB, desempleo, inflación",
    activeClass: "border-purple-500 bg-purple-50",
    checkColor: "accent-purple-600",
    indicators: [
      { id: "NY.GDP.MKTP.CD", label: "PIB (miles de mill. USD)", default: true },
      { id: "NY.GDP.PCAP.CD", label: "PIB per cápita (USD)", default: true },
      { id: "SL.UEM.TOTL.ZS", label: "Desempleo (%)", default: true },
      { id: "FP.CPI.TOTL.ZG", label: "Inflación (%)", default: true },
      { id: "NE.EXP.GNFS.ZS", label: "Exportaciones (% PIB)", default: false },
    ],
  },
  {
    id: "social", label: "🏫 Social", desc: "Educación, salud, desigualdad",
    activeClass: "border-orange-500 bg-orange-50",
    checkColor: "accent-orange-600",
    indicators: [
      { id: "SI.POV.GINI", label: "Índice de Gini", default: true },
      { id: "SP.DYN.IMRT.IN", label: "Mortalidad infantil (por 1000)", default: true },
      { id: "SE.SEC.ENRR", label: "Matrícula secundaria (%)", default: true },
      { id: "IT.NET.USER.ZS", label: "Usuarios de internet (%)", default: false },
      { id: "SE.XPD.TOTL.GD.ZS", label: "Gasto en educación (% PIB)", default: false },
    ],
  },
  {
    id: "ambiental", label: "🌱 Ambiental", desc: "CO₂, bosques, agua, renovables",
    activeClass: "border-teal-500 bg-teal-50",
    checkColor: "accent-teal-600",
    indicators: [
      { id: "EN.ATM.CO2E.PC", label: "Emisiones CO₂ per cápita (ton)", default: true },
      { id: "AG.LND.FRST.ZS", label: "Área forestal (% territorio)", default: true },
      { id: "SH.H2O.BASW.ZS", label: "Acceso a agua potable (%)", default: true },
      { id: "EG.FEC.RNEW.ZS", label: "Energías renovables (%)", default: false },
      { id: "AG.LND.ARBL.ZS", label: "Tierra cultivable (%)", default: false },
    ],
  },
];

const YEARS = Array.from({ length: 24 }, (_, i) => 2023 - i);

type Entity = { name: string; iso2?: string; wb: string };
type DimState = {
  [id: string]: { enabled: boolean; expanded: boolean; indicators: { [indId: string]: boolean } };
};

const buildDefaultDims = (): DimState => {
  const state: DimState = {};
  for (const dim of DIMENSIONS) {
    state[dim.id] = {
      enabled: dim.id !== "ambiental",
      expanded: false,
      indicators: Object.fromEntries(dim.indicators.map((ind) => [ind.id, ind.default])),
    };
  }
  return state;
};

const STORAGE_KEY = "comparador_uses";
const FREE_LIMIT = 2;

export default function ComparadorPaisesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const [tipo, setTipo] = useState<"pais" | "region">("pais");
  const [selected, setSelected] = useState<Entity[]>([]);
  const [query, setQuery] = useState("");
  const [dims, setDims] = useState<DimState>(buildDefaultDims);
  const [temporal, setTemporal] = useState(false);
  const [anioA, setAnioA] = useState(2010);
  const [anioB, setAnioB] = useState(2023);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getUses = () => parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  const canUse = () => user || getUses() < FREE_LIMIT;
  const usesLeft = FREE_LIMIT - getUses();

  const pool = tipo === "pais" ? COUNTRIES : REGIONS;
  const suggestions = query.length >= 1
    ? pool.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()) && !selected.find((s) => s.wb === e.wb)).slice(0, 8)
    : [];

  const addEntity = (entity: Entity) => {
    if (selected.length >= 5) return;
    setSelected((prev) => [...prev, entity]);
    setQuery("");
    inputRef.current?.focus();
  };
  const removeEntity = (wb: string) => setSelected((prev) => prev.filter((e) => e.wb !== wb));
  const toggleDim = (id: string) => setDims((p) => ({ ...p, [id]: { ...p[id], enabled: !p[id].enabled } }));
  const toggleExpand = (id: string) => setDims((p) => ({ ...p, [id]: { ...p[id], expanded: !p[id].expanded } }));
  const toggleIndicator = (dimId: string, indId: string) =>
    setDims((p) => ({ ...p, [dimId]: { ...p[dimId], indicators: { ...p[dimId].indicators, [indId]: !p[dimId].indicators[indId] } } }));

  useEffect(() => { setSelected([]); setQuery(""); }, [tipo]);

  const buildPayload = () => {
    const result: Record<string, { enabled: boolean; indicators: string[] }> = {};
    for (const dim of DIMENSIONS) {
      const state = dims[dim.id];
      if (state.enabled) {
        result[dim.id] = { enabled: true, indicators: Object.entries(state.indicators).filter(([, v]) => v).map(([k]) => k) };
      }
    }
    return result;
  };

  const enabledCount = DIMENSIONS.filter((d) => dims[d.id]?.enabled).length;
  const activeDims = DIMENSIONS.filter((d) => !d.onlyCountries || tipo === "pais");

  const handleSubmit = async () => {
    setError(null);
    if (selected.length < 2) { setError("Seleccioná al menos 2 países o regiones."); return; }
    if (enabledCount === 0) { setError("Activá al menos una dimensión."); return; }
    if (!canUse()) { setError("Alcanzaste el límite gratuito. Iniciá sesión para continuar."); return; }
    if (temporal && anioA >= anioB) { setError("El año inicial debe ser menor al año final."); return; }

    setLoading(true);
    const msgs = ["Consultando APIs de datos...", "Obteniendo indicadores del Banco Mundial...", "Procesando con IA...", "Generando el Excel..."];
    let idx = 0;
    setLoadingMsg(msgs[0]);
    const interval = setInterval(() => { idx = (idx + 1) % msgs.length; setLoadingMsg(msgs[idx]); }, 3500);

    try {
      const fn = httpsCallable(getFunctions(), "generateComparadorPaises");
      const result = await fn({ tipo, entidades: selected, dimensiones: buildPayload(), comparacionTemporal: temporal, anioA: temporal ? anioA : undefined, anioB: temporal ? anioB : undefined }) as { data: { base64: string; filename: string } };
      const { base64, filename } = result.data;
      const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      if (!user) localStorage.setItem(STORAGE_KEY, String(getUses() + 1));
      setDownloaded(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al generar el comparador.");
    } finally {
      clearInterval(interval); setLoading(false); setLoadingMsg("");
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ ...outerCardStyle, maxWidth: 760 }}>

        {/* ── Header con gradiente del tema ── */}
        <div style={{ background: theme.primaryGradient, padding: "20px 28px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", color: "white" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>🌍</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Comparador de Países y Regiones</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.9 }}>Tabla comparativa con datos reales + análisis IA en Excel</p>
            </div>
          </div>
          <button onClick={() => navigate("/")} style={closeBtnStyle}>✕</button>
        </div>

        {/* ── Body scrollable ── */}
        <div style={{ padding: "24px 28px", overflowY: "auto", maxHeight: "72vh" }}>

          {/* Freemium */}
          {!user && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-center gap-2" style={{ marginBottom: 20 }}>
              <span>⚡</span>
              <span>
                {usesLeft > 0 ? `Podés generar ${usesLeft} comparador${usesLeft !== 1 ? "es" : ""} más sin cuenta.` : "Límite gratuito alcanzado."}{" "}
                <button onClick={() => navigate("/login")} className="underline font-medium">Iniciá sesión</button>{" "}
                para acceso ilimitado.
              </span>
            </div>
          )}

          {/* ── Contenido — SIN CAMBIOS desde la versión que funciona ── */}

          {/* PASO 1 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4" style={{ marginBottom: 20 }}>
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">1. ¿Qué querés comparar?</h2>

            <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
              {(["pais", "region"] as const).map((t) => (
                <button key={t} onClick={() => setTipo(t)}
                  className={`px-5 py-2 text-sm font-medium transition-colors ${tipo === t ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  {t === "pais" ? "🏳️ Países" : "🗺️ Regiones"}
                </button>
              ))}
            </div>

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selected.map((e) => (
                  <span key={e.wb} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium">
                    {e.name}
                    <button onClick={() => removeEntity(e.wb)} className="hover:text-red-600 ml-1 font-bold text-base leading-none">×</button>
                  </span>
                ))}
              </div>
            )}

            {selected.length < 5 && (
              <div className="relative">
                <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Escribí para buscar un ${tipo === "pais" ? "país" : "región"}...`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button key={s.wb} onClick={() => addEntity(s)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors">
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400">Mínimo 2, máximo 5. {selected.length}/5 seleccionados.</p>
          </div>

          {/* PASO 2 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3" style={{ marginBottom: 20 }}>
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">2. Dimensiones a comparar</h2>
            <div className="space-y-2">
              {activeDims.map((dim) => {
                const state = dims[dim.id];
                return (
                  <div key={dim.id} className={`rounded-xl border-2 transition-colors ${state.enabled ? dim.activeClass : "border-gray-200 bg-gray-50"}`}>
                    <div className="flex items-center justify-between px-4 py-3">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input type="checkbox" checked={state.enabled} onChange={() => toggleDim(dim.id)} className="w-4 h-4 rounded" />
                        <div>
                          <span className="font-medium text-gray-800 text-sm">{dim.label}</span>
                          <span className="text-xs text-gray-500 ml-2">{dim.desc}</span>
                        </div>
                      </label>
                      {state.enabled && (
                        <button onClick={() => toggleExpand(dim.id)} className="text-xs text-gray-500 hover:text-gray-700 ml-2 whitespace-nowrap">
                          {state.expanded ? "▲ ocultar" : "▸ personalizar"}
                        </button>
                      )}
                    </div>
                    {state.enabled && state.expanded && (
                      <div className="px-4 pb-3 border-t border-gray-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dim.indicators.map((ind) => (
                          <label key={ind.id} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={state.indicators[ind.id] ?? ind.default} onChange={() => toggleIndicator(dim.id, ind.id)} className="w-3.5 h-3.5 rounded" />
                            <span className="text-xs text-gray-700">{ind.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PASO 3 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4" style={{ marginBottom: 20 }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                  3. Evolución temporal <span className="text-blue-600 font-bold text-xs ml-1">✨ Extra</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Agrega una hoja con datos históricos y escala de colores por año</p>
              </div>
              <button onClick={() => setTemporal(!temporal)}
                className={`relative w-11 h-6 rounded-full transition-colors ${temporal ? "bg-blue-600" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${temporal ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            {temporal && (
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año inicial</label>
                  <select value={anioA} onChange={(e) => setAnioA(Number(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {YEARS.filter((y) => y < anioB).map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <span className="text-gray-400 text-xl mb-2">→</span>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año final</label>
                  <select value={anioB} onChange={(e) => setAnioB(Number(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {YEARS.filter((y) => y > anioA).map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mb-2">{anioB - anioA} años de datos</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Loading */}
          {loading && (
            <div style={{ padding: "14px 18px", backgroundColor: "#fffbeb", borderRadius: 10, border: "1px solid #fbbf24", display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>⏳</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>{loadingMsg}</div>
                <div style={{ fontSize: 12, color: "#a16207", marginTop: 2 }}>Puede tardar 20–40 segundos. No cierres esta ventana.</div>
              </div>
            </div>
          )}

          {/* Success */}
          {downloaded && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">✅</div>
                <p className="font-semibold text-green-800">¡Comparador descargado!</p>
                <p className="text-sm text-green-700 mt-1">
                  El archivo .xlsx tiene {temporal ? "4" : "3"} hojas: Comparativa, Análisis IA,{temporal ? " Evolución Temporal," : ""} y Fuentes.
                </p>
                <button onClick={() => { setDownloaded(false); setSelected([]); }} className="mt-3 text-sm text-green-700 underline">
                  Generar otro comparador
                </button>
              </div>
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-5 text-white">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🚦</span>
                  <div>
                    <p className="font-bold text-lg leading-tight">¿Querés que tus alumnos trabajen con estos datos en clase?</p>
                    <p className="text-sm mt-2 text-yellow-100">Creá una actividad con el Juego del Semáforo para que debatan y comparen los países antes de la evaluación.</p>
                    <button onClick={() => navigate("/")} className="mt-4 bg-white text-orange-500 font-bold py-2 px-5 rounded-lg text-sm hover:bg-yellow-50 transition-colors">
                      Crear juego →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer con botones ── */}
        {!downloaded && (
          <div style={{ padding: "16px 28px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => navigate("/")} style={btnSecondary}>← Volver</button>
            <button
              onClick={handleSubmit}
              disabled={loading || selected.length < 2}
              style={{
                padding: "12px 24px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none",
                background: loading || selected.length < 2 ? "#94a3b8" : theme.primaryGradient,
                color: "white", cursor: loading || selected.length < 2 ? "not-allowed" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 8, minWidth: 240,
                opacity: loading || selected.length < 2 ? 0.7 : 1,
              }}
            >
              {loading ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>{loadingMsg}</> : <>📊 Generar comparador en Excel</>}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 20px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" };
const outerCardStyle: React.CSSProperties = { backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 760, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden", display: "flex", flexDirection: "column" };
const btnSecondary: React.CSSProperties = { padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#64748b", cursor: "pointer" };
const closeBtnStyle: React.CSSProperties = { background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 36, height: 36, borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };