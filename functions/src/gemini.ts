// Único punto de entrada a Gemini. Envuelve la llamada para que cualquier falla de la
// API (saldo, cuota, modelo inexistente, 5xx, red, timeout) se registre de forma segura
// y llegue al front siempre como el mismo error `unavailable`.
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateContentRequest } from "@google/generative-ai";
import { logger } from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";
import { MODELO_GEMINI } from "./config";

export const MENSAJE_IA_NO_DISPONIBLE =
  "El servicio de IA no está disponible en este momento, probá de nuevo en unos minutos.";

export type TipoErrorGemini = "saldo/402" | "cuota/429" | "modelo no encontrado/404" | "otro";

export function clasificarErrorGemini(status: number | undefined): TipoErrorGemini {
  if (status === 402) return "saldo/402";
  if (status === 429) return "cuota/429";
  if (status === 404) return "modelo no encontrado/404";
  return "otro";
}

// Deja solo el mensaje de Google: saca el "Error fetching from <url>: " que agrega el SDK,
// tapa cualquier clave y lo acota. Nunca se le pasa el prompt ni nada del alumno.
export function mensajeSeguroGemini(err: unknown): string {
  const bruto = String((err as any)?.message ?? err ?? "");
  return bruto
    .replace(/^.*?(?:Error fetching from|Request aborted when fetching)\s+\S+:\s+/i, "")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[clave]")
    .replace(/([?&]key=)[^&\s]+/gi, "$1[clave]")
    .slice(0, 300);
}

/**
 * Llama a Gemini y devuelve el texto de la respuesta (sin parsear).
 * Ante cualquier error de la API registra {estado, mensaje} con una etiqueta de tipo y
 * lanza HttpsError("unavailable"). No toca ningún otro error: los HttpsError propios
 * (login, permisos, sesión) se lanzan fuera de este helper.
 */
export async function generarTextoGemini(
  apiKey: string,
  contenido: string | GenerateContentRequest,
): Promise<string> {
  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: MODELO_GEMINI });
    const result = await model.generateContent(contenido);
    return result.response.text();
  } catch (err) {
    const status = typeof (err as any)?.status === "number" ? (err as any).status : undefined;
    logger.error(`Gemini error [${clasificarErrorGemini(status)}]`, {
      estado: status ?? null,
      mensaje: mensajeSeguroGemini(err),
    });
    throw new HttpsError("unavailable", MENSAJE_IA_NO_DISPONIBLE);
  }
}
