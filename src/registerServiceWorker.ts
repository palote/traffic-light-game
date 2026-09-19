// registerServiceWorker.ts
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('✅ Service Worker registrado:', registration.scope);

          // Forzar chequeo de actualización apenas carga la página
          registration.update();

          // Detectar actualizaciones
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Hay una nueva versión: activarla y recargar automáticamente,
                  // sin esperar confirmación del usuario (evita que se quede
                  // viendo la versión vieja indefinidamente).
                  console.log('🔄 Nueva versión detectada. Actualizando automáticamente...');
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Error al registrar Service Worker:', error);
        });

      // Recargar cuando el Service Worker tome control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    });
  } else {
    console.warn('⚠️ Service Workers no son soportados en este navegador');
  }
}
