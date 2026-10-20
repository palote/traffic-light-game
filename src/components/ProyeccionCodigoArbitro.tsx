// src/components/ProyeccionCodigoArbitro.tsx
//
// "Proyectar código": overlay a pantalla completa pensado para conectar la compu del
// docente a un proyector. Muestra la dirección a la que tienen que entrar los alumnos
// y el código de sesión bien grandes (visibles desde el fondo del aula), más un QR que
// entra directo al juego. La dirección y el destino del QR dependen del idioma de la
// SESIÓN (no del idioma de la pantalla del docente) — ver proyeccionCodigo.
//
// No es un ModalDialogo (esos quedan acotados a un panel blanco de ancho máximo): acá el
// contenido tiene que ocupar TODA la pantalla, así que arma el diálogo a mano con
// useDialogo/propsDialogo (foco atrapado, cierre con Esc) y le suma un pedido de pantalla
// completa real al navegador (Fullscreen API) al abrirse, deshecho al cerrarse. Si el
// navegador lo rechaza (política del sitio, dispositivo sin soporte), el overlay sigue
// funcionando igual — el pedido de fullscreen es una mejora, no un requisito.
//
// Se usa tanto recién creada la sesión (ArbitroConfigPage) como desde cualquier fila
// del historial (ArbitroPanelPage), por eso solo pide el código y el idioma, nada más.
import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useArbitroT } from "../i18n";
import { useDialogo, propsDialogo } from "../utils/arbitroA11y";
import { PALETA } from "../utils/arbitroPalette";
import { proyeccionCodigo } from "../utils/arbitroProyeccion";

interface ProyeccionCodigoArbitroProps {
  codigo: string;
  idioma?: string;
  /** Color de acento (el del área de la sesión); por defecto el azul/violeta genérico. */
  colorPrimario?: string;
  onCerrar: () => void;
}

export default function ProyeccionCodigoArbitro({ codigo, idioma, colorPrimario, onCerrar }: ProyeccionCodigoArbitroProps) {
  const t = useArbitroT();
  const ref = useDialogo<HTMLDivElement>(true, onCerrar);
  const { direccionVisible, urlJuego } = proyeccionCodigo(idioma, codigo);
  const acento = colorPrimario || "#3730a3";
  // Espacio visual a la mitad del código (el valor real no cambia: no es parte del código).
  const codigoLegible = codigo.length > 3
    ? `${codigo.slice(0, Math.ceil(codigo.length / 2))} ${codigo.slice(Math.ceil(codigo.length / 2))}`
    : codigo;

  // Pantalla completa real al abrir; se deshace sola al cerrar (solo si la pidió esta
  // pantalla: si el docente ya estaba en fullscreen por su cuenta, no se lo saca).
  useEffect(() => {
    let laPidioEsto = false;
    const el = ref.current;
    if (el && !document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().then(() => { laPidioEsto = true; }).catch(() => { /* el navegador no lo permite: sigue como overlay */ });
    }
    return () => {
      if (laPidioEsto && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      {...propsDialogo("proy-titulo")}
      style={{
        position: "fixed", inset: 0, zIndex: 10000, backgroundColor: "white", outline: "none",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "3vh 4vw", fontFamily: "'Segoe UI', system-ui, sans-serif", textAlign: "center" as const,
      }}
    >
      <button onClick={onCerrar} aria-label={t.proyClose}
        style={{
          position: "absolute", top: "2vh", right: "2vw", padding: "10px 18px", borderRadius: 10, border: "none",
          backgroundColor: "#f1f5f9", color: PALETA.grisOscuro, fontSize: "clamp(14px, 1.8vh, 20px)", fontWeight: 700, cursor: "pointer",
        }}>
        ✕ {t.proyClose}
      </button>

      <h2 id="proy-titulo" style={{ margin: "0 0 1vh", fontSize: "clamp(14px, 2vh, 24px)", fontWeight: 700, color: PALETA.grisOscuro, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {t.proyAddressLabel}
      </h2>
      <div style={{ fontSize: "clamp(28px, 6vh, 90px)", fontWeight: 800, color: PALETA.texto, marginBottom: "2vh", wordBreak: "break-word" as const, lineHeight: 1.2, maxWidth: "92vw" }}>
        {direccionVisible}
      </div>

      <div style={{ fontSize: "clamp(14px, 2vh, 24px)", fontWeight: 700, color: PALETA.grisOscuro, marginBottom: "0.5vh", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {t.proyCodeLabel}
      </div>
      <div style={{
        // min(25vh, 14vw): en 16:9 manda el alto (25vh), igual que antes; en 4:3 (más angosto
        // en relación al alto) manda el ancho (14vw), para que el código no se corte ni haga
        // overflow en un proyector 4:3 — whiteSpace nowrap porque el código nunca debe partirse
        // en dos líneas (perdería el espacio visual a la mitad, codigoLegible, que es cosmético).
        fontSize: "clamp(64px, min(25vh, 14vw), 420px)", fontWeight: 900, letterSpacing: "0.07em", color: acento,
        lineHeight: 1, marginBottom: "3vh", whiteSpace: "nowrap" as const,
      }}>
        {codigoLegible}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5vh" }}>
        <div style={{
          width: "clamp(160px, 33vh, 620px)", height: "clamp(160px, 33vh, 620px)", padding: "2%",
          backgroundColor: "white", borderRadius: 16, border: "1px solid #e2e8f0", boxSizing: "border-box" as const,
        }}>
          <QRCodeSVG value={urlJuego} size={512} level="M" style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ fontSize: "clamp(16px, 2.4vh, 32px)", color: PALETA.gris }}>{t.proyQrHint}</div>
      </div>

      <p style={{ marginTop: "3vh", fontSize: "clamp(18px, 3vh, 36px)", color: PALETA.gris, lineHeight: 1.5, maxWidth: "90vw" }}>
        {t.proyHint}
      </p>
    </div>
  );
}
