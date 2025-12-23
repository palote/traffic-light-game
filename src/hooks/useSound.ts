// src/hooks/useSound.ts
// Hook para manejar sonidos del juego Traffic Light Game

type SoundName =
  | 'click'
  | 'points'
  | 'correct'
  | 'incorrect'
  | 'rating'
  | 'transition'
  | 'roundComplete'
  | 'timerWarning'
  | 'help'
  | 'reveal';

// Sonidos generados con Web Audio API (sin archivos externos)
const SOUND_CONFIGS: Record<SoundName, { frequency: number; duration: number; type: OscillatorType; volume: number }> = {
  click: { frequency: 800, duration: 0.05, type: 'square', volume: 0.2 },
  points: { frequency: 880, duration: 0.15, type: 'sine', volume: 0.3 },
  correct: { frequency: 523, duration: 0.3, type: 'sine', volume: 0.4 },
  incorrect: { frequency: 200, duration: 0.3, type: 'sawtooth', volume: 0.3 },
  rating: { frequency: 600, duration: 0.1, type: 'sine', volume: 0.25 },
  transition: { frequency: 440, duration: 0.2, type: 'triangle', volume: 0.2 },
  roundComplete: { frequency: 660, duration: 0.4, type: 'sine', volume: 0.4 },
  timerWarning: { frequency: 440, duration: 0.1, type: 'square', volume: 0.3 },
  help: { frequency: 500, duration: 0.15, type: 'sine', volume: 0.25 },
  reveal: { frequency: 700, duration: 0.2, type: 'triangle', volume: 0.3 },
};

// AudioContext singleton
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Función para tocar un sonido simple
function playTone(frequency: number, duration: number, type: OscillatorType, volume: number) {
  try {
    const ctx = getAudioContext();
    
    // Reanudar si está suspendido (necesario por políticas de autoplay)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    // Envelope para evitar clicks
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  } catch (e) {
    console.warn('Error playing sound:', e);
  }
}

// Sonidos compuestos (múltiples tonos)
function playCompoundSound(name: SoundName) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  switch (name) {
    case 'correct':
      // Acorde mayor ascendente (Do-Mi-Sol)
      playTone(523, 0.15, 'sine', 0.3); // C5
      setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 100); // E5
      setTimeout(() => playTone(784, 0.25, 'sine', 0.4), 200); // G5
      break;

    case 'incorrect':
      // Dos tonos descendentes
      playTone(300, 0.15, 'sawtooth', 0.25);
      setTimeout(() => playTone(200, 0.25, 'sawtooth', 0.3), 150);
      break;

    case 'roundComplete':
      // Fanfare corta
      playTone(523, 0.1, 'sine', 0.3);
      setTimeout(() => playTone(659, 0.1, 'sine', 0.3), 100);
      setTimeout(() => playTone(784, 0.1, 'sine', 0.3), 200);
      setTimeout(() => playTone(1047, 0.3, 'sine', 0.4), 300);
      break;

    case 'points':
      // Coin sound (dos tonos rápidos)
      playTone(880, 0.08, 'square', 0.2);
      setTimeout(() => playTone(1320, 0.12, 'square', 0.25), 80);
      break;

    case 'timerWarning':
      // Tick-tock urgente
      playTone(800, 0.05, 'square', 0.2);
      setTimeout(() => playTone(600, 0.05, 'square', 0.2), 150);
      break;

    case 'reveal':
      // Whoosh ascendente
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    default:
      // Sonido simple
      const config = SOUND_CONFIGS[name];
      if (config) {
        playTone(config.frequency, config.duration, config.type, config.volume);
      }
  }
}

// Estado global de sonidos (habilitado/deshabilitado)
let soundEnabled = true;

// Cargar preferencia del localStorage
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('tlg-sound-enabled');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  }
}

/**
 * Hook para usar sonidos en el juego
 */
export function useSound() {
  const play = (name: SoundName) => {
    if (!soundEnabled) return;
    
    // Sonidos compuestos
    if (['correct', 'incorrect', 'roundComplete', 'points', 'timerWarning', 'reveal'].includes(name)) {
      playCompoundSound(name);
    } else {
      // Sonidos simples
      const config = SOUND_CONFIGS[name];
      if (config) {
        playTone(config.frequency, config.duration, config.type, config.volume);
      }
    }
  };

  const toggle = () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('tlg-sound-enabled', String(soundEnabled));
    return soundEnabled;
  };

  const setEnabled = (enabled: boolean) => {
    soundEnabled = enabled;
    localStorage.setItem('tlg-sound-enabled', String(enabled));
  };

  const isEnabled = () => soundEnabled;

  return {
    play,
    toggle,
    setEnabled,
    isEnabled,
  };
}

// Export para uso sin hook (en funciones puras)
export const playSound = (name: SoundName) => {
  if (!soundEnabled) return;
  
  if (['correct', 'incorrect', 'roundComplete', 'points', 'timerWarning', 'reveal'].includes(name)) {
    playCompoundSound(name);
  } else {
    const config = SOUND_CONFIGS[name];
    if (config) {
      playTone(config.frequency, config.duration, config.type, config.volume);
    }
  }
};

export const toggleSound = () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem('tlg-sound-enabled', String(soundEnabled));
  return soundEnabled;
};

export const isSoundEnabled = () => soundEnabled;