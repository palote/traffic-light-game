// src/utils/csvParser.ts
import Papa from "papaparse";

export type SuggestedStage = 1 | 2;

export interface ParsedQuestion {
  id: string;
  text: string;
  hint?: string;
  suggestedStage: SuggestedStage;
  rowNumber: number; // para debug / mensajes
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: string[];
  warnings: string[];
  rawRowCount: number;
}

function normalize(s: unknown): string {
  return String(s ?? "")
    .replace(/^\uFEFF/, "") // BOM
    .trim();
}

function normalizeKey(k: string): string {
  return normalize(k)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_-]+/g, "");
}

function parseStage(v: unknown): SuggestedStage | null {
  const s = normalize(v).toLowerCase().replace(/\s+/g, "");
  if (!s) return null;

  // Acepta varios formatos comunes
  if (s === "1" || s === "stage1" || s === "s1" || s === "etapa1") return 1;
  if (s === "2" || s === "stage2" || s === "s2" || s === "etapa2") return 2;

  return null;
}

// Detecta filas que son “encabezado repetido”
function looksLikeRepeatedHeader(row: Record<string, unknown>): boolean {
  const values = Object.values(row).map((v) => normalize(v).toLowerCase());
  if (values.length === 0) return false;

  const joined = values.join("|");
  // Si aparece "text|hint|stage" etc, suele ser header repetido
  const headerHints = ["id", "text", "question", "hint", "suggestedstage", "stage", "etapa"];
  let hits = 0;
  for (const h of headerHints) {
    if (joined.includes(h)) hits++;
  }
  return hits >= 2;
}

function pickField(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const foundKey = Object.keys(row).find((rk) => normalizeKey(rk) === normalizeKey(k));
    if (foundKey) {
      const val = normalize(row[foundKey]);
      if (val) return val;
    }
  }
  return "";
}

export function parseCSV(text: string): Promise<ParseResult> {
  return new Promise((resolve) => {
    const trimmed = normalize(text);
    if (!trimmed) {
      resolve({
        questions: [],
        errors: ["El archivo CSV está vacío."],
        warnings: [],
        rawRowCount: 0,
      });
      return;
    }

    Papa.parse<Record<string, unknown>>(trimmed, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      worker: true, 
 // limpia BOM/espacios
      complete: (results) => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const questions: ParsedQuestion[] = [];

        // Errores propios de PapaParse
        if (results.errors?.length) {
          for (const e of results.errors) {
            errors.push(`CSV: ${e.message} (fila ${e.row ?? "?"})`);
          }
        }

        const data = results.data ?? [];
        const rawRowCount = data.length;

        for (let i = 0; i < data.length; i++) {
          const row = data[i] || {};
          const rowNumber = i + 2; // +2 porque header es la línea 1

          // 1) Ignorar encabezado repetido
          if (looksLikeRepeatedHeader(row)) {
            warnings.push(`Fila ${rowNumber}: encabezado repetido (se ignoró).`);
            continue;
          }

          // 2) Tomar campos con tolerancia a nombres distintos
          const textField = pickField(row, ["text", "question", "pregunta"]);
          const hintField = pickField(row, ["hint", "ayuda", "pista"]);
          const idField = pickField(row, ["id", "qid", "questionid"]);
          const stageFieldRaw =
            pickField(row, ["suggestedStage", "suggested_stage", "stage", "etapa", "suggested"]);

          // 3) Filas vacías (o sin pregunta) afuera
          if (!textField) {
            // si hay contenido raro, lo avisamos suave
            const anyContent = Object.values(row).some((v) => normalize(v));
            if (anyContent) warnings.push(`Fila ${rowNumber}: sin texto de pregunta (se ignoró).`);
            continue;
          }

          // 4) Stage robusto (default 1 si no se entiende)
          const parsed = parseStage(stageFieldRaw);
          let suggestedStage: SuggestedStage = 1;
          if (parsed === null) {
            if (stageFieldRaw) {
              warnings.push(
                `Fila ${rowNumber}: suggestedStage inválido (“${normalize(stageFieldRaw)}”). Se usó Stage 1.`
              );
            }
            suggestedStage = 1;
          } else {
            suggestedStage = parsed;
          }

          // 5) ID: si falta, generamos uno estable
          const id = idField ? idField : `q_${questions.length + 1}`;

          questions.push({
            id,
            text: textField,
            hint: hintField || undefined,
            suggestedStage,
            rowNumber,
          });
        }

        // Validación final mínima
        if (questions.length === 0 && errors.length === 0) {
          errors.push("No se encontraron preguntas válidas en el CSV.");
        }

        resolve({ questions, errors, warnings, rawRowCount });
      },
      error: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Error desconocido al leer el CSV";

        resolve({
          questions: [],
          errors: [`No se pudo leer el CSV: ${message}`],
          warnings: [],
          rawRowCount: 0,
        });
      },

    });
  });
}
