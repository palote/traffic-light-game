// ============================================
// SavedClassesService.ts
// Servicio para guardar y cargar listas de alumnos por curso
// Ubicación: src/services/savedClassesService.ts
// ============================================

import { ref, set, get, remove, push } from 'firebase/database';
import { database } from '../firebase.config';

export interface SavedClass {
  id: string;
  name: string;
  students: string[];
  defaultTeams: number;
  defaultStudentsPerTeam: number;
  createdAt: number;
  updatedAt: number;
}

export interface NewClassData {
  name: string;
  students: string[];
  defaultTeams?: number;
  defaultStudentsPerTeam?: number;
}

// Obtener todos los cursos de un docente
export async function getSavedClasses(teacherUid: string): Promise<SavedClass[]> {
  try {
    const classesRef = ref(database, `teachers/${teacherUid}/classes`);
    const snapshot = await get(classesRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const classes: SavedClass[] = [];

    Object.entries(data).forEach(([id, classData]: [string, any]) => {
      classes.push({
        id,
        name: classData.name || 'Sin nombre',
        students: classData.students || [],
        defaultTeams: classData.defaultTeams || 6,
        defaultStudentsPerTeam: classData.defaultStudentsPerTeam || 5,
        createdAt: classData.createdAt || Date.now(),
        updatedAt: classData.updatedAt || Date.now(),
      });
    });

    // Ordenar por nombre
    classes.sort((a, b) => a.name.localeCompare(b.name));

    return classes;
  } catch (error) {
    console.error('Error loading saved classes:', error);
    return [];
  }
}

// Guardar un nuevo curso
export async function saveClass(
  teacherUid: string,
  classData: NewClassData
): Promise<string> {
  try {
    const classesRef = ref(database, `teachers/${teacherUid}/classes`);
    const newClassRef = push(classesRef);
    
    await set(newClassRef, {
      name: classData.name,
      students: classData.students,
      defaultTeams: classData.defaultTeams || 6,
      defaultStudentsPerTeam: classData.defaultStudentsPerTeam || 5,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return newClassRef.key || '';
  } catch (error) {
    console.error('Error saving class:', error);
    throw error;
  }
}

// Actualizar un curso existente
export async function updateClass(
  teacherUid: string,
  classId: string,
  updates: Partial<NewClassData>
): Promise<void> {
  try {
    const classRef = ref(database, `teachers/${teacherUid}/classes/${classId}`);
    const snapshot = await get(classRef);
    
    if (!snapshot.exists()) {
      throw new Error('Class not found');
    }

    const currentData = snapshot.val();
    
    await set(classRef, {
      ...currentData,
      ...updates,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Error updating class:', error);
    throw error;
  }
}

// Eliminar un curso
export async function deleteClass(
  teacherUid: string,
  classId: string
): Promise<void> {
  try {
    const classRef = ref(database, `teachers/${teacherUid}/classes/${classId}`);
    await remove(classRef);
  } catch (error) {
    console.error('Error deleting class:', error);
    throw error;
  }
}
