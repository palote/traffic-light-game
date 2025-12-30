// src/services/roomCodeService.ts
// Servicio para gestionar códigos de sala cortos

import { ref, set, get, remove, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../firebase.config';

// ============================================
// TIPOS
// ============================================

export interface RoomCode {
  code: string;           // "ABC123" - 6 caracteres
  gameId: string;         // El gameId real de Firebase
  createdAt: number;
  expiresAt: number;      // 24 horas después por defecto
  createdBy: string;      // UID del docente
  used: boolean;          // Si el juego ya empezó
}

// ============================================
// CONFIGURACIÓN
// ============================================

const ROOM_CODES_PATH = 'roomCodes';
const CODE_LENGTH = 6;
const CODE_EXPIRY_HOURS = 24;

// Caracteres que no se confunden fácilmente (sin 0/O, 1/I/L)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// ============================================
// GENERAR CÓDIGO ÚNICO
// ============================================

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

async function isCodeAvailable(code: string): Promise<boolean> {
  const snapshot = await get(ref(database, `${ROOM_CODES_PATH}/${code}`));
  if (!snapshot.exists()) return true;
  
  // Si existe pero expiró, está disponible
  const roomCode = snapshot.val() as RoomCode;
  if (roomCode.expiresAt < Date.now()) {
    // Limpiar código expirado
    await remove(ref(database, `${ROOM_CODES_PATH}/${code}`));
    return true;
  }
  
  return false;
}

// ============================================
// CREAR CÓDIGO PARA UN JUEGO
// ============================================

export async function createRoomCode(
  gameId: string, 
  createdBy: string,
  expiryHours: number = CODE_EXPIRY_HOURS
): Promise<string> {
  // Intentar generar código único (máximo 10 intentos)
  let code = '';
  let attempts = 0;
  
  while (attempts < 10) {
    code = generateCode();
    if (await isCodeAvailable(code)) break;
    attempts++;
  }
  
  if (attempts >= 10) {
    throw new Error('No se pudo generar un código único. Intentá de nuevo.');
  }
  
  const now = Date.now();
  const roomCode: RoomCode = {
    code,
    gameId,
    createdAt: now,
    expiresAt: now + (expiryHours * 60 * 60 * 1000),
    createdBy,
    used: false,
  };
  
  // Guardar código
  await set(ref(database, `${ROOM_CODES_PATH}/${code}`), roomCode);
  
  // También guardar referencia en el juego
  await set(ref(database, `games/${gameId}/roomCode`), code);
  
  return code;
}

// ============================================
// BUSCAR JUEGO POR CÓDIGO
// ============================================

export interface RoomCodeLookupResult {
  success: boolean;
  gameId?: string;
  error?: 'not_found' | 'expired' | 'invalid';
  message?: string;
}

export async function lookupRoomCode(code: string): Promise<RoomCodeLookupResult> {
  // Normalizar código (mayúsculas, sin espacios)
  const normalizedCode = code.toUpperCase().trim().replace(/\s/g, '');
  
  // Validar formato
  if (normalizedCode.length !== CODE_LENGTH) {
    return {
      success: false,
      error: 'invalid',
      message: `El código debe tener ${CODE_LENGTH} caracteres`,
    };
  }
  
  // Buscar código
  const snapshot = await get(ref(database, `${ROOM_CODES_PATH}/${normalizedCode}`));
  
  if (!snapshot.exists()) {
    return {
      success: false,
      error: 'not_found',
      message: 'Código no encontrado. Verificá que esté bien escrito.',
    };
  }
  
  const roomCode = snapshot.val() as RoomCode;
  
  // Verificar expiración
  if (roomCode.expiresAt < Date.now()) {
    return {
      success: false,
      error: 'expired',
      message: 'Este código expiró. Pedile uno nuevo al docente.',
    };
  }
  
  // Verificar que el juego exista
  const gameSnapshot = await get(ref(database, `games/${roomCode.gameId}`));
  if (!gameSnapshot.exists()) {
    return {
      success: false,
      error: 'not_found',
      message: 'El juego asociado a este código ya no existe.',
    };
  }
  
  return {
    success: true,
    gameId: roomCode.gameId,
  };
}

// ============================================
// OBTENER CÓDIGO DE UN JUEGO
// ============================================

export async function getRoomCodeForGame(gameId: string): Promise<string | null> {
  const snapshot = await get(ref(database, `games/${gameId}/roomCode`));
  return snapshot.exists() ? snapshot.val() : null;
}

// ============================================
// EXTENDER EXPIRACIÓN
// ============================================

export async function extendRoomCode(
  code: string, 
  additionalHours: number = CODE_EXPIRY_HOURS
): Promise<void> {
  const snapshot = await get(ref(database, `${ROOM_CODES_PATH}/${code}`));
  
  if (!snapshot.exists()) {
    throw new Error('Código no encontrado');
  }
  
  const roomCode = snapshot.val() as RoomCode;
  const newExpiry = Math.max(roomCode.expiresAt, Date.now()) + (additionalHours * 60 * 60 * 1000);
  
  await set(ref(database, `${ROOM_CODES_PATH}/${code}/expiresAt`), newExpiry);
}

// ============================================
// INVALIDAR CÓDIGO
// ============================================

export async function invalidateRoomCode(code: string): Promise<void> {
  await remove(ref(database, `${ROOM_CODES_PATH}/${code}`));
}

// ============================================
// LIMPIAR CÓDIGOS EXPIRADOS (para Cloud Function)
// ============================================

export async function cleanupExpiredCodes(): Promise<number> {
  const snapshot = await get(ref(database, ROOM_CODES_PATH));
  
  if (!snapshot.exists()) return 0;
  
  const codes = snapshot.val() as Record<string, RoomCode>;
  const now = Date.now();
  let cleaned = 0;
  
  for (const [code, data] of Object.entries(codes)) {
    if (data.expiresAt < now) {
      await remove(ref(database, `${ROOM_CODES_PATH}/${code}`));
      cleaned++;
    }
  }
  
  return cleaned;
}

// ============================================
// HELPERS
// ============================================

export function formatCodeForDisplay(code: string): string {
  // Formato: ABC-123 para mejor legibilidad
  if (code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }
  return code;
}

export function parseCodeFromInput(input: string): string {
  // Remover guiones, espacios, convertir a mayúsculas
  return input.toUpperCase().replace(/[-\s]/g, '');
}

export function getTimeRemaining(expiresAt: number): string {
  const remaining = expiresAt - Date.now();
  
  if (remaining <= 0) return 'Expirado';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}