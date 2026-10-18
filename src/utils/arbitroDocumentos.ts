// Documentos que el Árbitro de Aprendizaje arma como texto y se llevan afuera: las instrucciones y el informe por defecto
// de la sesión, el contenido de Classroom / impresión y el informe .txt de la partida. Son funciones puras: reciben el
// diccionario (`TranslationKeys['arbitro']`) del idioma de la SESIÓN y devuelven el texto. Ningún texto visible vive acá:
// todo sale de las claves `doc*` de es.ts / en.ts (en español, el resultado es idéntico al de antes de la etapa 3).
import type { TranslationKeys } from "../i18n";
import { nombreVisible } from "./arbitroNombres";
import type { ModoMetacognicion } from "./arbitroIntegrantes";
import { preguntasMeta } from "./arbitroMetaPreguntas";

type Tx = TranslationKeys["arbitro"];

const llenar = (texto: string, valores: Record<string, string | number>): string =>
  texto.replace(/\{(\w+)\}/g, (m, k) => (k in valores ? String(valores[k]) : m));

// ── Nombre de archivo del PDF del informe (window.print() toma el nombre de document.title) ──────────────
// Sin tildes, sin espacios, sin caracteres que Windows rechace en un nombre de archivo.
const paraNombreArchivo = (texto: string): string => {
  const limpio = texto
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // saca tildes y diacríticos
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return limpio || "x";
};

/**
 * Nombre de archivo (sin extensión) para el informe del Árbitro de Aprendizaje: identifica el juego, el tema,
 * el par de equipos (si se conocen exactamente dos) y la fecha. Ej.: Arbitros_Funcion-de-costo_Rojos-vs-Azules_2026-10-17.
 * `juego` viene de `tx.panPdfJuego` (ya en el idioma de la sesión: "Arbitros" / "Referees"). `equipos` es null
 * cuando se imprime una sesión con varias partidas a la vez (no hay un solo par que nombrar). `fechaISO` tiene
 * que ser la fecha de la PARTIDA (la del primer round jugado), no la del día en que se imprime el informe.
 */
export function nombreArchivoInformeArbitro(juego: string, tema: string, equipos: string[] | null, fechaISO: string, sufijo = ""): string {
  const partes = [paraNombreArchivo(juego || "Arbitros"), paraNombreArchivo(tema || "Sesion")];
  if (equipos && equipos.length === 2) {
    partes.push(`${paraNombreArchivo(equipos[0])}-vs-${paraNombreArchivo(equipos[1])}`);
  }
  const d = new Date(fechaISO);
  const fecha = Number.isNaN(d.getTime())
    ? paraNombreArchivo(fechaISO)
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  partes.push(fecha);
  return partes.join("_") + sufijo;
}

/** Instrucciones para los alumnos que se proponen al crear la sesión. */
export function instruccionesPorDefecto(tx: Tx, tema: string, modoMetacognicion: ModoMetacognicion = "grupal"): string {
  return (
    `${llenar(tx.docInstrToday, { t: tema })}\n\n` +
    `${tx.docInstrBefore}\n\n` +
    `${tx.docInstrHow}\n` +
    `${tx.docInstrStep1}\n` +
    `${tx.docInstrStep2}\n` +
    `${tx.docInstrStep3}\n` +
    `${tx.docInstrStep4}\n` +
    `${tx.rulesStep5Template}\n` +
    `${modoMetacognicion === "individual" ? tx.docInstrStep6Ind : tx.docInstrStep6}`
  );
}

/** Consigna del informe final que se propone al crear la sesión. */
export function informePorDefecto(tx: Tx, tema: string): string {
  return (
    `${tx.docRepIntro}\n\n` +
    `${llenar(tx.docRep1, { t: tema })}\n` +
    `${tx.docRep2}\n` +
    `${tx.docRep3}\n` +
    `${tx.docRep4}\n\n` +
    `${tx.docRepEnd}`
  );
}

/** Título de la tarea de Classroom. */
export function tituloClassroom(tx: Tx, materia: string, tema: string): string {
  return llenar(tx.docClassroomTitle, { materia: nombreVisible(tx.materiaNames, materia), tema });
}

/** Contenido completo (lo que se manda a Classroom y lo que se imprime comparten fuente). */
export function contenidoCompleto(tx: Tx, d: { materia: string; tema: string; nivel: string; anio: string; instrucciones: string; ejercicio: string; informe: string; link: string }): string {
  return [
    llenar(tx.docTitle, { materia: nombreVisible(tx.materiaNames, d.materia), tema: d.tema }),
    `${nombreVisible(tx.levelNames, d.nivel)} ${d.anio}`,
    d.instrucciones,
    d.ejercicio ? `${tx.docQuestionsHeader}\n${d.ejercicio}` : "",
    `${tx.docFinalReportHeader}\n${d.informe}`,
    llenar(tx.docLinkLine, { link: d.link }),
    tx.docTeacherNote,
  ].filter(Boolean).join("\n\n");
}

export interface DatosInformePartida {
  materia?: string; tema?: string;
  fecha: string;                         // ya formateada con el locale del idioma
  equipos: { nombre: string; integrantes: string; puntos: number }[];
  // 4 respuestas por equipo; en el modo individual, `individuales` trae las 4 respuestas de cada alumno (y `respuestas` va vacío).
  reflexiones: { nombre: string; integrantes: string; respuestas: (string | undefined)[]; individuales?: { alumno: string; respuestas: (string | undefined)[] }[] }[];
  preguntasPersonalizadas?: string[]; // preguntas de metacognición de la sesión (ausentes = las del diccionario)
  formatoPuntos: (valor: number) => string;
}

/** Informe de la partida (copiar / descargar .txt). */
export function textoInformePartida(tx: Tx, d: DatosInformePartida): string {
  const raya = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  const lineas: string[] = [
    llenar(tx.docSesionTitle, { materia: String(d.materia ? nombreVisible(tx.materiaNames, d.materia) : d.materia), tema: String(d.tema) }),
    llenar(tx.docDate, { fecha: d.fecha }),
    "",
  ];
  d.equipos.forEach((eq) => {
    lineas.push(raya);
    lineas.push(llenar(tx.docTeam, { nombre: eq.nombre, integrantes: eq.integrantes }));
    lineas.push(tx.docFinalScore(d.formatoPuntos(eq.puntos), eq.puntos));
    lineas.push("");
  });
  const preguntas = preguntasMeta(tx, d.preguntasPersonalizadas, String(d.tema), "doc").map((q) => q.label);
  d.reflexiones.forEach((r) => {
    lineas.push(raya);
    lineas.push(llenar(tx.docReflectionsOf, { nombre: r.nombre.toUpperCase(), integrantes: r.integrantes }));
    lineas.push("");
    const listarRespuestas = (respuestas: (string | undefined)[]) => respuestas.slice(0, preguntas.length).forEach((resp, i) => {
      if (resp?.trim()) {
        lineas.push(`${i + 1}. ${preguntas[i]}`);
        lineas.push(resp.trim());
        lineas.push("");
      }
    });
    if (r.individuales) {
      r.individuales.forEach((ind) => {
        lineas.push(llenar(tx.docIndStudent, { alumno: ind.alumno }));
        listarRespuestas(ind.respuestas);
      });
    } else {
      listarRespuestas(r.respuestas);
    }
  });
  lineas.push(raya);
  lineas.push(tx.docFooter);
  return lineas.join("\n");
}
