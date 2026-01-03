// src/utils/csvParser.ts
// Parser de CSV robusto con detección automática de delimitador + fallback sin headers (y sin ID)

import Papa from "papaparse";

export type SuggestedStage = 1 | 2;

export interface ParsedQuestion {
  id: string;
  text: string;
  hint?: string;
  suggestedStage: SuggestedStage;
  rowNumber: number;
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
    .replace(/[^a-z0-9]/g, "");
}

function parseStage(v: unknown): SuggestedStage | null {
  const s = normalize(v)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!s) return null;

  if (s === "1" || s === "stage1" || s === "s1" || s === "etapa1") return 1;
  if (s === "2" || s === "stage2" || s === "s2" || s === "etapa2") return 2;

  return null;
}

function looksLikeRepeatedHeader(row: Record<string, unknown>): boolean {
  const values = Object.values(row).map((v) => normalizeKey(String(v ?? "")));
  if (values.length === 0) return false;

  const headerTokens = new Set([
    "id",
    "qid",
    "questionid",
    "text",
    "question",
    "pregunta",
    "preguntas",
    "hint",
    "pista",
    "ayuda",
    "suggestedstage",
    "suggested",
    "stage",
    "etapa",
  ]);

  const hits = values.filter((v) => headerTokens.has(v)).length;
  return hits >= 2;
}

function pickField(row: Record<string, unknown>, keys: string[]): string {
  const map: Record<string, unknown> = {};
  for (const rk of Object.keys(row)) {
    map[normalizeKey(rk)] = row[rk];
  }

  for (const k of keys) {
    const val = map[normalizeKey(k)];
    const s = normalize(val);
    if (s) return s;
  }
  return "";
}

/**
 * ✅ Detectar el delimitador automáticamente
 * Cuenta ocurrencias de , ; \t | en la primera línea
 */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || "";

  const delimiters = [",", ";", "\t", "|"];
  let bestDelimiter = ",";
  let maxCount = 0;

  for (const d of delimiters) {
    const count =
      (firstLine.match(new RegExp(d === "|" ? "\\|" : d, "g")) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = d;
    }
  }

  console.log(
    `[csvParser] Delimitador detectado: "${bestDelimiter}" (${maxCount} ocurrencias)`
  );
  return bestDelimiter;
}

/**
 * ✅ Detectar posibles problemas de encoding
 */
function hasEncodingIssues(text: string): boolean {
  // Caracteres típicos de encoding incorrecto
  return /�|Ã¡|Ã©|Ã­|Ã³|Ãº|Ã±/.test(text);
}

/**
 * ✅ NUEVO: Validar si los headers parecen realmente headers
 * - Debe existir un campo tipo text/question/pregunta
 * - Evitar casos donde PapaParse tomó la primera fila de datos como header (frases largas)
 */
function hasValidHeaderFields(fields: string[] | undefined): boolean {
  if (!fields || fields.length === 0) return false;

  const normalized = fields.map((f) => normalizeKey(f));

  const hasText =
    normalized.includes("text") ||
    normalized.includes("question") ||
    normalized.includes("pregunta") ||
    normalized.includes("preguntas");

  const tooLong = fields.some((f) => normalize(f).length > 40);

  return hasText && !tooLong;
}

/**
 * ✅ NUEVO: Convertir fila array (header=false) a objeto “tipo header”
 * Soporta:
 * - 4 cols: id, text, hint, suggestedStage
 * - 3 cols: text, hint, suggestedStage (sin id)
 */
function rowFromArray(cols: unknown[]): Record<string, unknown> {
  if ((cols?.length ?? 0) >= 4) {
    return {
      id: cols?.[0],
      text: cols?.[1],
      hint: cols?.[2],
      suggestedStage: cols?.[3],
    };
  }

  return {
    text: cols?.[0],
    hint: cols?.[1],
    suggestedStage: cols?.[2],
  };
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

    const delimiter = detectDelimiter(trimmed);
    const encodingWarning = hasEncodingIssues(trimmed);

    // ✅ Procesamiento común para header=true y header=false
    const processRows = (
      dataRows: Record<string, unknown>[],
      baseRowNumber: number
    ): ParseResult => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const questions: ParsedQuestion[] = [];

      if (encodingWarning) {
        warnings.push(
          "⚠️ El archivo puede tener problemas de encoding (acentos incorrectos). Considerá guardarlo como UTF-8."
        );
      }

      const rawRowCount = dataRows.length;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] || {};
        const rowNumber = baseRowNumber + i;

        if (looksLikeRepeatedHeader(row)) {
          warnings.push(`Fila ${rowNumber}: encabezado repetido (se ignoró).`);
          continue;
        }

        const textField = pickField(row, ["text", "question", "pregunta", "preguntas"]);
        const hintField = pickField(row, ["hint", "ayuda", "pista"]);
        const idField = pickField(row, ["id", "qid", "questionid"]);

        const stageFieldRaw = pickField(row, [
          "suggestedstage",
          "suggested_stage",
          "suggestedStage",
          "stage",
          "etapa",
          "suggested",
        ]);

        if (!textField) {
          const anyContent = Object.values(row).some((v) => normalize(v));
          if (anyContent) {
            warnings.push(`Fila ${rowNumber}: sin texto de pregunta (se ignoró).`);
          }
          continue;
        }

        const parsed = parseStage(stageFieldRaw);
        let suggestedStage: SuggestedStage = 1;

        if (parsed === null) {
          if (stageFieldRaw) {
            warnings.push(
              `Fila ${rowNumber}: suggestedStage inválido ("${normalize(
                stageFieldRaw
              )}"). Se usó Stage 1.`
            );
          }
          suggestedStage = 1;
        } else {
          suggestedStage = parsed;
        }

        // ✅ ID automático: q1, q2, q3...
        const id = idField ? idField : `q${questions.length + 1}`;

        questions.push({
          id,
          text: textField,
          hint: hintField || undefined,
          suggestedStage,
          rowNumber,
        });
      }

      if (questions.length === 0 && errors.length === 0) {
        errors.push("No se encontraron preguntas válidas en el CSV.");
      }

      return { questions, errors, warnings, rawRowCount };
    };

    // ✅ 1) Intento normal (header=true)
    Papa.parse<Record<string, unknown>>(trimmed, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      delimiter,

      complete: (results) => {
        console.log("[csvParser] PAPA DEBUG (header=true)", {
          delimiter,
          meta: results.meta,
          fields: results.meta?.fields,
          firstRow: results.data?.[0],
          firstRowKeys: results.data?.[0]
            ? Object.keys(results.data[0] as object)
            : [],
        });

        const parseErrors = (results.errors ?? []).map(
          (e) => `CSV: ${e.message} (fila ${e.row ?? "?"})`
        );

        const data = results.data ?? [];
        const fields = results.meta?.fields;

        const headerOk = hasValidHeaderFields(fields);

        // ✅ 2) Fallback (header=false) si headers no son válidos / faltan
        if (!headerOk) {
          console.warn("[csvParser] Header inválido o ausente → fallback header=false");

          Papa.parse<unknown[]>(trimmed, {
            header: false,
            skipEmptyLines: "greedy",
            dynamicTyping: false,
            delimiter,

            complete: (results2) => {
              console.log("[csvParser] PAPA DEBUG (header=false)", {
                delimiter,
                meta: results2.meta,
                firstRow: results2.data?.[0],
              });

              const rows = (results2.data ?? [])
                .filter((r) => Array.isArray(r) && r.some((c) => normalize(c)))
                .map((r) => rowFromArray(r as unknown[]));

              // header=false: fila 1 es la primera de datos
              const processed = processRows(rows, 1);

              processed.errors.unshift(...parseErrors);
              processed.warnings.unshift(
                "ℹ️ Este CSV no tenía encabezados válidos. Se interpretaron columnas por posición y se generaron IDs si faltaban."
              );

              resolve(processed);
            },

            error: (err: unknown) => {
              const message =
                err instanceof Error ? err.message : "Error desconocido al leer el CSV";

              resolve({
                questions: [],
                errors: [...parseErrors, `No se pudo leer el CSV (fallback): ${message}`],
                warnings: [],
                rawRowCount: 0,
              });
            },
          });

          return;
        }

        // ✅ Header OK: procesar como siempre
        const processed = processRows(data, 2);
        processed.errors.unshift(...parseErrors);

        resolve(processed);
      },

      error: (err: unknown) => {
        const message = err instanceof Error ? err.message : "Error desconocido al leer el CSV";

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
