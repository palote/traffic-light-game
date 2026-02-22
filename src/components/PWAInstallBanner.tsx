// src/components/PWAInstallBanner.tsx
// VERSIÓN MEJORADA - Con detección automática de iOS

import { useState, useEffect } from 'react';
import './PWAInstallBanner.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Verificar si ya está instalada
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
                    || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) {
      console.log('✅ App ya instalada');
      return;
    }

    // Handler para Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Verificar si el usuario ya cerró el banner
      const dismissed = localStorage.getItem('pwa-banner-dismissed');
      if (dismissed && Date.now() < parseInt(dismissed)) {
        console.log('⏭️ Banner fue cerrado recientemente');
        return;
      }
      
      setShowBanner(true);
      console.log('✅ beforeinstallprompt capturado - mostrando banner Android');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Para iOS: Mostrar banner después de 3 segundos
    if (iOS && !standalone) {
      const dismissed = localStorage.getItem('pwa-ios-banner-dismissed');
      if (!dismissed || Date.now() > parseInt(dismissed)) {
        const timer = setTimeout(() => {
          setShowBanner(true);
          console.log('📱 Mostrando banner iOS con instrucciones');
        }, 3000);
        
        return () => {
          clearTimeout(timer);
          window.removeEventListener('beforeinstallprompt', handler);
        };
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('⚠️ No hay prompt disponible (probablemente iOS)');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`Usuario respondió: ${outcome}`);

    setDeferredPrompt(null);
    setShowBanner(false);
    
    // Guardar que se instaló/rechazó
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-banner-dismissed', 'installed');
    } else {
      const hideUntil = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 días
      localStorage.setItem('pwa-banner-dismissed', hideUntil.toString());
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    
    // Guardar que el usuario lo cerró (7 días)
    const dismissedUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
    
    if (isIOS) {
      localStorage.setItem('pwa-ios-banner-dismissed', dismissedUntil.toString());
    } else {
      localStorage.setItem('pwa-banner-dismissed', dismissedUntil.toString());
    }
  };

  // No mostrar si ya está instalada
  if (isStandalone) {
    return null;
  }

  // No mostrar si está oculto
  if (!showBanner) {
    return null;
  }

  // Banner para iOS (instrucciones)
  if (isIOS) {
    return (
      <div className="pwa-banner pwa-banner-ios">
        <button className="pwa-banner-close" onClick={handleDismiss}>
          ✕
        </button>
        <div className="pwa-banner-content">
          <div className="pwa-banner-icon">📱</div>
          <div className="pwa-banner-text">
            <strong>Instalar Traffic Light Game</strong>
            <div className="ios-instructions">
              <p className="ios-step">
                1. Toca el botón <strong>Compartir</strong> 
                <span className="ios-share-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                  </svg>
                </span>
              </p>
              <p className="ios-step">
                2. Selecciona <strong>"Agregar a pantalla de inicio"</strong>
              </p>
              <p className="ios-step">
                3. Toca <strong>"Agregar"</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Banner para Android/Chrome
  return (
    <div className="pwa-banner pwa-banner-android">
      <button className="pwa-banner-close" onClick={handleDismiss}>
        ✕
      </button>
      <div className="pwa-banner-content">
        <div className="pwa-banner-icon">🚦</div>
        <div className="pwa-banner-text">
          <strong>Instalar Traffic Light Game</strong>
          <p>Acceso rápido desde tu pantalla de inicio</p>
        </div>
        <button className="pwa-banner-install" onClick={handleInstallClick}>
          Instalar
        </button>
      </div>
    </div>
  );
};