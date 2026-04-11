import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './registerServiceWorker'
import * as Sentry from "@sentry/react"

// Debug initialization
console.log('🚦 Traffic Light Game - Starting...')
console.log('🔧 [SENTRY] Environment:', import.meta.env.PROD ? 'production' : 'development')
console.log('🔧 [SENTRY] DSN configured:', !!import.meta.env.VITE_SENTRY_DSN)

// Expose Sentry to window for testing
if (typeof window !== 'undefined') {
  (window as any).Sentry = Sentry
}

// Sentry Configuration - Versión simplificada y compatible
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://044e7731b018e86aadb7c5112a5fb807@o4510864360800256.ingest.us.sentry.io/4510864374956033",
  
  // Integrations - versión compatible
  integrations: [
    // BrowserTracing ya no se usa así en v10, usamos la función integrada
    Sentry.browserTracingIntegration(),
    // Replay integration
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  
  // ✅ FIX APLICADO: Usamos import.meta.env.PROD para detectar producción
  environment: import.meta.env.PROD ? 'production' : 'development',
  
  // Debug mode (only in development)
  debug: import.meta.env.DEV,
  
  // Performance Monitoring
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: import.meta.env.PROD ? 0.0 : 0.5,
  replaysOnErrorSampleRate: 1.0,
  
  // Filter common errors
  beforeSend(event, hint) {
    const error = hint?.originalException as Error
    const errorMessage = error?.message || ''
    
    // Ignore common browser/extension errors
    if (errorMessage.includes('ResizeObserver')) return null
    if (errorMessage.includes('chrome-extension://')) return null
    if (errorMessage.includes('Extension context')) return null

    // ✅ NUEVO: filtrar errores que vienen de extensiones en el stack
    const frames = event.exception?.values?.[0]?.stacktrace?.frames
    if (frames?.some(f => f.filename?.includes('chrome-extension') || f.filename?.includes('moz-extension'))) {
      return null
    }

    // ✅ Agregar esto: filtrar removeChild (causado por extensiones)
    const errorMsg = event.exception?.values?.[0]?.value ?? '';
    if (errorMsg.includes('removeChild') && errorMsg.includes('not a child')) {
      return null;
    }
    
    return event
  },
})

console.log('✅ [SENTRY] Initialized with environment:', import.meta.env.PROD ? 'production' : 'development')

// Render App with Error Boundary
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary 
      showDialog={false}
      fallback={({ error, componentStack, resetError }: any) => (
        <div style={{ 
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
            <h1 style={{ fontSize: '24px', marginBottom: '12px', color: '#1f2937' }}>
              ¡Ups! Algo salió mal
            </h1>
            <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
              Hemos registrado el error y lo revisaremos pronto.
              Mientras tanto, puedes intentar recargar la página.
            </p>
            
            {error && (
              <details style={{ 
                textAlign: 'left', 
                padding: '12px',
                backgroundColor: '#fef2f2',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px',
                border: '1px solid #fee2e2',
              }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  color: '#991b1b',
                  outline: 'none',
                }}>
                  Detalles técnicos
                </summary>
                <pre style={{ 
                  marginTop: '8px', 
                  whiteSpace: 'pre-wrap',
                  color: '#7f1d1d',
                  fontSize: '12px',
                  overflowX: 'auto',
                }}>
                  {error.message}
                  {componentStack && `\n\n${componentStack}`}
                </pre>
              </details>
            )}
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  if (resetError) {
                    resetError()
                  } else {
                    window.location.reload()
                  }
                }}
                style={{
                  backgroundColor: '#646cff',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#535bf2'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#646cff'}
              >
                Reintentar
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  backgroundColor: 'transparent',
                  color: '#646cff',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  border: '2px solid #646cff',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)

// Register Service Worker for PWA
registerServiceWorker()

// App initialized successfully
console.log('🚀 App initialized successfully in', import.meta.env.PROD ? 'production' : 'development')