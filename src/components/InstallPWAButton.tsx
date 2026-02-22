// src/components/InstallPWAButton.tsx
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPWAButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevenir que el banner automático aparezca
      e.preventDefault();
      
      // Guardar el evento para usarlo después
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true);
      
      console.log('✅ beforeinstallprompt capturado');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Verificar si la app ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('✅ App ya instalada');
      setShowButton(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('❌ No hay prompt disponible');
      return;
    }

    // Mostrar el prompt de instalación
    deferredPrompt.prompt();

    // Esperar la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`Usuario respondió: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('✅ Usuario aceptó instalar');
    } else {
      console.log('❌ Usuario rechazó instalar');
    }

    // Limpiar el prompt
    setDeferredPrompt(null);
    setShowButton(false);
  };

  if (!showButton) {
    return null;
  }

  return (
    <div style={styles.container}>
      <button onClick={handleInstallClick} style={styles.button}>
        📱 Instalar App
      </button>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    zIndex: 1000,
  },
  button: {
    backgroundColor: '#646cff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'transform 0.2s',
  },
};