// Prompt del árbitro y claves de área. Vive en un módulo aparte para poder
// probarlo y compararlo sin cargar todas las funciones (ver scripts/comparar-prompts.mjs).

import { quitarEtiquetaCalificacion } from "./arbitroReparto";
import type { IdiomaSesion } from "./arbitroIdioma";
import { buildArbitroPromptEn, buildPromptPreguntaPropiaEn, buildPromptConsignasEn, buildPromptConsignaEn, buildPromptInformeEn } from "./arbitroPromptEn";

// ── Claves de área ────────────────────────────────────────────────────────────
// Las sesiones nuevas guardan la clave corta ("exactas", "sociales",
// "lenguajes", "arte"). Las viejas guardaron el nombre completo en español (o en
// inglés, desde /learning-referee-config): se convierten al leer, sin migrar
// datos en Firestore. Misma tabla que src/utils/arbitroAreas.ts en el front.
export type AreaKeyArbitro = "exactas" | "sociales" | "lenguajes" | "arte";

const AREA_KEY_POR_NOMBRE: Record<string, AreaKeyArbitro> = {
  "exactas": "exactas",
  "sociales": "sociales",
  "lenguajes": "lenguajes",
  "arte": "arte",
  "ciencias exactas y naturales": "exactas",
  "ciencias sociales y humanidades": "sociales",
  "comunicación y lenguajes": "lenguajes",
  "comunicacion y lenguajes": "lenguajes",
  "arte y expresión": "arte",
  "arte y expresion": "arte",
  "exact and natural sciences": "exactas",
  "natural and exact sciences": "exactas",
  "social sciences and humanities": "sociales",
  "communication and languages": "lenguajes",
  "language and communication": "lenguajes",
  "art and expression": "arte",
  "arts and expression": "arte",
};

export const AREA_LABEL_ES: Record<AreaKeyArbitro, string> = {
  exactas: "Ciencias Exactas y Naturales",
  sociales: "Ciencias Sociales y Humanidades",
  lenguajes: "Comunicación y Lenguajes",
  arte: "Arte y Expresión",
};

export function normalizarAreaKey(area: unknown): AreaKeyArbitro | null {
  if (typeof area !== "string") return null;
  return AREA_KEY_POR_NOMBRE[area.trim().toLowerCase()] ?? null;
}

// Una línea por área: qué hace falta para que una respuesta se considere completa.
export const CRITERIO_COMPLETA_POR_AREA: Record<AreaKeyArbitro, string> = {
  exactas: "procedimiento y resultado: la respuesta muestra cómo se llegó al resultado y el resultado es correcto (con sus unidades, si corresponde).",
  sociales: "causas y contexto: la respuesta explica por qué ocurrió el hecho o fenómeno y lo ubica en su contexto (época, lugar, actores).",
  lenguajes: "evidencia textual: la respuesta se apoya en el texto (una cita, una referencia a un pasaje o a un recurso del lenguaje) y no solo en una opinión.",
  arte: "criterio y fundamentación: la respuesta nombra el criterio o elemento del lenguaje artístico que usa y explica por qué sostiene su lectura.",
};

// Devuelve la línea de criterio de un área (para activarla desde el llamador).
export function criterioDeArea(area: unknown): string {
  const k = normalizarAreaKey(area);
  return k ? CRITERIO_COMPLETA_POR_AREA[k] : "";
}

// ── Criterio de pertinencia (compartido) ──────────────────────────────────────
// Lo usan el árbitro (para decidir "fuera_de_tema") y la validación de preguntas propias
// (validarPreguntaPropia): una pregunta escrita por un equipo se juzga con el MISMO criterio con el que
// el árbitro rechazaría la pregunta. Con texto base el criterio es el texto; sin texto base, el área y el
// tema, con margen amplio.
export function reglaPertinencia(params: { materia: string; tema: string; hayTexto: boolean }): { criterio: string; ajena: string } {
  const { materia, tema, hayTexto } = params;
  if (hayTexto) {
    return {
      criterio: "Una pregunta es pertinente si puede responderse o evaluarse usando el TEXTO BASE de la sesión. No rechaces por comparación literal con el nombre del tema: usá el texto base como criterio de pertinencia.",
      ajena: "la pregunta es claramente ajena al texto base y al tema, o no tiene ningún contenido",
    };
  }
  return {
    criterio: "Una pregunta es pertinente si corresponde razonablemente al área y al tema configurados, entendidos con criterio amplio: una materia incluye sus subtemas, sus períodos y temas vecinos, y también las preguntas sobre la disciplina misma (sus métodos, sus fuentes, sus ciencias auxiliares). Ante la duda, arbitrá: es mejor dar un veredicto que rechazar.",
    ajena: `la pregunta es claramente ajena a ${materia} y al tema "${tema}", o no tiene ningún contenido`,
  };
}

// Prompt corto para validar una pregunta propia ANTES de pasársela al otro equipo.
export function buildPromptPreguntaPropia(params: {
  materia: string; nivel: string; anio: string; tema: string; subtema?: string; textoFuente?: string; pregunta: string;
  // Idioma de la sesión: "en" usa la versión en inglés (arbitroPromptEn.ts); cualquier otro valor, el texto original en español.
  idioma?: IdiomaSesion;
}): string {
  if (params.idioma === "en") return buildPromptPreguntaPropiaEn(params);
  const { materia, nivel, anio, tema, subtema, textoFuente, pregunta } = params;
  const regla = reglaPertinencia({ materia, tema, hayTexto: !!textoFuente });
  const texto = textoFuente ? `\nTEXTO BASE DE LA SESIÓN:\n"""\n${textoFuente.substring(0, 8000)}\n"""\n` : "";
  return `Sos un verificador de pertinencia para un juego de preguntas en clase de ${materia} (${nivel}, ${anio}° año).
Tema: "${tema}"${subtema ? `\nSubtema: "${subtema}"` : ""}
${texto}
Un equipo escribió esta pregunta para hacérsela al otro equipo:
"""
${pregunta.replace(/"""/g, '"').slice(0, 500)}
"""

PERTINENCIA: juzgá SOLO si la pregunta corresponde a la sesión; no juzgues si está bien redactada ni si es fácil o difícil.
${regla.criterio}
Si ${regla.ajena}, la pregunta NO es pertinente.

Respondé ÚNICAMENTE con JSON válido, sin backticks ni texto extra:
{"pertinente": true, "motivo": "una frase corta"}   (usá false si no es pertinente)`;
}

// ── Prompt del árbitro ────────────────────────────────────────────────────────

// Contexto opcional. VACÍO por defecto: con `contexto` omitido (o con los tres
// campos vacíos) el prompt es idéntico al que corre en producción. Para activarlo
// más adelante alcanza con pasar los campos desde el llamador (ver runArbitro):
//   area     → agrega la línea "Área: …"
//   materia  → agrega la línea "Materia: …"
//   criterio → agrega el bloque "QUÉ CUENTA COMO RESPUESTA COMPLETA EN ESTA ÁREA"
export interface ContextoArbitroOpcional {
  area?: string | null;
  materia?: string | null;
  criterio?: string | null;
}

export const RUBRICA_CALIFICACION_ES = `El campo "calificacionRecomendada" es INDEPENDIENTE de "resultado": indica qué puntaje merece la respuesta del equipo EN SÍ MISMA, evaluada por vos con tu propio conocimiento de la materia — no solo comparando qué posición del desacuerdo "ganó". Debe ser exactamente uno de:
- "completa": la respuesta es correcta y cubre los elementos específicos que hacían falta para esta pregunta puntual.
- "incompleta": la respuesta ES CORRECTA en todo lo que afirma Y menciona al menos un dato, nombre o idea ESPECÍFICA y CONCRETA sobre el tema — no genérica ni obvia, algo que demuestre que el equipo sabe algo puntual — pero le falta alguna de las partes que la pregunta pedía, o precisión en alguna de ellas. No cuentan como faltantes el desarrollo, la justificación ni los ejemplos que la pregunta no pidió. Si la respuesta completa requiere varios elementos (varias causas, varios nombres, varios pasos de un proceso), usá "incompleta" cuando el equipo mencione ALGUNOS de esos elementos de forma específica y correcta, aunque falten otros.
- "no": la respuesta tiene un error conceptual o factual — un nombre, dato, concepto o relación que está mal — sin importar qué tan convincente sea el argumento de quien la defiende, ni qué tan cerca esté del tema correcto. Confundir un personaje, una fecha o un dato por otro NUNCA es "incompleta" ni "un poco vaga": es un error, y va como "no". TAMBIÉN es "no" una respuesta vacía, evasiva o tan genérica que no menciona ningún dato específico y verificable del tema — que serviría como respuesta a casi cualquier pregunta del mismo tema sin demostrar comprensión real (ejemplo: si preguntan quiénes son los protagonistas y responden solo "la familia" sin nombrar a nadie ni dar ningún detalle). Y TAMBIÉN es "no" cuando la respuesta completa requería varios elementos y el equipo solo dio uno o dos, y esos pocos son genéricos u obvios en vez de específicos — ahí tampoco alcanza para "incompleta", aunque no haya ningún dato objetivamente erróneo. Sé estricto, no condescendiente — no le subas la categoría a una respuesta vacía o casi vacía solo para no ser duro. Chequeo de consistencia obligatorio: si en "explicacion" vos mismo decís que algo "es incorrecto", "está mal" o "confunde X con Y", entonces "calificacionRecomendada" tiene que ser "no" — nunca "incompleta". Esos dos campos no pueden contradecirse. Usá "no" incluso si el equipo que calificó originalmente había puesto "incompleta" — si vos detectás que en realidad está mal o es demasiado vacía, corregilo a "no".`;

export function buildArbitroPrompt(params: {
  materia: string;
  nivel: string;
  anio: string;
  tema: string;
  subtema?: string;
  ejercicio?: string;
  textoFuente?: string;
  desacuerdo: string;
  posicionA: string;
  posicionB: string;
  esJuegoOral?: boolean;
  // Juego oral: nombres de los equipos. El modelo recibe explícitamente cuál preguntó y cuál respondió.
  equipoPregunta?: string;
  equipoResponde?: string;
  contexto?: ContextoArbitroOpcional;
  // Idioma de la sesión: "en" usa la versión en inglés (arbitroPromptEn.ts); cualquier otro valor, el texto original en español.
  idioma?: IdiomaSesion;
}): string {
  if (params.idioma === "en") return buildArbitroPromptEn(params);
  const { materia, nivel, anio, tema, subtema, ejercicio, textoFuente, desacuerdo, posicionA, posicionB, esJuegoOral, contexto } = params;
  const limpiarNombre = (n?: string) => (n || "").replace(/["\r\n]+/g, " ").trim().slice(0, 60);
  const nombrePregunta = limpiarNombre(params.equipoPregunta);
  const nombreResponde = limpiarNombre(params.equipoResponde);

  // ── Instrucción de nivel de idioma (R02) ──────────────────────────────────
  const anioNum = parseInt(anio, 10);
  let nivelIdioma: string;
  if (!isNaN(anioNum) && anioNum <= 3) {
    nivelIdioma = "Usá un vocabulario muy simple y accesible, con oraciones cortas, como si le hablaras a un chico de primaria.";
  } else if (!isNaN(anioNum) && anioNum <= 6) {
    nivelIdioma = "Usá un vocabulario claro y directo, adecuado para la escuela primaria avanzada o primer ciclo secundario.";
  } else {
    nivelIdioma = "Podés usar terminología disciplinar precisa, apropiada para un estudiante de secundaria media o superior.";
  }

  // ── Preguntas previstas para la sesión (banco cargado por el docente) ─────
  const refMaterial = ejercicio ? `\nPreguntas previstas para la sesión (las cargó el docente; el equipo pudo elegir una de estas o escribir la suya):\n${ejercicio}` : "";
  const subtemaLine = subtema ? `\nSubtema: "${subtema}"` : "";

  // ── Texto base de la sesión ───────────────────────────────────────────────
  // Lo carga el docente al crear la sesión y viaja en el documento de Firestore,
  // no desde el cliente. Se recorta a 8000 caracteres para acotar el prompt.
  const textoFuenteBlock = textoFuente
    ? `\nTEXTO BASE DE LA SESIÓN:\n"""\n${textoFuente.substring(0, 8000)}\n"""\n\n${esJuegoOral ? "Fundamentá tu evaluación señalando qué parte del texto sostiene o contradice la respuesta. Si el texto no alcanza para decidir, decilo explícitamente en vez de inventar un fundamento." : "Fundamentá tu veredicto señalando qué parte del texto sostiene cada posición. Si el texto no alcanza para decidir entre las dos, decilo explícitamente en vez de inventar un fundamento."} El texto sirve para verificar conceptos: no exijas que la respuesta repita sus palabras.\n`
    : "";

  // ── Formato de respuesta JSON (compartido) ────────────────────────────────
  const jsonFormat = `Respondé ÚNICAMENTE con JSON válido sin backticks ni texto extra:
{
  "resultado": "A",
  "elementosClave": "qué elementos específicos necesitaría una respuesta completa a ESTA pregunta puntual (uno solo, o varios si la pregunta lo requiere), y cuáles de esos mencionó el equipo de forma concreta y no genérica (aunque lo haya dicho con otras palabras). Incluí solo lo que la consigna pide expresamente: si pide «identificá el error», alcanza con señalar cuál es; no sumes corregirlo, explicarlo ni justificarlo salvo que la consigna lo pida",
  "calificacionRecomendada": "completa",
  ${esJuegoOral ? `"evaluacion": "una oración que evalúa la respuesta en sí misma: qué tiene de correcta y, si corresponde, qué le falta o qué está mal. NO digas quién tiene razón ni nombres a un equipo como ganador"` : `"veredicto": "una oración que resume quién tiene razón"`},
  "explicacion": "2-3 oraciones explicando el concepto de forma pedagógica",
  "paraSeguirPensando": "una pregunta que invite al grupo a seguir reflexionando sobre la comprensión del concepto (por qué, cómo, con qué se relaciona), nunca sobre la terminología literal"
}

El campo "elementosClave" es un paso de análisis obligatorio que tenés que resolver ANTES de decidir "calificacionRecomendada": pensá primero qué necesitaría decir una respuesta completa a esta pregunta puntual, y compará eso con lo que el equipo realmente dijo. No lo saltees — la categoría de abajo tiene que salir de esa comparación, no de una impresión general.

REGLA DE COMPLETITUD: las partes que hacen completa una respuesta se sacan de lo que PIDE LA PREGUNTA, no de todo lo que se podría decir sobre el tema. Una respuesta es completa si da lo que la pregunta pide, aunque quede información relevante sin mencionar. Si la sesión tiene TEXTO BASE, usalo para verificar que lo que dijo el equipo es correcto; NO lo uses para exigir información que la pregunta no pidió. Ejemplos: si la consigna pide «identificá el error», la respuesta es completa si señala cuál es el error; corregirlo solo se exige si la consigna lo pide explícitamente (por ejemplo, «identificá y corregí»), y tampoco hace falta que explique cómo o por qué se produjo; si pide «nombrá dos causas», es completa con dos causas correctas. Con el procedimiento pasa lo mismo: mostrar la cuenta o justificar solo se exige si la consigna lo pide explícitamente (por ejemplo, «calculá y mostrá la cuenta», «justificá»).

EVALUÁ EL CONCEPTO, NO LAS PALABRAS: una respuesta es correcta si expresa el concepto correcto, aunque lo diga con otras palabras que las del texto base o las de quien preguntó. Los sinónimos, las paráfrasis y los términos equivalentes valen igual: por ejemplo, «vestigios» o «restos arqueológicos» corresponden a «fuentes materiales». NUNCA marques una respuesta como incorrecta o incompleta solo porque no usó las palabras exactas del texto, y no le des peso a un argumento que se reduzca a «no dijo la palabra». Para cada elemento de "elementosClave" preguntate si el equipo lo expresó como concepto, con las palabras que fueran. En "paraSeguirPensando" apuntá a la comprensión del concepto (por qué, cómo, con qué se relaciona), nunca a recordar la palabra exacta del texto.${esJuegoOral ? `

Vos NO escribís puntajes ni decidís quién tiene razón: eso lo hace el sistema a partir de tu "calificacionRecomendada" (ver "CÓMO DECIDIR LA CALIFICACIÓN" más abajo).` : ""}

El campo "resultado" debe ser exactamente uno de: "A", "B", "ambas_correctas", "ambas_incorrectas".${esJuegoOral ? ` En esta ronda, "resultado" lo calcula el sistema a partir de tu calificación: escribí "A", salvo que corresponda "fuera_de_tema".` : ""}

${RUBRICA_CALIFICACION_ES}`;

  // ── Pertinencia (R05) ─────────────────────────────────────────────────────
  // Se juzga por la PREGUNTA, no por el bloque completo del desacuerdo: una
  // respuesta pobre o un argumento flojo no vuelven "fuera de tema" a una
  // pregunta que sí es del tema. Con texto base, el criterio es el texto; sin
  // texto base, el área y el tema, con margen amplio.
  const jsonFueraDeTema = `{"resultado":"fuera_de_tema","calificacionRecomendada":"no","veredicto":"Este desacuerdo no corresponde al tema de la sesión.","explicacion":"El árbitro solo puede intervenir en desacuerdos sobre ${materia} — tema: ${tema}. Como la pregunta no corresponde al tema, no corresponde puntaje por esta respuesta.","paraSeguirPensando":"¿La pregunta que querían plantear sí tiene que ver con ${tema}?"}`;

  const regla = reglaPertinencia({ materia, tema, hayTexto: !!textoFuente });
  const validacionTema = `PERTINENCIA: juzgá la pertinencia SOLO por la pregunta que se hizo — no por la calidad de la respuesta ni de los argumentos. Una respuesta floja, vaga o casi vacía NO vuelve la pregunta "fuera de tema": eso se resuelve con la calificación, no rechazando el arbitraje.
${regla.criterio}
Solo si ${regla.ajena}, respondé exactamente:
${jsonFueraDeTema}`;

  // ── Contexto específico del juego oral competitivo (Árbitro de Aprendizaje) ─
  const contextoJuego = esJuegoOral ? `
CONTEXTO DEL JUEGO: Esto es una ronda en vivo de "Árbitro de Aprendizaje", un juego oral entre dos equipos con puntaje. Un equipo le hizo la pregunta al otro en voz alta, escuchó la respuesta oral, y le puso una calificación. El equipo que respondió no está de acuerdo con esa calificación y pidió tu intervención. Los dos equipos están esperando tu fallo en el momento para seguir jugando, así que tu resolución tiene que ser clara, decisiva y breve — evitá quedarte en un "depende" cuando exista una respuesta objetivamente mejor.
Actuá como un árbitro deportivo: firme y justo, que reconoce lo que está bien y corrige lo que está mal sin desalentar al equipo.
Muy importante: "calificacionRecomendada" tiene que reflejar el mérito real de la respuesta oral que dieron, no premiar al equipo que argumentó con más convicción en la disputa — si la respuesta tiene un error de fondo, es "no" aunque ese equipo defienda su postura con seguridad. No suavices el puntaje por compasión: confundir un nombre, un dato o un concepto por otro no es "responder vago", es un error, y corresponde "no" — sé un árbitro estricto y justo, no uno condescendiente. Lo mismo vale para una respuesta vacía, evasiva o demasiado genérica sin ningún dato concreto: no tener errores no alcanza para "incompleta" si tampoco hay nada específico — en ese caso también corresponde "no".
La pregunta de "paraSeguirPensando" tiene que servir para los DOS equipos por igual, porque se lee en voz alta para toda la clase.

QUIÉN ES QUIÉN: ${nombrePregunta && nombreResponde ? `el equipo que PREGUNTÓ es "${nombrePregunta}" (es la Posición A) y el equipo que RESPONDIÓ es "${nombreResponde}" (es la Posición B).` : "el equipo que PREGUNTÓ es el de la Posición A y el equipo que RESPONDIÓ es el de la Posición B."}

CÓMO DECIDIR LA CALIFICACIÓN: vos NO escribís puntajes ni decidís quién tiene razón; eso lo hace el sistema a partir de tu "calificacionRecomendada". Decidila evaluando la respuesta contra la consigna (la pregunta) y, si la sesión tiene TEXTO BASE, contra ese texto. Los argumentos escritos de los dos equipos (Posición A y Posición B) sirven para que los CONSIDERES, no para que los ADOPTES: pueden señalarte algo que conviene mirar, pero verificalo vos, y no te dejes llevar por quien escribió con más seguridad o con más palabras.
La "evaluacion", la "explicacion" y "paraSeguirPensando" NO dicen quién tiene razón ni nombran a un equipo como ganador: esa frase la agrega el sistema. Tienen que ser coherentes con tu "calificacionRecomendada" y no pueden contradecirse con ella. Si tu calificación es "incompleta", NO digas que la respuesta es incorrecta ni errónea: decí qué parte es correcta y qué falta. Reservá la palabra «incorrecta» para cuando "calificacionRecomendada" es "no".

Muy importante: evaluá el mérito real de la respuesta, no quién argumentó con más convicción ni quién escribió más.
` : "";

  // ── Prompt único ──────────────────────────────────────────────────────────
  // Un solo prompt para todas las áreas (antes había cuatro). Las líneas de
  // área, materia y criterio salen SOLO si el llamador las pasa en `contexto`;
  // en producción hoy no se pasan, así que no aparecen.
  const areaTxt = (contexto?.area || "").trim();
  const materiaTxt = (contexto?.materia || "").trim();
  const criterioTxt = (contexto?.criterio || "").trim();
  const areaLine = areaTxt ? `\nÁrea: ${areaTxt}` : "";
  const materiaLine = materiaTxt ? `\nMateria: ${materiaTxt}` : "";
  const criterioArea = criterioTxt
    ? `\nQUÉ CUENTA COMO RESPUESTA COMPLETA EN ESTA ÁREA${areaTxt ? ` (${areaTxt})` : ""}: ${criterioTxt}\n`
    : "";

  return `Sos un árbitro pedagógico experto en ${materia} de nivel ${nivel} (${anio}° año).${areaLine}${materiaLine}
Tema: "${tema}"${subtemaLine}${refMaterial}

${nivelIdioma}

Tu tarea es arbitrar un desacuerdo entre dos estudiantes con criterio pedagógico y precisión disciplinar.
${criterioArea}
${validacionTema}
${contextoJuego}
${jsonFormat}

Reglas:
- Solo arbitrá sobre "${tema}".
- Si las dos posiciones son equivalentes, usá "ambas_correctas".
- No resolvás ejercicios completos; solo arbitrá el punto en disputa.

${textoFuenteBlock}
Desacuerdo: ${desacuerdo}
Posición A: ${esJuegoOral ? quitarEtiquetaCalificacion(posicionA, params.equipoPregunta) : posicionA}
Posición B: ${posicionB}`;
}


// ── Generador de preguntas (consignas) ────────────────────────────────────────
// El texto en español es el que estaba en index.ts (generarConsignasArbitro), sin cambios.
export function buildPromptConsignas(params: {
  materia: string; nivel: string; anio: string; tema: string; subtema?: string; n: number;
  tipo: "memoristica" | "mixta" | "capacidades"; textoFuente?: string; idioma?: IdiomaSesion;
}): string {
  if (params.idioma === "en") return buildPromptConsignasEn(params);
  const { materia, nivel, anio, tema, subtema, n, tipo, textoFuente } = params;
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
  return prompt;
}

// ── Una sola pregunta de debate (requestConsigna) ─────────────────────────────
export function buildPromptConsigna(params: { materia: string; nivel: string; anio: string; tema: string; subtema?: string; idioma?: IdiomaSesion }): string {
  if (params.idioma === "en") return buildPromptConsignaEn(params);
  const { materia, nivel, anio, tema, subtema } = params;
    const prompt = `Generá UNA SOLA pregunta de debate para alumnos de ${materia}, ${nivel} ${anio}, tema: "${tema}"${subtema ? ` (${subtema})` : ""}.
No debe ser de sí/no. Máximo 2 líneas. Respondé SOLO con la pregunta.`;
  return prompt;
}

// ── Informe de la sesión (generarInformeSesion) ───────────────────────────────
export function buildPromptInforme(params: {
  session: { materia: string; area?: unknown; nivel: string; anio: string; tema: string; subtema?: string };
  consultas: any[]; rondasPasadas: any[]; idioma?: IdiomaSesion;
}): string {
  const { session, consultas, rondasPasadas } = params;
  if (params.idioma === "en") {
    return buildPromptInformeEn({ materia: session.materia, areaKey: normalizarAreaKey(session.area), nivel: session.nivel, anio: session.anio, tema: session.tema, subtema: session.subtema, consultas, rondasPasadas });
  }
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
  return prompt;
}
