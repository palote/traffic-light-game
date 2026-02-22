// src/services/classroomService.ts
// 📚 Servicio para interactuar con Google Classroom API
// ✅ ACTUALIZADO: Agregada función para crear anuncios

import { auth } from "../firebase.config";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// ============================================
// TIPOS
// ============================================

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  ownerId: string;
  courseState: string;
}

export interface ClassroomStudent {
  userId: string;
  profile: {
    id: string;
    name: {
      givenName: string;
      familyName: string;
      fullName: string;
    };
    emailAddress?: string;
    photoUrl?: string;
  };
}

export interface ClassroomAnnouncement {
  id: string;
  courseId: string;
  text: string;
  state: string;
  creationTime: string;
  updateTime: string;
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

// Scopes necesarios para Classroom
const CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
  "https://www.googleapis.com/auth/classroom.announcements",
  "https://www.googleapis.com/auth/classroom.profile.emails",
  "https://www.googleapis.com/auth/classroom.profile.photos",
];

/**
 * Obtiene un access token para Google Classroom API
 * Si ya hay uno válido en caché, lo reutiliza
 */
export async function getClassroomAccessToken(): Promise<string> {
  // Si tenemos token válido en caché, usarlo
  if (cachedAccessToken && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

  // Necesitamos obtener un nuevo token
  const provider = new GoogleAuthProvider();

  // Agregar scopes necesarios
  CLASSROOM_SCOPES.forEach(scope => {
    provider.addScope(scope);
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error("No se pudo obtener el token de acceso");
    }

    // Cachear el token por 55 minutos (los tokens duran 60 min)
    cachedAccessToken = credential.accessToken;
    tokenExpiry = Date.now() + 55 * 60 * 1000;

    return cachedAccessToken;
  } catch (error: any) {
    console.error("Error obteniendo token de Classroom:", error);

    if (error.code === "auth/popup-blocked") {
      throw new Error("El navegador bloqueó la ventana emergente. Permití los popups para este sitio.");
    }
    if (error.code === "auth/popup-closed-by-user") {
      throw new Error("Cerraste la ventana de autorización. Intentá de nuevo.");
    }
    if (error.code === "auth/unauthorized-domain") {
      throw new Error("Este dominio no está autorizado. Contactá al administrador.");
    }

    throw new Error("Error al conectar con Google Classroom: " + error.message);
  }
}

/**
 * Limpia el token cacheado (útil para forzar re-autenticación)
 */
export function clearClassroomToken(): void {
  cachedAccessToken = null;
  tokenExpiry = 0;
}

// ============================================
// API CALLS - CURSOS
// ============================================

/**
 * Obtiene la lista de cursos donde el usuario es profesor
 */
export async function getCourses(): Promise<ClassroomCourse[]> {
  const token = await getClassroomAccessToken();

  const response = await fetch(
    "https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      clearClassroomToken();
      throw new Error("Sesión expirada. Intentá de nuevo.");
    }
    if (response.status === 403) {
      throw new Error("No tenés permiso para acceder a Google Classroom. Asegurate de tener una cuenta de Google Workspace for Education.");
    }
    throw new Error(`Error al obtener cursos: ${response.status}`);
  }

  const data = await response.json();
  return data.courses || [];
}

// ============================================
// API CALLS - ESTUDIANTES
// ============================================

/**
 * Obtiene la lista de estudiantes de un curso
 */
export async function getStudents(courseId: string): Promise<SimpleStudent[]> {
  const token = await getClassroomAccessToken();
  const allStudents: any[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`https://classroom.googleapis.com/v1/courses/${courseId}/students`);
    url.searchParams.set("pageSize", "100");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearClassroomToken();
        throw new Error("Sesión expirada. Intentá de nuevo.");
      }
      if (response.status === 403) {
        throw new Error("No tenés permiso para ver los estudiantes de este curso.");
      }
      throw new Error(`Error al obtener estudiantes: ${response.status}`);
    }

    const data = await response.json();
    
    // 🔴 DEBUG: Ver qué viene de la API
    console.log("🔴 RAW API RESPONSE:", JSON.stringify(data, null, 2));
    
    if (data.students) {
      allStudents.push(...data.students);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  // 🔴 DEBUG: Ver estructura de un estudiante
  if (allStudents.length > 0) {
    console.log("🔴 FIRST STUDENT STRUCTURE:", JSON.stringify(allStudents[0], null, 2));
  }

  // Transformar a estructura simple
  const result = allStudents.map(s => {
    // Intentar obtener el nombre de varias formas posibles
    const name = 
      s.profile?.name?.fullName ||
      s.profile?.name?.givenName + " " + (s.profile?.name?.familyName || "") ||
      s.profile?.emailAddress?.split("@")[0] ||
      s.name ||
      "";
    
    console.log("🔴 Student mapping:", { 
      raw: s.profile?.name, 
      extracted: name.trim() 
    });
    
    return {
      id: s.userId || s.profile?.id || "",
      name: name.trim(),
      email: s.profile?.emailAddress,
      photoUrl: s.profile?.photoUrl,
    };
  });

  // Filtrar los que quedaron sin nombre
  return result.filter(s => s.name && s.name !== "");
}


// ============================================
// API CALLS - ANUNCIOS
// ============================================

/**
 * Crea un anuncio en un curso de Google Classroom
 * Los estudiantes recibirán una notificación automáticamente
 */
export async function createAnnouncement(
  courseId: string,
  text: string
): Promise<ClassroomAnnouncement> {
  const token = await getClassroomAccessToken();

  const response = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/announcements`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        state: "PUBLISHED", // Publicar inmediatamente
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      clearClassroomToken();
      throw new Error("Sesión expirada. Intentá de nuevo.");
    }
    if (response.status === 403) {
      throw new Error("No tenés permiso para publicar anuncios en este curso. Asegurate de ser profesor del curso.");
    }

    const errorData = await response.json().catch(() => ({}));
    console.error("Error creating announcement:", errorData);
    throw new Error(`Error al crear anuncio: ${response.status}`);
  }

  const announcement = await response.json();
  return announcement;
}

/**
 * Crea un anuncio de autoevaluación con formato predefinido
 */
export async function createSelfEvaluationAnnouncement(
  courseId: string,
  evaluationLink: string,
  gameName: string,
  language: 'es' | 'en' | 'pt'
): Promise<ClassroomAnnouncement> {
  const messages = {
    es: {
      title: "📝 ¡Hora de la autoevaluación!",
      body: `Completá tu autoevaluación del juego "${gameName}":`,
      reminder: "Recordá mencionar quién te ayudó y a quién ayudaste durante el juego.",
    },
    en: {
      title: "📝 Self-evaluation time!",
      body: `Complete your self-evaluation for the game "${gameName}":`,
      reminder: "Remember to mention who helped you and who you helped during the game.",
    },
    pt: {
      title: "📝 Hora da autoavaliação!",
      body: `Complete sua autoavaliação do jogo "${gameName}":`,
      reminder: "Lembre-se de mencionar quem te ajudou e quem você ajudou durante o jogo.",
    },
  };

  const msg = messages[language];
  const text = `${msg.title}\n\n${msg.body}\n${evaluationLink}\n\n${msg.reminder}`;

  return createAnnouncement(courseId, text);
}