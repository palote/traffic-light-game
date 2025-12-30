// src/components/RoomCodeDisplay.tsx
// Componente para mostrar el código de sala y QR al docente

import { useState, useEffect } from 'react';
import { 
  createRoomCode, 
  getRoomCodeForGame, 
  formatCodeForDisplay,
  getTimeRemaining,
  extendRoomCode 
} from '../services/roomCodeService';
import { useAuth } from '../contexts/AuthContext';

interface RoomCodeDisplayProps {
  gameId: string;
  onCodeCreated?: (code: string) => void;
}

export function RoomCodeDisplay({ gameId, onCodeCreated }: RoomCodeDisplayProps) {
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Cargar o crear código
  useEffect(() => {
    loadOrCreateCode();
  }, [gameId]);

  const loadOrCreateCode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Intentar obtener código existente
      let code = await getRoomCodeForGame(gameId);
      
      // Si no existe, crear uno nuevo
      if (!code && user?.uid) {
        code = await createRoomCode(gameId, user.uid);
        onCodeCreated?.(code);
      }
      
      if (code) {
        setRoomCode(code);
        // Calcular expiración (24h desde ahora si es nuevo)
        setExpiresAt(Date.now() + 24 * 60 * 60 * 1000);
      }
    } catch (err) {
      console.error('Error with room code:', err);
      setError('Error al generar código');
    } finally {
      setLoading(false);
    }
  };

  // Copiar link
  const copyLink = async () => {
    if (!roomCode) return;
    
    const link = `${window.location.origin}/join?code=${roomCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extender código
  const handleExtend = async () => {
    if (!roomCode) return;
    
    try {
      await extendRoomCode(roomCode, 24);
      setExpiresAt(Date.now() + 24 * 60 * 60 * 1000);
    } catch (err) {
      console.error('Error extending code:', err);
    }
  };

  // Generar URL del QR (usando API gratuita)
  const getQRUrl = (size: number = 200) => {
    if (!roomCode) return '';
    const joinUrl = `${window.location.origin}/join?code=${roomCode}`;
    // Usando QR Server API (gratuita, sin límites)
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(joinUrl)}`;
  };

  if (loading) {
    return (
      <div style={{
        padding: 20,
        textAlign: 'center',
        color: '#64748b',
      }}>
        Generando código...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 20,
        textAlign: 'center',
        color: '#ef4444',
      }}>
        {error}
        <button onClick={loadOrCreateCode} style={{ marginLeft: 8 }}>
          Reintentar
        </button>
      </div>
    );
  }

  // Vista fullscreen para proyector
  if (showFullscreen) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'white',
          zIndex: 100000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setShowFullscreen(false)}
      >
        <div style={{ fontSize: 48, marginBottom: 20 }}>🚦</div>
        <h1 style={{ 
          fontSize: 32, 
          margin: '0 0 40px',
          color: '#1e293b',
        }}>
          Uníte al juego
        </h1>
        
        {/* QR Grande */}
        <img 
          src={getQRUrl(300)} 
          alt="QR Code"
          style={{
            width: 300,
            height: 300,
            borderRadius: 16,
            border: '4px solid #e2e8f0',
            marginBottom: 40,
          }}
        />
        
        {/* Código Grande */}
        <div style={{
          fontSize: 72,
          fontWeight: 800,
          fontFamily: 'monospace',
          letterSpacing: 12,
          color: '#6366f1',
          marginBottom: 20,
        }}>
          {formatCodeForDisplay(roomCode || '')}
        </div>
        
        <p style={{ 
          fontSize: 24, 
          color: '#64748b',
          margin: 0,
        }}>
          Ingresá a <strong>{window.location.host}/join</strong>
        </p>
        
        <p style={{
          position: 'absolute',
          bottom: 20,
          fontSize: 14,
          color: '#94a3b8',
        }}>
          Click en cualquier lugar para cerrar
        </p>
      </div>
    );
  }

  // Vista compacta
  return (
    <div style={{
      backgroundColor: '#f8fafc',
      borderRadius: 16,
      padding: 20,
      border: '2px solid #e2e8f0',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: 14, 
          fontWeight: 600, 
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          🔗 Código de Sala
        </h3>
        {expiresAt && (
          <span style={{ 
            fontSize: 12, 
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            ⏱️ {getTimeRemaining(expiresAt)}
          </span>
        )}
      </div>

      {/* Código + QR */}
      <div style={{
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}>
        {/* QR pequeño */}
        <img 
          src={getQRUrl(100)} 
          alt="QR"
          style={{
            width: 80,
            height: 80,
            borderRadius: 8,
            border: '2px solid #e2e8f0',
          }}
        />

        {/* Código */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 28,
            fontWeight: 800,
            fontFamily: 'monospace',
            letterSpacing: 4,
            color: '#6366f1',
            marginBottom: 8,
          }}>
            {formatCodeForDisplay(roomCode || '')}
          </div>
          
          <div style={{
            display: 'flex',
            gap: 8,
          }}>
            <button
              onClick={copyLink}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: copied ? '#22c55e' : '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {copied ? '✓ Copiado' : '📋 Copiar link'}
            </button>
            
            <button
              onClick={() => setShowFullscreen(true)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: 'white',
                color: '#64748b',
                border: '2px solid #e2e8f0',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              📺 Pantalla completa
            </button>
          </div>
        </div>
      </div>

      {/* Instrucciones */}
      <p style={{
        margin: '16px 0 0',
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'center',
      }}>
        Los alumnos ingresan a <strong>{window.location.host}/join</strong> y escriben el código
      </p>
    </div>
  );
}