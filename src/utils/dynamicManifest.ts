import { esRutaArbitro } from "./arbitroRoutes";

// Cambia el <link rel="manifest"> según la ruta actual, para que el PWA
// instalado desde el árbitro tenga su propio nombre/ícono/color, distinto
// del manifest general del Juego del Semáforo.
export function setManifestForRoute() {
  const path = window.location.pathname;
  const isArbitro = esRutaArbitro(path);

  const manifestUrl = isArbitro ? "/manifest-arbitro.json" : "/manifest.json";

  let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  link.href = manifestUrl;
}
