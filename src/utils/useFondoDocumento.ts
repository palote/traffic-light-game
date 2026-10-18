// Pinta el fondo de una pantalla en <html> y <body> (no solo en un contenedor con alto de viewport), así el color acompaña todo el
// scroll —incluido el rebote de scroll en el celular— y nunca aparece el blanco del navegador. El fondo queda fijo al viewport.
// Al salir de la pantalla se restauran los estilos que tenían <html> y <body>.
import { useLayoutEffect } from "react";

export function useFondoDocumento(fondo: string): void {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previo = {
      html: { background: html.style.background, attachment: html.style.backgroundAttachment, minHeight: html.style.minHeight },
      body: { background: body.style.background },
    };
    html.style.background = fondo;
    html.style.backgroundAttachment = "fixed";
    html.style.minHeight = "100%";
    body.style.background = "transparent"; // si no, el fondo gris del body taparía al de <html>
    return () => {
      html.style.background = previo.html.background;
      html.style.backgroundAttachment = previo.html.attachment;
      html.style.minHeight = previo.html.minHeight;
      body.style.background = previo.body.background;
    };
  }, [fondo]);
}
