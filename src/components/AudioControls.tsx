// src/components/AudioControls.tsx
// Panel de controles de audio (efectos de sonido + música de countdown)

import { useState } from 'react';
import { toggleSound, isSoundEnabled, playSound } from '../hooks/useSound';
import { 
  toggleCountdownMusic, 
  isCountdownMusicEnabled,
  startCountdownMusic,
  stopCountdownMusic 
} from '../hooks/useCountdownMusic';

interface AudioControlsProps {
  style?: React.CSSProperties;
  compact?: boolean; // Versión compacta para móviles
}

export function AudioControls({ style, compact = false }: AudioControlsProps) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [musicOn, setMusicOn] = useState(isCountdownMusicEnabled());
  const [testingMusic, setTestingMusic] = useState(false);

  const handleSoundToggle = () => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) {
      playSound('click');
    }
  };

  const handleMusicToggle = () => {
    const newState = toggleCountdownMusic();
    setMusicOn(newState);
  };

  // Test de música (5 segundos)
  const handleTestMusic = () => {
    if (testingMusic) {
      stopCountdownMusic();
      setTestingMusic(false);
      return;
    }

    setTestingMusic(true);
    let remaining = 5;
    
    startCountdownMusic(5, () => remaining);
    
    const interval = setInterval(() => {
      remaining -= 0.1;
      if (remaining <= 0) {
        clearInterval(interval);
        stopCountdownMusic();
        setTestingMusic(false);
      }
    }, 100);
  };

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        gap: 8,
        ...style,
      }}>
        <button
          onClick={handleSoundToggle}
          title={soundOn ? 'Desactivar efectos' : 'Activar efectos'}
          style={{
            padding: '6px 10px',
            fontSize: 18,
            backgroundColor: soundOn ? '#4CAF50' : '#9e9e9e',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>

        <button
          onClick={handleMusicToggle}
          title={musicOn ? 'Desactivar música' : 'Activar música'}
          style={{
            padding: '6px 10px',
            fontSize: 18,
            backgroundColor: musicOn ? '#9C27B0' : '#9e9e9e',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          🎵
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: 12,
      backgroundColor: '#f5f5f5',
      borderRadius: 12,
      ...style,
    }}>
      <div style={{ 
        fontSize: 12, 
        fontWeight: 700, 
        color: '#666',
        marginBottom: 4,
      }}>
        🔈 AUDIO
      </div>

      {/* Efectos de sonido */}
      <button
        onClick={handleSoundToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          backgroundColor: soundOn ? '#4CAF50' : '#e0e0e0',
          color: soundOn ? 'white' : '#666',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        {soundOn ? '🔊' : '🔇'}
        <span>Efectos {soundOn ? 'ON' : 'OFF'}</span>
      </button>

      {/* Música de countdown */}
      <button
        onClick={handleMusicToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          backgroundColor: musicOn ? '#9C27B0' : '#e0e0e0',
          color: musicOn ? 'white' : '#666',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        🎵
        <span>Música {musicOn ? 'ON' : 'OFF'}</span>
      </button>

      {/* Botón de prueba */}
      {musicOn && (
        <button
          onClick={handleTestMusic}
          style={{
            padding: '6px 10px',
            backgroundColor: testingMusic ? '#F44336' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {testingMusic ? '⏹️ Parar' : '▶️ Probar música'}
        </button>
      )}
    </div>
  );
}