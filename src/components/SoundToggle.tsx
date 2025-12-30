// src/components/SoundToggle.tsx
// Botón para activar/desactivar sonidos del juego

import { useState } from 'react';
import { useI18n } from '../i18n';
import { toggleSound, isSoundEnabled, playSound } from '../hooks/useSound';

interface SoundToggleProps {
  style?: React.CSSProperties;
}

export function SoundToggle({ style }: SoundToggleProps) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(isSoundEnabled());

  const handleToggle = () => {
    const newState = toggleSound();
    setEnabled(newState);
    
    if (newState) {
      playSound('click');
    }
  };

  return (
    <button
      onClick={handleToggle}
      title={enabled ? t.sound.disable : t.sound.enable}
      style={{
        padding: '8px 12px',
        fontSize: 20,
        backgroundColor: enabled ? '#4CAF50' : '#9e9e9e',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        ...style,
      }}
    >
      {enabled ? '🔊' : '🔇'}
      <span style={{ fontSize: 14 }}>
        {enabled ? t.sound.on : t.sound.off}
      </span>
    </button>
  );
}