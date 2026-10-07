// Formato de puntajes para mostrar: hasta dos decimales y la coma/punto del idioma
// ("0,25" en español, "0.25" en inglés). Es SOLO presentación: lo que se guarda y se suma
// es siempre el valor exacto (0, 0.25, 0.5, 0.75, 1…), nunca el redondeado.
export type IdiomaPuntos = "es" | "en" | "pt";

const LOCALE: Record<IdiomaPuntos, string> = { es: "es-AR", en: "en-US", pt: "pt-BR" };

export function formatearPuntos(valor: number, idioma: IdiomaPuntos = "es"): string {
  if (typeof valor !== "number" || !isFinite(valor)) return "0";
  return new Intl.NumberFormat(LOCALE[idioma] ?? LOCALE.es, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(valor);
}
