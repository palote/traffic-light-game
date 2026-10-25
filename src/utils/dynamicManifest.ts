// src/utils/dynamicManifest.ts
// Elige y aplica el manifest.json (+ apple-touch-icon + apple-mobile-web-app-title) correcto
// según la ruta y el dominio. La misma regla la usa el script inline de index.html para que
// el manifiesto esté bien desde el primer momento, antes de que React monte.
import { esRutaArbitro } from "./arbitroRoutes";
import { idiomaPorDominio } from "./idiomaInicial";
import { rutaSiguienteValida } from "./nextRoute";

export interface DatosManifest {
  manifest: string;
  appleTouchIcon: string;
  appleTitle: string;
}

const SEMAFORO: DatosManifest = {
  manifest: "/manifest.json",
  appleTouchIcon: "/icons/icon-192x192.png",
  appleTitle: "TL Game",
};
const ARBITRO_ES: DatosManifest = {
  manifest: "/manifest-arbitro.json",
  appleTouchIcon: "/icons/arbitro-icon-192.png",
  appleTitle: "Árbitro IA",
};
const ARBITRO_EN: DatosManifest = {
  manifest: "/manifest-arbitro-en.json",
  appleTouchIcon: "/icons/arbitro-icon-192.png",
  appleTitle: "Referees",
};

// ¿Esta combinación de ruta + query corresponde a una pantalla de Árbitros?
// Además de esRutaArbitro(pathname), /login cuenta como de Árbitros cuando su ?next= válido lo es.
// "origen" es el origin real del sitio (window.location.origin) — rutaSiguienteValida lo necesita
// para descartar un next que el propio parser de URLs resolvería a otro dominio (ver nextRoute.ts).
export function esRutaArbitroParaManifest(pathname: string, search: string, origen: string): boolean {
  if (esRutaArbitro(pathname)) return true;
  if (pathname === "/login") {
    const params = new URLSearchParams(search);
    const next = rutaSiguienteValida(params.get("next"), origen);
    const nextPathname = next.split(/[?#]/)[0];
    return esRutaArbitro(nextPathname);
  }
  return false;
}

// Función pura (sin DOM) para poder testearla igual que al script inline de index.html.
// "origen" manda (incluye protocolo y host); el hostname para elegir es/en se deriva de él.
export function datosManifestParaRuta(pathname: string, search: string, origen: string): DatosManifest {
  if (!esRutaArbitroParaManifest(pathname, search, origen)) return SEMAFORO;
  let hostname = origen;
  try { hostname = new URL(origen).hostname; } catch { /* origen ya era un hostname plano */ }
  return idiomaPorDominio(hostname) === "en" ? ARBITRO_EN : ARBITRO_ES;
}

function setLinkHref(rel: string, href: string) {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

function setMetaContent(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

export function setManifestForRoute() {
  const datos = datosManifestParaRuta(window.location.pathname, window.location.search, window.location.origin);
  setLinkHref("manifest", datos.manifest);
  setLinkHref("apple-touch-icon", datos.appleTouchIcon);
  setMetaContent("apple-mobile-web-app-title", datos.appleTitle);
}
