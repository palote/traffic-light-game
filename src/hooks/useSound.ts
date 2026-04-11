// src/hooks/useSound.ts
// Hook para manejar sonidos del juego Traffic Light Game
// ✅ FIX: AudioContext cerrado ya no crashea + reveal protegido con try/catch
// ✅ FIX: Guards en connect() para prevenir 'Overload resolution failed'
// ✅ FIX: ctx.resume() ahora se awaita correctamente — Chrome 145+ requiere esto

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

const SOUND_CONFIGS: Record<SoundName, { frequency: number; duration: number; type: OscillatorType; volume: number }> = {
  click:         { frequency: 800,  duration: 0.05, type: 'square',   volume: 0.2  },
  points:        { frequency: 880,  duration: 0.15, type: 'sine',     volume: 0.3  },
  correct:       { frequency: 523,  duration: 0.3,  type: 'sine',     volume: 0.4  },
  incorrect:     { frequency: 200,  duration: 0.3,  type: 'sawtooth', volume: 0.3  },
  rating:        { frequency: 600,  duration: 0.1,  type: 'sine',     volume: 0.25 },
  transition:    { frequency: 440,  duration: 0.2,  type: 'triangle', volume: 0.2  },
  roundComplete: { frequency: 660,  duration: 0.4,  type: 'sine',     volume: 0.4  },
  timerWarning:  { frequency: 440,  duration: 0.1,  type: 'square',   volume: 0.3  },
  help:          { frequency: 500,  duration: 0.15, type: 'sine',     volume: 0.25 },
  reveal:        { frequency: 700,  duration: 0.2,  type: 'triangle', volume: 0.3  },
};

// AudioContext singleton
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// ✅ FIX: async — espera a que el contexto esté running antes de conectar nodos.
// Sin await, ctx.resume() devuelve una Promise ignorada y el contexto sigue
// suspendido cuando se llama a gainNode.connect(ctx.destination), lo que en
// Chrome 145+ lanza "Overload resolution failed" sin ser atrapado por el try/catch.
async function playTone(frequency: number, duration: number, type: OscillatorType, volume: number) {
  try {
    const ctx = getAudioContext();

    if (!ctx || ctx.state === 'closed') return;

    if (ctx.state === 'suspended') {
      await ctx.resume(); // ✅ FIX: await — espera antes de continuar
    }

    // ✅ Guard extra: si después del resume el estado no es 'running', abortar
    if (ctx.state !== 'running') return;

    if (!ctx.destination) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    if (!oscillator || !gainNode) return;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  } catch (e) {
    // Silencioso — los errores de audio no deben interrumpir el juego
    console.warn('⚠️ Error playing sound tone:', e);
  }
}

function playCompoundSound(name: SoundName) {
  switch (name) {
    case 'correct':
      playTone(523, 0.15, 'sine', 0.3);
      setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 100);
      setTimeout(() => playTone(784, 0.25, 'sine', 0.4), 200);
      break;

    case 'incorrect':
      playTone(300, 0.15, 'sawtooth', 0.25);
      setTimeout(() => playTone(200, 0.25, 'sawtooth', 0.3), 150);
      break;

    case 'roundComplete':
      playTone(523, 0.1, 'sine', 0.3);
      setTimeout(() => playTone(659, 0.1, 'sine', 0.3), 100);
      setTimeout(() => playTone(784, 0.1, 'sine', 0.3), 200);
      setTimeout(() => playTone(1047, 0.3, 'sine', 0.4), 300);
      break;

    case 'points':
      playTone(880, 0.08, 'square', 0.2);
      setTimeout(() => playTone(1320, 0.12, 'square', 0.25), 80);
      break;

    case 'timerWarning':
      playTone(800, 0.05, 'square', 0.2);
      setTimeout(() => playTone(600, 0.05, 'square', 0.2), 150);
      break;

    case 'reveal':
      // ✅ FIX: IIFE async para poder awaitar ctx.resume()
      (async () => {
        try {
          const ctx = getAudioContext();

          if (!ctx || ctx.state === 'closed') return;

          if (ctx.state === 'suspended') {
            await ctx.resume(); // ✅ FIX: await
          }

          if (ctx.state !== 'running') return;

          if (!ctx.destination) return;

          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          if (!osc || !gain) return;

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(900, now + 0.2);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.25);

          osc.start(now);
          osc.stop(now + 0.3);
        } catch (e) {
          console.warn('⚠️ Error playing reveal sound:', e);
        }
      })();
      break;

    default: {
      const config = SOUND_CONFIGS[name];
      if (config) {
        playTone(config.frequency, config.duration, config.type, config.volume);
      }
    }
  }
}

let soundEnabled = true;

if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('tlg-sound-enabled');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  }
}

export function useSound() {
  const play = (name: SoundName) => {
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

  return { play, toggle, setEnabled, isEnabled };
}

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