// Ayudas de accesibilidad compartidas por las páginas del Árbitro de Aprendizaje.
//  - useDialogo: foco inicial, Tab atrapado dentro, cierre con Esc y devolución del foco.
//  - propsDialogo: atributos ARIA de un diálogo modal.
//  - fieldsetReset / legendReset: para agrupar botones de opción con <fieldset>/<legend>
//    sin cambiar el aspecto.
//  - srOnly: texto solo para lectores de pantalla.

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import "./arbitroA11y.css";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function enfocables(raiz: HTMLElement): HTMLElement[] {
  return Array.from(raiz.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    el => !el.hasAttribute("hidden") && el.getAttribute("aria-hidden") !== "true" && el.getClientRects().length > 0
  );
}

// Pila de diálogos abiertos: Esc y Tab solo los atiende el de arriba.
const pila: HTMLElement[] = [];

/**
 * Comportamiento de un diálogo modal. Devuelve la ref que va en el contenedor
 * con role="dialog". Al abrirse manda el foco al elemento con `data-autofocus`
 * (o al primer enfocable, o al propio diálogo); Tab y Shift+Tab no salen del
 * diálogo; Esc lo cierra; al cerrarse el foco vuelve a quien lo tenía.
 */
export function useDialogo<T extends HTMLElement = HTMLDivElement>(abierto: boolean, onCerrar: () => void) {
  const ref = useRef<T>(null);
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  useEffect(() => {
    if (!abierto) return;
    const el = ref.current;
    if (!el) return;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pila.push(el);

    const inicial = el.querySelector<HTMLElement>("[data-autofocus]") ?? enfocables(el)[0] ?? el;
    inicial.focus();

    const onKey = (e: KeyboardEvent) => {
      if (pila[pila.length - 1] !== el) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cerrarRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const lista = enfocables(el);
      if (lista.length === 0) {
        e.preventDefault();
        el.focus();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const activo = document.activeElement;
      if (e.shiftKey && (activo === primero || activo === el || !el.contains(activo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (activo === ultimo || !el.contains(activo))) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      const i = pila.indexOf(el);
      if (i >= 0) pila.splice(i, 1);
      if (previo && document.contains(previo)) {
        previo.focus();
      } else {
        // Quien abrió el diálogo ya no está (la pantalla cambió): el foco vuelve al
        // contenido principal para que la navegación siga desde arriba y no se pierda en <body>.
        const principal = document.querySelector<HTMLElement>("main");
        if (principal) {
          if (!principal.hasAttribute("tabindex")) principal.setAttribute("tabindex", "-1");
          principal.focus({ preventScroll: true });
        }
      }
    };
  }, [abierto]);

  return ref;
}

/** Atributos ARIA de un diálogo modal con título (y descripción opcional). */
export function propsDialogo(idTitulo: string, idDescripcion?: string) {
  return {
    role: "dialog" as const,
    "aria-modal": true as const,
    "aria-labelledby": idTitulo,
    ...(idDescripcion ? { "aria-describedby": idDescripcion } : {}),
    tabIndex: -1,
  };
}

/** <fieldset> sin borde ni márgenes del navegador (conserva el diseño de los grupos de botones). */
export const fieldsetReset: CSSProperties = { border: "none", padding: 0, margin: 0, minWidth: 0 };

/** <legend> sin relleno; el estilo visual se pone en un <span> interno. */
export const legendReset: CSSProperties = { padding: 0, display: "block", width: "100%" };

/** Texto solo para lectores de pantalla. */
export const srOnly: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

// ── Diálogo modal listo para usar ───────────────────────────────────────────
// Capa oscura + panel con role="dialog", aria-modal, título enlazado, foco
// inicial, Tab atrapado y cierre con Esc. Se monta solo mientras está abierto.
interface ModalDialogoProps {
  /** Se llama con Esc y al hacer clic en la capa oscura. */
  onCerrar: () => void;
  /** id del elemento que contiene el título (lo enlaza aria-labelledby). */
  idTitulo: string;
  idDescripcion?: string;
  /** Opacidad de la capa oscura (por defecto 0,5). */
  velo?: number;
  panelStyle?: CSSProperties;
  children: React.ReactNode;
}

export function ModalDialogo({ onCerrar, idTitulo, idDescripcion, velo = 0.5, panelStyle, children }: ModalDialogoProps) {
  const ref = useDialogo<HTMLDivElement>(true, onCerrar);
  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: `rgba(0,0,0,${velo})`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20 }}
      onClick={onCerrar}>
      <div
        ref={ref}
        {...propsDialogo(idTitulo, idDescripcion)}
        style={{ backgroundColor: "white", borderRadius: 20, maxWidth: 440, width: "100%", maxHeight: "calc(100vh - 40px)", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", outline: "none", ...panelStyle }}
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ── Diálogo que ocupa la página (sin capa oscura) ───────────────────────────
// Para avisos que reemplazan la pantalla, como «Hay una partida en curso»:
// mismo comportamiento que ModalDialogo (foco inicial, Tab atrapado, Esc)
// pero conserva el diseño de tarjeta sobre el fondo de la página.
interface DialogoEnPaginaProps {
  onCerrar: () => void;
  idTitulo: string;
  idDescripcion?: string;
  style?: CSSProperties;
  /** Atributos extra del contenedor (por ejemplo data-noprint). */
  extra?: Record<string, string | boolean>;
  children: React.ReactNode;
}

export function DialogoEnPagina({ onCerrar, idTitulo, idDescripcion, style, extra, children }: DialogoEnPaginaProps) {
  const ref = useDialogo<HTMLDivElement>(true, onCerrar);
  return (
    <div ref={ref} {...propsDialogo(idTitulo, idDescripcion)} {...extra} style={{ outline: "none", ...style }}>
      {children}
    </div>
  );
}
