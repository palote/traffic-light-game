// src/services/teacherLibraryService.ts
// Servicio para biblioteca personal y compartida de docentes

import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  limitToLast,
} from 'firebase/database';
import {
  ref as storageRef,
  uploadString,
  getDownloadURL,
  deleteObject,
  getBlob,
} from 'firebase/storage';
import { database, storage, auth } from '../firebase.config';
import type {
  TeacherGame,
  NewTeacherGame,
  GameRating,
  GameReport,
  ReportReason,
  TeacherLibraryFilters,
} from '../types/teacherLibrary';
import { TEACHER_LIMITS } from '../types/teacherLibrary';

// ============================================
// CREAR / GUARDAR JUEGO
// ============================================
export async function saveTeacherGame(
  userId: string,
  userName: string,
  userEmail: string,
  gameData: NewTeacherGame,
  csvContent: string
): Promise<string> {
  // ✅ DEBUG
  console.log("🔍 saveTeacherGame called");
  console.log("🔍 userId:", userId);
  console.log("🔍 storagePath will be:", `teacher-games/${userId}/[gameId].csv`);

  // Verificar límite de juegos privados
  if (gameData.visibility === 'private') {
    const privateCount = await getPrivateGameCount(userId);
    if (privateCount >= TEACHER_LIMITS.maxPrivateGames) {
      throw new Error(`Has alcanzado el límite de ${TEACHER_LIMITS.maxPrivateGames} juegos privados. Hacé público alguno para liberar espacio.`);
    }
  }

  // Crear referencia
  const gamesRef = ref(database, 'teacherGames');
  const newGameRef = push(gamesRef);
  const gameId = newGameRef.key!;

  // Subir CSV a Storage
  const storagePath = `teacher-games/${userId}/${gameId}.csv`;
  console.log("🔍 Attempting upload to:", storagePath);
  console.log("🔍 Auth state:", auth.currentUser?.uid);

  const fileRef = storageRef(storage, storagePath);

  try {
    await uploadString(fileRef, csvContent, 'raw', {
      contentType: 'text/csv;charset=utf-8'
    });
    console.log("✅ Upload successful");
  } catch (uploadError: any) {
    console.error("❌ Storage upload error:", {
      code: uploadError.code,
      message: uploadError.message,
      serverResponse: uploadError.serverResponse,
      storagePath,
      userId,
      authUid: auth.currentUser?.uid,
    });
    throw uploadError;
  }

  // Contar preguntas
  const lines = csvContent.split('\n').filter(l => l.trim());
  const questionCount = Math.max(0, lines.length - 1); // -1 por header

  // Crear documento base
  const now = Date.now();
  const gameBase = {
    id: gameId,
    ownerId: userId,
    ownerName: userName,
    ownerEmail: userEmail,
    visibility: gameData.visibility,
    title: gameData.title,
    description: gameData.description || '',
    gameMode: gameData.gameMode,
    language: gameData.language,
    area: gameData.area || '',
    subject: gameData.subject || '',
    grade: gameData.grade || '',
    level: gameData.level || '',
    topic: gameData.topic || '',
    mainContents: gameData.mainContents || '',
    mainSkills: gameData.mainSkills || '',
    storagePath,
    questionCount,
    ratingSum: 0,
    ratingCount: 0,
    ratingAvg: 0,
    timesUsed: 0,
    timesCopied: 0,
    reportCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Agregar publishedAt solo si es público
  const game: TeacherGame = {
    ...gameBase,
    ...(gameData.visibility === 'public' ? { publishedAt: now } : {}),
  } as TeacherGame;

  await set(newGameRef, game);

  // Agregar a índice del usuario
  await set(ref(database, `userGames/${userId}/${gameId}`), {
    gameId,
    visibility: gameData.visibility,
    createdAt: now,
  });

  return gameId;
}

// ============================================
// OBTENER JUEGOS
// ============================================

export async function getMyGames(userId: string): Promise<TeacherGame[]> {
  const userGamesRef = ref(database, `userGames/${userId}`);
  const snapshot = await get(userGamesRef);

  if (!snapshot.exists()) return [];

  const gameIds = Object.keys(snapshot.val());
  const games: TeacherGame[] = [];

  for (const gameId of gameIds) {
    const gameSnap = await get(ref(database, `teacherGames/${gameId}`));
    if (gameSnap.exists()) {
      games.push(gameSnap.val() as TeacherGame);
    }
  }

  return games.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getCommunityGames(filters?: Partial<TeacherLibraryFilters>): Promise<TeacherGame[]> {
  const gamesRef = ref(database, 'teacherGames');
  const snapshot = await get(gamesRef);

  if (!snapshot.exists()) return [];

  const allGames = Object.values(snapshot.val()) as TeacherGame[];

  // Filtrar solo públicos y no reportados excesivamente
  let games = allGames.filter(g =>
    g.visibility === 'public' &&
    g.reportCount < 5 // Ocultar si tiene muchos reportes
  );

  // Aplicar filtros
  if (filters) {
    if (filters.gameMode && filters.gameMode !== 'all') {
      games = games.filter(g => g.gameMode === filters.gameMode);
    }
    if (filters.grade && filters.grade !== 'all') {
      games = games.filter(g => g.grade === filters.grade);
    }
    if (filters.area && filters.area !== 'all') {
      games = games.filter(g => g.area === filters.area);
    }
    if (filters.subject && filters.subject !== 'all') {
      games = games.filter(g => g.subject === filters.subject);
    }
    if (filters.language && filters.language !== 'all') {
      games = games.filter(g => g.language === filters.language);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      games = games.filter(g =>
        g.title.toLowerCase().includes(search) ||
        g.description.toLowerCase().includes(search) ||
        g.topic.toLowerCase().includes(search) ||
        g.ownerName.toLowerCase().includes(search)
      );
    }
  }

  // Ordenar
  const sortBy = filters?.sortBy || 'recent';
  if (sortBy === 'rating') {
    games.sort((a, b) => b.ratingAvg - a.ratingAvg);
  } else if (sortBy === 'popular') {
    games.sort((a, b) => b.timesUsed - a.timesUsed);
  } else {
    games.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
  }

  return games;
}

export async function getGameById(gameId: string): Promise<TeacherGame | null> {
  const snapshot = await get(ref(database, `teacherGames/${gameId}`));
  return snapshot.exists() ? (snapshot.val() as TeacherGame) : null;
}

// ============================================
// ACTUALIZAR JUEGO
// ============================================

export async function updateTeacherGame(
  gameId: string,
  userId: string,
  updates: Partial<NewTeacherGame>
): Promise<void> {
  const game = await getGameById(gameId);
  if (!game) throw new Error('Juego no encontrado');
  if (game.ownerId !== userId) throw new Error('No tenés permiso para editar este juego');

  // ✅ NUEVO: Limpiar undefined - Firebase no los acepta
  const cleanUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  }

  const updateData: Record<string, any> = {
    ...cleanUpdates,
    updatedAt: Date.now(),
  };

  // Si cambia a público, agregar publishedAt
  if (updates.visibility === 'public' && game.visibility === 'private') {
    updateData.publishedAt = Date.now();
  }

  await update(ref(database, `teacherGames/${gameId}`), updateData);

  // Actualizar índice si cambia visibilidad
  if (updates.visibility && updates.visibility !== game.visibility) {
    await update(ref(database, `userGames/${userId}/${gameId}`), {
      visibility: updates.visibility,
    });
  }
}

export async function deleteTeacherGame(
  gameId: string,
  oderId: string,
  isAdmin: boolean = false  // ← NUEVO parámetro
): Promise<void> {
  const game = await getGameById(gameId);
  if (!game) throw new Error('Juego no encontrado');

  // Permitir si es owner O si es admin
  if (game.ownerId !== oderId && !isAdmin) {
    throw new Error('No tenés permiso para eliminar este juego');
  }

  // Eliminar CSV de Storage
  try {
    const fileRef = storageRef(storage, game.storagePath);
    await deleteObject(fileRef);
  } catch (e) {
    console.warn('CSV no encontrado en storage:', e);
  }

  // Eliminar de la base de datos
  await remove(ref(database, `teacherGames/${gameId}`));

  // Si es el owner, también eliminar de userGames
  // Si es admin borrando juego de otro, eliminar de userGames del owner original
  const ownerToClean = game.ownerId;
  await remove(ref(database, `userGames/${ownerToClean}/${gameId}`));

  // Eliminar ratings asociados
  const ratingsSnap = await get(ref(database, `gameRatings/${gameId}`));
  if (ratingsSnap.exists()) {
    await remove(ref(database, `gameRatings/${gameId}`));
  }
}

// ============================================
// COPIAR JUEGO
// ============================================

export async function copyGameToMyLibrary(
  gameId: string,
  userId: string,
  userName: string,
  userEmail: string
): Promise<string> {
  const original = await getGameById(gameId);
  if (!original) throw new Error('Juego no encontrado');
  if (original.visibility !== 'public') throw new Error('Solo se pueden copiar juegos públicos');

  // Obtener CSV original
  const fileRef = storageRef(storage, original.storagePath);
  const blob = await getBlob(fileRef);
  const csvContent = await blob.text();

  // Crear copia
  const newGameData: NewTeacherGame = {
    title: `${original.title} (copia)`,
    description: original.description,
    gameMode: original.gameMode,
    language: original.language,
    area: original.area,
    subject: original.subject,
    grade: original.grade,
    level: original.level,
    topic: original.topic,
    mainContents: original.mainContents,
    mainSkills: original.mainSkills,
    visibility: 'private', // Las copias empiezan privadas
  };

  const newGameId = await saveTeacherGame(userId, userName, userEmail, newGameData, csvContent);

  // Incrementar contador de copias del original
  await update(ref(database, `teacherGames/${gameId}`), {
    timesCopied: (original.timesCopied || 0) + 1,
  });

  return newGameId;
}

// ============================================
// USAR JUEGO (incrementar contador)
// ============================================

export async function incrementGameUsage(gameId: string): Promise<void> {
  const game = await getGameById(gameId);
  if (!game) return;

  await update(ref(database, `teacherGames/${gameId}`), {
    timesUsed: (game.timesUsed || 0) + 1,
  });
}

// ============================================
// DESCARGAR CSV
// ============================================

export async function getTeacherGameCSV(game: TeacherGame): Promise<File> {
  const fileRef = storageRef(storage, game.storagePath);
  const blob = await getBlob(fileRef);
  return new File([blob], `${game.title}.csv`, { type: 'text/csv' });
}

// ============================================
// RATING
// ============================================

export async function rateGame(
  gameId: string,
  userId: string,
  userEmail: string, // ← PARÁMETRO AGREGADO
  stars: number,
  comment?: string
): Promise<void> {
  if (stars < 1 || stars > 5) throw new Error('Rating debe ser entre 1 y 5');

  const game = await getGameById(gameId);
  if (!game) throw new Error('Juego no encontrado');
  if (game.visibility !== 'public') throw new Error('Solo se pueden calificar juegos públicos');
  if (game.ownerId === userId) throw new Error('No podés calificar tu propio juego');

  // Verificar si ya votó
  const existingRating = await get(ref(database, `gameRatings/${gameId}/${userId}`));
  const hadPreviousRating = existingRating.exists();
  const previousStars = hadPreviousRating ? (existingRating.val() as GameRating).stars : 0;

  // Guardar rating
  const rating: GameRating = {
    userId,  // ← CORRECTO
    userEmail,
    gameId,
    stars,
    createdAt: Date.now(),
    ...(comment ? { comment } : {}),
  };
  await set(ref(database, `gameRatings/${gameId}/${userId}`), rating);

  // Actualizar promedio del juego
  let newSum = game.ratingSum;
  let newCount = game.ratingCount;

  if (hadPreviousRating) {
    newSum = newSum - previousStars + stars;
  } else {
    newSum += stars;
    newCount += 1;
  }

  const newAvg = newCount > 0 ? newSum / newCount : 0;

  // ✅ CORREGIDO: La ruta debe ser `teacherGames`, no `games`
  await update(ref(database, `teacherGames/${gameId}`), {
    ratingSum: newSum,
    ratingCount: newCount,
    ratingAvg: Math.round(newAvg * 10) / 10, // 1 decimal
  });
}

export async function getMyRating(gameId: string, userId: string): Promise<number | null> {
  const snapshot = await get(ref(database, `gameRatings/${gameId}/${userId}`));
  if (!snapshot.exists()) return null;
  return (snapshot.val() as GameRating).stars;
}

// ============================================
// REPORTES
// ============================================

export async function reportGame(
  gameId: string,
  userId: string,
  reason: ReportReason,
  details?: string
): Promise<void> {
  const game = await getGameById(gameId);
  if (!game) throw new Error('Juego no encontrado');

  // Verificar si ya reportó
  const existingReport = await get(ref(database, `gameReports/${gameId}/${userId}`));
  if (existingReport.exists()) {
    throw new Error('Ya reportaste este juego');
  }

  const reportRef = ref(database, `gameReports/${gameId}/${userId}`);
  const report: GameReport = {
    id: `${gameId}_${userId}`,
    userId: userId,
    gameId,
    reason,
    details,
    createdAt: Date.now(),
    resolved: false,
  };
  await set(reportRef, report);

  // Incrementar contador
  await update(ref(database, `teacherGames/${gameId}`), {
    reportCount: (game.reportCount || 0) + 1,
  });
}

// ============================================
// HELPERS
// ============================================

async function getPrivateGameCount(userId: string): Promise<number> {
  const userGamesRef = ref(database, `userGames/${userId}`);
  const snapshot = await get(userGamesRef);

  if (!snapshot.exists()) return 0;

  const games = Object.values(snapshot.val()) as Array<{ visibility: string }>;
  return games.filter(g => g.visibility === 'private').length;
}

export async function getGameStats(userId: string): Promise<{
  privateCount: number;
  publicCount: number;
  totalUses: number;
  avgRating: number;
}> {
  const games = await getMyGames(userId);

  const privateCount = games.filter(g => g.visibility === 'private').length;
  const publicCount = games.filter(g => g.visibility === 'public').length;
  const totalUses = games.reduce((sum, g) => sum + (g.timesUsed || 0), 0);

  const publicGames = games.filter(g => g.visibility === 'public' && g.ratingCount > 0);
  const avgRating = publicGames.length > 0
    ? publicGames.reduce((sum, g) => sum + g.ratingAvg, 0) / publicGames.length
    : 0;

  return { privateCount, publicCount, totalUses, avgRating };
}