import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import fetch from "node-fetch";
// ExcelJS, docx y pptxgenjs son librerías pesadas que antes se cargaban acá arriba
// para TODAS las funciones, aunque solo las usan un puñado de ellas (planillas,
// planificaciones, presentaciones). Eso hacía que Node tardara demasiado en
// levantar el archivo y el deploy fallara con "Cannot determine backend
// specification. Timeout after 10000". Por eso acá solo importamos los TIPOS
// (se borran al compilar, no generan código) y cada función que las necesita
// las carga en el momento con `await import(...)`.
import type ExcelJS from "exceljs";
import type PptxGenJS from "pptxgenjs";
import { generarTextoGemini } from "./gemini";
import { repartirPunto, resultadoDesdeTieneRazon } from "./arbitroReparto";
import * as admin from "firebase-admin";
import { buildArbitroPrompt, buildPromptPreguntaPropia, normalizarAreaKey, AREA_LABEL_ES } from "./arbitroPrompt";
import { validarEntradaRonda, construirRonda, idDeRonda, aplicarCorreccion, calcularTotales, OPCIONES_REPARTO } from "./arbitroRondas";

// Inicializar Firebase Admin UNA SOLA VEZ
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const CLAUDE_KEY = defineSecret("CLAUDE_KEY");
const GEMINI_KEY = defineSecret("GEMINI_KEY");
const GA4_SERVICE_ACCOUNT = defineSecret("GA4_SERVICE_ACCOUNT");

// ============================================================================
// CONSTANTES Y AUXILIARES (para generateAttendanceSheet)
// ============================================================================

const AR_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "Año Nuevo", "2026-02-16": "Carnaval", "2026-02-17": "Carnaval",
  "2026-03-24": "Día de la Memoria", "2026-04-02": "Veteranos de Malvinas",
  "2026-04-03": "Viernes Santo", "2026-05-01": "Día del Trabajador",
  "2026-05-25": "Revolución de Mayo", "2026-06-19": "Belgrano (trasladado)",
  "2026-07-09": "Independencia", "2026-08-17": "San Martín",
  "2026-10-12": "Diversidad Cultural", "2026-11-20": "Soberanía Nacional",
  "2026-12-08": "Inmaculada Concepción", "2026-12-25": "Navidad",
  "2027-01-01": "Año Nuevo", "2027-03-01": "Carnaval", "2027-03-02": "Carnaval",
  "2027-03-24": "Día de la Memoria", "2027-04-02": "Veteranos de Malvinas",
  "2027-03-26": "Viernes Santo", "2027-05-01": "Día del Trabajador",
  "2027-05-25": "Revolución de Mayo", "2027-06-21": "Belgrano",
  "2027-07-09": "Independencia", "2027-08-16": "San Martín",
  "2027-10-11": "Diversidad Cultural", "2027-11-22": "Soberanía Nacional",
  "2027-12-08": "Inmaculada Concepción", "2027-12-25": "Navidad",
};

const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function colLetter(n: number): string {
  let s = "";
  while (n > 0) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); }
  return s;
}

function cellRef(row: number, col: number) { return `${colLetter(col)}${row}`; }

function thinBorder() {
  const s = { style: "thin" as const, color: { argb: "FFB0C4DE" } };
  return { top: s, bottom: s, left: s, right: s };
}

function styleHeader(cell: ExcelJS.Cell, textArgb: string, bgArgb: string) {
  cell.font = { bold: true, size: 9, color: { argb: textArgb }, name: "Arial" };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = thinBorder();
}

interface DayInfo {
  day: number; dow: number; dayName: string;
  isHoliday: boolean; holidayName: string | null;
}

function getDays(year: number, month: number, excludeWeekends: boolean, markHolidays: boolean): DayInfo[] {
  const days: DayInfo[] = [];
  const total = new Date(year, month, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, month - 1, d);
    const dow = date.getDay();
    if (excludeWeekends && (dow === 0 || dow === 6)) continue;
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({
      day: d, dow, dayName: DAYS_ES[dow],
      isHoliday: markHolidays && !!AR_HOLIDAYS[key],
      holidayName: markHolidays ? (AR_HOLIDAYS[key] ?? null) : null,
    });
  }
  return days;
}

// ============================================================================
// FUNCIONES EXISTENTES
// ============================================================================

export const generateQuestions = onCall(
  { secrets: [CLAUDE_KEY], invoker: "public", timeoutSeconds: 120 },
  async (request) => {
    const prompt = request.data?.prompt;
    if (!prompt || typeof prompt !== "string") {
      throw new HttpsError("invalid-argument", "Prompt requerido");
    }
    const apiKey = CLAUDE_KEY.value();
    if (!apiKey) {
      throw new HttpsError("internal", "API key no configurada");
    }
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 8000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpsError("internal", `Claude error: ${response.status} - ${errorText}`);
      }
      const result = await response.json() as any;
      const text = result.content?.[0]?.text || "";
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message);
    }
  }
);

export const generateAttendanceSheet = onCall(
  { invoker: "public", timeoutSeconds: 120 },
  async (request) => {
    const d = request.data ?? {};
    const sheetName: string = d.sheetName ?? "Presentismo";
    const month: number = d.month ?? 4;
    const year: number = d.year ?? 2026;
    const studentCount: number = d.studentCount ?? 30;
    const excludeWeekends: boolean = d.excludeWeekends ?? true;
    const markHolidays: boolean = d.markHolidays ?? false;
    const presentSymbol: string = d.presentSymbol ?? "P";
    const absentSymbol: string = d.absentSymbol ?? "A";
    const halfPresentEnabled: boolean = d.halfPresentEnabled ?? false;
    const halfPresentSymbol: string = d.halfPresentSymbol ?? "MP";
    const presentColor: string = d.presentColor ?? "FF92D050";
    const absentColor: string = d.absentColor ?? "FFFF0000";
    const halfPresentColor: string = d.halfPresentColor ?? "FFFFFF00";
    const showTotals: boolean = d.showTotals ?? true;
    const showPercentage: boolean = d.showPercentage ?? true;
    const showObservations: boolean = d.showObservations ?? false;

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "El Juego del Semáforo";
    const ws = wb.addWorksheet(sheetName, {
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });

    const days = getDays(year, month, excludeWeekends, markHolidays);
    const symbols = [presentSymbol, absentSymbol, ...(halfPresentEnabled ? [halfPresentSymbol] : [])];

    const COL_NUM = 1, COL_NAME = 2, COL_DAYS_START = 3;
    const COL_DAYS_END = COL_DAYS_START + days.length - 1;
    let nextCol = COL_DAYS_END + 1;
    const COL_FALTAS = showTotals ? nextCol++ : null;
    const COL_PCT = showPercentage ? nextCol++ : null;
    const COL_OBS = showObservations ? nextCol++ : null;
    const LAST_COL = nextCol - 1;

    const ROW_TITLE = 1, ROW_HEADER = 2, ROW_DATA_START = 3;
    const ROW_DATA_END = ROW_DATA_START + studentCount - 1;
    const ROW_TOTALS = showTotals ? ROW_DATA_END + 1 : null;

    ws.getRow(ROW_TITLE).height = 30;
    ws.mergeCells(ROW_TITLE, 1, ROW_TITLE, LAST_COL);
    const titleCell = ws.getCell(ROW_TITLE, 1);
    titleCell.value = `${sheetName} — ${MONTHS_ES[month - 1]} ${year}`;
    titleCell.font = { bold: true, size: 14, color: { argb: "FF1F3864" }, name: "Arial" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6E4F0" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    ws.getRow(ROW_HEADER).height = 42;
    styleHeader(ws.getCell(ROW_HEADER, COL_NUM), "FF1F3864", "FFBDD7EE");
    ws.getCell(ROW_HEADER, COL_NUM).value = "N°";
    ws.getColumn(COL_NUM).width = 5;
    styleHeader(ws.getCell(ROW_HEADER, COL_NAME), "FF1F3864", "FFBDD7EE");
    ws.getCell(ROW_HEADER, COL_NAME).value = "Apellido y Nombre";
    ws.getColumn(COL_NAME).width = 30;

    days.forEach((day, i) => {
      const col = COL_DAYS_START + i;
      const cell = ws.getCell(ROW_HEADER, col);
      cell.value = `${day.day}\n${day.dayName}`;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = thinBorder();
      ws.getColumn(col).width = 5;
      if (day.isHoliday) {
        cell.font = { bold: true, size: 8, color: { argb: "FFCC0000" }, name: "Arial" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFCCCC" } };
      } else {
        cell.font = { bold: true, size: 8, color: { argb: "FF1F3864" }, name: "Arial" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBDD7EE" } };
      }
    });

    if (COL_FALTAS) {
      styleHeader(ws.getCell(ROW_HEADER, COL_FALTAS), "FF1F3864", "FFBDD7EE");
      ws.getCell(ROW_HEADER, COL_FALTAS).value = "Total\nFaltas";
      ws.getColumn(COL_FALTAS).width = 9;
    }
    if (COL_PCT) {
      styleHeader(ws.getCell(ROW_HEADER, COL_PCT), "FF1F3864", "FFBDD7EE");
      ws.getCell(ROW_HEADER, COL_PCT).value = "%\nAsist.";
      ws.getColumn(COL_PCT).width = 9;
    }
    if (COL_OBS) {
      styleHeader(ws.getCell(ROW_HEADER, COL_OBS), "FF1F3864", "FFBDD7EE");
      ws.getCell(ROW_HEADER, COL_OBS).value = "Observaciones";
      ws.getColumn(COL_OBS).width = 32;
    }

    const zebraFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F8FF" } };
    for (let s = 0; s < studentCount; s++) {
      const row = ROW_DATA_START + s;
      ws.getRow(row).height = 18;
      const isEven = s % 2 === 0;

      const numCell = ws.getCell(row, COL_NUM);
      numCell.value = s + 1;
      numCell.alignment = { horizontal: "center", vertical: "middle" };
      numCell.font = { size: 9, name: "Arial" };
      numCell.border = thinBorder();
      if (isEven) numCell.fill = zebraFill;

      const nameCell = ws.getCell(row, COL_NAME);
      nameCell.alignment = { vertical: "middle" };
      nameCell.font = { size: 10, name: "Arial" };
      nameCell.border = thinBorder();
      if (isEven) nameCell.fill = zebraFill;

      days.forEach((day, i) => {
        const col = COL_DAYS_START + i;
        const cell = ws.getCell(row, col);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { bold: true, size: 10, name: "Arial" };
        cell.border = thinBorder();
        if (day.isHoliday) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEEEE" } };
        } else if (isEven) {
          cell.fill = zebraFill;
        }
      });

      if (COL_FALTAS) {
        const cell = ws.getCell(row, COL_FALTAS);
        cell.value = { formula: `COUNTIF(${cellRef(row, COL_DAYS_START)}:${cellRef(row, COL_DAYS_END)},"${absentSymbol}")` };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { bold: true, size: 10, name: "Arial" };
        cell.border = thinBorder();
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
      }

      if (COL_PCT && COL_FALTAS) {
        const cell = ws.getCell(row, COL_PCT);
        const activeDays = days.filter((dd) => !dd.isHoliday).length;
        cell.value = { formula: `IFERROR(1-(${cellRef(row, COL_FALTAS)}/${activeDays}),1)` };
        cell.numFmt = "0.0%";
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { size: 10, name: "Arial" };
        cell.border = thinBorder();
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };
      }

      if (COL_OBS) {
        const cell = ws.getCell(row, COL_OBS);
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.font = { size: 10, name: "Arial" };
        cell.border = thinBorder();
        if (isEven) cell.fill = zebraFill;
      }
    }

    const attendRange = `${cellRef(ROW_DATA_START, COL_DAYS_START)}:${cellRef(ROW_DATA_END, COL_DAYS_END)}`;
    (ws as any).dataValidations.add(attendRange, {
      type: "list", allowBlank: true,
      formulae: [`"${symbols.join(",")}"`],
      showErrorMessage: false, showInputMessage: false,
    });

    const cfRules: ExcelJS.ConditionalFormattingRule[] = [
      {
        type: "cellIs", operator: "equal", formulae: [`"${presentSymbol}"`], priority: 1,
        style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: presentColor } } }
      },
      {
        type: "cellIs", operator: "equal", formulae: [`"${absentSymbol}"`], priority: 2,
        style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: absentColor } } }
      },
    ];
    if (halfPresentEnabled) {
      cfRules.push({
        type: "cellIs", operator: "equal", formulae: [`"${halfPresentSymbol}"`], priority: 3,
        style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: halfPresentColor } } }
      });
    }
    ws.addConditionalFormatting({ ref: attendRange, rules: cfRules });

    if (ROW_TOTALS) {
      ws.getRow(ROW_TOTALS).height = 22;
      const lbl = ws.getCell(ROW_TOTALS, COL_NAME);
      lbl.value = "Total Presentes";
      lbl.font = { bold: true, size: 10, name: "Arial", color: { argb: "FF1F3864" } };
      lbl.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBDD7EE" } };
      lbl.border = thinBorder();
      lbl.alignment = { horizontal: "right", vertical: "middle" };
      days.forEach((day, i) => {
        if (day.isHoliday) return;
        const col = COL_DAYS_START + i;
        const cell = ws.getCell(ROW_TOTALS as number, col);
        cell.value = { formula: `COUNTIF(${cellRef(ROW_DATA_START, col)}:${cellRef(ROW_DATA_END, col)},"${presentSymbol}")` };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.font = { bold: true, size: 10, name: "Arial", color: { argb: "FF1F3864" } };
        cell.border = thinBorder();
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6E4F0" } };
      });
    }

    ws.views = [{
      state: "frozen", xSplit: 2, ySplit: 2,
      topLeftCell: cellRef(ROW_DATA_START, COL_DAYS_START)
    }];

    const buffer = await wb.xlsx.writeBuffer() as unknown as Buffer;
    return {
      data: Buffer.from(buffer).toString("base64"),
      filename: `Presentismo_${MONTHS_ES[month - 1]}_${year}.xlsx`,
    };
  }
);

// generatePresentation
const PALETTES: Record<string, { primary: string; secondary: string; accent: string; text: string; bg: string; name: string }> = {
  midnight: { primary: "1E2761", secondary: "CADCFC", accent: "4A90D9", text: "FFFFFF", bg: "F8FAFF", name: "Midnight Azul" },
  forest: { primary: "2C5F2D", secondary: "97BC62", accent: "4A7C59", text: "FFFFFF", bg: "F5FFF5", name: "Verde Bosque" },
  coral: { primary: "F96167", secondary: "2F3C7E", accent: "F9E795", text: "FFFFFF", bg: "FFF8F8", name: "Coral Energía" },
  terracotta: { primary: "B85042", secondary: "A7BEAE", accent: "E7E8D1", text: "FFFFFF", bg: "FFF9F8", name: "Terracota Cálido" },
  ocean: { primary: "065A82", secondary: "1C7293", accent: "00B4D8", text: "FFFFFF", bg: "F0FAFF", name: "Océano Profundo" },
  charcoal: { primary: "36454F", secondary: "78909C", accent: "0D9488", text: "FFFFFF", bg: "F8F9FA", name: "Carbón Moderno" },
};

const FONTS: Record<string, { title: string; body: string }> = {
  modern: { title: "Calibri", body: "Calibri Light" },
  classic: { title: "Georgia", body: "Calibri" },
  bold: { title: "Arial Black", body: "Arial" },
};

type SlideType = "cover" | "text" | "text_image" | "two_columns" | "quote" | "closing";

interface SlideConfig {
  type: SlideType;
  title?: string;
  subtitle?: string;
  body?: string;
  bodyLeft?: string;
  bodyRight?: string;
  quote?: string;
  author?: string;
  points?: string[];
  imageNote?: string;
}

interface PresentationConfig {
  presentationTitle: string;
  subject?: string;
  grade?: string;
  paletteId: string;
  fontId: string;
  slides: SlideConfig[];
}

function parseBullets(text: string): string[] {
  if (!text) return [];
  return text.split("\n").map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
}

function makeShadow() {
  return { type: "outer" as const, blur: 8, offset: 2, angle: 135, color: "000000", opacity: 0.12 };
}

function buildCover(pres: PptxGenJS, config: SlideConfig, pal: typeof PALETTES[string], font: typeof FONTS[string]) {
  const slide = pres.addSlide();
  slide.background = { color: pal.primary };
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.22, h: 5.625, fill: { color: pal.accent, transparency: 30 }, line: { color: pal.accent, width: 0 } });
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 4.8, w: 10, h: 0.825, fill: { color: "000000", transparency: 60 }, line: { color: "000000", width: 0 } });
  slide.addText(config.title || "Presentación", { x: 0.55, y: 1.2, w: 9, h: 2, fontSize: 44, fontFace: font.title, color: pal.text, bold: true, align: "left", valign: "middle", shadow: makeShadow() });
  if (config.subtitle) slide.addText(config.subtitle, { x: 0.55, y: 3.3, w: 9, h: 0.9, fontSize: 20, fontFace: font.body, color: pal.secondary, align: "left", italic: true });
  const footer = [(config as any).subject, (config as any).grade].filter(Boolean).join(" — ");
  if (footer) slide.addText(footer, { x: 0.55, y: 4.85, w: 9, h: 0.6, fontSize: 12, fontFace: font.body, color: "BBBBBB", align: "left" });
  return slide;
}

function buildTextSlide(pres: PptxGenJS, config: SlideConfig, pal: typeof PALETTES[string], font: typeof FONTS[string]) {
  const slide = pres.addSlide();
  slide.background = { color: pal.bg };
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.85, fill: { color: pal.primary }, line: { color: pal.primary, width: 0 } });
  slide.addText(config.title || "", { x: 0.4, y: 0, w: 9.2, h: 0.85, fontSize: 26, fontFace: font.title, color: "FFFFFF", bold: true, align: "left", valign: "middle", margin: 0 });
  const bullets = parseBullets(config.body || "");
  if (bullets.length > 0) {
    const items = bullets.map((b, i) => ({ text: b, options: { bullet: true, breakLine: i < bullets.length - 1, fontSize: 18, color: "2D2D2D", paraSpaceAfter: 8 } }));
    slide.addText(items as any, { x: 0.5, y: 1.1, w: 9, h: 4.2, fontFace: font.body, valign: "top" });
  }
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0.85, w: 0.08, h: 4.775, fill: { color: pal.accent }, line: { color: pal.accent, width: 0 } });
  return slide;
}

function buildTextImageSlide(pres: PptxGenJS, config: SlideConfig, pal: typeof PALETTES[string], font: typeof FONTS[string]) {
  const slide = pres.addSlide();
  slide.background = { color: pal.bg };
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.75, fill: { color: pal.primary }, line: { color: pal.primary, width: 0 } });
  slide.addText(config.title || "", { x: 0.4, y: 0, w: 9.2, h: 0.75, fontSize: 24, fontFace: font.title, color: "FFFFFF", bold: true, align: "left", valign: "middle", margin: 0 });
  const bullets = parseBullets(config.body || "");
  if (bullets.length > 0) {
    const items = bullets.map((b, i) => ({ text: b, options: { bullet: true, breakLine: i < bullets.length - 1, fontSize: 16, color: "2D2D2D", paraSpaceAfter: 6 } }));
    slide.addText(items as any, { x: 0.4, y: 0.95, w: 5.2, h: 4.3, fontFace: font.body, valign: "top" });
  }
  slide.addShape(pres.ShapeType.rect, { x: 5.9, y: 0.9, w: 3.7, h: 4.3, fill: { color: pal.secondary, transparency: 50 }, line: { color: pal.accent, width: 2 }, shadow: makeShadow() });
  const imgLabel = config.imageNote || "[ Imagen ]";
  slide.addText(imgLabel, { x: 5.9, y: 0.9, w: 3.7, h: 4.3, fontSize: 14, fontFace: font.body, color: pal.primary, align: "center", valign: "middle", italic: true });
  return slide;
}

function buildTwoColumnsSlide(pres: PptxGenJS, config: SlideConfig, pal: typeof PALETTES[string], font: typeof FONTS[string]) {
  const slide = pres.addSlide();
  slide.background = { color: pal.bg };
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.75, fill: { color: pal.primary }, line: { color: pal.primary, width: 0 } });
  slide.addText(config.title || "", { x: 0.4, y: 0, w: 9.2, h: 0.75, fontSize: 24, fontFace: font.title, color: "FFFFFF", bold: true, align: "left", valign: "middle", margin: 0 });
  slide.addShape(pres.ShapeType.rect, { x: 4.9, y: 0.9, w: 0.05, h: 4.3, fill: { color: pal.accent, transparency: 40 }, line: { color: pal.accent, width: 0 } });
  const leftBullets = parseBullets(config.bodyLeft || "");
  if (leftBullets.length > 0) {
    const items = leftBullets.map((b, i) => ({ text: b, options: { bullet: true, breakLine: i < leftBullets.length - 1, fontSize: 15, color: "2D2D2D", paraSpaceAfter: 5 } }));
    slide.addText(items as any, { x: 0.4, y: 0.95, w: 4.3, h: 4.3, fontFace: font.body, valign: "top" });
  }
  const rightBullets = parseBullets(config.bodyRight || "");
  if (rightBullets.length > 0) {
    const items = rightBullets.map((b, i) => ({ text: b, options: { bullet: true, breakLine: i < rightBullets.length - 1, fontSize: 15, color: "2D2D2D", paraSpaceAfter: 5 } }));
    slide.addText(items as any, { x: 5.2, y: 0.95, w: 4.4, h: 4.3, fontFace: font.body, valign: "top" });
  }
  return slide;
}

function buildQuoteSlide(pres: PptxGenJS, config: SlideConfig, pal: typeof PALETTES[string], font: typeof FONTS[string]) {
  const slide = pres.addSlide();
  slide.background = { color: pal.primary };
  slide.addText("\u201C", { x: 0.3, y: 0.2, w: 2, h: 2, fontSize: 120, fontFace: font.title, color: pal.accent, transparency: 40, align: "left" });
  slide.addText(config.quote || "", { x: 1, y: 1.1, w: 8, h: 2.8, fontSize: 28, fontFace: font.title, color: pal.text, align: "center", valign: "middle", italic: true, bold: true });
  if (config.author) {
    slide.addShape(pres.ShapeType.rect, { x: 3.5, y: 4.2, w: 3, h: 0.04, fill: { color: pal.accent }, line: { color: pal.accent, width: 0 } });
    slide.addText(`— ${config.author}`, { x: 1, y: 4.3, w: 8, h: 0.6, fontSize: 16, fontFace: font.body, color: pal.secondary, align: "center" });
  }
  return slide;
}

function buildClosingSlide(pres: PptxGenJS, config: SlideConfig, pal: typeof PALETTES[string], font: typeof FONTS[string]) {
  const slide = pres.addSlide();
  slide.background = { color: pal.bg };
  slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.4, h: 5.625, fill: { color: pal.primary }, line: { color: pal.primary, width: 0 } });
  slide.addText(config.title || "Conclusiones", { x: 0.7, y: 0.4, w: 9, h: 0.9, fontSize: 32, fontFace: font.title, color: pal.primary, bold: true, align: "left" });
  const points = config.points || parseBullets(config.body || "");
  const totalPoints = Math.min(points.length, 4);
  const cols = totalPoints <= 2 ? totalPoints : 2;
  const rows = Math.ceil(totalPoints / cols);
  const cardW = cols === 1 ? 8.5 : 4.1;
  const cardH = rows === 1 ? 2.8 : 1.6;
  const startX = cols === 1 ? 0.75 : 0.7;
  const startY = 1.5;
  const gapX = 0.3;
  const gapY = 0.2;
  points.slice(0, 4).forEach((pt, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = startX + col * (cardW + gapX);
    const cy = startY + row * (cardH + gapY);
    slide.addShape(pres.ShapeType.rect, { x: cx, y: cy, w: cardW, h: cardH, fill: { color: pal.secondary, transparency: 65 }, line: { color: pal.accent, width: 1.5 }, shadow: makeShadow() });
    slide.addShape(pres.ShapeType.ellipse, { x: cx + 0.15, y: cy + 0.15, w: 0.18, h: 0.18, fill: { color: pal.accent }, line: { color: pal.accent, width: 0 } });
    slide.addText(pt, { x: cx + 0.45, y: cy + 0.05, w: cardW - 0.55, h: cardH - 0.1, fontSize: 14, fontFace: font.body, color: "1E293B", align: "left", valign: "middle", wrap: true });
  });
  return slide;
}

export const generatePresentation = onCall(
  { invoker: "public", timeoutSeconds: 120 },
  async (request) => {
    const cfg: PresentationConfig = request.data;
    if (!cfg?.slides?.length) throw new HttpsError("invalid-argument", "Se requieren diapositivas");
    const pal = PALETTES[cfg.paletteId] ?? PALETTES.midnight;
    const font = FONTS[cfg.fontId] ?? FONTS.modern;
    const PptxGenJSCtor = (await import("pptxgenjs")).default as unknown as typeof PptxGenJS;
    const pres = new PptxGenJSCtor();
    pres.layout = "LAYOUT_16x9";
    pres.author = "El Juego del Semáforo";
    pres.title = cfg.presentationTitle || "Presentación";
    pres.subject = cfg.subject || "";
    for (const slide of cfg.slides) {
      switch (slide.type) {
        case "cover": buildCover(pres, slide, pal, font); break;
        case "text": buildTextSlide(pres, slide, pal, font); break;
        case "text_image": buildTextImageSlide(pres, slide, pal, font); break;
        case "two_columns": buildTwoColumnsSlide(pres, slide, pal, font); break;
        case "quote": buildQuoteSlide(pres, slide, pal, font); break;
        case "closing": buildClosingSlide(pres, slide, pal, font); break;
        default: buildTextSlide(pres, slide, pal, font);
      }
    }
    const base64 = await pres.write({ outputType: "base64" }) as string;
    const filename = `${(cfg.presentationTitle || "Presentacion").replace(/[^a-zA-Z0-9]/g, "_")}.pptx`;
    return { data: base64, filename };
  }
);

// generateComparadorPaises
interface ComparadorEntity { name: string; iso2?: string; wb: string; }
interface ComparadorDimConfig { enabled: boolean; indicators: string[]; }
interface ComparadorRequest {
  tipo: "pais" | "region";
  entidades: ComparadorEntity[];
  dimensiones: Record<string, ComparadorDimConfig>;
  comparacionTemporal: boolean;
  anioA?: number;
  anioB?: number;
}
interface GeoData { area?: number; capital?: string; region?: string; subregion?: string; languages?: string; bordersCount?: number; }
interface WBValue { value: number | null; date: string | null; }
interface EntityData { name: string; wb: string; iso2?: string; geo: GeoData; wbData: Record<string, WBValue>; temporal: Record<string, Array<{ year: string; value: number | null }>>; }

const IND_META: Record<string, { label: string; unit: string; numFmt: string }> = {
  "SP.POP.TOTL": { label: "Población total", unit: "habitantes", numFmt: "#,##0" },
  "SP.POP.GROW": { label: "Crecimiento poblacional", unit: "%", numFmt: "0.0" },
  "SP.URB.TOTL.IN.ZS": { label: "Urbanización", unit: "%", numFmt: "0.0" },
  "SP.DYN.LE00.IN": { label: "Esperanza de vida", unit: "años", numFmt: "0.0" },
  "SP.DYN.TFRT.IN": { label: "Tasa de fecundidad", unit: "hijos/mujer", numFmt: "0.00" },
  "NY.GDP.MKTP.CD": { label: "PIB", unit: "miles de mill. USD", numFmt: "#,##0.0" },
  "NY.GDP.PCAP.CD": { label: "PIB per cápita", unit: "USD", numFmt: "#,##0" },
  "SL.UEM.TOTL.ZS": { label: "Desempleo", unit: "%", numFmt: "0.0" },
  "FP.CPI.TOTL.ZG": { label: "Inflación", unit: "%", numFmt: "0.0" },
  "NE.EXP.GNFS.ZS": { label: "Exportaciones", unit: "% PIB", numFmt: "0.0" },
  "SI.POV.GINI": { label: "Índice de Gini", unit: "(0–100)", numFmt: "0.0" },
  "SP.DYN.IMRT.IN": { label: "Mortalidad infantil", unit: "por 1000 nac.", numFmt: "0.0" },
  "SE.SEC.ENRR": { label: "Matrícula secundaria", unit: "%", numFmt: "0.0" },
  "IT.NET.USER.ZS": { label: "Usuarios de internet", unit: "%", numFmt: "0.0" },
  "SE.XPD.TOTL.GD.ZS": { label: "Gasto en educación", unit: "% PIB", numFmt: "0.0" },
  "EN.ATM.CO2E.PC": { label: "Emisiones CO₂ per cápita", unit: "toneladas", numFmt: "0.00" },
  "AG.LND.FRST.ZS": { label: "Área forestal", unit: "% territorio", numFmt: "0.0" },
  "SH.H2O.BASW.ZS": { label: "Acceso a agua potable", unit: "%", numFmt: "0.0" },
  "EG.FEC.RNEW.ZS": { label: "Energías renovables", unit: "%", numFmt: "0.0" },
  "AG.LND.ARBL.ZS": { label: "Tierra cultivable", unit: "% territorio", numFmt: "0.0" },
};

const GEO_LABELS: Record<string, string> = {
  area: "Superficie (km²)", capital: "Capital", region: "Región",
  subregion: "Subregión", languages: "Idiomas oficiales", bordersCount: "Nº países limítrofes",
};

const DIM_META: Record<string, { label: string; color: string; textColor: string }> = {
  geografica: { label: "🌍 GEOGRÁFICA", color: "1E8449", textColor: "FFFFFF" },
  demografica: { label: "👥 DEMOGRÁFICA", color: "1A5276", textColor: "FFFFFF" },
  economica: { label: "💰 ECONÓMICA", color: "6C3483", textColor: "FFFFFF" },
  social: { label: "🏫 SOCIAL", color: "B7550A", textColor: "FFFFFF" },
  ambiental: { label: "🌱 AMBIENTAL", color: "148F77", textColor: "FFFFFF" },
};

async function fetchRestCountries(entities: ComparadorEntity[]): Promise<Record<string, GeoData>> {
  const withIso = entities.filter((e) => e.iso2);
  if (!withIso.length) return {};
  try {
    const codes = withIso.map((e) => e.iso2).join(",");
    const res = await fetch(`https://restcountries.com/v3.1/alpha?codes=${codes}&fields=name,cca2,capital,region,subregion,area,languages,borders`);
    if (!res.ok) return {};
    const data = await res.json() as any[];
    const result: Record<string, GeoData> = {};
    for (const c of data) {
      result[c.cca2] = {
        area: c.area,
        capital: Array.isArray(c.capital) ? c.capital[0] : c.capital ?? "",
        region: c.region ?? "",
        subregion: c.subregion ?? "",
        languages: c.languages ? Object.values(c.languages as Record<string, string>).join(", ") : "",
        bordersCount: Array.isArray(c.borders) ? c.borders.length : 0,
      };
    }
    return result;
  } catch { return {}; }
}

async function fetchWBIndicator(wbCodes: string[], indicator: string, dateParam: string): Promise<Record<string, Array<{ year: string; value: number | null }>>> {
  try {
    const url = `https://api.worldbank.org/v2/country/${wbCodes.join(";")}/indicator/${indicator}?format=json&${dateParam}&per_page=${wbCodes.length * 30}`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const json = await res.json() as any[];
    if (!Array.isArray(json) || !Array.isArray(json[1])) return {};
    const result: Record<string, Array<{ year: string; value: number | null }>> = {};
    for (const item of json[1]) {
      const code: string = item.country?.id ?? "";
      if (!code) continue;
      if (!result[code]) result[code] = [];
      result[code].push({ year: item.date, value: item.value });
    }
    return result;
  } catch { return {}; }
}

function addCellBorder(cell: ExcelJS.Cell): void {
  const b: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCCCCCC" } };
  cell.border = { top: b, bottom: b, left: b, right: b };
}

function colToLetter(col: number): string {
  let letter = "";
  while (col > 0) { const rem = (col - 1) % 26; letter = String.fromCharCode(65 + rem) + letter; col = Math.floor((col - 1) / 26); }
  return letter;
}

function buildComparativaSheet(wb: ExcelJS.Workbook, entities: EntityData[], req: ComparadorRequest): void {
  const ws = wb.addWorksheet("Comparativa", { views: [{ state: "frozen", xSplit: 1, ySplit: 2 }] });
  const HEADER_BG = "1E3A5F";
  const ALT_ROW = "F0F4FA";
  const N = entities.length;
  ws.getColumn(1).width = 32;
  for (let i = 2; i <= N + 1; i++) ws.getColumn(i).width = 22;
  ws.mergeCells(1, 1, 1, N + 1);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `Comparador: ${entities.map((e) => e.name).join(" · ")}`;
  titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" }, name: "Arial" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_BG}` } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 28;
  ws.getRow(2).height = 24;
  const indCell = ws.getCell(2, 1);
  indCell.value = "Indicador";
  indCell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" }, name: "Arial" };
  indCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_BG}` } };
  indCell.alignment = { horizontal: "center", vertical: "middle" };
  entities.forEach((e, i) => {
    const c = ws.getCell(2, i + 2);
    c.value = e.name;
    c.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" }, name: "Arial" };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_BG}` } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  let currentRow = 3;
  let rowIdx = 0;
  for (const dimId of ["geografica", "demografica", "economica", "social", "ambiental"]) {
    const dimConfig = req.dimensiones[dimId];
    if (!dimConfig?.enabled) continue;
    const meta = DIM_META[dimId];
    ws.mergeCells(currentRow, 1, currentRow, N + 1);
    const dimCell = ws.getCell(currentRow, 1);
    dimCell.value = meta.label;
    dimCell.font = { bold: true, size: 11, color: { argb: `FF${meta.textColor}` }, name: "Arial" };
    dimCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${meta.color}` } };
    dimCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getRow(currentRow).height = 20;
    currentRow++;
    for (const indId of dimConfig.indicators) {
      const isAlt = rowIdx % 2 === 0;
      ws.getRow(currentRow).height = 18;
      const label = IND_META[indId]?.label ?? GEO_LABELS[indId] ?? indId;
      const unit = IND_META[indId]?.unit ?? "";
      const lc = ws.getCell(currentRow, 1);
      lc.value = unit ? `${label} (${unit})` : label;
      lc.font = { size: 10, name: "Arial" };
      lc.fill = isAlt ? { type: "pattern", pattern: "solid", fgColor: { argb: `FF${ALT_ROW}` } } : { type: "pattern", pattern: "none" };
      lc.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      addCellBorder(lc);
      entities.forEach((entity, i) => {
        const vc = ws.getCell(currentRow, i + 2);
        const isGeo = ["area", "capital", "region", "subregion", "languages", "bordersCount"].includes(indId);
        const raw = isGeo ? entity.geo[indId as keyof GeoData] : entity.wbData[indId]?.value ?? null;
        if (raw === null || raw === undefined) {
          vc.value = "N/D";
          vc.font = { size: 10, name: "Arial", color: { argb: "FF999999" }, italic: true };
        } else if (typeof raw === "number") {
          vc.value = raw;
          vc.numFmt = IND_META[indId]?.numFmt ?? "#,##0.0";
          vc.font = { size: 10, name: "Arial" };
        } else {
          vc.value = String(raw);
          vc.font = { size: 10, name: "Arial" };
        }
        vc.alignment = { horizontal: "center", vertical: "middle" };
        vc.fill = isAlt ? { type: "pattern", pattern: "solid", fgColor: { argb: `FF${ALT_ROW}` } } : { type: "pattern", pattern: "none" };
        addCellBorder(vc);
      });
      currentRow++;
      rowIdx++;
    }
  }
}

function buildAnalisisSheet(wb: ExcelJS.Workbook, analysis: Record<string, string>, entities: ComparadorEntity[]): void {
  const ws = wb.addWorksheet("Análisis IA");
  ws.getColumn(1).width = 100;
  let row = 1;
  const tc = ws.getCell(row, 1);
  tc.value = `Análisis comparativo: ${entities.map((e) => e.name).join(", ")}`;
  tc.font = { bold: true, size: 14, name: "Arial", color: { argb: "FF1E3A5F" } };
  ws.getRow(row).height = 28;
  row += 2;
  const DIM_LABELS: Record<string, string> = {
    demografica: "👥 Dimensión Demográfica", economica: "💰 Dimensión Económica",
    social: "🏫 Dimensión Social", ambiental: "🌱 Dimensión Ambiental",
    conclusion: "🔍 Conclusión general", para_el_aula: "📚 Sugerencia para el aula",
  };
  for (const [key, text] of Object.entries(analysis)) {
    if (!text) continue;
    const hc = ws.getCell(row, 1);
    hc.value = DIM_LABELS[key] ?? key;
    hc.font = { bold: true, size: 12, name: "Arial", color: { argb: "FFFFFFFF" } };
    hc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    hc.alignment = { vertical: "middle", indent: 1 };
    ws.getRow(row).height = 22;
    row++;
    const cc = ws.getCell(row, 1);
    cc.value = text;
    cc.font = { size: 11, name: "Arial" };
    cc.alignment = { wrapText: true, vertical: "top" };
    cc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F8FF" } };
    ws.getRow(row).height = Math.max(60, Math.ceil(text.length / 90) * 15);
    row += 2;
  }
  const nc = ws.getCell(row, 1);
  nc.value = `Análisis generado por IA (Claude). Datos: World Bank API + REST Countries. Fecha: ${new Date().toLocaleDateString("es-AR")}.`;
  nc.font = { size: 9, name: "Arial", color: { argb: "FF999999" }, italic: true };
}

function buildTemporalSheet(wb: ExcelJS.Workbook, entities: EntityData[], indicators: string[], req: ComparadorRequest): void {
  const ws = wb.addWorksheet("Evolución Temporal");
  ws.getColumn(1).width = 12;
  let startRow = 1;
  ws.mergeCells(startRow, 1, startRow, entities.length + 1);
  const tc = ws.getCell(startRow, 1);
  tc.value = `Evolución ${req.anioA}–${req.anioB}: ${entities.map((e) => e.name).join(", ")}`;
  tc.font = { bold: true, size: 13, name: "Arial", color: { argb: "FF1E3A5F" } };
  tc.alignment = { horizontal: "center" };
  ws.getRow(startRow).height = 26;
  startRow += 2;
  for (const ind of indicators) {
    const meta = IND_META[ind];
    if (!meta) continue;
    const allYears = new Set<string>();
    for (const e of entities) (e.temporal[ind] ?? []).forEach((d) => allYears.add(d.year));
    const sortedYears = Array.from(allYears).sort();
    if (sortedYears.length === 0) continue;
    ws.mergeCells(startRow, 1, startRow, entities.length + 1);
    const ih = ws.getCell(startRow, 1);
    ih.value = `${meta.label} (${meta.unit})`;
    ih.font = { bold: true, size: 11, name: "Arial", color: { argb: "FFFFFFFF" } };
    ih.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    ih.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getRow(startRow).height = 20;
    startRow++;
    ws.getCell(startRow, 1).value = "Año";
    ws.getCell(startRow, 1).font = { bold: true, size: 10, name: "Arial" };
    ws.getCell(startRow, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };
    ws.getCell(startRow, 1).alignment = { horizontal: "center" };
    addCellBorder(ws.getCell(startRow, 1));
    entities.forEach((e, i) => {
      ws.getColumn(i + 2).width = 18;
      const c = ws.getCell(startRow, i + 2);
      c.value = e.name;
      c.font = { bold: true, size: 10, name: "Arial" };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE6F1" } };
      c.alignment = { horizontal: "center" };
      addCellBorder(c);
    });
    startRow++;
    const dataStartRow = startRow;
    sortedYears.forEach((year, yi) => {
      const isAlt = yi % 2 === 0;
      const yc = ws.getCell(startRow, 1);
      yc.value = year;
      yc.font = { bold: true, size: 10, name: "Arial" };
      yc.alignment = { horizontal: "center" };
      yc.fill = isAlt ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FA" } } : { type: "pattern", pattern: "none" };
      addCellBorder(yc);
      entities.forEach((entity, i) => {
        const dp = (entity.temporal[ind] ?? []).find((d) => d.year === year);
        const c = ws.getCell(startRow, i + 2);
        if (dp?.value !== null && dp?.value !== undefined) { c.value = dp.value; c.numFmt = meta.numFmt; }
        else { c.value = "N/D"; c.font = { size: 10, name: "Arial", color: { argb: "FF999999" }, italic: true }; }
        c.font = { ...c.font, size: 10, name: "Arial" };
        c.alignment = { horizontal: "center" };
        c.fill = isAlt ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FA" } } : { type: "pattern", pattern: "none" };
        addCellBorder(c);
      });
      startRow++;
    });
    const dataEndRow = startRow - 1;
    if (dataEndRow > dataStartRow) {
      for (let col = 2; col <= entities.length + 1; col++) {
        ws.addConditionalFormatting({
          ref: `${colToLetter(col)}${dataStartRow}:${colToLetter(col)}${dataEndRow}`,
          rules: [{ type: "colorScale", cfvo: [{ type: "min" }, { type: "percentile", value: 50 }, { type: "max" }], color: [{ argb: "FFC6EFCE" }, { argb: "FFFFEB9C" }, { argb: "FF63BE7B" }] } as ExcelJS.ColorScaleRuleType],
        });
      }
    }
    startRow += 2;
  }
  ws.mergeCells(startRow, 1, startRow, entities.length + 1);
  const nc = ws.getCell(startRow, 1);
  nc.value = "💡 Para crear un gráfico: seleccioná la tabla de un indicador → Insertar → Gráfico de líneas.";
  nc.font = { size: 9, name: "Arial", color: { argb: "FF555555" }, italic: true };
  nc.alignment = { wrapText: true };
}

function buildFuentesSheet(wb: ExcelJS.Workbook, req: ComparadorRequest, indicators: string[]): void {
  const ws = wb.addWorksheet("Fuentes");
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 80;
  let row = 1;
  const addRow = (label: string, value: string, bold = false) => {
    ws.getCell(row, 1).value = label; ws.getCell(row, 1).font = { bold: true, size: 10, name: "Arial" };
    ws.getCell(row, 2).value = value; ws.getCell(row, 2).font = { size: 10, name: "Arial", bold }; row++;
  };
  ws.mergeCells(row, 1, row, 2);
  ws.getCell(row, 1).value = "📌 Fuentes de datos";
  ws.getCell(row, 1).font = { bold: true, size: 14, name: "Arial", color: { argb: "FF1E3A5F" } };
  row += 2;
  addRow("Fecha de consulta:", new Date().toLocaleDateString("es-AR"), true);
  addRow("Entidades comparadas:", req.entidades.map((e) => e.name).join(", "));
  row++;
  ws.mergeCells(row, 1, row, 2);
  ws.getCell(row, 1).value = "FUENTE 1: REST Countries API";
  ws.getCell(row, 1).font = { bold: true, size: 11, name: "Arial", color: { argb: "FF1E8449" } };
  row++;
  addRow("URL:", "https://restcountries.com/v3.1/");
  addRow("Licencia:", "Open Data / CC BY-SA 4.0");
  row++;
  ws.mergeCells(row, 1, row, 2);
  ws.getCell(row, 1).value = "FUENTE 2: Banco Mundial (World Bank Open Data)";
  ws.getCell(row, 1).font = { bold: true, size: 11, name: "Arial", color: { argb: "FF1A5276" } };
  row++;
  addRow("URL:", "https://api.worldbank.org/v2/");
  addRow("Licencia:", "Creative Commons Attribution 4.0 (CC-BY 4.0)");
  row++;
  ws.getCell(row, 1).value = "Indicadores utilizados:";
  ws.getCell(row, 1).font = { bold: true, size: 10, name: "Arial" };
  row++;
  for (const ind of indicators) {
    if (!IND_META[ind]) continue;
    ws.getCell(row, 1).value = ind; ws.getCell(row, 1).font = { size: 9, name: "Courier New", color: { argb: "FF555555" } };
    ws.getCell(row, 2).value = `${IND_META[ind].label} (${IND_META[ind].unit})`; ws.getCell(row, 2).font = { size: 10, name: "Arial" };
    row++;
  }
  row++;
  ws.mergeCells(row, 1, row, 2);
  ws.getCell(row, 1).value = "FUENTE 3: Análisis IA — Claude Haiku (Anthropic). El análisis es orientativo.";
  ws.getCell(row, 1).font = { bold: true, size: 11, name: "Arial", color: { argb: "FF6C3483" } };
}

async function getAIAnalysis(entityData: EntityData[], req: ComparadorRequest): Promise<Record<string, string>> {
  const apiKey = GEMINI_KEY.value();
  if (!apiKey) return {};
  const enabledDims = Object.keys(req.dimensiones);
  const dataSummary = entityData.map((e) => {
    const lines = [`**${e.name}**`];
    if (req.dimensiones.geografica && e.geo.area) lines.push(`  Superficie: ${e.geo.area?.toLocaleString()} km², Capital: ${e.geo.capital}`);
    for (const dim of enabledDims.filter((d) => d !== "geografica")) {
      for (const ind of req.dimensiones[dim]?.indicators ?? []) {
        if (IND_META[ind] && e.wbData[ind]?.value !== null) lines.push(`  ${IND_META[ind].label}: ${e.wbData[ind].value?.toFixed(1)} ${IND_META[ind].unit}`);
      }
    }
    return lines.join("\n");
  }).join("\n\n");
  const prompt = `Sos docente especialista en geografía. Analizá comparativamente para uso educativo:\n\n${dataSummary}\n\nRespondé ÚNICAMENTE con JSON válido sin backticks:\n{\n  ${enabledDims.filter(d => d !== "geografica").map(d => `"${d}": "análisis de 2 párrafos sobre dimensión ${d}"`).join(",\n  ")},\n  "conclusion": "síntesis de diferencias y similitudes",\n  "para_el_aula": "sugerencia para trabajar en clase"\n}`;
  try {
    // Si Gemini falla, el helper lo registra y acá se cae al texto de respaldo: el Excel se genera igual.
    const text = await generarTextoGemini(apiKey, prompt);
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { conclusion: "Análisis no disponible.", para_el_aula: "Usar datos de la hoja Comparativa." };
  }
}

export const generateComparadorPaises = onCall(
  { secrets: [GEMINI_KEY], invoker: "public", maxInstances: 5, timeoutSeconds: 240, memory: "512MiB" },
  async (request) => {
    const data = request.data as ComparadorRequest;
    if (!data.entidades || data.entidades.length < 2) throw new HttpsError("invalid-argument", "Se requieren al menos 2 entidades.");
    const entities = data.entidades;
    const wbCodes = entities.map((e) => e.wb);
    const allWBIndicators: string[] = [];
    for (const dim of Object.values(data.dimensiones)) {
      for (const ind of dim.indicators) {
        if (IND_META[ind] && !allWBIndicators.includes(ind)) allWBIndicators.push(ind);
      }
    }
    const temporalIndicators: string[] = data.comparacionTemporal
      ? (data.dimensiones.economica?.indicators ?? data.dimensiones.demografica?.indicators ?? []).filter((i) => IND_META[i]).slice(0, 4)
      : [];
    const [geoMap, ...wbResults] = await Promise.all([
      data.tipo === "pais" ? fetchRestCountries(entities) : Promise.resolve({} as Record<string, GeoData>),
      ...allWBIndicators.map((ind) => fetchWBIndicator(wbCodes, ind, "mrv=1")),
    ]);
    const wbByIndicator: Record<string, Record<string, WBValue>> = {};
    allWBIndicators.forEach((ind, i) => {
      wbByIndicator[ind] = {};
      for (const [code, values] of Object.entries(wbResults[i])) {
        const best = values.find((v) => v.value !== null) ?? values[0];
        wbByIndicator[ind][code] = { value: best?.value ?? null, date: best?.year ?? null };
      }
    });
    const temporalMap: { [key: string]: Record<string, Array<{ year: string; value: number | null }>> } = {};
    if (data.comparacionTemporal && temporalIndicators.length > 0 && data.anioA && data.anioB) {
      const temporalResults = await Promise.all(temporalIndicators.map((ind) => fetchWBIndicator(wbCodes, ind, `date=${data.anioA}:${data.anioB}`)));
      temporalIndicators.forEach((ind, i) => {
        temporalMap[ind] = temporalResults[i];
        for (const code of Object.keys(temporalMap[ind])) temporalMap[ind][code].sort((a, b) => a.year.localeCompare(b.year));
      });
    }
    const entityDataList: EntityData[] = entities.map((entity) => {
      const wbData: Record<string, WBValue> = {};
      for (const ind of allWBIndicators) wbData[ind] = wbByIndicator[ind]?.[entity.wb] ?? { value: null, date: null };
      if (wbData["NY.GDP.MKTP.CD"]?.value !== null) wbData["NY.GDP.MKTP.CD"] = { value: (wbData["NY.GDP.MKTP.CD"].value ?? 0) / 1e9, date: wbData["NY.GDP.MKTP.CD"].date };
      const temp: Record<string, Array<{ year: string; value: number | null }>> = {};
      for (const ind of temporalIndicators) {
        temp[ind] = temporalMap[ind]?.[entity.wb] ?? [];
      }
      return { name: entity.name, wb: entity.wb, iso2: entity.iso2, geo: geoMap[entity.iso2 ?? ""] ?? {}, wbData, temporal: temp };
    });
    const analysis = await getAIAnalysis(entityDataList, data);
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "El Juego del Semáforo";
    workbook.created = new Date();
    buildComparativaSheet(workbook, entityDataList, data);
    buildAnalisisSheet(workbook, analysis, entities);
    if (data.comparacionTemporal && temporalIndicators.length > 0) buildTemporalSheet(workbook, entityDataList, temporalIndicators, data);
    buildFuentesSheet(workbook, data, allWBIndicators);
    const buffer = await workbook.xlsx.writeBuffer();
    const names = entities.map((e) => e.name.replace(/\s+/g, "_")).join("-").substring(0, 40);
    return { base64: Buffer.from(buffer as ArrayBuffer).toString("base64"), filename: `Comparador_${names}_${new Date().getFullYear()}.xlsx` };
  }
);

// generatePlanificacion
interface PlanificacionInput {
  institucion?: string; docente?: string; materia: string;
  nivel: "Primaria" | "Secundaria" | "Superior"; anio?: string;
  duracion: "Anual" | "Cuatrimestral" | "Bimestral" | "Por unidad";
  eje: string; modalidad: "Presencial" | "Virtual" | "Híbrida";
  enfoqueObjetivos: "objetivos" | "capacidades";
}
interface PlanContent {
  fundamentacion: string; objetivos_generales: string[]; objetivos_especificos: string[];
  expectativas_logro: string[]; contenidos_conceptuales: string[]; contenidos_procedimentales: string[];
  contenidos_actitudinales: string[]; estrategias: string[]; evaluacion: string; bibliografia: string[];
  cronograma: Array<{ periodo: string; eje: string; contenidos: string; objetivos_capacidades: string; estrategias: string; evaluacion: string }>;
}
export const generatePlanificacion = onCall(
  { secrets: [GEMINI_KEY], invoker: "public", timeoutSeconds: 180, memory: "512MiB" },
  async (request) => {
    const data = request.data as PlanificacionInput;
    if (!data.materia || !data.eje) throw new HttpsError("invalid-argument", "Materia y eje temático son requeridos.");
    const isCapacidades = data.enfoqueObjetivos === "capacidades";
    const isPeriodBased = data.duracion === "Anual" || data.duracion === "Cuatrimestral";
    const objetivosLabel = isCapacidades ? "capacidades fundamentales a desarrollar" : "objetivos de enseñanza";
    const capacidadesNota = isCapacidades
      ? "Las capacidades deben estar en términos de: pensamiento crítico, comunicación, aprender a aprender, trabajo con otros, resolución de problemas."
      : 'Los objetivos deben usar infinitivos docentes: "lograr que los alumnos comprendan...", etc.';
    const cronogramaEstructura = isPeriodBased
      ? 'El cronograma debe tener 3-4 filas. El campo "periodo" debe decir "Período 1", "Período 2", etc.'
      : 'El cronograma debe tener 6-8 filas. El campo "periodo" debe decir "Semana 1", "Semana 2", etc.';
    const prompt = `Sos un especialista en didáctica y planificación docente. Generá una planificación completa.\n\nDATOS: Materia: ${data.materia} | Nivel: ${data.nivel} | Año/Grado: ${data.anio || "no especificado"} | Duración: ${data.duracion} | Eje: ${data.eje} | Modalidad: ${data.modalidad} | Enfoque: ${isCapacidades ? "capacidades" : "objetivos clásicos"}\n\nRespondé ÚNICAMENTE con JSON válido sin backticks:\n{\n  "fundamentacion": "párrafo de 3-4 oraciones",\n  "objetivos_generales": ["objetivo 1", "objetivo 2", "objetivo 3"],\n  "objetivos_especificos": ["específico 1", "específico 2", "específico 3", "específico 4"],\n  "expectativas_logro": ["expectativa 1", "expectativa 2", "expectativa 3"],\n  "contenidos_conceptuales": ["contenido 1", "contenido 2", "contenido 3"],\n  "contenidos_procedimentales": ["contenido 1", "contenido 2", "contenido 3"],\n  "contenidos_actitudinales": ["contenido 1", "contenido 2"],\n  "estrategias": ["estrategia 1", "estrategia 2", "estrategia 3"],\n  "evaluacion": "párrafo de 2-3 oraciones",\n  "bibliografia": ["Apellido, A. (año). Título. Editorial.", "Apellido, B. (año). Título. Editorial."],\n  "cronograma": [{"periodo": "Período 1", "eje": "nombre del eje", "contenidos": "contenidos", "objetivos_capacidades": "${objetivosLabel}", "estrategias": "estrategias", "evaluacion": "tipo de evaluación"}]\n}\n\nINSTRUCCIONES: ${capacidadesNota} ${cronogramaEstructura} Todo en español.`;
    const apiKey = GEMINI_KEY.value();
    const rawText: string = await generarTextoGemini(apiKey, prompt);
    let content: PlanContent;
    try {
      content = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new HttpsError("internal", "No se pudo parsear la respuesta de la IA.");
      content = JSON.parse(match[0]);
    }
    const buffer = await buildPlanificacionDoc(data, content, isCapacidades, isPeriodBased);
    const safeMateria = data.materia.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, "").trim().replace(/\s+/g, "_");
    return { base64: Buffer.from(buffer).toString("base64"), filename: `Planificacion_${safeMateria}_${data.duracion}.docx` };
  }
);
async function buildPlanificacionDoc(data: PlanificacionInput, content: PlanContent, isCapacidades: boolean, isPeriodBased: boolean): Promise<Buffer> {
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, PageOrientation, BorderStyle, WidthType,
    ShadingType, VerticalAlign, LevelFormat, SectionType,
  } = await import("docx");
  const COLOR_PRIMARY = "1E40AF";
  const COLOR_ACCENT = "DBEAFE";
  const COLOR_BORDER = "BFDBFE";
  const COLOR_ROW_ALT = "F0F7FF";
  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
    left: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
    right: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
  };
  const sectionHeading = (text: string) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text, bold: true, size: 26, color: COLOR_PRIMARY, font: "Arial" })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_ACCENT, space: 2 } },
  });
  const bulletItem = (text: string) => new Paragraph({
    numbering: { reference: "bullets-plan", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22, font: "Arial" })],
  });
  const normalPara = (text: string) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, size: 22, font: "Arial" })] });
  const emptyLine = () => new Paragraph({ children: [new TextRun({ text: "", size: 22 })] });
  const headerLines: string[] = [];
  if (data.institucion) headerLines.push(data.institucion);
  if (data.docente) headerLines.push(`Docente: ${data.docente}`);
  const objetivosTitle = isCapacidades ? "CAPACIDADES GENERALES" : "OBJETIVOS GENERALES";
  const objetivosEspTitle = isCapacidades ? "CAPACIDADES ESPECÍFICAS" : "OBJETIVOS ESPECÍFICOS";
  const portraitChildren = [
    ...(headerLines.length > 0 ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: headerLines.map((line, i) => new TextRun({ text: line + (i < headerLines.length - 1 ? "   " : ""), size: 22, bold: i === 0, font: "Arial", color: "555555" })) })] : []),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 80 }, children: [new TextRun({ text: `PLANIFICACIÓN ${data.duracion.toUpperCase()}`, bold: true, size: 36, font: "Arial", color: COLOR_PRIMARY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: data.materia.toUpperCase(), bold: true, size: 30, font: "Arial", color: COLOR_PRIMARY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: [data.nivel, data.anio, data.modalidad].filter(Boolean).join("  |  "), size: 22, font: "Arial", color: "555555" })] }),
    new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_PRIMARY, space: 1 } }, children: [new TextRun({ text: "" })] }),
    sectionHeading("FUNDAMENTACIÓN"), normalPara(content.fundamentacion), emptyLine(),
    sectionHeading(objetivosTitle), ...content.objetivos_generales.map(bulletItem), emptyLine(),
    sectionHeading(objetivosEspTitle), ...content.objetivos_especificos.map(bulletItem), emptyLine(),
    sectionHeading("EXPECTATIVAS DE LOGRO"), ...content.expectativas_logro.map(bulletItem), emptyLine(),
    sectionHeading("CONTENIDOS"),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "Conceptuales", bold: true, size: 22, font: "Arial" })] }),
    ...content.contenidos_conceptuales.map(bulletItem),
    new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: "Procedimentales", bold: true, size: 22, font: "Arial" })] }),
    ...content.contenidos_procedimentales.map(bulletItem),
    new Paragraph({ spacing: { before: 100, after: 60 }, children: [new TextRun({ text: "Actitudinales", bold: true, size: 22, font: "Arial" })] }),
    ...content.contenidos_actitudinales.map(bulletItem), emptyLine(),
    sectionHeading("ESTRATEGIAS DIDÁCTICAS"), ...content.estrategias.map(bulletItem), emptyLine(),
    sectionHeading("EVALUACIÓN"), normalPara(content.evaluacion), emptyLine(),
    sectionHeading("BIBLIOGRAFÍA"),
    ...content.bibliografia.map((item) => new Paragraph({ numbering: { reference: "numbers-plan", level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: item, size: 22, font: "Arial" })] })),
  ];
  const TOTAL_WIDTH = 15700;
  const colHeaders = isPeriodBased
    ? ["Período / Unidad", "Eje temático", "Contenidos", isCapacidades ? "Capacidades" : "Objetivos", "Estrategias didácticas", "Evaluación"]
    : ["Semana / Clase", "Eje / Contenidos", isCapacidades ? "Capacidades" : "Objetivos", "Actividades", "Recursos", "Evaluación"];
  const colWidths = isPeriodBased ? [1700, 2800, 2800, 2800, 2800, 2800] : [1700, 3000, 2800, 2800, 2700, 2700];
  const headerRow = new TableRow({
    tableHeader: true,
    children: colHeaders.map((h, i) => new TableCell({
      borders: cellBorder, width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: COLOR_PRIMARY, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 18, color: "FFFFFF", font: "Arial" })] })],
    })),
  });
  const dataRows = content.cronograma.map((row, rowIdx) => {
    const cells = isPeriodBased
      ? [row.periodo, row.eje, row.contenidos, row.objetivos_capacidades, row.estrategias, row.evaluacion]
      : [row.periodo, row.contenidos, row.objetivos_capacidades, row.estrategias, row.evaluacion, row.evaluacion];
    const fill = rowIdx % 2 === 0 ? "FFFFFF" : COLOR_ROW_ALT;
    return new TableRow({
      children: cells.map((cellText, i) => new TableCell({
        borders: cellBorder, width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.TOP,
        children: [new Paragraph({ children: [new TextRun({ text: cellText ?? "", size: 18, font: "Arial" })] })],
      })),
    });
  });
  const doc = new Document({
    numbering: {
      config: [
        { reference: "bullets-plan", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "numbers-plan", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ],
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [{ id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: COLOR_PRIMARY }, paragraph: { spacing: { before: 300, after: 100 }, outlineLevel: 1 } }],
    },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
        children: portraitChildren,
      },
      {
        properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 567, right: 567, bottom: 567, left: 567 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 300 }, children: [new TextRun({ text: "CRONOGRAMA DE PLANIFICACIÓN", bold: true, size: 28, font: "Arial", color: COLOR_PRIMARY })] }),
          new Table({ width: { size: TOTAL_WIDTH, type: WidthType.DXA }, columnWidths: colWidths, rows: [headerRow, ...dataRows] }),
        ],
      },
    ],
  });
  return (await Packer.toBuffer(doc)) as unknown as Buffer;
}

// generateEcuaciones
interface EcuacionRequest {
  tipo: string;
  params: { a: number; b?: number; c?: number };
  range: { xInicio: number; xFin: number; paso: number };
}
const EQ_META_MAP: Record<string, { label: string; formulaDisplay: string; yFormula: (x: string) => string; equationFormula: string; paramLabels: Array<{ id: string; symbol: string; label: string }>; notes: string }> = {
  lineal: { label: "Función Lineal", formulaDisplay: "y = mx + b", yFormula: (x) => `=$B$7*${x}+$B$8`, equationFormula: `="y = "&TEXT(B7,"0.##")&"x + "&TEXT(B8,"0.##")`, paramLabels: [{ id: "a", symbol: "m", label: "Pendiente" }, { id: "b", symbol: "b", label: "Ordenada al origen" }], notes: "Cambiá m para modificar la inclinación. Cambiá b para subir o bajar la recta." },
  cuadratica: { label: "Función Cuadrática", formulaDisplay: "y = ax² + bx + c", yFormula: (x) => `=$B$7*${x}^2+$B$8*${x}+$B$9`, equationFormula: `="y = "&TEXT(B7,"0.##")&"x^2 + "&TEXT(B8,"0.##")&"x + "&TEXT(B9,"0.##")`, paramLabels: [{ id: "a", symbol: "a", label: "Coef. cuadrático" }, { id: "b", symbol: "b", label: "Coef. lineal" }, { id: "c", symbol: "c", label: "Término independiente" }], notes: "Si a > 0 la parábola abre hacia arriba. El vértice está en x = -b/(2a)." },
  exponencial: { label: "Función Exponencial", formulaDisplay: "y = a · bˣ", yFormula: (x) => `=IFERROR($B$7*$B$8^${x},"")`, equationFormula: `="y = "&TEXT(B7,"0.##")&" · "&TEXT(B8,"0.##")&"^x"`, paramLabels: [{ id: "a", symbol: "a", label: "Coeficiente" }, { id: "b", symbol: "b", label: "Base (b > 0)" }], notes: "Si b > 1 crece exponencialmente. Si 0 < b < 1, decrece." },
  seno: { label: "Función Seno", formulaDisplay: "y = a · sen(bx + c)", yFormula: (x) => `=$B$7*SIN($B$8*${x}+$B$9)`, equationFormula: `="y = "&TEXT(B7,"0.##")&" · sen("&TEXT(B8,"0.##")&"x + "&TEXT(B9,"0.##")&")"`, paramLabels: [{ id: "a", symbol: "a", label: "Amplitud" }, { id: "b", symbol: "b", label: "Frecuencia angular" }, { id: "c", symbol: "c", label: "Fase (radianes)" }], notes: "Ángulos en radianes. Período = 2π/b ≈ 6.28/b. Amplitud = |a|." },
  coseno: { label: "Función Coseno", formulaDisplay: "y = a · cos(bx + c)", yFormula: (x) => `=$B$7*COS($B$8*${x}+$B$9)`, equationFormula: `="y = "&TEXT(B7,"0.##")&" · cos("&TEXT(B8,"0.##")&"x + "&TEXT(B9,"0.##")&")"`, paramLabels: [{ id: "a", symbol: "a", label: "Amplitud" }, { id: "b", symbol: "b", label: "Frecuencia angular" }, { id: "c", symbol: "c", label: "Fase (radianes)" }], notes: "El coseno es igual al seno desplazado π/2 ≈ 1.57 radianes." },
  logaritmica: { label: "Función Logarítmica", formulaDisplay: "y = a · ln(bx)", yFormula: (x) => `=IFERROR($B$7*LN($B$8*${x}),"")`, equationFormula: `="y = "&TEXT(B7,"0.##")&" · ln("&TEXT(B8,"0.##")&"x)"`, paramLabels: [{ id: "a", symbol: "a", label: "Coeficiente" }, { id: "b", symbol: "b", label: "Coeficiente (b > 0)" }], notes: "Solo definida para bx > 0. Usá x inicial > 0." },
  potencial: { label: "Función Potencial", formulaDisplay: "y = a · xⁿ", yFormula: (x) => `=IFERROR($B$7*${x}^$B$8,"")`, equationFormula: `="y = "&TEXT(B7,"0.##")&" · x^"&TEXT(B8,"0.##")`, paramLabels: [{ id: "a", symbol: "a", label: "Coeficiente" }, { id: "b", symbol: "n", label: "Exponente (n)" }], notes: "Con exponente par la función es simétrica. Con impar pasa por el origen." },
};
function safeEvalEq(tipo: string, params: { a: number; b?: number; c?: number }, x: number): number | string {
  const a = params.a ?? 1, b = params.b ?? 1, c = params.c ?? 0;
  try {
    switch (tipo) {
      case "lineal": return a * x + b;
      case "cuadratica": return a * x * x + b * x + c;
      case "exponencial": { const v = a * Math.pow(b, x); return isFinite(v) ? v : ""; }
      case "seno": return a * Math.sin(b * x + c);
      case "coseno": return a * Math.cos(b * x + c);
      case "logaritmica": { const v = a * Math.log(b * x); return isFinite(v) ? v : ""; }
      case "potencial": { const v = a * Math.pow(x, b); return isFinite(v) ? v : ""; }
      default: return "";
    }
  } catch { return ""; }
}
export const generateEcuaciones = onCall(
  { invoker: "public", timeoutSeconds: 60, memory: "256MiB" },
  async (request) => {
    const { tipo, params, range } = request.data as EcuacionRequest;
    const meta = EQ_META_MAP[tipo];
    if (!meta) throw new HttpsError("invalid-argument", `Tipo desconocido: ${tipo}`);
    const { xInicio, xFin, paso } = range;
    if (paso <= 0 || xFin <= xInicio) throw new HttpsError("invalid-argument", "Rango inválido.");
    const nPoints = Math.min(500, Math.floor((xFin - xInicio) / paso) + 1);
    if (nPoints < 2) throw new HttpsError("invalid-argument", "El rango genera menos de 2 puntos.");
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "El Juego del Semáforo";
    workbook.created = new Date();
    const ws = workbook.addWorksheet("Datos");
    ws.getColumn(1).width = 28; ws.getColumn(2).width = 14;
    ws.getColumn(3).width = 4;  ws.getColumn(4).width = 14; ws.getColumn(5).width = 16;
    const BLUE_DARK = "FF1E3A5F"; const BLUE_LIGHT = "FFDCE6F1";
    const YELLOW = "FFFFF2CC"; const SECTION_BG = "FFF0F4FA"; const ALT_ROW_EQ = "FFF0F4FA";
    ws.mergeCells("A1:B1");
    const t1 = ws.getCell("A1");
    t1.value = `📊 ${meta.label}`;
    t1.font = { bold: true, size: 14, name: "Arial", color: { argb: "FFFFFFFF" } };
    t1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_DARK } };
    t1.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 28;
    ws.mergeCells("A2:B2");
    const t2 = ws.getCell("A2");
    t2.value = { formula: meta.equationFormula, result: meta.formulaDisplay };
    t2.font = { bold: true, size: 12, name: "Courier New", color: { argb: "FF1E3A5F" } };
    t2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_LIGHT } };
    t2.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 22;
    ws.mergeCells("A4:B4");
    const ph = ws.getCell("A4");
    ph.value = "⚙️  PARÁMETROS  (celdas editables)";
    ph.font = { bold: true, size: 10, name: "Arial", color: { argb: "FFFFFFFF" } };
    ph.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E8449" } };
    ph.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getRow(4).height = 20;
    const paramValues = [params.a, params.b ?? 0, params.c ?? 0];
    const paramRows = meta.paramLabels.length === 3 ? [7, 8, 9] : [7, 8];
    meta.paramLabels.forEach((p, i) => {
      const row = paramRows[i];
      const lc = ws.getCell(`A${row}`);
      lc.value = `${p.symbol}  =   (${p.label})`;
      lc.font = { size: 10, name: "Arial", bold: true };
      lc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SECTION_BG } };
      lc.alignment = { vertical: "middle", indent: 1 };
      const vc = ws.getCell(`B${row}`);
      vc.value = paramValues[i];
      vc.numFmt = "0.###";
      vc.font = { size: 12, name: "Arial", bold: true, color: { argb: "FF1E3A5F" } };
      vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
      vc.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(row).height = 22;
    });
    const rangeHeaderRow = (meta.paramLabels.length === 3 ? 9 : 8) + 2;
    ws.mergeCells(`A${rangeHeaderRow}:B${rangeHeaderRow}`);
    const rh = ws.getCell(`A${rangeHeaderRow}`);
    rh.value = "📐  RANGO DE x  (editable)";
    rh.font = { bold: true, size: 10, name: "Arial", color: { argb: "FFFFFFFF" } };
    rh.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5276" } };
    rh.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    ws.getRow(rangeHeaderRow).height = 20;
    [{ label: "x inicial", value: xInicio }, { label: "x final", value: xFin }, { label: "Paso", value: paso }].forEach((item, i) => {
      const row = 13 + i;
      ws.getCell(`A${row}`).value = item.label;
      ws.getCell(`A${row}`).font = { size: 10, name: "Arial", bold: true };
      ws.getCell(`A${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: SECTION_BG } };
      ws.getRow(row).height = 20;
      const vc = ws.getCell(`B${row}`);
      vc.value = item.value; vc.numFmt = "0.###";
      vc.font = { size: 12, name: "Arial", bold: true, color: { argb: "FF1A5276" } };
      vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
      vc.alignment = { horizontal: "center", vertical: "middle" };
    });
    ws.mergeCells("A17:B17");
    const nc = ws.getCell("A17");
    nc.value = `💡 ${meta.notes}`;
    nc.font = { size: 9, name: "Arial", italic: true, color: { argb: "FF555555" } };
    nc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
    nc.alignment = { wrapText: true, vertical: "top", indent: 1 };
    ws.getRow(17).height = 36;
    ws.getCell("D1").value = "x";
    ws.getCell("D1").font = { bold: true, size: 11, name: "Arial", color: { argb: "FFFFFFFF" } };
    ws.getCell("D1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_DARK } };
    ws.getCell("D1").alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell("E1").value = "y = f(x)";
    ws.getCell("E1").font = { bold: true, size: 11, name: "Arial", color: { argb: "FFFFFFFF" } };
    ws.getCell("E1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_DARK } };
    ws.getCell("E1").alignment = { horizontal: "center", vertical: "middle" };
    for (let i = 0; i < nPoints; i++) {
      const row = i + 2;
      const isAlt = i % 2 === 0;
      const rowBg = isAlt ? ALT_ROW_EQ : "FFFFFFFF";
      const xCell = ws.getCell(`D${row}`);
      if (i === 0) { xCell.value = { formula: "=$B$13", result: xInicio }; }
      else { xCell.value = { formula: `=D${row - 1}+$B$15`, result: xInicio + i * paso }; }
      xCell.numFmt = "0.###"; xCell.font = { size: 10, name: "Arial" };
      xCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      xCell.alignment = { horizontal: "center" };
      const yCell = ws.getCell(`E${row}`);
      const xVal = xInicio + i * paso;
      yCell.value = { formula: meta.yFormula(`D${row}`), result: safeEvalEq(tipo, params, xVal) };
      yCell.numFmt = "0.####"; yCell.font = { size: 10, name: "Arial" };
      yCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      yCell.alignment = { horizontal: "center" };
      ws.getRow(row).height = 16;
    }
    ws.addConditionalFormatting({
      ref: `E2:E${nPoints + 1}`,
      rules: [{ type: "colorScale", cfvo: [{ type: "min" }, { type: "percentile", value: 50 }, { type: "max" }], color: [{ argb: "FF4472C4" }, { argb: "FFFFFFFF" }, { argb: "FFE74C3C" }] } as any],
    });
    ws.getCell(`D${nPoints + 3}`).value = `${nPoints} puntos generados`;
    ws.getCell(`D${nPoints + 3}`).font = { size: 8, italic: true, name: "Arial", color: { argb: "FF999999" } };
    const wi = workbook.addWorksheet("Instrucciones");
    wi.getColumn(1).width = 8; wi.getColumn(2).width = 80;
    let irow = 1;
    const addITitle = (text: string) => {
      wi.mergeCells(irow, 1, irow, 2);
      const c = wi.getCell(irow, 1);
      c.value = text; c.font = { bold: true, size: 13, name: "Arial", color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_DARK } };
      c.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
      wi.getRow(irow).height = 24; irow++;
    };
    const addIStep = (num: string, text: string) => {
      wi.getCell(irow, 1).value = num; wi.getCell(irow, 1).font = { bold: true, size: 12, name: "Arial", color: { argb: "FF1E3A5F" } }; wi.getCell(irow, 1).alignment = { horizontal: "center", vertical: "top" };
      wi.getCell(irow, 2).value = text; wi.getCell(irow, 2).font = { size: 11, name: "Arial" }; wi.getCell(irow, 2).alignment = { wrapText: true, vertical: "top" };
      wi.getRow(irow).height = Math.max(20, Math.ceil(text.length / 70) * 16); irow++;
    };
    addITitle(`📊 Cómo crear el gráfico — ${meta.label}`);
    irow++;
    addIStep("1️⃣", "Ir a la hoja \"Datos\"");
    addIStep("2️⃣", `Seleccionar la tabla: hacer clic en D1 y arrastrar hasta E${nPoints + 1}.`);
    addIStep("3️⃣", "Ir al menú Insertar → Gráficos → Gráfico de dispersión (XY).");
    addIStep("4️⃣", "Elegir \"Dispersión con líneas suaves\".");
    addIStep("5️⃣", "El gráfico se inserta automáticamente.");
    irow++;
    addITitle("⚙️  Cómo editar los parámetros");
    irow++;
    addIStep("1️⃣", "Las celdas amarillas (B7, B8, B9) contienen los parámetros.");
    addIStep("2️⃣", "Hacé clic en una celda amarilla, escribí el nuevo valor y presioná Enter.");
    addIStep("3️⃣", "La tabla y el gráfico se actualizan automáticamente.");
    irow++;
    wi.mergeCells(irow, 1, irow, 2);
    wi.getCell(irow, 1).value = `💡 ${meta.notes}`;
    wi.getCell(irow, 1).font = { size: 10, name: "Arial", italic: true };
    wi.getCell(irow, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
    wi.getCell(irow, 1).alignment = { wrapText: true, vertical: "top", indent: 1 };
    wi.getRow(irow).height = 32;
    const buffer = await workbook.xlsx.writeBuffer();
    return { base64: Buffer.from(buffer as ArrayBuffer).toString("base64"), filename: `Ecuacion_${meta.label.replace(/\s+/g, "_")}.xlsx` };
  }
);

// ============================================================================
// FUNCIONES DEL ÁRBITRO
// ============================================================================

const ADMIN_UID_ARBITRO = "P2lU12xoCxMkZ0AdZdMoGGksJ5o1";

// ── Autorización del panel docente ────────────────────────────────────────────
// Las funciones que leen datos de una sesión para el panel exigen que quien
// llama sea el docente que la creó (docenteUid) o el administrador.
async function exigirDocenteDeSesion(
  auth: { uid: string } | undefined,
  sessionId: string,
): Promise<FirebaseFirestore.DocumentData> {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Tenés que iniciar sesión para ver esta información.");
  }
  const doc = await db.collection("sesiones_arbitro").doc(sessionId).get();
  if (!doc.exists) throw new HttpsError("not-found", "Sesión no encontrada.");
  const data = doc.data()!;
  if (data.docenteUid !== auth.uid && auth.uid !== ADMIN_UID_ARBITRO) {
    throw new HttpsError("permission-denied", "Esta sesión pertenece a otro docente.");
  }
  return data;
}

function generateSessionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export const crearSesionArbitro = onCall(
  { secrets: [GEMINI_KEY], invoker: "public", timeoutSeconds: 60 },
  async (request) => {
    try {
      const { area, materia, nivel, anio, tema, subtema, ejercicio, duracion = "clase", tiempoPregunta, textoFuente, permitirPreguntasPropias } = request.data;
      if (!materia || !nivel || !anio || !tema) {
        throw new HttpsError("invalid-argument", "Faltan campos obligatorios: materia, nivel, año y tema");
      }
      const sessionId = generateSessionId();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (duracion === "dia" ? 24 : 3));
      await db.collection("sesiones_arbitro").doc(sessionId).set({
        area: normalizarAreaKey(area),
        materia,
        nivel,
        anio,
        tema,
        subtema: subtema || null,
        ejercicio: ejercicio || null,
        creadoEn: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        duracion,
        tiempoPregunta: tiempoPregunta ?? 0,
        textoFuente: textoFuente || "",
        // «Permitir preguntas propias»: activada por defecto (solo se desactiva con false explícito).
        permitirPreguntasPropias: permitirPreguntasPropias !== false,
        docenteUid: request.auth?.uid ?? null,
        docenteEmail: request.auth?.token?.email ?? null,
      });
      return {
        id: sessionId,
        link: `https://eljuegodelsemaforo.com/sesion/${sessionId}`,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error: any) {
      console.error("Error en crearSesionArbitro:", error);
      throw new HttpsError("internal", error.message || "Error desconocido al crear sesión");
    }
  }
);

export const getSesionArbitro = onCall(
  { invoker: "public", timeoutSeconds: 10 },
  async (request) => {
    const { sessionId } = request.data;
    if (!sessionId) throw new HttpsError("invalid-argument", "sessionId requerido.");
    const doc = await db.collection("sesiones_arbitro").doc(sessionId).get();
    if (!doc.exists) throw new HttpsError("not-found", "Sesión no encontrada.");
    const data = doc.data()!;
    if (new Date(data.expiresAt) < new Date()) {
      throw new HttpsError("deadline-exceeded", "Sesión expirada.");
    }
    return {
      area: normalizarAreaKey(data.area),
      materia: data.materia,
      nivel: data.nivel,
      anio: data.anio,
      tema: data.tema,
      subtema: data.subtema || "",
      ejercicio: data.ejercicio || "",
      tiempoPregunta: data.tiempoPregunta ?? 0,
      textoFuente: data.textoFuente || "",
      permitirPreguntasPropias: data.permitirPreguntasPropias !== false, // las sesiones viejas no tienen el campo: permitido
      expiresAt: data.expiresAt,
      docenteEmail: data.docenteEmail || "",
    };
  }
);

// ── Helper compartido del árbitro ─────────────────────────────────────────────

// ── Helper compartido del árbitro ─────────────────────────────────────────────

async function runArbitro(params: {
  sessionId: string;
  desacuerdo: string;
  posicionA: string;
  posicionB: string;
  esJuegoOral?: boolean;
  equipoPregunta?: string;
  equipoResponde?: string;
}): Promise<object> {
  const { sessionId, desacuerdo, posicionA, posicionB, esJuegoOral } = params;
  const nombreEquipo = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 60) : "");

  const sessionDoc = await db.collection("sesiones_arbitro").doc(sessionId).get();
  if (!sessionDoc.exists) throw new HttpsError("not-found", "La sesión no existe o expiró.");
  const session = sessionDoc.data()!;
  if (new Date(session.expiresAt) < new Date()) {
    throw new HttpsError("failed-precondition", "La sesión ha expirado.");
  }

  const apiKey = GEMINI_KEY.value();
  if (!apiKey) throw new HttpsError("internal", "Gemini API key no configurada.");

  // Sin `contexto`: el prompt de producción no lleva línea de área/materia/criterio.
  // Para activarlas: contexto: { area: AREA_LABEL_ES[k], materia, criterio: criterioDeArea(session.area) }.
  const prompt = buildArbitroPrompt({
    materia: session.materia,
    nivel: session.nivel,
    anio: session.anio,
    tema: session.tema,
    subtema: session.subtema || "",
    ejercicio: session.ejercicio || "",
    textoFuente: session.textoFuente || "",
    desacuerdo,
    posicionA,
    posicionB,
    esJuegoOral,
    equipoPregunta: esJuegoOral ? nombreEquipo(params.equipoPregunta) : "",
    equipoResponde: esJuegoOral ? nombreEquipo(params.equipoResponde) : "",
  });

  const textoGemini = await generarTextoGemini(apiKey, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
  });

  const raw = textoGemini.trim().replace(/```json|```/g, "").trim();

  // Si Gemini no devuelve JSON válido (o, en el juego oral, no trae el reparto
  // del punto), NO inventamos un veredicto: un respaldo sin puntos cerraba la
  // ronda 0 a 0. Devolvemos un error y el juego ofrece "Reintentar". La
  // consulta tampoco se registra, para no ensuciar el informe pedagógico.
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("runArbitro: Gemini devolvió algo que no es JSON:", raw.slice(0, 500));
    throw new HttpsError("unavailable", "El árbitro no pudo dar una respuesta clara. Probá de nuevo.", { motivo: "respuesta_no_clara" });
  }
  if (esJuegoOral && parsed?.resultado === "fuera_de_tema") {
    // Pregunta fuera del texto/tema: no hay disputa que repartir. Reparto 0/0, sin «Reintentar»;
    // el juego avisa que elijan otra pregunta. La consulta igual se registra (resultado fuera_de_tema).
    parsed.tieneRazon = "ninguno";
    parsed.grado = "parcial";
    parsed.puntosPregunta = 0;
    parsed.puntosResponde = 0;
  } else if (esJuegoOral) {
    // El reparto lo calcula el código a partir de tieneRazon + grado; el modelo no escribe puntajes.
    // Si faltan o traen valores fuera de las opciones, camino de «Reintentar» (no se suma nada).
    const reparto = repartirPunto(parsed?.tieneRazon, parsed?.grado);
    if (!reparto) {
      console.error("runArbitro: tieneRazon/grado ausentes o fuera de las opciones:", JSON.stringify({ tieneRazon: parsed?.tieneRazon, grado: parsed?.grado }));
      throw new HttpsError("unavailable", "El árbitro no pudo dar una respuesta clara. Probá de nuevo.", { motivo: "respuesta_no_clara" });
    }
    parsed.tieneRazon = String(parsed.tieneRazon).trim().toLowerCase();
    if (parsed.grado !== undefined && parsed.grado !== null && parsed.grado !== "") parsed.grado = String(parsed.grado).trim().toLowerCase();
    parsed.puntosPregunta = reparto.puntosPregunta;
    parsed.puntosResponde = reparto.puntosResponde;
    // "resultado" siempre coherente con tieneRazon (salvo fuera_de_tema, que se respeta).
    if (parsed.resultado !== "fuera_de_tema") parsed.resultado = resultadoDesdeTieneRazon(parsed.tieneRazon) ?? parsed.resultado;
  }

  // Registrar consulta (incluye resultado fuera_de_tema para análisis)
  // Se guarda también el veredicto y el reparto: registrarRonda los toma de acá (no de lo que diga el cliente).
  const consultaRef = await db.collection("sesiones_arbitro").doc(sessionId).collection("consultas").add({
    desacuerdo, posicionA, posicionB,
    resultado: parsed.resultado,
    area: normalizarAreaKey(session.area),
    materia: session.materia,
    timestamp: new Date().toISOString(),
    ...(esJuegoOral ? {
      equipoPregunta: nombreEquipo(params.equipoPregunta),
      equipoResponde: nombreEquipo(params.equipoResponde),
      tieneRazon: parsed.tieneRazon ?? null,
      grado: parsed.grado ?? null,
      puntosPregunta: typeof parsed.puntosPregunta === "number" ? parsed.puntosPregunta : null,
      puntosResponde: typeof parsed.puntosResponde === "number" ? parsed.puntosResponde : null,
      veredicto: typeof parsed.veredicto === "string" ? parsed.veredicto : null,
      explicacion: typeof parsed.explicacion === "string" ? parsed.explicacion : null,
      paraSeguirPensando: typeof parsed.paraSeguirPensando === "string" ? parsed.paraSeguirPensando : null,
    } : {}),
  });

  return esJuegoOral ? { ...parsed, consultaId: consultaRef.id } : parsed;
}

// ── arbitrarDesacuerdo ────────────────────────────────────────────────────────

export const arbitrarDesacuerdo = onCall(
  { secrets: [GEMINI_KEY], invoker: "public", timeoutSeconds: 90, memory: "256MiB" },
  async (request) => {
    const { sessionId, desacuerdo, posicionA, posicionB } = request.data;
    if (!sessionId || !desacuerdo || !posicionA || !posicionB) {
      throw new HttpsError("invalid-argument", "Faltan datos del desacuerdo.");
    }
    return runArbitro({ sessionId, desacuerdo, posicionA, posicionB });
  }
);

// ── requestVeredicto (llamado desde ArbitroSesionPage) ────────────────────────

export const requestVeredicto = onCall(
  { secrets: [GEMINI_KEY], invoker: "public", timeoutSeconds: 90, memory: "256MiB" },
  async (request) => {
    const { sessionId, conflicto, desacuerdo, posicionA, posicionB, modo, equipoPregunta, equipoResponde } = request.data;
    const texto = conflicto || desacuerdo;
    if (!sessionId || !texto || !posicionA || !posicionB) {
      throw new HttpsError("invalid-argument", "Faltan campos: sessionId, conflicto, posicionA, posicionB.");
    }
    return runArbitro({ sessionId, desacuerdo: texto, posicionA, posicionB, esJuegoOral: modo === "juego_oral", equipoPregunta, equipoResponde });
  }
);

// ── generarConsignasArbitro ───────────────────────────────────────────────────

export const generarConsignasArbitro = onCall(
  { secrets: [GEMINI_KEY], invoker: "public", timeoutSeconds: 60 },
  async (request) => {
    // Función abierta (invoker público) que gasta Gemini: solo docentes con sesión.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Iniciá sesión con Google para generar preguntas.");
    }
    const { materia, nivel, anio, tema, subtema, cantidad, tipoPreguntas, textoFuente } = request.data as {
      materia: string; nivel: string; anio: string; tema: string; subtema?: string; cantidad?: number;
      tipoPreguntas?: "memoristica" | "mixta" | "capacidades";
      textoFuente?: string;
    };
    if (!materia || !nivel || !anio || !tema) {
      throw new HttpsError("invalid-argument", "Faltan datos obligatorios.");
    }
    // La cantidad la elige el docente en la configuración de la sesión; la acotamos
    // a un rango razonable (3 a 30) para no generar listas inmanejables durante el juego.
    const n = Math.min(30, Math.max(3, Math.round(cantidad || 6)));
    const tipo = tipoPreguntas === "memoristica" || tipoPreguntas === "capacidades" ? tipoPreguntas : "mixta";
    const apiKey = GEMINI_KEY.value();
    if (!apiKey) throw new HttpsError("internal", "Gemini API key no configurada");

    // Operaciones de pensamiento que buscan desarrollar capacidades (pensamiento
    // crítico, argumentación) en vez de pura memoria — versión curada para preguntas
    // orales breves, alineada con las mismas capacidades que usa el Juego del Semáforo.
    const OPERACIONES_CAPACIDADES = [
      "Comparar: presentar dos interpretaciones, posturas o elementos del tema y pedir cuál es más sólido y por qué.",
      "Detectar un error: plantear una afirmación con un error conceptual sobre el tema y pedir que lo identifiquen y corrijan.",
      "Argumentar una posición: pedir que defiendan una postura discutible sobre el tema con al menos dos razones.",
      "Cuestionar un supuesto: presentar una idea muy extendida sobre el tema y pedir que evalúen si es así o no, y por qué.",
      "Relacionar conceptos: pedir que expliquen la conexión entre dos elementos del tema.",
    ];

    const bloqueTipo = tipo === "memoristica"
      ? `Priorizá preguntas de dato concreto: nombres, fechas, definiciones, hechos puntuales del tema.`
      : tipo === "capacidades"
      ? `La gran mayoría de las preguntas (al menos 8 de cada 10) tienen que pedir alguna de estas operaciones de pensamiento en vez de un dato suelto, para que ayuden a desarrollar capacidades y no solo memoria:
${OPERACIONES_CAPACIDADES.map((o) => `- ${o}`).join("\n")}
Estas preguntas siguen necesitando una respuesta verificable y justificable con el tema — no es opinión libre, es razonamiento que el árbitro pueda evaluar.`
      : `Combiná dos tipos de preguntas en partes similares: la mitad de dato concreto (nombres, fechas, definiciones) y la otra mitad que pida alguna de estas operaciones de pensamiento, para que ayuden a desarrollar capacidades y no solo memoria:
${OPERACIONES_CAPACIDADES.map((o) => `- ${o}`).join("\n")}
Estas últimas también necesitan una respuesta verificable y justificable con el tema — no es opinión libre, es razonamiento que el árbitro pueda evaluar.`;

    const bloqueTexto = textoFuente && textoFuente.trim()
      ? `\nTEXTO BASE QUE LOS ALUMNOS VAN A LEER ANTES DEL JUEGO:\n"""\n${textoFuente.trim().substring(0, 8000)}\n"""\n\nMUY IMPORTANTE: las preguntas tienen que poder responderse a partir de este texto. No inventes preguntas sobre aspectos del tema que el texto no cubre, aunque los conozcas de otras fuentes. Priorizá lo que el texto realmente dice, para que el árbitro después pueda evaluar las respuestas citándolo.\n`
      : `\nNo hay un texto base cargado todavía, así que generá las preguntas con tu conocimiento general del tema.\n`;

    const prompt = `Sos un docente experto en ${materia} para ${nivel} ${anio} en Argentina.
Generá exactamente ${n} preguntas sobre el tema: "${tema}"${subtema ? ` (específicamente: ${subtema})` : ""}.
${bloqueTexto}
Estas preguntas se van a usar en un juego oral por equipos: un equipo le hace la pregunta en voz alta
a otro, que debe responder también en voz alta, y un árbitro (o el docente) evalúa si la respuesta es
completa, incompleta o incorrecta. Por eso cada pregunta debe:
- Tener una respuesta verificable, que el árbitro pueda evaluar como correcta, incompleta o incorrecta (evitar preguntas de opinión libre sin ningún criterio posible).
- Ser breve y clara para decirla en voz alta.
- Variar en dificultad (algunas más simples, otras más desafiantes).
- No le pidas al alumno que cite, nombre o argumente "según" un autor o experto mencionado en el texto (aunque el texto sí lo nombre). Si el texto expone una idea de un autor, formulá la pregunta sobre esa idea en sí misma, sin exigir que el alumno recuerde o mencione de quién es. Ejemplo: en vez de "¿cómo argumentarías esto basándote en las ideas de [autor]?", preguntá "¿por qué el texto sostiene que [idea]? ¿estás de acuerdo?".

${bloqueTipo}

Numerá las preguntas del 1 al ${n}. Respondé SOLO con las preguntas numeradas, sin introducción ni cierre.`;
    return { consignas: (await generarTextoGemini(apiKey, prompt)).trim() };
  }
);

// ── requestConsigna ───────────────────────────────────────────────────────────

export const requestConsigna = onCall(
  { secrets: [GEMINI_KEY], invoker: "public", timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Iniciá sesión con Google para generar preguntas.");
    }
    const { sessionId } = request.data as { sessionId: string };
    if (!sessionId) throw new HttpsError("invalid-argument", "sessionId es requerido.");
    const sessionDoc = await db.collection("sesiones_arbitro").doc(sessionId).get();
    if (!sessionDoc.exists) throw new HttpsError("not-found", "Sesión no encontrada.");
    const session = sessionDoc.data()!;
    if (new Date(session.expiresAt) < new Date()) {
      throw new HttpsError("failed-precondition", "La sesión ha expirado.");
    }
    const { materia, nivel, anio, tema, subtema } = session;
    const apiKey = GEMINI_KEY.value();
    if (!apiKey) throw new HttpsError("internal", "Gemini API key no configurada");
    const prompt = `Generá UNA SOLA pregunta de debate para alumnos de ${materia}, ${nivel} ${anio}, tema: "${tema}"${subtema ? ` (${subtema})` : ""}.
No debe ser de sí/no. Máximo 2 líneas. Respondé SOLO con la pregunta.`;
    return { consigna: (await generarTextoGemini(apiKey, prompt)).trim() };
  }
);

// ── GA4 A/B Report ─────────────────────────────────────────
// Datos de envíos hardcodeados (actualizar manualmente con cada campaña)
const DATOS_ENVIOS: Record<string, { lista: string; enviados: number }> = {
  v1: { lista: "historia_geografia", enviados: 294 },
  v2: { lista: "biologia_matematica", enviados: 285 },
  v3: { lista: "idiomas", enviados: 280 },
};

interface VersionAccum {
  sesiones: number;
  usuariosUnicos: number;
  sesionesComprometidas: number;
  duracionTotal: number;
  bounceRateSum: number;
  paginasPorSesionSum: number;
  eventosTotal: number;
  porMateria: Record<string, number>;
}

// onRequest con CORS nativo de Firebase v2 — consumible con fetch() desde el browser
export const getMetricsGA4 = onRequest(
  { region: "us-central1", secrets: ["GA4_SERVICE_ACCOUNT"], cors: true },
  async (_req, res) => {
    try {
      const { BetaAnalyticsDataClient } = await import("@google-analytics/data");

      const serviceAccountJson = GA4_SERVICE_ACCOUNT.value();
      if (!serviceAccountJson) {
        res.status(500).json({ error: "GA4_SERVICE_ACCOUNT secret not configured" });
        return;
      }

      const credentials = JSON.parse(serviceAccountJson);
      const analyticsClient = new BetaAnalyticsDataClient({ credentials });

      const [response] = await analyticsClient.runReport({
        property: "properties/533122058",
        dateRanges: [{ startDate: "60daysAgo", endDate: "today" }],
        dimensions: [
          { name: "sessionManualAdContent" },
          { name: "sessionManualTerm" },
        ],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "engagedSessions" },
          { name: "userEngagementDuration" },
          { name: "bounceRate" },
          { name: "screenPageViewsPerSession" },
          { name: "eventCount" },
        ],
        dimensionFilter: {
          filter: {
            fieldName: "sessionCampaignName",
            stringFilter: { value: "arbitro_2026", matchType: "EXACT" },
          },
        },
      });

      // Acumular por versión
      const metricas: Record<string, VersionAccum> = {};

      for (const row of response.rows ?? []) {
        const utmContent = row.dimensionValues?.[0]?.value ?? "";
        const utmTerm    = row.dimensionValues?.[1]?.value ?? "";
        const version    = utmContent.split("_")[0];

        if (!version.match(/^v[123]$/)) continue;

        if (!metricas[version]) {
          metricas[version] = {
            sesiones: 0, usuariosUnicos: 0,
            sesionesComprometidas: 0, duracionTotal: 0,
            bounceRateSum: 0, paginasPorSesionSum: 0, eventosTotal: 0,
            porMateria: {},
          };
        }

        const m = metricas[version];
        const sesiones = parseInt(row.metricValues?.[0]?.value ?? "0");
        m.sesiones              += sesiones;
        m.usuariosUnicos        += parseInt(row.metricValues?.[1]?.value ?? "0");
        m.sesionesComprometidas += parseInt(row.metricValues?.[2]?.value ?? "0");
        m.duracionTotal         += parseFloat(row.metricValues?.[3]?.value ?? "0");
        m.bounceRateSum         += parseFloat(row.metricValues?.[4]?.value ?? "0") * sesiones;
        m.paginasPorSesionSum   += parseFloat(row.metricValues?.[5]?.value ?? "0") * sesiones;
        m.eventosTotal          += parseInt(row.metricValues?.[6]?.value ?? "0");

        if (utmTerm && utmTerm !== "(not set)") {
          const materia = utmTerm
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l: string) => l.toUpperCase());
          m.porMateria[materia] = (m.porMateria[materia] ?? 0) + parseInt(row.metricValues?.[0]?.value ?? "0");
        }
      }

      // Formatear respuesta con el mismo shape que espera ABTestDashboard
      const resultado = ["v1", "v2", "v3"].map((version) => {
        const d = metricas[version] ?? {
          sesiones: 0, usuariosUnicos: 0,
          sesionesComprometidas: 0, duracionTotal: 0,
          bounceRateSum: 0, paginasPorSesionSum: 0, eventosTotal: 0,
          porMateria: {},
        };

        const bounceRate = d.sesiones > 0
          ? Math.round((d.bounceRateSum / d.sesiones) * 1000) / 1000
          : 0;

        const paginasPorSesion = d.sesiones > 0
          ? Math.round((d.paginasPorSesionSum / d.sesiones) * 10) / 10
          : 0;

        const eventosPorSesion = d.sesiones > 0
          ? Math.round((d.eventosTotal / d.sesiones) * 10) / 10
          : 0;

        return {
          version,
          sesiones:        d.sesiones,
          usuariosUnicos:  d.usuariosUnicos,
          engagementRate:  d.sesiones > 0
            ? Math.round((d.sesionesComprometidas / d.sesiones) * 100) / 100
            : 0,
          tiempoPromedio:  d.sesiones > 0
            ? Math.round(d.duracionTotal / d.sesiones)
            : 0,
          bounceRate,
          paginasPorSesion,
          eventosPorSesion,
          eventosTotal:    d.eventosTotal,
          porMateria:      d.porMateria,
          enviados:        DATOS_ENVIOS[version]?.enviados ?? 0,
          lista:           DATOS_ENVIOS[version]?.lista ?? "",
        };
      });

      res.json(resultado);

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[getMetricsGA4] Error:", msg);
      res.status(500).json({ error: "Error al obtener métricas de GA4", message: msg });
    }
  }
);

// Rondas corregidas por el docente y totales recalculados: se calculan en cada lectura (no se guardan en el
// informe generado con Gemini) para que siempre reflejen las correcciones más recientes.
async function resumenCorrecciones(sessionId: string) {
  try {
    const { totales, resumen } = await leerRondasYTotales(sessionId);
    return { ...resumen, totales };
  } catch (e) {
    console.error("resumenCorrecciones:", e);
    return { rondasConVeredicto: 0, rondasCorregidas: 0, totales: [] };
  }
}

// ── generarInformeSesion ──────────────────────────────────────────────────────
// Genera un informe pedagógico de una sesión de árbitro usando Gemini.
// Guarda el informe en sesiones_arbitro/{sessionId}/informe y lo devuelve.

export const generarInformeSesion = onCall(
  { secrets: [GEMINI_KEY], invoker: "public", timeoutSeconds: 120, memory: "256MiB" },
  async (request) => {
    const { sessionId, forceRegenerar } = request.data as { sessionId: string; forceRegenerar?: boolean };
    if (!sessionId) throw new HttpsError("invalid-argument", "sessionId es requerido.");

    // Cargar sesión — solo el docente dueño (o el admin) puede generar o ver el informe
    const session = await exigirDocenteDeSesion(request.auth, sessionId);

    // Cargar consultas
    const consultasSnap = await db
      .collection("sesiones_arbitro")
      .doc(sessionId)
      .collection("consultas")
      .orderBy("timestamp", "asc")
      .get();

    if (consultasSnap.empty) {
      throw new HttpsError("failed-precondition", "La sesión no tiene consultas registradas aún.");
    }

    const consultas = consultasSnap.docs.map((d) => d.data());

    // Registros ronda por ronda: viven en la subcolección "informes" (un doc por
    // mesa, lo escribe guardarInformeArbitro al enviar la metacognición). Se leen
    // ANTES del early return de caché para que un informe ya generado también
    // muestre las preguntas pasadas, sin obligar a regenerarlo con Gemini.
    const informesSnap = await db
      .collection("sesiones_arbitro")
      .doc(sessionId)
      .collection("informes")
      .get();

    const rondasPasadas: any[] = [];
    informesSnap.docs.forEach((doc) => {
      const d = doc.data();
      if (Array.isArray(d.registros)) {
        d.registros.forEach((r: any) => {
          if (r?.calificacion === "pasada") rondasPasadas.push(r);
        });
      }
    });

    // tiempoSegundos puede venir undefined: las sesiones anteriores a esta
    // semana no lo registraban.
    const rondasPasadasPayload = rondasPasadas.map((r) => ({
      pregunta: r.pregunta || "",
      equipoPregunta: r.equipoPregunta || "",
      tiempoSegundos: typeof r.tiempoSegundos === "number" ? r.tiempoSegundos : null,
    }));

    // Si ya existe informe guardado, devolverlo directamente — salvo que el
    // docente pida explícitamente regenerarlo (por ejemplo, porque terminaron
    // de jugar más parejas después de la primera vez que se generó el informe).
    // Siempre viajamos totalConsultasActual para que el panel pueda detectar
    // que hay consultas nuevas desde la última generación y ofrecer el botón
    // de actualizar, sin gastar una llamada a Gemini de más por su cuenta.
    if (session.informe && !forceRegenerar) {
      return { ...session.informe, totalConsultasActual: consultas.length, rondasPasadas: rondasPasadasPayload, correcciones: await resumenCorrecciones(sessionId) };
    }

    const apiKey = GEMINI_KEY.value();
    if (!apiKey) throw new HttpsError("internal", "Gemini API key no configurada.");

    // Construir resumen de consultas para el prompt
    const resumenConsultas = consultas.map((c, i) => {
      const resultadoLabel: Record<string, string> = {
        A: "Posición A correcta",
        B: "Posición B correcta",
        ambas_correctas: "Ambas correctas",
        ambas_incorrectas: "Ambas incorrectas",
        fuera_de_tema: "Fuera de tema",
      };
      return `Consulta ${i + 1}:
  Desacuerdo: ${c.desacuerdo}
  Posición A: ${c.posicionA}
  Posición B: ${c.posicionB}
  Resultado: ${resultadoLabel[c.resultado] ?? c.resultado}`;
    }).join("\n\n");

    const totalConsultas = consultas.length;
    const fueraDeTema = consultas.filter((c) => c.resultado === "ambas_incorrectas" || c.resultado === "fuera_de_tema").length;
    const correctasA = consultas.filter((c) => c.resultado === "A").length;
    const correctasB = consultas.filter((c) => c.resultado === "B").length;
    const ambasCorrectas = consultas.filter((c) => c.resultado === "ambas_correctas").length;
    const ambasIncorrectas = consultas.filter((c) => c.resultado === "ambas_incorrectas").length;

    // Las preguntas pasadas se excluyen del análisis pedagógico pero se listan
    // aparte: son señal de dificultad y el docente tiene que verlas.
    const rondasPasadasSection = rondasPasadas.length > 0
      ? `\n\nPREGUNTAS PASADAS (NO las incluyas en el análisis pedagógico — no cuentan como debate ni como error; listalas solo para que el docente las vea):\n${
          rondasPasadas.map((r, i) => `${i + 1}. "${r.pregunta || "(sin texto)"}" — pasada por ${r.equipoPregunta || "un equipo"}`).join("\n")
        }`
      : "";

    const prompt = `Sos un asistente pedagógico especializado en análisis de aprendizaje colaborativo.
Analizá la siguiente sesión de debate arbitrado y generá un informe para el docente.

DATOS DE LA SESIÓN:
- Materia: ${session.materia}
- Área: ${(() => { const k = normalizarAreaKey(session.area); return k ? AREA_LABEL_ES[k] : "No especificada"; })()}
- Nivel: ${session.nivel} — ${session.anio}° año
- Tema: ${session.tema}
${session.subtema ? `- Subtema: ${session.subtema}` : ""}
- Total de consultas al árbitro: ${totalConsultas}
- Resultados: A correcta: ${correctasA} | B correcta: ${correctasB} | Ambas correctas: ${ambasCorrectas} | Ambas incorrectas: ${ambasIncorrectas} | Fuera de tema: ${fueraDeTema}

DETALLE DE CONSULTAS:
${resumenConsultas}

Respondé ÚNICAMENTE con JSON válido sin backticks ni texto adicional:
{
  "resumenEjecutivo": "2-3 oraciones que resumen el desempeño general del grupo",
  "conceptosDebatidos": ["lista de conceptos o ideas centrales que aparecieron en las consultas"],
  "fortalezas": "párrafo describiendo lo que el grupo comprendió bien o debatió con profundidad",
  "areasDeOportunidad": "párrafo describiendo los conceptos donde hubo más confusión o errores",
  "patronesObservados": "párrafo describiendo patrones: si hubo debate genuino, si las posiciones eran polarizadas, si las preguntas eran superficiales o profundas",
  "recomendacionesDocente": ["3-4 recomendaciones concretas para el docente para la próxima clase"],
  "preguntasParaRetomar": ["2-3 preguntas que quedaron sin resolver o merecen ser retomadas en clase"],
  "nivelDebate": "superficial" | "adecuado" | "profundo"
}${rondasPasadasSection}`;

    const textoGemini = await generarTextoGemini(apiKey, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
    });

    const raw = textoGemini.trim().replace(/```json|```/g, "").trim();

    let informe: any;
    try {
      informe = JSON.parse(raw);
    } catch {
      informe = {
        resumenEjecutivo: "No se pudo generar el análisis completo.",
        conceptosDebatidos: [],
        fortalezas: raw.slice(0, 400),
        areasDeOportunidad: "",
        patronesObservados: "",
        recomendacionesDocente: [],
        preguntasParaRetomar: [],
        nivelDebate: "adecuado",
      };
    }

    // Enriquecer con metadatos
    informe.generadoEn = new Date().toISOString();
    informe.totalConsultas = totalConsultas;
    informe.estadisticas = { correctasA, correctasB, ambasCorrectas, ambasIncorrectas, fueraDeTema };

    // Guardar en Firestore para no regenerar
    await db.collection("sesiones_arbitro").doc(sessionId).update({ informe });

    return { ...informe, totalConsultasActual: totalConsultas, rondasPasadas: rondasPasadasPayload, correcciones: await resumenCorrecciones(sessionId) };
  }
);

// listarSesionesDocente

export const listarSesionesDocente = onCall(
  { invoker: "public", timeoutSeconds: 30 },
  async (request) => {
    // El uid sale de la autenticación, nunca de los datos que manda el
    // navegador: antes cualquiera podía listar las sesiones de otro docente
    // pasando su uid.
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Tenés que iniciar sesión para ver tus sesiones.");
    const { limit: lim } = request.data as { limit?: number };

    const snap = await db
      .collection("sesiones_arbitro")
      .where("docenteUid", "==", uid)
      .orderBy("creadoEn", "desc")
      .limit(lim ?? 50)
      .get();

    // Cuántas partidas (equipos que ya jugaron y enviaron su metacognición)
    // tiene cada sesión — una sesión con 25-30 alumnos jugando de a parejas
    // puede acumular 6-7 partidas bajo el mismo link, y el docente necesita
    // ver ese número de un vistazo en la lista, sin entrar a cada una.
    const sesiones = await Promise.all(
      snap.docs.map(async (d) => {
        const countSnap = await d.ref.collection("informes").count().get();
        return {
          id: d.id,
          ...d.data(),
          tieneInforme: !!d.data().informe,
          partidasCount: countSnap.data().count,
        };
      })
    );

    return { sesiones };
  }
);

// Igual que las demás funciones de alumnos: la sesión tiene que existir y no estar vencida.
async function exigirSesionVigente(sessionId: unknown) {
  if (typeof sessionId !== "string" || !/^[A-Za-z0-9_-]{2,60}$/.test(sessionId)) {
    throw new HttpsError("invalid-argument", "sessionId inválido.");
  }
  const doc = await db.collection("sesiones_arbitro").doc(sessionId).get();
  if (!doc.exists) throw new HttpsError("not-found", "La sesión no existe o expiró.");
  if (new Date(doc.data()!.expiresAt) < new Date()) throw new HttpsError("failed-precondition", "La sesión ha expirado.");
}

export const guardarInformeArbitro = onCall(
  { region: "us-central1", invoker: "public" },
  async (request) => {
    const data = request.data;

    // ── Modo competitivo: { sessionId, modo, equipos, registros } ──────────
    if (data.modo === "competitivo" && data.equipos) {
      const { sessionId, equipos, registros } = data;
      if (!sessionId || !equipos?.length) {
        throw new HttpsError("invalid-argument", "sessionId y equipos son requeridos para el modo competitivo");
      }
      await exigirSesionVigente(sessionId);
      // Id de la partida (lo genera el juego): une este informe con las rondas registradas por registrarRonda.
      const partidaId = typeof data.partidaId === "string" && /^[A-Za-z0-9_-]{8,40}$/.test(data.partidaId) ? data.partidaId : null;
      const informeRef = db
        .collection("sesiones_arbitro")
        .doc(sessionId)
        .collection("informes")
        .doc(); // genera ID único por grupo

      await informeRef.set({
        modo: "competitivo",
        grupoNombre: equipos[0]?.nombre || "Grupo",
        ...(partidaId ? { partidaId } : {}),
        equipos,
        registros: registros || [],
        creadoEn: new Date().toISOString(),
      });
      return { ok: true };
    }

    // ── Modo normal: { sessionId, nombreAlumno, nombreEquipo, respuestas } ──
    const { sessionId, nombreAlumno, nombreEquipo, respuestas } = data;
    if (!sessionId || !nombreAlumno) {
      throw new HttpsError("invalid-argument", "sessionId y nombreAlumno son requeridos");
    }
    await exigirSesionVigente(sessionId);
    const informeRef = db
      .collection("sesiones_arbitro")
      .doc(sessionId)
      .collection("informes")
      .doc();

    await informeRef.set({
      nombreAlumno,
      nombreEquipo: nombreEquipo || "",
      respuestas,
      creadoEn: new Date().toISOString(),
    });
    return { ok: true };
  }
);

// ── getInformesMetacognicion ───────────────────────────────────────────────

export const getInformesMetacognicion = onCall(
  { region: "us-central1" },
  async (request) => {
    const { sessionId } = request.data;
    if (!sessionId) {
      throw new HttpsError("invalid-argument", "sessionId es requerido");
    }
    await exigirDocenteDeSesion(request.auth, sessionId);

    const snapshot = await db
      .collection("sesiones_arbitro")
      .doc(sessionId)
      .collection("informes")
      .orderBy("creadoEn", "asc")
      .get();

    const informes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { informes };
  }
);

// ── Rondas del juego oral ──────────────────────────────────────────────────────
// Cada ronda confirmada se registra en sesiones_arbitro/{sessionId}/rondas/{partidaId}_{ronda}.
// El cliente no escribe en Firestore: lo hace registrarRonda. Si la ronda fue al árbitro, el veredicto y el
// reparto se toman de la consulta que el servidor guardó (consultaId), no de lo que mande el cliente.
// Solo se guardan los nombres de los equipos: ningún otro dato de los alumnos (no hay integrantes).

export const registrarRonda = onCall(
  { invoker: "public", timeoutSeconds: 30 },
  async (request) => {
    const sessionId = request.data?.sessionId;
    if (typeof sessionId !== "string" || !/^[A-Za-z0-9_-]{2,40}$/.test(sessionId)) {
      throw new HttpsError("invalid-argument", "sessionId requerido.");
    }
    const entrada = validarEntradaRonda(request.data);

    // Misma validación que las demás funciones de alumnos: la sesión existe y no venció.
    const sessionRef = db.collection("sesiones_arbitro").doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) throw new HttpsError("not-found", "La sesión no existe o expiró.");
    if (new Date(sessionDoc.data()!.expiresAt) < new Date()) {
      throw new HttpsError("failed-precondition", "La sesión ha expirado.");
    }

    let consulta: Record<string, any> | null = null;
    if (entrada.consultaId) {
      const c = await sessionRef.collection("consultas").doc(entrada.consultaId).get();
      consulta = c.exists ? (c.data() as Record<string, any>) : null;
    }
    const doc = construirRonda(entrada, consulta, new Date().toISOString());

    // Idempotente: reintentar la misma ronda de la misma partida no duplica ni pisa (ni borra una corrección del docente).
    const id = idDeRonda(entrada.partidaId, entrada.ronda);
    const ref = sessionRef.collection("rondas").doc(id);
    const existente = await ref.get();
    if (existente.exists) return { ok: true, id, yaRegistrada: true };
    await ref.set(doc);
    return { ok: true, id };
  }
);

// Lee las rondas de una sesión + totales. Solo el docente dueño (o el admin).
async function leerRondasYTotales(sessionId: string) {
  const sessionRef = db.collection("sesiones_arbitro").doc(sessionId);
  const [rondasSnap, informesSnap] = await Promise.all([sessionRef.collection("rondas").get(), sessionRef.collection("informes").get()]);
  const rondas = rondasSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, any>>;
  // Orden: las partidas en el orden en que empezaron, y dentro de cada una por número de ronda.
  const primera = new Map<string, string>();
  for (const r of rondas) if (!primera.has(r.partidaId) || r.creadoEn < primera.get(r.partidaId)!) primera.set(r.partidaId, r.creadoEn);
  rondas.sort((a, b) => (primera.get(a.partidaId)! < primera.get(b.partidaId)! ? -1 : primera.get(a.partidaId)! > primera.get(b.partidaId)! ? 1 : a.partidaId < b.partidaId ? -1 : a.partidaId > b.partidaId ? 1 : a.ronda - b.ronda));
  const informes = informesSnap.docs.map((d) => d.data());
  const totales = calcularTotales(rondas, informes);
  return {
    rondas,
    totales,
    resumen: {
      rondasConVeredicto: rondas.filter((r) => r.disputa).length,
      rondasCorregidas: rondas.filter((r) => r.correccion).length,
    },
  };
}

export const listarRondasSesion = onCall(
  { invoker: "public", timeoutSeconds: 30 },
  async (request) => {
    const sessionId = request.data?.sessionId;
    if (typeof sessionId !== "string" || !sessionId) throw new HttpsError("invalid-argument", "sessionId requerido.");
    const session = await exigirDocenteDeSesion(request.auth, sessionId);
    const datos = await leerRondasYTotales(sessionId);
    return {
      ...datos,
      // Solo el docente dueño corrige; el admin puede mirar pero no cambiar repartos.
      puedeCorregir: !!request.auth?.uid && request.auth.uid === session.docenteUid,
      opciones: OPCIONES_REPARTO,
    };
  }
);

// Corrección del docente: cambia el reparto de una ronda con veredicto a una de las 6 opciones. No toca lo que
// los alumnos ya vieron (el marcador de la partida y el informe de metacognición quedan como se enviaron).
export const corregirRonda = onCall(
  { invoker: "public", timeoutSeconds: 30 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Tenés que iniciar sesión para corregir una ronda.");
    const { sessionId, rondaId, tieneRazon, grado } = (request.data || {}) as Record<string, unknown>;
    if (typeof sessionId !== "string" || !sessionId) throw new HttpsError("invalid-argument", "sessionId requerido.");
    if (typeof rondaId !== "string" || !/^[A-Za-z0-9_-]{8,60}$/.test(rondaId)) throw new HttpsError("invalid-argument", "rondaId inválido.");

    const sessionRef = db.collection("sesiones_arbitro").doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) throw new HttpsError("not-found", "Sesión no encontrada.");
    if (sessionDoc.data()!.docenteUid !== uid) {
      throw new HttpsError("permission-denied", "Solo el docente dueño de la sesión puede corregir sus rondas.");
    }
    const ref = sessionRef.collection("rondas").doc(rondaId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Ronda no encontrada.");

    const ahora = new Date().toISOString();
    const resultado = aplicarCorreccion(snap.data() as Record<string, any>, tieneRazon, grado, uid, ahora);
    if (resultado.cambio !== "sin_cambios") await ref.update(resultado.patch);
    const ronda = { id: rondaId, ...(snap.data() as Record<string, any>), ...resultado.patch };
    return { ok: true, cambio: resultado.cambio, ronda };
  }
);

// ── validarPreguntaPropia ───────────────────────────────────────────────────
// Antes de pasarle al otro equipo la pregunta que escribió un equipo, se verifica con Gemini que corresponda
// al texto base y al tema, con el mismo criterio de pertinencia que usa el árbitro (arbitroPrompt.reglaPertinencia).
// Llamada corta; no gasta la ronda ni se guarda nada.

// Máximo de validaciones de preguntas propias con Gemini por sesión.
const TOPE_VALIDACIONES_PROPIAS = 30;

export const validarPreguntaPropia = onCall(
  { secrets: [GEMINI_KEY], invoker: "public", timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    const sessionId = request.data?.sessionId;
    const pregunta = typeof request.data?.pregunta === "string" ? request.data.pregunta.trim() : "";
    if (typeof sessionId !== "string" || !sessionId) throw new HttpsError("invalid-argument", "sessionId requerido.");
    if (pregunta.length < 3 || pregunta.length > 500) throw new HttpsError("invalid-argument", "La pregunta tiene que tener entre 3 y 500 caracteres.");

    const sessionDoc = await db.collection("sesiones_arbitro").doc(sessionId).get();
    if (!sessionDoc.exists) throw new HttpsError("not-found", "La sesión no existe o expiró.");
    const session = sessionDoc.data()!;
    if (new Date(session.expiresAt) < new Date()) throw new HttpsError("failed-precondition", "La sesión ha expirado.");
    if (session.permitirPreguntasPropias === false) {
      throw new HttpsError("failed-precondition", "En esta sesión no se permiten preguntas propias.");
    }

    // Tope de validaciones por sesión (cuenta en el documento de la sesión): esta función es pública y
    // cada llamada gasta Gemini. Al superar el tope la pregunta pasa SIN llamar a Gemini y queda en el log.
    const usadas = typeof session.validacionesPropias === "number" ? session.validacionesPropias : 0;
    if (usadas >= TOPE_VALIDACIONES_PROPIAS) {
      console.warn(JSON.stringify({ evento: "validarPreguntaPropia_tope_superado", sessionId, usadas, tope: TOPE_VALIDACIONES_PROPIAS }));
      return { pertinente: true, motivo: "", sinValidar: true };
    }
    // El contador sube ANTES de llamar a Gemini (y cuenta también los intentos en que Gemini falla).
    await sessionDoc.ref.update({ validacionesPropias: admin.firestore.FieldValue.increment(1) });

    const apiKey = GEMINI_KEY.value();
    if (!apiKey) throw new HttpsError("internal", "Gemini API key no configurada.");

    const prompt = buildPromptPreguntaPropia({
      materia: session.materia, nivel: session.nivel, anio: session.anio, tema: session.tema,
      subtema: session.subtema || "", textoFuente: session.textoFuente || "", pregunta,
    });
    const crudo = await generarTextoGemini(apiKey, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 200 },
    });
    let parsed: any;
    try {
      parsed = JSON.parse(crudo.trim().replace(/```json|```/g, "").trim());
    } catch {
      console.error("validarPreguntaPropia: Gemini devolvió algo que no es JSON:", crudo.slice(0, 300));
      throw new HttpsError("unavailable", "No se pudo validar la pregunta.", { motivo: "respuesta_no_clara" });
    }
    if (typeof parsed?.pertinente !== "boolean") {
      throw new HttpsError("unavailable", "No se pudo validar la pregunta.", { motivo: "respuesta_no_clara" });
    }
    return { pertinente: parsed.pertinente, motivo: typeof parsed.motivo === "string" ? parsed.motivo.slice(0, 200) : "" };
  }
);

// ── listarTodasSesionesAdmin ────────────────────────────────────────────────

export const listarTodasSesionesAdmin = onCall(
  { region: "us-central1" },
  async (request) => {
    if (request.auth?.uid !== ADMIN_UID_ARBITRO) {
      throw new HttpsError("permission-denied", "Solo el administrador puede acceder a esta función.");
    }

    const snap = await db
      .collection("sesiones_arbitro")
      .orderBy("creadoEn", "desc")
      .limit(100)
      .get();

    const sesiones = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      tieneInforme: !!d.data().informe,
    }));

    return { sesiones };
  }
);
