// src/pages/ArbitroIngresoPage.tsx
//
// Ingreso de alumnos al Árbitro de Aprendizaje: una sola pantalla servida tanto en
// /alumnos (eljuegodelsemaforo.com) como en /students (thetrafficlightgame.com) — mismo
// build, mismo componente; el idioma sale del dominio (ver esRutaArbitro/useArbitroT).
//
// Un campo grande para el código + un botón. No se muestra nada de la sesión (materia,
// tema, docente) antes de entrar: getSesionArbitro se usa solo para validar que el código
// exista y no haya expirado, y el resultado se descarta — la pantalla /arbitro-juego/:id
// es la que carga y muestra la sesión de verdad.
//
// El código se normaliza en el cliente (mayúsculas, sin espacios ni guiones) antes de
// llamar al servidor y antes de armar la URL de destino — ver normalizarCodigoSesion.
// getSesionArbitro no normaliza nada por su cuenta.
//
// Tres mensajes de error bien distintos (nunca el mismo "no existe" para los tres), con
// redacción propia de esta pantalla — no el errorMotivo_sesion_* genérico (ese habla de un
// link; acá el alumno tipeó un código, así que el texto habla de código):
//  - Código inexistente  → ingErrorNoEncontrada
//  - Sesión expirada     → ingErrorExpirada
//  - Error de red/servidor inalcanzable (sin motivo del servidor) → ingErrorConexion
// La distinción la hace textoErrorArbitroConReemplazos: solo cae en el respaldo
// (ingErrorConexion) cuando el error no trae motivo, que es exactamente lo que pasa si
// nunca se pudo contactar al servidor.
import { useState, type FormEvent } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useNavigate } from "react-router-dom";
import { app } from "../firebase.config";
import { useArbitroT, useTituloPagina } from "../i18n";
import { normalizarCodigoSesion } from "../utils/arbitroCodigo";
import { textoErrorArbitroConReemplazos } from "../utils/arbitroErrores";
import { useFondoDocumento } from "../utils/useFondoDocumento";
import { PALETA } from "../utils/arbitroPalette";

const GRADIENTE = "linear-gradient(135deg, #1e3a5f 0%, #3730a3 100%)";

export default function ArbitroIngresoPage() {
  const t = useArbitroT();
  useTituloPagina(`${t.ingTitle} — ${t.pageTitleSuffix}`);
  useFondoDocumento(GRADIENTE);
  const navigate = useNavigate();

  const [codigo, setCodigo] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canonico = normalizarCodigoSesion(codigo);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canonico || verificando) return;
    setVerificando(true);
    setError(null);
    try {
      const fn = httpsCallable(getFunctions(app), "getSesionArbitro");
      await fn({ sessionId: canonico }); // solo valida: el contenido lo carga /arbitro-juego
      navigate(`/arbitro-juego/${canonico}`);
      return; // no apagar "verificando": la pantalla cambia de ruta igual
    } catch (err: any) {
      // Mensajes propios de esta pantalla para "no existe"/"expiró" (nunca el errorMotivo_sesion_*
      // genérico, pensado para quien llegó por un link, no por haber tipeado un código) — ver
      // textoErrorArbitroConReemplazos. El de red queda igual: cae ahí solo cuando no hay motivo.
      setError(textoErrorArbitroConReemplazos(
        err, t,
        { sesion_no_encontrada: t.ingErrorNoEncontrada, sesion_expirada: t.ingErrorExpirada },
        t.ingErrorConexion
      ));
    }
    setVerificando(false);
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ backgroundColor: "white", borderRadius: 20, width: "100%", maxWidth: 420, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", overflow: "hidden" }}>

        <div style={{ background: GRADIENTE, padding: "28px 28px 24px", color: "white", textAlign: "center" }}>
          <div aria-hidden="true" style={{ fontSize: 34, marginBottom: 8 }}>⚖️</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>{t.ingTitle}</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.85 }}>{t.ingHint}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "28px" }} noValidate>
          <label htmlFor="codigo-sesion" style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 700, color: PALETA.grisOscuro }}>
            {t.ingLabel}
          </label>
          <input
            id="codigo-sesion"
            name="codigo-sesion"
            type="text"
            inputMode="text"
            value={codigo}
            onChange={e => { setCodigo(e.target.value); if (error) setError(null); }}
            placeholder={t.ingPlaceholder}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            disabled={verificando}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "codigo-sesion-error" : undefined}
            style={{
              width: "100%", padding: "16px 14px", fontSize: 24, fontWeight: 800, letterSpacing: "3px",
              textAlign: "center", textTransform: "uppercase", borderRadius: 12,
              border: `2px solid ${error ? PALETA.rojo : "#e2e8f0"}`,
              backgroundColor: verificando ? "#f1f5f9" : "#f8fafc", color: PALETA.texto,
              boxSizing: "border-box" as const, marginBottom: 14,
            }}
          />

          {error && (
            <div id="codigo-sesion-error" role="alert" style={{ padding: "10px 14px", backgroundColor: "#fef2f2", borderRadius: 8, fontSize: 13, color: PALETA.rojo, border: "1px solid #fecaca", marginBottom: 14, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={verificando || !canonico}
            style={{
              width: "100%", minHeight: 48, padding: "14px", fontSize: 16, fontWeight: 800, borderRadius: 12, border: "none",
              background: verificando || !canonico ? PALETA.gris : GRADIENTE,
              color: "white",
              cursor: verificando || !canonico ? "not-allowed" : "pointer",
              opacity: verificando || !canonico ? 0.7 : 1,
            }}
          >
            {verificando ? t.ingVerificando : t.ingSubmit}
          </button>
        </form>
      </div>
    </main>
  );
}
