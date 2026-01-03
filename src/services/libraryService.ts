// src/services/libraryService.ts
// Servicio para gestionar la biblioteca de CSVs
// Con soporte para múltiples encodings (UTF-8, Latin-1, Windows-1252)

import { ref, get, set, push, remove, query, orderByChild } from "firebase/database";
import { ref as storageRef, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
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

// ============================================
// UTILIDAD: DETECTAR Y CONVERTIR ENCODING
// ============================================

/**
 * Detecta si el texto tiene caracteres mal codificados (típico de Latin-1 leído como UTF-8)
 * y los corrige.
 */
function fixEncoding(text: string): string {
  // Patrones típicos de Latin-1/Windows-1252 mal interpretado como UTF-8
  const replacements: [RegExp, string][] = [
    // Vocales con tilde
    [/Ã¡/g, 'á'],
    [/Ã©/g, 'é'],
    [/Ã­/g, 'í'],
    [/Ã³/g, 'ó'],
    [/Ãº/g, 'ú'],
    [/Ã/g, 'Á'],
    [/Ã‰/g, 'É'],
    [/Ã/g, 'Í'],
    [/Ã"/g, 'Ó'],
    [/Ãš/g, 'Ú'],
    // Eñe
    [/Ã±/g, 'ñ'],
    [/Ã'/g, 'Ñ'],
    // Diéresis
    [/Ã¼/g, 'ü'],
    [/Ãœ/g, 'Ü'],
    // Signos
    [/Â¿/g, '¿'],
    [/Â¡/g, '¡'],
    [/Âº/g, 'º'],
    [/Âª/g, 'ª'],
    // Comillas y apóstrofes
    [/â€œ/g, '"'],
    [/â€/g, '"'],
    [/â€˜/g, "'"],
    [/â€™/g, "'"],
    [/â€"/g, '–'],
    [/â€"/g, '—'],
    // Espacios especiales
    [/Â /g, ' '],
    // Otros caracteres comunes
    [/Ã§/g, 'ç'],
    [/Ã‡/g, 'Ç'],
  ];

  let fixed = text;
  for (const [pattern, replacement] of replacements) {
    fixed = fixed.replace(pattern, replacement);
  }
  
  return fixed;
}

/**
 * Lee un Blob intentando múltiples encodings y devuelve el texto correctamente decodificado
 */
async function readBlobWithEncoding(blob: Blob): Promise<string> {
  // Primero intentamos UTF-8
  let text = await blob.text();
  
  // Detectar si hay caracteres mal codificados
  const hasBadEncoding = /Ã[¡©­³ºÁÉÍÓÚ±Ñ¼œ§‡]|â€[œ˜™"]/g.test(text);
  
  if (hasBadEncoding) {
    // Aplicar correcciones
    text = fixEncoding(text);
  }
  
  // Si todavía hay caracteres raros, intentar con Latin-1
  if (/[\x80-\x9f]/.test(text)) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const decoder = new TextDecoder('iso-8859-1');
      text = decoder.decode(arrayBuffer);
    } catch (e) {
      console.warn('Error decoding as Latin-1:', e);
    }
  }
  
  return text;
}

/**
 * Lee un archivo File con soporte para múltiples encodings
 */
export function readFileWithEncoding(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async () => {
      let text = reader.result as string;
      
      // Detectar y corregir encoding
      const hasBadEncoding = /Ã[¡©­³ºÁÉÍÓÚ±Ñ¼œ§‡]|â€[œ˜™"]/g.test(text);
      
      if (hasBadEncoding) {
        text = fixEncoding(text);
      }
      
      resolve(text);
    };
    
    reader.onerror = () => reject(reader.error);
    
    // Intentar leer como UTF-8 primero
    reader.readAsText(file, 'UTF-8');
  });
}

// ============================================
// FUNCIONES DE LECTURA
// ============================================

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
 * Descargar CSV usando getBlob con soporte para múltiples encodings
 */


// ... (quitar getBlob del import si está)

/**
 * Descargar CSV usando getDownloadURL + fetch (mejor soporte CORS)
 */
export async function downloadCSVContent(storagePath: string): Promise<string> {
  if (!storagePath) {
    throw new Error("No hay archivo CSV vinculado");
  }
  
  try {
    const fileRef = storageRef(storage, storagePath);
    const downloadURL = await getDownloadURL(fileRef);
    
    const response = await fetch(downloadURL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Detectar y corregir encoding
    const hasBadEncoding = /Ã[¡©­³ºÁÉÍÓÚ±Ñ¼œ§‡]|â€[œ˜™"]/g.test(text);
    
    if (hasBadEncoding) {
      return fixEncoding(text);
    }
    
    return text;
  } catch (error) {
    console.error("Error downloading CSV:", error);
    throw new Error("No se pudo descargar el archivo CSV");
  }
}

/**
 * Crear File object desde contenido descargado
 */
export async function getCSVAsFile(item: CSVLibraryItem): Promise<File> {
  const content = await downloadCSVContent(item.storagePath);
  // Crear blob con charset UTF-8 explícito
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
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
  
  // Corregir encoding antes de subir
  const fixedContent = fixEncoding(csvContent);
  
  // Subir CSV
  const csvFileName = `${timestamp}_${safeTitle}.csv`;
  const csvPath = `csv-library/${folder}/${subFolder}/${item.area}/${csvFileName}`;
  const csvRef = storageRef(storage, csvPath);
  
  await uploadString(csvRef, fixedContent, "raw", { contentType: "text/csv;charset=utf-8" });

  // Subir texto fuente si existe
  let sourceTextPath: string | undefined;
  if (sourceTextContent) {
    const fixedSourceText = fixEncoding(sourceTextContent);
    const txtFileName = `${timestamp}_${safeTitle}_source.txt`;
    const txtPath = `csv-library/${folder}/${subFolder}/${item.area}/${txtFileName}`;
    const txtRef = storageRef(storage, txtPath);
    await uploadString(txtRef, fixedSourceText, "raw", { contentType: "text/plain;charset=utf-8" });
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
  
  // Corregir encoding antes de subir
  const fixedContent = fixEncoding(csvContent);
  
  const timestamp = Date.now();
  const safeTitle = (item.title || 'untitled').replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
  
  const folder = item.gameMode === 'coopetition' ? 'coopetition' : 'traffic-light';
  const subFolder = item.grade || item.level || 'general';
  
  const csvFileName = `${timestamp}_${safeTitle}.csv`;
  const csvPath = `csv-library/${folder}/${subFolder}/${item.area}/${csvFileName}`;
  const csvRef = storageRef(storage, csvPath);
  
  await uploadString(csvRef, fixedContent, "raw", { contentType: "text/csv;charset=utf-8" });
  
  await updateLibraryItemMetadata(itemId, { storagePath: csvPath });
}