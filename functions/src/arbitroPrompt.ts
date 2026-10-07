// Prompt del árbitro y claves de área. Vive en un módulo aparte para poder
// probarlo y compararlo sin cargar todas las funciones (ver scripts/comparar-prompts.mjs).

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
  contexto?: ContextoArbitroOpcional;
}): string {
  const { materia, nivel, anio, tema, subtema, ejercicio, textoFuente, desacuerdo, posicionA, posicionB, esJuegoOral, contexto } = params;

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
    ? `\nTEXTO BASE DE LA SESIÓN:\n"""\n${textoFuente.substring(0, 8000)}\n"""\n\nFundamentá tu veredicto señalando qué parte del texto sostiene cada posición. Si el texto no alcanza para decidir entre las dos, decilo explícitamente en vez de inventar un fundamento.\n`
    : "";

  // ── Formato de respuesta JSON (compartido) ────────────────────────────────
  const jsonFormat = `Respondé ÚNICAMENTE con JSON válido sin backticks ni texto extra:
{
  "resultado": "A",
  "elementosClave": "qué elementos específicos necesitaría una respuesta completa a ESTA pregunta puntual (uno solo, o varios si la pregunta lo requiere), y cuáles de esos mencionó el equipo de forma concreta y no genérica",
  "calificacionRecomendada": "completa",${esJuegoOral ? `
  "puntosResponde": <número entre 0 y 1, en pasos de 0.25>,
  "puntosPregunta": <número entre 0 y 1, en pasos de 0.25>,` : ""}
  "veredicto": "una oración que resume quién tiene razón",
  "explicacion": "2-3 oraciones explicando el concepto de forma pedagógica",
  "paraSeguirPensando": "una pregunta que invite al grupo a seguir reflexionando"
}

El campo "elementosClave" es un paso de análisis obligatorio que tenés que resolver ANTES de decidir "calificacionRecomendada": pensá primero qué necesitaría decir una respuesta completa a esta pregunta puntual, y compará eso con lo que el equipo realmente dijo. No lo saltees — la categoría de abajo tiene que salir de esa comparación, no de una impresión general.${esJuegoOral ? `

Los campos "puntosResponde" y "puntosPregunta" reparten 1 punto entre los dos equipos según el mérito real de cada posición en la disputa — no dependen de "calificacionRecomendada" ni tienen que sumar necesariamente 1 (pueden ser 0 y 0 si ninguna posición se sostiene). Usá pasos de 0.25: 0, 0.25, 0.5, 0.75 o 1.` : ""}

El campo "resultado" debe ser exactamente uno de: "A", "B", "ambas_correctas", "ambas_incorrectas".

El campo "calificacionRecomendada" es INDEPENDIENTE de "resultado": indica qué puntaje merece la respuesta del equipo EN SÍ MISMA, evaluada por vos con tu propio conocimiento de la materia — no solo comparando qué posición del desacuerdo "ganó". Debe ser exactamente uno de:
- "completa": la respuesta es correcta y cubre los elementos específicos que hacían falta para esta pregunta puntual.
- "incompleta": la respuesta ES CORRECTA en todo lo que afirma Y menciona al menos un dato, nombre o idea ESPECÍFICA y CONCRETA sobre el tema — no genérica ni obvia, algo que demuestre que el equipo sabe algo puntual — pero le falta desarrollo, justificación, precisión o ejemplos. Si la respuesta completa requiere varios elementos (varias causas, varios nombres, varios pasos de un proceso), usá "incompleta" cuando el equipo mencione ALGUNOS de esos elementos de forma específica y correcta, aunque falten otros.
- "no": la respuesta tiene un error conceptual o factual — un nombre, dato, concepto o relación que está mal — sin importar qué tan convincente sea el argumento de quien la defiende, ni qué tan cerca esté del tema correcto. Confundir un personaje, una fecha o un dato por otro NUNCA es "incompleta" ni "un poco vaga": es un error, y va como "no". TAMBIÉN es "no" una respuesta vacía, evasiva o tan genérica que no menciona ningún dato específico y verificable del tema — que serviría como respuesta a casi cualquier pregunta del mismo tema sin demostrar comprensión real (ejemplo: si preguntan quiénes son los protagonistas y responden solo "la familia" sin nombrar a nadie ni dar ningún detalle). Y TAMBIÉN es "no" cuando la respuesta completa requería varios elementos y el equipo solo dio uno o dos, y esos pocos son genéricos u obvios en vez de específicos — ahí tampoco alcanza para "incompleta", aunque no haya ningún dato objetivamente erróneo. Sé estricto, no condescendiente — no le subas la categoría a una respuesta vacía o casi vacía solo para no ser duro. Chequeo de consistencia obligatorio: si en "explicacion" vos mismo decís que algo "es incorrecto", "está mal" o "confunde X con Y", entonces "calificacionRecomendada" tiene que ser "no" — nunca "incompleta". Esos dos campos no pueden contradecirse. Usá "no" incluso si el equipo que calificó originalmente había puesto "incompleta" — si vos detectás que en realidad está mal o es demasiado vacía, corregilo a "no".`;

  // ── Pertinencia (R05) ─────────────────────────────────────────────────────
  // Se juzga por la PREGUNTA, no por el bloque completo del desacuerdo: una
  // respuesta pobre o un argumento flojo no vuelven "fuera de tema" a una
  // pregunta que sí es del tema. Con texto base, el criterio es el texto; sin
  // texto base, el área y el tema, con margen amplio.
  const jsonFueraDeTema = `{"resultado":"fuera_de_tema","calificacionRecomendada":"no","veredicto":"Este desacuerdo no corresponde al tema de la sesión.","explicacion":"El árbitro solo puede intervenir en desacuerdos sobre ${materia} — tema: ${tema}. Como la pregunta no corresponde al tema, no corresponde puntaje por esta respuesta.","paraSeguirPensando":"¿La pregunta que querían plantear sí tiene que ver con ${tema}?"}`;

  const validacionTema = textoFuente
    ? `PERTINENCIA: juzgá la pertinencia SOLO por la pregunta que se hizo — no por la calidad de la respuesta ni de los argumentos. Una respuesta floja, vaga o casi vacía NO vuelve la pregunta "fuera de tema": eso se resuelve con la calificación, no rechazando el arbitraje.
Una pregunta es pertinente si puede responderse o evaluarse usando el TEXTO BASE de la sesión. No rechaces por comparación literal con el nombre del tema: usá el texto base como criterio de pertinencia.
Solo si la pregunta es claramente ajena al texto base y al tema, o no tiene ningún contenido, respondé exactamente:
${jsonFueraDeTema}`
    : `PERTINENCIA: juzgá la pertinencia SOLO por la pregunta que se hizo — no por la calidad de la respuesta ni de los argumentos. Una respuesta floja, vaga o casi vacía NO vuelve la pregunta "fuera de tema": eso se resuelve con la calificación, no rechazando el arbitraje.
Una pregunta es pertinente si corresponde razonablemente al área y al tema configurados, entendidos con criterio amplio: una materia incluye sus subtemas, sus períodos y temas vecinos, y también las preguntas sobre la disciplina misma (sus métodos, sus fuentes, sus ciencias auxiliares). Ante la duda, arbitrá: es mejor dar un veredicto que rechazar.
Solo si la pregunta es claramente ajena a ${materia} y al tema "${tema}", o no tiene ningún contenido, respondé exactamente:
${jsonFueraDeTema}`;

  // ── Contexto específico del juego oral competitivo (Árbitro de Aprendizaje) ─
  const contextoJuego = esJuegoOral ? `
CONTEXTO DEL JUEGO: Esto es una ronda en vivo de "Árbitro de Aprendizaje", un juego oral entre dos equipos con puntaje. Un equipo le hizo la pregunta al otro en voz alta, escuchó la respuesta oral, y le puso una calificación. El equipo que respondió no está de acuerdo con esa calificación y pidió tu intervención. Los dos equipos están esperando tu fallo en el momento para seguir jugando, así que tu resolución tiene que ser clara, decisiva y breve — evitá quedarte en un "depende" cuando exista una respuesta objetivamente mejor.
Actuá como un árbitro deportivo: firme y justo, que reconoce lo que está bien y corrige lo que está mal sin desalentar al equipo.
Muy importante: "calificacionRecomendada" tiene que reflejar el mérito real de la respuesta oral que dieron, no premiar al equipo que argumentó con más convicción en la disputa — si la respuesta tiene un error de fondo, es "no" aunque ese equipo defienda su postura con seguridad. No suavices el puntaje por compasión: confundir un nombre, un dato o un concepto por otro no es "responder vago", es un error, y corresponde "no" — sé un árbitro estricto y justo, no uno condescendiente. Lo mismo vale para una respuesta vacía, evasiva o demasiado genérica sin ningún dato concreto: no tener errores no alcanza para "incompleta" si tampoco hay nada específico — en ese caso también corresponde "no".
La pregunta de "paraSeguirPensando" tiene que servir para los DOS equipos por igual, porque se lee en voz alta para toda la clase.

Además de "calificacionRecomendada", tenés que repartir 1 punto entre los dos equipos en "puntosResponde" y "puntosPregunta" según el mérito real de cada posición — no es "quién gana", es cuánto se lleva cada uno:
- Si la respuesta fue realmente completa y la objeción no se sostiene: puntosResponde 1, puntosPregunta 0
- Si la respuesta fue casi completa y la objeción señala algo menor pero real: puntosResponde 0.75, puntosPregunta 0.25
- Si los dos tienen parte de razón: puntosResponde 0.5, puntosPregunta 0.5
- Si la objeción es acertada y bien fundamentada: puntosResponde 0.25, puntosPregunta 0.75
- Si la respuesta era incorrecta y la objeción se sostiene: puntosResponde 0, puntosPregunta 1
- Si NINGUNA de las dos posiciones se sostiene con el texto o el tema: puntosResponde 0, puntosPregunta 0

Muy importante: evaluá el mérito real de cada argumento, no quién escribió más o con más convicción. Si el equipo que preguntó solo dijo "está incompleta" sin explicar qué falta, eso pesa poco frente a una respuesta bien fundamentada — inclinate hacia puntosResponde alto en ese caso.
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
Posición A: ${posicionA}
Posición B: ${posicionB}`;
}
