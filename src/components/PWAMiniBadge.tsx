// src/components/PWAMiniBadge.tsx
// VERSIÓN MEJORADA - Se conecta con el banner de instalación

import { useState, useEffect } from 'react';
import './PWAMiniBadge.css';

interface PWAMiniBadgeProps {
  onInstallClick?: () => void;  // Callback para disparar instalación
}

export const PWAMiniBadge = ({ onInstallClick }: PWAMiniBadgeProps) => {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    // Solo mostrar si NO está instalada
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    if (isInstalled) return;

    // Verificar si ya se cerró recientemente
    const dismissed = localStorage.getItem('pwa-mini-badge-dismissed');
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

  const handleClick = () => {
    // Si hay callback, usarlo (para disparar el banner de instalación)
    if (onInstallClick) {
      onInstallClick();
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que dispare el click del badge
    setShow(false);
    
    // Recordar que se cerró (por 7 días)
    const hideUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
    localStorage.setItem('pwa-mini-badge-dismissed', hideUntil.toString());
  };

  if (!show) return null;

  return (
    <div 
      className="pwa-mini-badge" 
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Instalar aplicación"
    >
      <span className="mini-badge-icon">📱</span>
      <span className="mini-badge-text">
        Instalar como app
      </span>
      {platform && (
        <span className="mini-badge-platform">• {platform}</span>
      )}
      <button 
        className="mini-badge-close"
        onClick={handleClose}
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
};