import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../i18n";
import { useGameMode } from "../contexts/GameModeContext";

const EQ_TYPES = [
  {
    id: "lineal", emoji: "📈", label: "Lineal", formula: "y = mx + b", nivel: "Secundaria",
    params: [
      { id: "a", symbol: "m", label: "Pendiente (m)", default: 2, step: 0.5 },
      { id: "b", symbol: "b", label: "Ordenada al origen (b)", default: 1, step: 0.5 },
    ],
    range: { xInicio: -5, xFin: 5, paso: 1 },
  },
  {
    id: "cuadratica", emoji: "⛰️", label: "Cuadrática", formula: "y = ax² + bx + c", nivel: "Secundaria",
    params: [
      { id: "a", symbol: "a", label: "Coef. cuadrático (a)", default: 1, step: 0.5 },
      { id: "b", symbol: "b", label: "Coef. lineal (b)", default: 0, step: 0.5 },
      { id: "c", symbol: "c", label: "Término independiente (c)", default: 0, step: 0.5 },
    ],
    range: { xInicio: -5, xFin: 5, paso: 0.5 },
  },
  {
    id: "exponencial", emoji: "🚀", label: "Exponencial", formula: "y = a · bˣ", nivel: "Sec. / Superior",
    params: [
      { id: "a", symbol: "a", label: "Coeficiente (a)", default: 1, step: 0.5 },
      { id: "b", symbol: "b", label: "Base (b > 0)", default: 2, step: 0.5 },
    ],
    range: { xInicio: -3, xFin: 5, paso: 0.5 },
  },
  {
    id: "seno", emoji: "〰️", label: "Seno", formula: "y = a · sen(bx+c)", nivel: "Sec. / Superior",
    params: [
      { id: "a", symbol: "a", label: "Amplitud (a)", default: 1, step: 0.5 },
      { id: "b", symbol: "b", label: "Frecuencia (b)", default: 1, step: 0.25 },
      { id: "c", symbol: "c", label: "Fase (c, rad)", default: 0, step: 0.5 },
    ],
    range: { xInicio: -6.28, xFin: 6.28, paso: 0.2 },
  },
  {
    id: "coseno", emoji: "🌊", label: "Coseno", formula: "y = a · cos(bx+c)", nivel: "Sec. / Superior",
    params: [
      { id: "a", symbol: "a", label: "Amplitud (a)", default: 1, step: 0.5 },
      { id: "b", symbol: "b", label: "Frecuencia (b)", default: 1, step: 0.25 },
      { id: "c", symbol: "c", label: "Fase (c, rad)", default: 0, step: 0.5 },
    ],
    range: { xInicio: -6.28, xFin: 6.28, paso: 0.2 },
  },
  {
    id: "logaritmica", emoji: "📐", label: "Logarítmica", formula: "y = a · ln(bx)", nivel: "Superior",
    params: [
      { id: "a", symbol: "a", label: "Coeficiente (a)", default: 1, step: 0.5 },
      { id: "b", symbol: "b", label: "Coeficiente (b > 0)", default: 1, step: 0.5 },
    ],
    range: { xInicio: 0.5, xFin: 10, paso: 0.5 },
  },
  {
    id: "potencial", emoji: "⚡", label: "Potencial", formula: "y = a · xⁿ", nivel: "Sec. / Superior",
    params: [
      { id: "a", symbol: "a", label: "Coeficiente (a)", default: 1, step: 0.5 },
      { id: "b", symbol: "n", label: "Exponente (n)", default: 2, step: 1 },
    ],
    range: { xInicio: -5, xFin: 5, paso: 0.5 },
  },
];

const STORAGE_KEY = "ecuaciones_uses";
const FREE_LIMIT = 2;

function countPoints(xInicio: number, xFin: number, paso: number): number {
  if (paso <= 0 || xFin <= xInicio) return 0;
  return Math.min(500, Math.floor((xFin - xInicio) / paso) + 1);
}

export default function EcuacionesGeneratorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useI18n();
  const { getLocalizedTheme } = useGameMode();
  const theme = getLocalizedTheme(language);

  const [selectedType, setSelectedType] = useState(EQ_TYPES[1]);
  const [params, setParams] = useState<Record<string, number>>(
    Object.fromEntries(EQ_TYPES[1].params.map((p) => [p.id, p.default]))
  );
  const [range, setRange] = useState(EQ_TYPES[1].range);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const getUses = () => parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  const canUse = () => user || getUses() < FREE_LIMIT;
  const usesLeft = FREE_LIMIT - getUses();

  const selectType = (eq: typeof EQ_TYPES[0]) => {
    setSelectedType(eq);
    setParams(Object.fromEntries(eq.params.map((p) => [p.id, p.default])));
    setRange(eq.range);
    setError(null);
    setDownloaded(false);
  };

  const nPuntos = countPoints(range.xInicio, range.xFin, range.paso);

  const handleSubmit = async () => {
    setError(null);
    if (!canUse()) { setError("Alcanzaste el límite gratuito. Iniciá sesión para continuar."); return; }
    if (range.paso <= 0) { setError("El paso debe ser mayor a 0."); return; }
    if (range.xFin <= range.xInicio) { setError("El valor final de x debe ser mayor al inicial."); return; }
    if (nPuntos < 2) { setError("El rango y paso configurados generan menos de 2 puntos."); return; }
    if ((selectedType.id === "exponencial" || selectedType.id === "logaritmica") && params.b <= 0) {
      setError("El parámetro b debe ser mayor a 0 para este tipo de ecuación."); return;
    }
    setLoading(true);
    try {
      const fn = httpsCallable(getFunctions(), "generateEcuaciones");
      const result = await fn({ tipo: selectedType.id, params, range }) as { data: { base64: string; filename: string } };
      const { base64, filename } = result.data;
      const blob = new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      if (!user) localStorage.setItem(STORAGE_KEY, String(getUses() + 1));
      setDownloaded(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al generar el archivo.");
    } finally {
      setLoading(false);
    }
  };

  const pointsFeedback = () => {
    if (nPuntos >= 10 && nPuntos <= 500) return { cls: "bg-green-50 text-green-700", msg: `✅ Se generarán ${nPuntos} puntos en la tabla.` };
    if (nPuntos > 500) return { cls: "bg-amber-50 text-amber-700", msg: `⚠️ Demasiados puntos. Se limitará a 500. Aumentá el paso.` };
    return { cls: "bg-red-50 text-red-700", msg: "❌ Rango insuficiente. Revisá inicio, fin y paso." };
  };
  const fb = pointsFeedback();

  return (
    <div style={pageStyle}>
      <div style={{ ...outerCardStyle, maxWidth: 720 }}>

        {/* ── Header con gradiente del tema ── */}
        <div style={{ background: theme.primaryGradient, padding: "20px 28px", borderRadius: "20px 20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", color: "white" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>📊</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Generador de Ecuaciones en Excel</h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.9 }}>Tabla de valores con parámetros editables — cambiá los valores y todo se actualiza</p>
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
                {usesLeft > 0 ? `Podés generar ${usesLeft} archivo${usesLeft !== 1 ? "s" : ""} más sin cuenta.` : "Límite gratuito alcanzado."}{" "}
                <button onClick={() => navigate("/login")} className="underline font-medium">Iniciá sesión</button>{" "}
                para acceso ilimitado.
              </span>
            </div>
          )}

          {/* ── Contenido — SIN CAMBIOS desde la versión que funciona ── */}

          {/* PASO 1 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4" style={{ marginBottom: 20 }}>
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">1. Tipo de ecuación</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EQ_TYPES.map((eq) => (
                <button key={eq.id} onClick={() => selectType(eq)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${selectedType.id === eq.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                  <div className="text-xl mb-1">{eq.emoji}</div>
                  <div className="font-semibold text-gray-800 text-xs">{eq.label}</div>
                  <div className="text-gray-500 text-xs mt-0.5 font-mono">{eq.formula}</div>
                  <div className="mt-1.5 inline-block bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded">{eq.nivel}</div>
                </button>
              ))}
            </div>
          </div>

          {/* PASO 2 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4" style={{ marginBottom: 20 }}>
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">2. Parámetros iniciales</h2>
            <p className="text-xs text-gray-500 -mt-2">
              Se cargan como celdas editables en el Excel — modificalos directamente en el archivo y la tabla se recalcula sola.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {selectedType.params.map((p) => (
                <div key={p.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="font-mono text-blue-600 font-bold text-base">{p.symbol}</span>{" "}
                    <span className="text-gray-500 font-normal text-xs">({p.label.replace(/\(.+\)/, "").trim()})</span>
                  </label>
                  <input type="number" value={params[p.id]} step={p.step}
                    onChange={(e) => setParams((prev) => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
          </div>

          {/* PASO 3 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4" style={{ marginBottom: 20 }}>
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">3. Rango de valores de x</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "x inicial", val: range.xInicio, key: "xInicio" },
                { label: "x final", val: range.xFin, key: "xFin" },
                { label: "Paso", val: range.paso, key: "paso" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input type="number" value={f.val} step={0.5} min={f.key === "paso" ? 0.01 : undefined}
                    onChange={(e) => setRange((r) => ({ ...r, [f.key]: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className={`text-sm px-3 py-2 rounded-lg ${fb.cls}`}>{fb.msg}</div>
          </div>

          {/* Error */}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Loading */}
          {loading && (
            <div style={{ padding: "14px 18px", backgroundColor: "#fffbeb", borderRadius: 10, border: "1px solid #fbbf24", display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>⏳</span>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>Generando Excel…</div>
            </div>
          )}

          {/* Success */}
          {downloaded && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="text-2xl text-center mb-2">✅</div>
                <p className="font-semibold text-green-800 text-center">¡Excel descargado!</p>
                <div className="mt-3 text-sm text-green-700 space-y-1">
                  <p><strong>Para crear el gráfico:</strong> seleccioná las columnas x e y → Insertar → Dispersión con líneas suaves.</p>
                  <p><strong>Para editar parámetros:</strong> modificá las celdas amarillas y la tabla se recalcula automáticamente.</p>
                </div>
                <div className="text-center">
                  <button onClick={() => setDownloaded(false)} className="mt-3 text-sm text-green-700 underline">
                    Generar otra ecuación
                  </button>
                </div>
              </div>
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-5 text-white">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🚦</span>
                  <div>
                    <p className="font-bold text-lg leading-tight">¿Querés que tus alumnos trabajen con estas ecuaciones en clase?</p>
                    <p className="text-sm mt-2 text-yellow-100">Creá una actividad con el Juego del Semáforo para que analicen y debatan los conceptos matemáticos antes de la evaluación.</p>
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
              disabled={loading || nPuntos < 2}
              style={{
                padding: "12px 24px", fontSize: 14, fontWeight: 700, borderRadius: 10, border: "none",
                background: loading || nPuntos < 2 ? "#94a3b8" : theme.primaryGradient,
                color: "white", cursor: loading || nPuntos < 2 ? "not-allowed" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 8, minWidth: 240,
                opacity: loading || nPuntos < 2 ? 0.7 : 1,
              }}
            >
              {loading ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>Generando…</> : <>📊 Generar Excel con tabla de valores</>}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 20px", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" };
const outerCardStyle: React.CSSProperties = { backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 720, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden", display: "flex", flexDirection: "column" };
const btnSecondary: React.CSSProperties = { padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 10, border: "2px solid #e2e8f0", backgroundColor: "white", color: "#64748b", cursor: "pointer" };
const closeBtnStyle: React.CSSProperties = { background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 36, height: 36, borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };