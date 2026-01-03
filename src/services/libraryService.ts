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
 * Heurística: detecta mojibake típico y/o reemplazos del decoder
 */
function hasBadEncodingMarkers(text: string): boolean {
  return /�|Ã|Â|â€/.test(text);
}

/**
 * ✅ NUEVO: detecta el carácter de reemplazo U+FFFD (�).
 * Si ya existe en el string, significa que en algún punto previo
 * se perdió información (bytes inválidos reemplazados), y ningún "repair"
 * puede recuperar los caracteres originales.
 */
function containsReplacementChar(text: string): boolean {
  return text.includes("�");
}

/**
 * Score: menor = mejor.
 * - penaliza replacement char "�"
 * - penaliza mojibake típico (Ã, Â, â€)
 */
function scoreDecodedText(text: string): number {
  const repl = (text.match(/�/g) || []).length;
  const mojibake = (text.match(/Ã|Â|â€/g) || []).length;
  const ctrl = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
  return repl * 10 + mojibake * 3 + ctrl * 2;
}

/**
 * Reparación general para mojibake: “latin1 string” → bytes → decode UTF-8
 * Ej: "Ã¡" → "á"
 */
function repairLatin1ToUtf8(text: string): string {
  const bytes = new Uint8Array([...text].map((ch) => ch.charCodeAt(0) & 0xff));
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

/**
 * Decodifica bytes probando varios encodings y elige el mejor.
 * Mantiene la lógica: devuelve un string listo para parsear.
 */
function decodeBytesBestEffort(bytes: ArrayBuffer): { text: string; chosen: string; debug: any } {
  const candidates: { enc: string; text: string }[] = [];

  // 1) UTF-8
  try {
    candidates.push({ enc: "utf-8", text: new TextDecoder("utf-8", { fatal: false }).decode(bytes) });
  } catch {
    // ignore
  }

  // 2) Windows-1252
  try {
    candidates.push({ enc: "windows-1252", text: new TextDecoder("windows-1252", { fatal: false }).decode(bytes) });
  } catch {
    // ignore
  }

  // 3) ISO-8859-1
  try {
    candidates.push({ enc: "iso-8859-1", text: new TextDecoder("iso-8859-1", { fatal: false }).decode(bytes) });
  } catch {
    // ignore
  }

  // Elegir el mejor score
  let best = candidates[0] ?? { enc: "utf-8", text: "" };
  let bestScore = scoreDecodedText(best.text);

  for (const c of candidates) {
    const sc = scoreDecodedText(c.text);
    if (sc < bestScore) {
      best = c;
      bestScore = sc;
    }
  }

  let finalText = best.text;
  const beforeRepairScore = scoreDecodedText(finalText);

  // Si el “mejor” todavía parece mojibake, intentamos reparación latin1→utf8
  // ✅ PERO: si ya tiene '�' en cantidad, probablemente ya hubo pérdida.
  if (hasBadEncodingMarkers(finalText)) {
    try {
      const repaired = repairLatin1ToUtf8(finalText);
      const afterRepairScore = scoreDecodedText(repaired);

      if (afterRepairScore < beforeRepairScore) {
        finalText = repaired;
        best = { enc: `${best.enc}+repair(latin1→utf8)`, text: finalText };
      }
    } catch {
      // ignore
    }
  }

  return {
    text: finalText,
    chosen: best.enc,
    debug: {
      candidates: candidates.map((c) => ({ enc: c.enc, score: scoreDecodedText(c.text) })),
      chosen: best.enc,
      chosenScore: scoreDecodedText(finalText),
    },
  };
}

/**
 * Lee un archivo File con soporte para múltiples encodings
 * (sin cambiar la API: sigue devolviendo Promise<string>)
 */
export function readFileWithEncoding(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        const decoded = decodeBytesBestEffort(buffer);

        console.log("[libraryService] readFileWithEncoding decode:", {
          fileName: file.name,
          chosen: decoded.chosen,
          ...decoded.debug,
        });

        resolve(decoded.text);
      } catch (e) {
        reject(e);
      }
    };

    reader.onerror = () => reject(reader.error);

    // ✅ clave: leer bytes, no forzar UTF-8
    reader.readAsArrayBuffer(file);
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
  gameMode?: LibraryGameMode | "all";
  grade?: PrimaryGrade | "all";
  area?: Area | "all";
  subject?: Subject | "all";
  language?: LibraryLanguage | "all";
}): Promise<CSVLibraryItem[]> {
  const allItems = await getAllLibraryItems();

  return allItems.filter((item) => {
    const gameModeMatch =
      !filters.gameMode || filters.gameMode === "all" || item.gameMode === filters.gameMode;
    const gradeMatch = !filters.grade || filters.grade === "all" || item.grade === filters.grade;
    const areaMatch = !filters.area || filters.area === "all" || item.area === filters.area;
    const subjectMatch =
      !filters.subject || filters.subject === "all" || item.subject === filters.subject;
    const langMatch =
      !filters.language || filters.language === "all" || item.language === filters.language;

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
 * Descargar CSV usando getDownloadURL + fetch (mejor soporte CORS)
 * ✅ Modificado: leer como bytes y decodificar con mejor esfuerzo.
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

    // ✅ clave: bytes → decoder múltiple
    const buffer = await response.arrayBuffer();
    const decoded = decodeBytesBestEffort(buffer);

    console.log("[libraryService] downloadCSVContent decode:", {
      storagePath,
      chosen: decoded.chosen,
      ...decoded.debug,
    });

    return decoded.text;
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
  const safeTitle = (item.title || "untitled")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  // Determinar carpeta según gameMode
  const folder = item.gameMode === "coopetition" ? "coopetition" : "traffic-light";
  const subFolder = item.grade || item.level || "general";

  // ✅ NUEVO: si ya viene con '�', avisar (y NO intentar repair)
  if (containsReplacementChar(csvContent)) {
    console.warn("[libraryService] uploadLibraryItem: CSV contiene '�' antes de subir. Posible corrupción previa.");
  }

  // ✅ Solo reparar si hay señales de problema Y NO hay '�'
  let fixedContent = csvContent;
  if (!containsReplacementChar(csvContent) && hasBadEncodingMarkers(csvContent)) {
    try {
      const repaired = repairLatin1ToUtf8(csvContent);
      if (scoreDecodedText(repaired) < scoreDecodedText(csvContent)) {
        fixedContent = repaired;
      }
    } catch {
      // si falla, dejamos como vino
    }
  }

  // Subir CSV
  const csvFileName = `${timestamp}_${safeTitle}.csv`;
  const csvPath = `csv-library/${folder}/${subFolder}/${item.area}/${csvFileName}`;
  const csvRef = storageRef(storage, csvPath);

  await uploadString(csvRef, fixedContent, "raw", { contentType: "text/csv;charset=utf-8" });

  // Subir texto fuente si existe
  let sourceTextPath: string | undefined;
  if (sourceTextContent) {
    if (containsReplacementChar(sourceTextContent)) {
      console.warn("[libraryService] uploadLibraryItem: sourceText contiene '�' antes de subir. Posible corrupción previa.");
    }

    let fixedSourceText = sourceTextContent;

    if (!containsReplacementChar(sourceTextContent) && hasBadEncodingMarkers(sourceTextContent)) {
      try {
        const repaired = repairLatin1ToUtf8(sourceTextContent);
        if (scoreDecodedText(repaired) < scoreDecodedText(sourceTextContent)) {
          fixedSourceText = repaired;
        }
      } catch {
        // ignore
      }
    }

    const txtFileName = `${timestamp}_${safeTitle}_source.txt`;
    const txtPath = `csv-library/${folder}/${subFolder}/${item.area}/${txtFileName}`;
    const txtRef = storageRef(storage, txtPath);
    await uploadString(txtRef, fixedSourceText, "raw", {
      contentType: "text/plain;charset=utf-8",
    });
    sourceTextPath = txtPath;
  }

  // Crear metadata en DB
  const libraryRef = ref(database, LIBRARY_PATH);
  const newItemRef = push(libraryRef);

  const now = Date.now();

  // Limpiar item de valores undefined
  const cleanItem: Record<string, any> = {};
  Object.entries(item).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
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
export async function uploadLibraryMetadataOnly(item: NewCSVLibraryItem): Promise<string> {
  const libraryRef = ref(database, LIBRARY_PATH);
  const newItemRef = push(libraryRef);

  const now = Date.now();

  // Limpiar item de valores undefined
  const cleanItem: Record<string, any> = {};
  Object.entries(item).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
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
export async function bulkUploadMetadata(items: NewCSVLibraryItem[]): Promise<string[]> {
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
  updates: Partial<Omit<CSVLibraryItem, "id" | "createdAt" | "updatedAt">>
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
export async function linkCSVFile(itemId: string, csvContent: string): Promise<void> {
  const item = await getLibraryItemById(itemId);
  if (!item) {
    throw new Error("Item no encontrado");
  }

  // ✅ NUEVO: si ya viene con '�', avisar (y NO intentar repair)
  if (containsReplacementChar(csvContent)) {
    console.warn("[libraryService] linkCSVFile: CSV contiene '�' antes de subir. Posible corrupción previa.");
  }

  // ✅ Solo reparar si hay señales de problema Y NO hay '�'
  let fixedContent = csvContent;
  if (!containsReplacementChar(csvContent) && hasBadEncodingMarkers(csvContent)) {
    try {
      const repaired = repairLatin1ToUtf8(csvContent);
      if (scoreDecodedText(repaired) < scoreDecodedText(csvContent)) {
        fixedContent = repaired;
      }
    } catch {
      // ignore
    }
  }

  const timestamp = Date.now();
  const safeTitle = (item.title || "untitled")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  const folder = item.gameMode === "coopetition" ? "coopetition" : "traffic-light";
  const subFolder = item.grade || item.level || "general";

  const csvFileName = `${timestamp}_${safeTitle}.csv`;
  const csvPath = `csv-library/${folder}/${subFolder}/${item.area}/${csvFileName}`;
  const csvRef = storageRef(storage, csvPath);

  await uploadString(csvRef, fixedContent, "raw", { contentType: "text/csv;charset=utf-8" });

  await updateLibraryItemMetadata(itemId, { storagePath: csvPath });
}
