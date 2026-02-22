// src/services/sheetsService.ts
// 📊 Servicio para interactuar con Google Sheets API
// Permite importar listas de alumnos y exportar resultados de autoevaluaciones

import { auth } from "../firebase.config";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// ============================================
// TIPOS
// ============================================

export interface SpreadsheetInfo {
  id: string;
  name: string;
  sheets: SheetInfo[];
}

export interface SheetInfo {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
}

export interface SheetData {
  values: string[][];
  range: string;
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

// Scopes necesarios para Sheets (lectura y escritura)
const SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly", // Para listar archivos
];

/**
 * Obtiene un access token para Google Sheets API
 */
export async function getSheetsAccessToken(): Promise<string> {
  // Si tenemos token válido en caché, usarlo
  if (cachedAccessToken && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

  const provider = new GoogleAuthProvider();
  
  SHEETS_SCOPES.forEach(scope => {
    provider.addScope(scope);
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error("No se pudo obtener el token de acceso");
    }

    cachedAccessToken = credential.accessToken;
    tokenExpiry = Date.now() + 55 * 60 * 1000; // 55 minutos

    return cachedAccessToken;
  } catch (error: any) {
    console.error("Error obteniendo token de Sheets:", error);
    
    if (error.code === "auth/popup-blocked") {
      throw new Error("El navegador bloqueó la ventana emergente. Permití los popups para este sitio.");
    }
    if (error.code === "auth/popup-closed-by-user") {
      throw new Error("Cerraste la ventana de autorización. Intentá de nuevo.");
    }
    
    throw new Error("Error al conectar con Google: " + error.message);
  }
}

/**
 * Limpia el token cacheado
 */
export function clearSheetsToken(): void {
  cachedAccessToken = null;
  tokenExpiry = 0;
}

// ============================================
// LISTAR SPREADSHEETS DEL USUARIO
// ============================================

/**
 * Lista los spreadsheets recientes del usuario
 */
export async function listUserSpreadsheets(maxResults: number = 20): Promise<Array<{ id: string; name: string; modifiedTime: string }>> {
  const token = await getSheetsAccessToken();

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?` +
    `q=mimeType='application/vnd.google-apps.spreadsheet'` +
    `&orderBy=modifiedTime desc` +
    `&pageSize=${maxResults}` +
    `&fields=files(id,name,modifiedTime)`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      clearSheetsToken();
      throw new Error("Sesión expirada. Intentá de nuevo.");
    }
    throw new Error(`Error al listar archivos: ${response.status}`);
  }

  const data = await response.json();
  return data.files || [];
}

// ============================================
// LEER DATOS DE UN SPREADSHEET
// ============================================

/**
 * Obtiene información de un spreadsheet (hojas disponibles)
 */
export async function getSpreadsheetInfo(spreadsheetId: string): Promise<SpreadsheetInfo> {
  const token = await getSheetsAccessToken();

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      clearSheetsToken();
      throw new Error("Sesión expirada. Intentá de nuevo.");
    }
    if (response.status === 404) {
      throw new Error("Spreadsheet no encontrado.");
    }
    throw new Error(`Error al obtener spreadsheet: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    id: data.spreadsheetId,
    name: data.properties?.title || "Sin nombre",
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
      rowCount: s.properties.gridProperties?.rowCount || 0,
      columnCount: s.properties.gridProperties?.columnCount || 0,
    })),
  };
}

/**
 * Lee datos de una hoja específica
 */
export async function readSheetData(
  spreadsheetId: string,
  range: string = "A:Z"
): Promise<SheetData> {
  const token = await getSheetsAccessToken();

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      clearSheetsToken();
      throw new Error("Sesión expirada. Intentá de nuevo.");
    }
    throw new Error(`Error al leer datos: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    values: data.values || [],
    range: data.range || range,
  };
}

/**
 * Lee la primera columna de una hoja (para importar lista de alumnos)
 */
export async function readStudentList(
  spreadsheetId: string,
  sheetName: string,
  column: string = "A"
): Promise<string[]> {
  const range = `'${sheetName}'!${column}:${column}`;
  const data = await readSheetData(spreadsheetId, range);
  
  // Filtrar celdas vacías y retornar solo los valores
  return data.values
    .flat()
    .filter(val => val && val.trim() !== "")
    .map(val => val.trim());
}

// ============================================
// CREAR Y ESCRIBIR EN SPREADSHEET
// ============================================

/**
 * Crea un nuevo spreadsheet
 */
export async function createSpreadsheet(title: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = await getSheetsAccessToken();

  const response = await fetch(
    "https://sheets.googleapis.com/v4/spreadsheets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title,
        },
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      clearSheetsToken();
      throw new Error("Sesión expirada. Intentá de nuevo.");
    }
    throw new Error(`Error al crear spreadsheet: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
}

/**
 * Escribe datos en un spreadsheet
 */
export async function writeToSheet(
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<void> {
  const token = await getSheetsAccessToken();

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values,
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      clearSheetsToken();
      throw new Error("Sesión expirada. Intentá de nuevo.");
    }
    throw new Error(`Error al escribir datos: ${response.status}`);
  }
}

/**
 * Aplica formato básico a un spreadsheet (headers en negrita, ancho de columnas)
 */
export async function formatSheet(
  spreadsheetId: string,
  sheetId: number = 0,
  headerRowCount: number = 1,
  columnCount: number = 10
): Promise<void> {
  const token = await getSheetsAccessToken();

  const requests = [
    // Header en negrita
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: headerRowCount,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    // Freeze header row
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: headerRowCount },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    // Auto resize columns
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: 0,
          endIndex: columnCount,
        },
      },
    },
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!response.ok) {
    console.warn("Error applying format (non-critical):", response.status);
  }
}

// ============================================
// EXPORTAR AUTOEVALUACIONES
// ============================================

export interface SelfEvaluationExportData {
  studentName: string;
  teamName: string;
  receivedHelpFrom: string;
  receivedHelpConcepts: string;
  gaveHelpTo: string;
  gaveHelpConcepts: string;
  difficultyRating?: number;
  confidenceBefore?: number;
  confidenceAfter?: number;
  validated: boolean;
  submittedAt: number;
}

/**
 * Exporta autoevaluaciones a un nuevo Google Sheet
 */
export async function exportSelfEvaluationsToSheet(
  gameName: string,
  evaluations: SelfEvaluationExportData[],
  language: 'es' | 'en' | 'pt'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  
  const headers = {
    es: [
      "Alumno",
      "Equipo", 
      "Recibió ayuda de",
      "Conceptos (recibidos)",
      "Ayudó a",
      "Conceptos (dados)",
      "Dificultad (1-5)",
      "Confianza antes (1-5)",
      "Confianza después (1-5)",
      "Validada",
      "Fecha de envío",
    ],
    en: [
      "Student",
      "Team",
      "Received help from",
      "Concepts (received)",
      "Helped",
      "Concepts (given)",
      "Difficulty (1-5)",
      "Confidence before (1-5)",
      "Confidence after (1-5)",
      "Validated",
      "Submitted at",
    ],
    pt: [
      "Aluno",
      "Equipe",
      "Recebeu ajuda de",
      "Conceitos (recebidos)",
      "Ajudou a",
      "Conceitos (dados)",
      "Dificuldade (1-5)",
      "Confiança antes (1-5)",
      "Confiança depois (1-5)",
      "Validada",
      "Data de envio",
    ],
  };

  const yesNo = {
    es: { yes: "Sí", no: "No" },
    en: { yes: "Yes", no: "No" },
    pt: { yes: "Sim", no: "Não" },
  };

  // Crear spreadsheet
  const title = `Autoevaluaciones - ${gameName} - ${new Date().toLocaleDateString()}`;
  const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(title);

  // Preparar datos
  const rows: (string | number)[][] = [
    headers[language],
    ...evaluations.map(e => [
      e.studentName,
      e.teamName,
      e.receivedHelpFrom,
      e.receivedHelpConcepts,
      e.gaveHelpTo,
      e.gaveHelpConcepts,
      e.difficultyRating || "",
      e.confidenceBefore || "",
      e.confidenceAfter || "",
      e.validated ? yesNo[language].yes : yesNo[language].no,
      new Date(e.submittedAt).toLocaleString(
        language === "es" ? "es-AR" : language === "pt" ? "pt-BR" : "en-US"
      ),
    ]),
  ];

  // Escribir datos
  await writeToSheet(spreadsheetId, "A1", rows);

  // Aplicar formato
  await formatSheet(spreadsheetId, 0, 1, headers[language].length);

  return { spreadsheetId, spreadsheetUrl };
}