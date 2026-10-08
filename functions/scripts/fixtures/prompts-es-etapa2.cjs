// Prompts en español de la etapa 2, COPIADOS TEXTUALMENTE de functions/src/index.ts antes de la etapa 3 (consignas, una consigna, informe).
// verificar-prompt-identico.cjs compara contra esto que los de lib/arbitroPrompt.js para 'es' no cambiaron ni un carácter.
const { normalizarAreaKey, AREA_LABEL_ES } = require("../../lib/arbitroPrompt.js");
exports.consignas = function ({ materia, nivel, anio, tema, subtema, n, tipo, textoFuente }) {
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
};
exports.consigna = function ({ materia, nivel, anio, tema, subtema }) {
    const prompt = `Generá UNA SOLA pregunta de debate para alumnos de ${materia}, ${nivel} ${anio}, tema: "${tema}"${subtema ? ` (${subtema})` : ""}.
No debe ser de sí/no. Máximo 2 líneas. Respondé SOLO con la pregunta.`;
  return prompt;
};
exports.informe = function ({ session, consultas, rondasPasadas }) {
    const resumenConsultas = consultas.map((c, i) => {
      const resultadoLabel = {
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
};
