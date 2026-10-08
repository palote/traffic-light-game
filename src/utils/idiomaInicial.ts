// Idioma inicial de la interfaz. Función pura (sin window ni localStorage) para poder probarla con un hostname simulado.
// Prioridad: (a) elección explícita guardada → (b) dominio → (c) idioma del navegador → (d) 'en'.
// El dominio NO pisa una elección explícita del usuario.
export type IdiomaInterfaz = "es" | "en" | "pt";

const esIdioma = (x: unknown): x is IdiomaInterfaz => x === "es" || x === "en" || x === "pt";

/** Idioma por defecto de un dominio, o null si el dominio no dice nada (localhost, *.web.app, etc.). */
export function idiomaPorDominio(hostname: string | null | undefined): IdiomaInterfaz | null {
  const h = String(hostname ?? "").toLowerCase();
  if (h.includes("eljuegodelsemaforo")) return "es";
  if (h.includes("trafficlight") || h.includes("traffic-light")) return "en";
  return null;
}

export function resolverIdiomaInicial(p: {
  guardado?: string | null;
  hostname?: string | null;
  idiomaNavegador?: string | null;
}): IdiomaInterfaz {
  if (esIdioma(p.guardado)) return p.guardado;
  const porDominio = idiomaPorDominio(p.hostname);
  if (porDominio) return porDominio;
  const nav = String(p.idiomaNavegador ?? "").toLowerCase();
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("pt")) return "pt";
  return "en";
}
