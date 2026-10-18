// src/pages/ArbitrosPublicaPage.tsx
// Portada pública de los Árbitros de Aprendizaje (/arbitros): no pide sesión. Entrada para el jurado y para quien
// llega por primera vez. Las áreas salen del catálogo común (utils/arbitroAreas) y se muestran con nombreVisible.
import { Link } from "react-router-dom";
import { useI18n, useArbitroT, useTituloPagina, LanguageSelector, IDIOMAS_ARBITRO } from "../i18n";
import { es } from "../i18n/es";
import { en } from "../i18n/en";
import { nombreVisible } from "../utils/arbitroNombres";
import { AREAS_ORDEN, AREA_EMOJI, AREA_LABELS_ES } from "../utils/arbitroAreas";
import { AREA_COLORS, PALETA } from "../utils/arbitroPalette";
import { pasosArbitro } from "../utils/arbitroPasos";
import { ARBITROS_VIDEO, ARBITROS_FORM_URL } from "../config/arbitrosVideo";

const FUENTE = "'Segoe UI', system-ui, -apple-system, sans-serif";
const AZUL = "#0369a1";

// Botón destacado hacia el formulario de la prueba piloto (pestaña nueva). El texto visible es el nombre accesible;
// «se abre en una pestaña nueva» se agrega solo para lectores de pantalla.
function BotonProbar({ ta, variante }: { ta: { pubTryClass: string; pubNewTab: string }; variante: "hero" | "pie" }) {
  const hero = variante === "hero";
  return (
    <a href={ARBITROS_FORM_URL} target="_blank" rel="noopener noreferrer" className="arb-pub-btn"
      style={{
        position: "relative", padding: hero ? "14px 30px" : "14px 32px", fontSize: 16, fontWeight: 800, borderRadius: 14, textDecoration: "none", display: "inline-block",
        ...(hero
          ? { backgroundColor: "#fde047", color: "#1e293b", boxShadow: "0 6px 20px rgba(0,0,0,0.2)" }
          : { backgroundColor: "#0369a1", color: "white", boxShadow: "0 6px 20px rgba(3,105,161,0.3)" }),
      }}>
      {ta.pubTryClass}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}> {ta.pubNewTab}</span>
    </a>
  );
}

export default function ArbitrosPublicaPage() {
  const ta = useArbitroT();
  const { language } = useI18n();
  // Mismo criterio que el resto del árbitro: solo hay textos en español e inglés (el portugués cae en español).
  const dash = (language === "en" ? en : es).dashboard;
  useTituloPagina(`${ta.infTitle} — ${ta.pageTitleSuffix}`);

  const hayVideo = ARBITROS_VIDEO.mostrar;
  const pasos = pasosArbitro(ta);
  // Enlace de respaldo «Ver en YouTube» (por si el navegador o una extensión bloquea el video incrustado)
  const idVideo = /\/embed\/([\w-]+)/.exec(ARBITROS_VIDEO.url)?.[1];
  const enlaceYoutube = idVideo ? `https://www.youtube.com/watch?v=${idVideo}` : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: FUENTE, color: "#1e293b" }}>
      <style>{`
        .arb-pub-card { transition: transform .2s, box-shadow .2s; }
        .arb-pub-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(15,23,42,.12) !important; }
        .arb-pub-card:focus-visible, .arb-pub-btn:focus-visible, .arb-pub-link:focus-visible { outline: 3px solid #0369a1; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .arb-pub-card { transition: none; } .arb-pub-card:hover { transform: none; } }
      `}</style>

      {/* Encabezado liviano: marca, selector es/en e ingreso discreto */}
      <header style={{ background: "white", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Link to="/arbitros" className="arb-pub-link" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#1e293b", fontWeight: 800, fontSize: 16 }}>
            <span aria-hidden="true" style={{ fontSize: 24 }}>⚖️</span>
            {ta.infTitle}
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <LanguageSelector compact tone="onLight" idiomas={IDIOMAS_ARBITRO} />
            <Link to="/login" className="arb-pub-link" style={{ color: AZUL, fontSize: 14, fontWeight: 600, textDecoration: "underline", padding: "8px 4px" }}>
              {ta.pubLogin}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Presentación del concepto y llamado principal */}
        <section style={{ background: "linear-gradient(135deg, #0369a1 0%, #0f766e 100%)", color: "white", textAlign: "center", padding: "56px 24px 64px" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <h1 style={{ margin: "0 0 14px", fontSize: 34, fontWeight: 900, lineHeight: 1.15 }}>{ta.infTitle}</h1>
            <p style={{ margin: "0 auto", fontSize: 17, lineHeight: 1.65, maxWidth: 600 }}>{ta.infIntro}</p>
            <div style={{ marginTop: 30, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href={hayVideo ? "#demo" : "#como-funciona"} className="arb-pub-btn"
                style={{ padding: "14px 30px", fontSize: 16, fontWeight: 800, borderRadius: 14, backgroundColor: "white", color: AZUL, textDecoration: "none", boxShadow: "0 6px 20px rgba(0,0,0,0.15)" }}>
                {hayVideo ? ta.pubDemoCta : ta.pubHowCta}
              </a>
              <Link to="/arbitro-config" className="arb-pub-btn"
                style={{ padding: "13px 26px", fontSize: 15, fontWeight: 700, borderRadius: 14, border: "2px solid rgba(255,255,255,0.85)", color: "white", textDecoration: "none" }}>
                {ta.landConfigure}
              </Link>
            </div>
            <div style={{ marginTop: 16 }}>
              <BotonProbar ta={ta} variante="hero" />
            </div>
          </div>
        </section>

        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px" }}>

          {/* Video de demostración (si no hay video todavía, queda un espacio reservado) */}
          {hayVideo && (
            <section id="demo" aria-labelledby="pub-demo-h" style={{ padding: "48px 0 8px" }}>
              <h2 id="pub-demo-h" style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 800, textAlign: "center" }}>{ta.pubDemoTitle}</h2>
              <div style={{ maxWidth: 760, margin: "0 auto" }}>
                {ARBITROS_VIDEO.url ? (
                  <div style={{ position: "relative", aspectRatio: "16 / 9", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 28px rgba(15,23,42,0.18)", background: "#0f172a" }}>
                    <iframe src={ARBITROS_VIDEO.url} title={ta.pubVideoFrameTitle} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
                  </div>
                ) : (
                  <div style={{ aspectRatio: "16 / 9", borderRadius: 16, background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center", boxShadow: "0 8px 28px rgba(15,23,42,0.18)" }}>
                    <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>▶</span>
                    <strong style={{ fontSize: 18 }}>{ta.pubDemoSoonTitle}</strong>
                    <span style={{ fontSize: 14, maxWidth: 420, lineHeight: 1.5 }}>{ta.pubDemoSoonText}</span>
                  </div>
                )}
                {enlaceYoutube && (
                  <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 14 }}>
                    <a href={enlaceYoutube} target="_blank" rel="noopener noreferrer" className="arb-pub-link" style={{ color: AZUL, fontWeight: 600, textDecoration: "underline", padding: "6px 4px" }}>
                      {ta.pubVideoYoutube}
                    </a>
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Cómo funciona */}
          <section id="como-funciona" aria-labelledby="pub-how-h" style={{ padding: "48px 0 8px" }}>
            <h2 id="pub-how-h" style={{ margin: "0 0 18px", fontSize: 22, fontWeight: 800, textAlign: "center" }}>{ta.pubHowTitle}</h2>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 14 }}>
              {pasos.map((p) => (
                <li key={p.n} style={{ background: "white", borderRadius: 14, padding: "16px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#e0f2fe", color: AZUL, fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{p.n}</span>
                  <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.55 }}>{p.txt}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Un árbitro por área: mismo catálogo y diccionarios que la portada del docente */}
          <section aria-labelledby="pub-areas-h" style={{ padding: "48px 0 8px" }}>
            <h2 id="pub-areas-h" style={{ margin: "0 0 18px", fontSize: 22, fontWeight: 800, textAlign: "center" }}>{ta.infPerArea}</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
              {AREAS_ORDEN.map((key) => {
                const c = AREA_COLORS[key];
                return (
                  <li key={key} style={{ display: "flex" }}>
                    <Link to={`/arbitro-config?area=${key}`} className="arb-pub-card"
                      style={{ flex: 1, padding: 20, borderRadius: 16, background: "white", boxShadow: "0 3px 12px rgba(0,0,0,0.06)", textDecoration: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                      <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 12, background: c.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{AREA_EMOJI[key]}</span>
                      <span>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4, lineHeight: 1.3 }}>{nombreVisible(ta.areaNames, AREA_LABELS_ES[key])}</span>
                        <span style={{ display: "block", fontSize: 12, color: PALETA.grisOscuro, lineHeight: 1.45 }}>{dash.arbAreaDescs[key]}</span>
                      </span>
                      <span style={{ marginTop: "auto", fontSize: 13, fontWeight: 700, color: c.primary }}>{dash.configureSession}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "40px 24px 48px", fontSize: 13, color: PALETA.grisOscuro }}>
        <div style={{ marginBottom: 24 }}>
          <BotonProbar ta={ta} variante="pie" />
        </div>
        <p style={{ margin: "0 0 8px" }}>{ta.infFreeNoReg}</p>
        <Link to="/arbitros-info" className="arb-pub-link" style={{ color: AZUL, fontWeight: 600, textDecoration: "underline", padding: "6px 4px" }}>{ta.pubMoreInfo}</Link>
      </footer>
    </div>
  );
}
