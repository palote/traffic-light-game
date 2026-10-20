// Dirección y destino para "Proyectar código": a dónde tienen que entrar los alumnos,
// según el idioma de la SESIÓN (no el del docente que está proyectando) — ver
// dominioPorIdioma. Separado del componente ProyeccionCodigoArbitro para poder probarlo
// con datos reales (verificar-ingreso-alumnos.cjs) sin necesitar un renderer de React.
import { dominioPorIdioma } from "./dominioPorIdioma";
import { normalizarIdiomaSesion } from "./idiomaSesion";

export interface ProyeccionCodigo {
  /** Dominio + ruta de ingreso, tal como se muestra en pantalla (sin protocolo): "eljuegodelsemaforo.com/alumnos". */
  direccionVisible: string;
  /** URL completa a la que apunta el QR: entra directo al juego, con el código ya puesto en la ruta. */
  urlJuego: string;
}

export function proyeccionCodigo(idiomaSesion: string | null | undefined, codigo: string): ProyeccionCodigo {
  const idioma = normalizarIdiomaSesion(idiomaSesion);
  const dominio = dominioPorIdioma(idioma);
  const ruta = idioma === "en" ? "students" : "alumnos";
  return {
    direccionVisible: `${dominio}/${ruta}`,
    urlJuego: `https://${dominio}/arbitro-juego/${codigo}`,
  };
}
