// src/hooks/useCountdownMusic.ts
// Música de expectativa MEJORADA - Más intensa y notoria 🎵
// Similar a Kahoot - sube de intensidad a medida que el tiempo baja

let audioContext: AudioContext | null = null;
let isPlaying = false;
let animationFrameId: number | null = null;
let currentOscillators: OscillatorNode[] = [];
let currentGainNodes: GainNode[] = [];
let masterGain: GainNode | null = null;
let backgroundOscillators: OscillatorNode[] = [];
let backgroundGains: GainNode[] = [];

// Configuración MEJORADA - Más notoria
const BASE_BPM = 100; // Más rápido desde el inicio
const MAX_BPM = 180; // Más intenso al final
const BASE_VOLUME = 0.35; // Volumen base más alto
const MAX_VOLUME = 0.6; // Volumen máximo más alto

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Limpiar osciladores activos
function cleanupOscillators() {
  [...currentOscillators, ...backgroundOscillators].forEach(osc => {
    try {
      osc.stop();
      osc.disconnect();
    } catch (e) {}
  });
  currentOscillators = [];
  backgroundOscillators = [];
  
  [...currentGainNodes, ...backgroundGains].forEach(gain => {
    try {
      gain.disconnect();
    } catch (e) {}
  });
  currentGainNodes = [];
  backgroundGains = [];
}

// Calcular BPM según tiempo restante
function calculateBPM(timeRemaining: number, totalTime: number): number {
  const progress = 1 - (timeRemaining / totalTime);
  
  // Últimos 10 segundos: MÁXIMA intensidad
  if (timeRemaining <= 10) {
    return MAX_BPM + 20; // Extra rápido
  }
  
  // Últimos 30%: acelerar mucho
  if (progress > 0.7) {
    const finalProgress = (progress - 0.7) / 0.3;
    return BASE_BPM + (MAX_BPM - BASE_BPM) * Math.pow(finalProgress, 1.5);
  }
  
  // Resto: aceleración gradual
  return BASE_BPM + (MAX_BPM - BASE_BPM) * 0.4 * progress;
}

// Calcular volumen según tiempo restante
function calculateVolume(timeRemaining: number, totalTime: number): number {
  const progress = 1 - (timeRemaining / totalTime);
  
  // Últimos 10 segundos: volumen máximo
  if (timeRemaining <= 10) {
    return MAX_VOLUME;
  }
  
  return BASE_VOLUME + (MAX_VOLUME - BASE_VOLUME) * progress;
}

// 🎵 NUEVO: Tocar nota melódica
function playMelodicNote(ctx: AudioContext, freq: number, duration: number, volume: number, delay: number = 0) {
  const now = ctx.currentTime + delay;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(masterGain!);
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  
  // Envelope suave
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.05);
  gain.gain.setValueAtTime(volume * 0.8, now + duration * 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  
  osc.start(now);
  osc.stop(now + duration + 0.01);
  
  currentOscillators.push(osc);
  currentGainNodes.push(gain);
}

// 🎵 MEJORADO: Beat más potente con capas
function playBeat(ctx: AudioContext, intensity: number, isAccent: boolean, beatInMeasure: number) {
  const now = ctx.currentTime;
  
  // === CAPA 1: Kick/Bass drum ===
  if (isAccent || beatInMeasure % 2 === 0) {
    const kickOsc = ctx.createOscillator();
    const kickGain = ctx.createGain();
    
    kickOsc.connect(kickGain);
    kickGain.connect(masterGain!);
    
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(150, now);
    kickOsc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    
    const kickVol = isAccent ? 0.5 : 0.3;
    kickGain.gain.setValueAtTime(kickVol * intensity, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    kickOsc.start(now);
    kickOsc.stop(now + 0.2);
    
    currentOscillators.push(kickOsc);
    currentGainNodes.push(kickGain);
  }
  
  // === CAPA 2: Hi-hat / tick ===
  const tickOsc = ctx.createOscillator();
  const tickGain = ctx.createGain();
  
  tickOsc.connect(tickGain);
  tickGain.connect(masterGain!);
  
  tickOsc.type = 'square';
  tickOsc.frequency.setValueAtTime(isAccent ? 800 : 600, now);
  
  const tickVol = isAccent ? 0.15 : 0.08;
  tickGain.gain.setValueAtTime(tickVol * intensity, now);
  tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  
  tickOsc.start(now);
  tickOsc.stop(now + 0.05);
  
  currentOscillators.push(tickOsc);
  currentGainNodes.push(tickGain);
  
  // === CAPA 3: Nota melódica en acentos ===
  if (isAccent) {
    // Patrón melódico simple (Do-Sol-Mi-Sol)
    const melodyNotes = [262, 392, 330, 392]; // C4, G4, E4, G4
    const noteIndex = Math.floor(beatInMeasure / 4) % melodyNotes.length;
    playMelodicNote(ctx, melodyNotes[noteIndex], 0.2, 0.2 * intensity);
  }
}

// 🎵 NUEVO: Bajo pulsante de fondo
function startBackgroundBass(ctx: AudioContext) {
  const bassOsc = ctx.createOscillator();
  const bassGain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  
  // LFO para pulso
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(2, ctx.currentTime); // 2 Hz = pulso suave
  lfoGain.gain.setValueAtTime(30, ctx.currentTime);
  lfo.connect(lfoGain);
  lfoGain.connect(bassOsc.frequency);
  
  bassOsc.type = 'sine';
  bassOsc.frequency.setValueAtTime(65, ctx.currentTime); // C2
  bassOsc.connect(bassGain);
  bassGain.connect(masterGain!);
  bassGain.gain.setValueAtTime(0.15, ctx.currentTime);
  
  lfo.start(ctx.currentTime);
  bassOsc.start(ctx.currentTime);
  
  backgroundOscillators.push(bassOsc, lfo);
  backgroundGains.push(bassGain, lfoGain);
}

// 🎵 NUEVO: Pad de tensión
function startTensionPad(ctx: AudioContext) {
  // Acorde menor para tensión: Am (A-C-E)
  const frequencies = [220, 261.6, 329.6]; // A3, C4, E4
  
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Vibrato sutil
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.type = 'sine';
    vibrato.frequency.setValueAtTime(4 + i, ctx.currentTime);
    vibratoGain.gain.setValueAtTime(2, ctx.currentTime);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    
    osc.connect(gain);
    gain.connect(masterGain!);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    
    vibrato.start(ctx.currentTime);
    osc.start(ctx.currentTime);
    
    backgroundOscillators.push(osc, vibrato);
    backgroundGains.push(gain, vibratoGain);
  });
}

// Variables para el loop
let lastBeatTime = 0;
let beatCount = 0;
let totalDuration = 60;
let getRemainingTime: (() => number) | null = null;

// Loop principal de música
function musicLoop() {
  if (!isPlaying || !getRemainingTime) {
    return;
  }
  
  const ctx = getAudioContext();
  const remaining = getRemainingTime();
  
  if (remaining <= 0) {
    stopCountdownMusic();
    return;
  }
  
  const now = performance.now();
  const bpm = calculateBPM(remaining, totalDuration);
  const beatInterval = 60000 / bpm;
  const intensity = 0.6 + (1 - (remaining / totalDuration)) * 0.4; // 0.6 a 1.0
  
  // Actualizar volumen master
  if (masterGain) {
    const vol = calculateVolume(remaining, totalDuration);
    masterGain.gain.setValueAtTime(vol, ctx.currentTime);
  }
  
  // Actualizar velocidad del bajo (LFO)
  if (backgroundOscillators.length > 1) {
    const lfo = backgroundOscillators[1];
    if (lfo && lfo.frequency) {
      const lfoSpeed = 2 + (1 - (remaining / totalDuration)) * 4; // 2 a 6 Hz
      lfo.frequency.setValueAtTime(lfoSpeed, ctx.currentTime);
    }
  }
  
  // Tocar beat si es momento
  if (now - lastBeatTime >= beatInterval) {
    const beatInMeasure = beatCount % 16;
    const isAccent = beatInMeasure % 4 === 0;
    
    playBeat(ctx, intensity, isAccent, beatInMeasure);
    
    lastBeatTime = now;
    beatCount++;
    
    // 🔥 Últimos 10 segundos: doble ritmo
    if (remaining <= 10 && beatCount % 2 === 0) {
      setTimeout(() => {
        if (isPlaying) {
          playBeat(ctx, intensity * 0.7, false, beatCount);
        }
      }, beatInterval / 2);
    }
    
    // 🔥 Últimos 5 segundos: notas de tensión extra
    if (remaining <= 5 && beatInMeasure % 2 === 0) {
      const highNote = 523 + (5 - remaining) * 50; // Notas cada vez más altas
      playMelodicNote(ctx, highNote, 0.1, 0.25 * intensity);
    }
  }
  
  animationFrameId = requestAnimationFrame(musicLoop);
}

/**
 * Inicia la música de countdown
 * @param duration - Duración total del timer en segundos
 * @param getRemaining - Función que devuelve los segundos restantes
 */
export function startCountdownMusic(duration: number, getRemaining: () => number) {
  if (isPlaying) {
    stopCountdownMusic();
  }
  
  // Verificar si está habilitada
  if (!musicEnabled) {
    return;
  }
  
  const ctx = getAudioContext();
  
  // Reanudar si está suspendido
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  
  // Crear master gain
  masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(BASE_VOLUME, ctx.currentTime);
  
  // Configurar
  totalDuration = duration;
  getRemainingTime = getRemaining;
  lastBeatTime = performance.now();
  beatCount = 0;
  isPlaying = true;
  
  // 🎵 Iniciar capas de fondo
  startBackgroundBass(ctx);
  startTensionPad(ctx);
  
  // Iniciar loop
  animationFrameId = requestAnimationFrame(musicLoop);
  
  console.log('🎵 Countdown music started (enhanced)');
}

/**
 * Detiene la música de countdown
 */
export function stopCountdownMusic() {
  isPlaying = false;
  getRemainingTime = null;
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Fade out suave
  if (masterGain && audioContext) {
    const now = audioContext.currentTime;
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 0.5);
    
    setTimeout(() => {
      cleanupOscillators();
      if (masterGain) {
        masterGain.disconnect();
        masterGain = null;
      }
    }, 600);
  } else {
    cleanupOscillators();
  }
  
  console.log('🔇 Countdown music stopped');
}

/**
 * Pausa la música (mantiene estado)
 */
export function pauseCountdownMusic() {
  if (!isPlaying) return;
  
  isPlaying = false;
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Bajar volumen pero mantener fondo
  if (masterGain && audioContext) {
    masterGain.gain.linearRampToValueAtTime(0.05, audioContext.currentTime + 0.2);
  }
  
  console.log('⏸️ Countdown music paused');
}

/**
 * Reanuda la música pausada
 */
export function resumeCountdownMusic() {
  if (isPlaying || !getRemainingTime) return;
  
  isPlaying = true;
  lastBeatTime = performance.now();
  
  // Restaurar volumen
  if (masterGain && audioContext) {
    const remaining = getRemainingTime();
    const vol = calculateVolume(remaining, totalDuration);
    masterGain.gain.linearRampToValueAtTime(vol, audioContext.currentTime + 0.2);
  }
  
  animationFrameId = requestAnimationFrame(musicLoop);
  
  console.log('▶️ Countdown music resumed');
}

/**
 * Verifica si la música está sonando
 */
export function isCountdownMusicPlaying(): boolean {
  return isPlaying;
}

// Estado de música habilitada
let musicEnabled = true;

// Cargar preferencia
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('tlg-music-enabled');
  if (saved !== null) {
    musicEnabled = saved === 'true';
  }
}

export function toggleCountdownMusic(): boolean {
  musicEnabled = !musicEnabled;
  localStorage.setItem('tlg-music-enabled', String(musicEnabled));
  
  if (!musicEnabled && isPlaying) {
    stopCountdownMusic();
  }
  
  return musicEnabled;
}

export function isCountdownMusicEnabled(): boolean {
  return musicEnabled;
}

export function setCountdownMusicEnabled(enabled: boolean) {
  musicEnabled = enabled;
  localStorage.setItem('tlg-music-enabled', String(enabled));
  
  if (!enabled && isPlaying) {
    stopCountdownMusic();
  }
}

/**
 * Hook para usar en componentes React
 */
export function useCountdownMusic() {
  return {
    start: (duration: number, getRemaining: () => number) => {
      if (musicEnabled) {
        startCountdownMusic(duration, getRemaining);
      }
    },
    stop: stopCountdownMusic,
    pause: pauseCountdownMusic,
    resume: resumeCountdownMusic,
    isPlaying: isCountdownMusicPlaying,
    toggle: toggleCountdownMusic,
    isEnabled: isCountdownMusicEnabled,
    setEnabled: setCountdownMusicEnabled,
  };
}