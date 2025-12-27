// src/services/libraryService.ts
// Servicio para gestionar la biblioteca de CSVs

import { ref, get, set, push, remove, query, orderByChild } from "firebase/database";
import { ref as storageRef, uploadString, getBlob, deleteObject } from "firebase/storage";
import { database, storage } from "../firebase.config";
import type { 
  CSVLibraryItem, 
  NewCSVLibraryItem, 
  PrimaryGrade, 
  Area, 
  Subject,
  LibraryLanguage,
  LibraryGameMode 
} from "../types/library";

const LIBRARY_PATH = "csvLibrary";

/**
 * Obtener todos los items de la biblioteca
 */
export async function getAllLibraryItems(): Promise<CSVLibraryItem[]> {
  const libraryRef = ref(database, LIBRARY_PATH);
  const snapshot = await get(query(libraryRef, orderByChild("updatedAt")));
  
  if (!snapshot.exists()) {
    return [];
  }

  const items: CSVLibraryItem[] = [];
  snapshot.forEach((child) => {
    items.push({
      id: child.key!,
      ...child.val(),
    });
  });

  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Obtener items filtrados
 */
export async function getFilteredLibraryItems(filters: {
  gameMode?: LibraryGameMode | 'all';
  grade?: PrimaryGrade | 'all';
  area?: Area | 'all';
  subject?: Subject | 'all';
  language?: LibraryLanguage | 'all';
}): Promise<CSVLibraryItem[]> {
  const allItems = await getAllLibraryItems();
  
  return allItems.filter((item) => {
    const gameModeMatch = !filters.gameMode || filters.gameMode === 'all' || item.gameMode === filters.gameMode;
    const gradeMatch = !filters.grade || filters.grade === 'all' || item.grade === filters.grade;
    const areaMatch = !filters.area || filters.area === 'all' || item.area === filters.area;
    const subjectMatch = !filters.subject || filters.subject === 'all' || item.subject === filters.subject;
    const langMatch = !filters.language || filters.language === 'all' || item.language === filters.language;
    
    return gameModeMatch && gradeMatch && areaMatch && subjectMatch && langMatch;
  });
}

/**
 * Obtener un item por ID
 */
export async function getLibraryItemById(itemId: string): Promise<CSVLibraryItem | null> {
  const itemRef = ref(database, `${LIBRARY_PATH}/${itemId}`);
  const snapshot = await get(itemRef);
  
  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: itemId,
    ...snapshot.val(),
  };
}

/**
 * Descargar CSV usando getBlob (evita CORS)
 */
export async function downloadCSVContent(storagePath: string): Promise<string> {
  if (!storagePath) {
    throw new Error("No hay archivo CSV vinculado");
  }
  const fileRef = storageRef(storage, storagePath);
  const blob = await getBlob(fileRef);
  return await blob.text();
}

/**
 * Crear File object desde contenido descargado
 */
export async function getCSVAsFile(item: CSVLibraryItem): Promise<File> {
  const content = await downloadCSVContent(item.storagePath);
  const blob = new Blob([content], { type: "text/csv" });
  const fileName = item.fileName || `${item.title.replace(/\s+/g, "_")}.csv`;
  return new File([blob], fileName, { type: "text/csv" });
}

// ============================================
// FUNCIONES ADMIN
// ============================================

/**
 * Subir nuevo CSV a biblioteca
 */
export async function uploadLibraryItem(
  item: NewCSVLibraryItem,
  csvContent: string,
  sourceTextContent?: string
): Promise<string> {
  const timestamp = Date.now();
  const safeTitle = (item.title || 'untitled').replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
  
  // Determinar carpeta según gameMode
  const folder = item.gameMode === 'coopetition' ? 'coopetition' : 'traffic-light';
  const subFolder = item.grade || item.level || 'general';
  
  // Subir CSV
  const csvFileName = `${timestamp}_${safeTitle}.csv`;
  const csvPath = `csv-library/${folder}/${subFolder}/${item.area}/${csvFileName}`;
  const csvRef = storageRef(storage, csvPath);
  
  await uploadString(csvRef, csvContent, "raw", { contentType: "text/csv" });

  // Subir texto fuente si existe
  let sourceTextPath: string | undefined;
  if (sourceTextContent) {
    const txtFileName = `${timestamp}_${safeTitle}_source.txt`;
    const txtPath = `csv-library/${folder}/${subFolder}/${item.area}/${txtFileName}`;
    const txtRef = storageRef(storage, txtPath);
    await uploadString(txtRef, sourceTextContent, "raw", { contentType: "text/plain" });
    sourceTextPath = txtPath;
  }

  // Crear metadata en DB
  const libraryRef = ref(database, LIBRARY_PATH);
  const newItemRef = push(libraryRef);
  
  const now = Date.now();
  
  // Limpiar item de valores undefined
  const cleanItem: Record<string, any> = {};
  Object.entries(item).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanItem[key] = value;
    }
  });
  
  const itemData = {
    ...cleanItem,
    storagePath: csvPath,
    ...(sourceTextPath ? { sourceTextPath } : {}),
    createdAt: now,
    updatedAt: now,
  };

  await set(newItemRef, itemData);
  return newItemRef.key!;
}

/**
 * Subir solo metadata (para bulk upload)
 */
export async function uploadLibraryMetadataOnly(
  item: NewCSVLibraryItem
): Promise<string> {
  const libraryRef = ref(database, LIBRARY_PATH);
  const newItemRef = push(libraryRef);
  
  const now = Date.now();
  
  // Limpiar item de valores undefined
  const cleanItem: Record<string, any> = {};
  Object.entries(item).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanItem[key] = value;
    }
  });
  
  const itemData = {
    ...cleanItem,
    createdAt: now,
    updatedAt: now,
  };

  await set(newItemRef, itemData);
  return newItemRef.key!;
}

/**
 * Bulk upload de metadata
 */
export async function bulkUploadMetadata(
  items: NewCSVLibraryItem[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const item of items) {
    const id = await uploadLibraryMetadataOnly(item);
    ids.push(id);
  }
  return ids;
}

/**
 * Eliminar item de biblioteca
 */
export async function deleteLibraryItem(itemId: string): Promise<void> {
  const item = await getLibraryItemById(itemId);
  if (!item) {
    throw new Error("Item no encontrado");
  }

  // Eliminar CSV
  if (item.storagePath) {
    try {
      const fileRef = storageRef(storage, item.storagePath);
      await deleteObject(fileRef);
    } catch (e) {
      console.warn("No se pudo eliminar CSV:", e);
    }
  }

  // Eliminar texto fuente
  if (item.sourceTextPath) {
    try {
      const txtRef = storageRef(storage, item.sourceTextPath);
      await deleteObject(txtRef);
    } catch (e) {
      console.warn("No se pudo eliminar texto fuente:", e);
    }
  }

  // Eliminar metadata
  const itemRef = ref(database, `${LIBRARY_PATH}/${itemId}`);
  await remove(itemRef);
}

/**
 * Actualizar metadata de un item
 */
export async function updateLibraryItemMetadata(
  itemId: string,
  updates: Partial<Omit<CSVLibraryItem, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const itemRef = ref(database, `${LIBRARY_PATH}/${itemId}`);
  const snapshot = await get(itemRef);
  
  if (!snapshot.exists()) {
    throw new Error("Item no encontrado");
  }

  const currentData = snapshot.val();
  
  // Limpiar updates de valores undefined
  const cleanUpdates: Record<string, any> = {};
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  });
  
  await set(itemRef, {
    ...currentData,
    ...cleanUpdates,
    updatedAt: Date.now(),
  });
}

/**
 * Vincular archivo CSV a un item existente
 */
export async function linkCSVFile(
  itemId: string,
  csvContent: string
): Promise<void> {
  const item = await getLibraryItemById(itemId);
  if (!item) {
    throw new Error("Item no encontrado");
  }
  
  const timestamp = Date.now();
  const safeTitle = (item.title || 'untitled').replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
  
  const folder = item.gameMode === 'coopetition' ? 'coopetition' : 'traffic-light';
  const subFolder = item.grade || item.level || 'general';
  
  const csvFileName = `${timestamp}_${safeTitle}.csv`;
  const csvPath = `csv-library/${folder}/${subFolder}/${item.area}/${csvFileName}`;
  const csvRef = storageRef(storage, csvPath);
  
  await uploadString(csvRef, csvContent, "raw", { contentType: "text/csv" });
  
  await updateLibraryItemMetadata(itemId, { storagePath: csvPath });
}