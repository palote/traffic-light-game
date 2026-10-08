// src/components/PWAMiniBadge.tsx
// VERSIÓN MEJORADA - Se conecta con el banner de instalación

import { useState, useEffect } from 'react';
import './PWAMiniBadge.css';
import { almacenLocal } from "../utils/almacenSeguro";
import { useArbitroT } from "../i18n";

interface PWAMiniBadgeProps {
  onInstallClick?: () => void;  // Callback para disparar instalación
}

export const PWAMiniBadge = ({ onInstallClick }: PWAMiniBadgeProps) => {
  const ta = useArbitroT();
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    // Solo mostrar si NO está instalada
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    if (isInstalled) return;

    // Verificar si ya se cerró recientemente
    const dismissed = almacenLocal.getItem('pwa-mini-badge-dismissed');
    if (dismissed && Date.now() < parseInt(dismissed)) {
      return; // No mostrar si fue cerrado hace menos de 7 días
    }

    // Detectar plataforma
    const ua = navigator.userAgent;
    if (/Android/.test(ua)) setPlatform('Android');
    else if (/iPad|iPhone|iPod/.test(ua)) setPlatform('iOS');
    else if (/Windows|Mac|Linux/.test(ua)) setPlatform('Desktop');

    // Mostrar después de 2 segundos
    const timer = setTimeout(() => setShow(true), 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Mientras el aviso está abajo, el navegador deja ese espacio libre al llevar un
  // elemento enfocado a la vista (así el aviso no tapa lo que se está usando con teclado).
  useEffect(() => {
    if (!show) return;
    const raiz = document.documentElement;
    const antes = raiz.style.scrollPaddingBottom;
    raiz.style.scrollPaddingBottom = '64px';
    return () => { raiz.style.scrollPaddingBottom = antes; };
  }, [show]);

  const handleClick = () => {
    // Si hay callback, usarlo (para disparar el banner de instalación)
    if (onInstallClick) {
      onInstallClick();
    }
  };

  const handleClose = () => {
    setShow(false);
    
    // Recordar que se cerró (por 7 días)
    const hideUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
    almacenLocal.setItem('pwa-mini-badge-dismissed', hideUntil.toString());
  };

  if (!show) return null;

  // Dos botones hermanos dentro de un contenedor (antes era un botón dentro de un
  // botón, que los lectores de pantalla no manejan bien). El nombre accesible del
  // botón de instalar es su propio texto visible, así que lo contiene por definición.
  return (
    <div className="pwa-mini-badge">
      <button
        type="button"
        className="mini-badge-main"
        onClick={handleClick}
      >
        <span className="mini-badge-icon" aria-hidden="true">📱</span>
        <span className="mini-badge-text">
          {ta.pwaInstallText}
        </span>
        {platform && (
          <span className="mini-badge-platform">• {platform}</span>
        )}
      </button>
      <button
        type="button"
        className="mini-badge-close"
        onClick={handleClose}
        aria-label={ta.pwaClose}
        title={ta.pwaClose}
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
};
