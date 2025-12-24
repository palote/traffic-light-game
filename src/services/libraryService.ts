// src/services/libraryService.ts
// Servicio para gestionar la biblioteca de CSVs

import { ref, get, set, push, remove, query, orderByChild } from "firebase/database";
import { ref as storageRef, uploadString, getBlob, deleteObject } from "firebase/storage";
import { database, storage } from "../firebase.config";
import type { CSVLibraryItem, NewCSVLibraryItem, Grade, Subject } from "../types/library";

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

  // Ordenar por fecha descendente (más recientes primero)
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Obtener items filtrados por grado y/o materia
 */
export async function getFilteredLibraryItems(
  grade?: Grade | 'all',
  subject?: Subject | 'all'
): Promise<CSVLibraryItem[]> {
  const allItems = await getAllLibraryItems();
  
  return allItems.filter((item) => {
    const gradeMatch = !grade || grade === 'all' || item.grade === grade;
    const subjectMatch = !subject || subject === 'all' || item.subject === subject;
    return gradeMatch && subjectMatch;
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
 * ✅ Descargar el contenido CSV de un item usando getBlob (evita CORS)
 */
export async function downloadCSVContent(storagePath: string): Promise<string> {
  const fileRef = storageRef(storage, storagePath);
  
  // ✅ Usar getBlob en lugar de getDownloadURL + fetch
  // Esto evita el problema de CORS porque el SDK maneja la descarga internamente
  const blob = await getBlob(fileRef);
  
  // Convertir Blob a texto
  const text = await blob.text();
  return text;
}

/**
 * Crear un File object desde el contenido descargado
 * (para simular un archivo subido y usar con CSVPreview)
 */
export async function getCSVAsFile(item: CSVLibraryItem): Promise<File> {
  const content = await downloadCSVContent(item.storagePath);
  const blob = new Blob([content], { type: "text/csv" });
  const fileName = `${item.title.replace(/\s+/g, "_")}.csv`;
  return new File([blob], fileName, { type: "text/csv" });
}

// ============================================
// FUNCIONES ADMIN (para subir nuevos CSVs)
// ============================================

/**
 * Subir un nuevo CSV a la biblioteca
 */
export async function uploadLibraryItem(
  item: NewCSVLibraryItem,
  csvContent: string
): Promise<string> {
  // 1. Subir archivo a Storage
  const fileName = `${Date.now()}_${item.title.replace(/\s+/g, "_")}.csv`;
  const filePath = `csv-library/${item.grade}/${item.subject}/${fileName}`;
  const fileRef = storageRef(storage, filePath);
  
  await uploadString(fileRef, csvContent, "raw", {
    contentType: "text/csv",
  });

  // 2. Crear metadata en Realtime DB
  const libraryRef = ref(database, LIBRARY_PATH);
  const newItemRef = push(libraryRef);
  
  const now = Date.now();
  const itemData: Omit<CSVLibraryItem, "id"> = {
    ...item,
    storagePath: filePath,
    createdAt: now,
    updatedAt: now,
  };

  await set(newItemRef, itemData);
  
  return newItemRef.key!;
}

/**
 * Eliminar un item de la biblioteca
 */
export async function deleteLibraryItem(itemId: string): Promise<void> {
  // 1. Obtener el item para saber el storagePath
  const item = await getLibraryItemById(itemId);
  if (!item) {
    throw new Error("Item no encontrado");
  }

  // 2. Eliminar archivo de Storage
  try {
    const fileRef = storageRef(storage, item.storagePath);
    await deleteObject(fileRef);
  } catch (e) {
    console.warn("No se pudo eliminar archivo de Storage:", e);
  }

  // 3. Eliminar metadata de Realtime DB
  const itemRef = ref(database, `${LIBRARY_PATH}/${itemId}`);
  await remove(itemRef);
}

/**
 * Actualizar metadata de un item (sin cambiar el archivo)
 */
export async function updateLibraryItemMetadata(
  itemId: string,
  updates: Partial<Pick<CSVLibraryItem, "title" | "content" | "grade" | "subject">>
): Promise<void> {
  const itemRef = ref(database, `${LIBRARY_PATH}/${itemId}`);
  const snapshot = await get(itemRef);
  
  if (!snapshot.exists()) {
    throw new Error("Item no encontrado");
  }

  const currentData = snapshot.val();
  await set(itemRef, {
    ...currentData,
    ...updates,
    updatedAt: Date.now(),
  });
}