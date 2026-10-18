// Video de demostración de la portada pública de los Árbitros (/arbitros).
// - mostrar: false → la página no muestra el bloque de video (el CTA principal pasa a «Cómo funciona»).
// - mostrar: true y url vacía → muestra un espacio reservado («próximamente»).
// - url: dirección de embed (p. ej. "https://www.youtube-nocookie.com/embed/<ID>") → muestra el video.
export const ARBITROS_VIDEO: { mostrar: boolean; url: string } = {
  mostrar: true,
  url: "https://www.youtube-nocookie.com/embed/fJgtO0mOq7Q",
};

// Formulario de la prueba piloto («Quiero probarlo con mi curso»): se abre en una pestaña nueva.
export const ARBITROS_FORM_URL = "https://forms.gle/2aMY559en2orTP1o8";
