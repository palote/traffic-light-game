// Versión en inglés de los prompts del Árbitro de Aprendizaje (etapa 3).
// Es una traducción sección por sección de los prompts en español de arbitroPrompt.ts / index.ts: mismas secciones, mismos
// criterios, mismos ejemplos (adaptados al inglés) y las mismas variables. Se elige con el `idioma` de la sesión.
//
// NO se traducen (el código los lee): las claves del JSON de salida ("resultado", "elementosClave", "calificacionRecomendada",
// "evaluacion", "veredicto", "explicacion", "paraSeguirPensando", …) ni los valores ("A", "B", "ambas_correctas",
// "ambas_incorrectas", "fuera_de_tema", "completa", "incompleta", "no", "superficial", "adecuado", "profundo").
// Sí se traduce lo que lee el alumno: evaluación, explicación, preguntas, informe.
//
// Si cambiás un prompt en español, cambiá acá el equivalente: scripts/verificar-prompts-equivalentes.cjs lo comprueba.

import { quitarEtiquetaCalificacion } from "./arbitroReparto";
import type { ContextoArbitroOpcional } from "./arbitroPrompt";

// ── Nombres en inglés de lo que el servidor guarda en español (claves estables) ───────────────────────────────────────────────
// Misma tabla que `materiaNames` / `levelNames` / `areaNames` de src/i18n/en.ts (la compara verificar-prompts-equivalentes.cjs).
export const MATERIA_EN: Record<string, string> = {
  "Matemática": "Mathematics", "Ciencias Naturales": "Natural Sciences", "Biología": "Biology", "Física": "Physics", "Química": "Chemistry",
  "Tecnología": "Technology", "Informática": "Computer Science", "Estadística": "Statistics", "Ciencias Sociales": "Social Studies",
  "Historia": "History", "Geografía": "Geography", "Formación Ética y Ciudadana": "Ethics and Civics", "Filosofía": "Philosophy",
  "Psicología": "Psychology", "Economía": "Economics", "Derecho": "Law", "Antropología": "Anthropology",
  "Lengua y Literatura": "Language and Literature", "Inglés": "English", "Portugués": "Portuguese", "Francés": "French",
  "Comunicación": "Communication", "TIC y Medios": "ICT and Media", "Literatura": "Literature", "Plástica / Artes Visuales": "Visual Arts",
  "Música": "Music", "Teatro": "Theater", "Educación Física": "Physical Education", "Danza": "Dance", "Artesanía y Diseño": "Crafts and Design",
  "Plástica": "Visual Arts", "Lengua": "Language",
};
export const NIVEL_EN: Record<string, string> = { "Primaria": "Primary", "Secundaria": "Secondary" };
export const AREA_LABEL_EN: Record<string, string> = {
  exactas: "Exact and Natural Sciences",
  sociales: "Social Sciences and Humanities",
  lenguajes: "Communication and Languages",
  arte: "Art and Expression",
};
const materiaEn = (m: string): string => MATERIA_EN[m] ?? m;
const nivelEn = (n: string): string => NIVEL_EN[n] ?? n;

// ── Pertinencia (compartida por el árbitro y la validación de preguntas propias) ────────────────────────────────────────────────
export function reglaPertinenciaEn(params: { materia: string; tema: string; hayTexto: boolean }): { criterio: string; ajena: string } {
  const { materia, tema, hayTexto } = params;
  if (hayTexto) {
    return {
      criterio: "A question is relevant if it can be answered or evaluated using the session's BASE TEXT. Do not reject it by literal comparison with the topic name: use the base text as the relevance criterion.",
      ajena: "the question is clearly unrelated to the base text and to the topic, or has no content at all",
    };
  }
  return {
    criterio: "A question is relevant if it reasonably corresponds to the configured area and topic, understood broadly: a subject includes its subtopics, its periods and neighboring topics, and also questions about the discipline itself (its methods, its sources, its auxiliary sciences). When in doubt, referee: it is better to give a verdict than to reject.",
    ajena: `the question is clearly unrelated to ${materia} and to the topic "${tema}", or has no content at all`,
  };
}

// ── Validación de una pregunta propia ─────────────────────────────────────────────────────────────────────────────────────────────
export function buildPromptPreguntaPropiaEn(params: {
  materia: string; nivel: string; anio: string; tema: string; subtema?: string; textoFuente?: string; pregunta: string;
}): string {
  const { tema, subtema, textoFuente, pregunta } = params;
  const materia = materiaEn(params.materia), nivel = nivelEn(params.nivel), anio = params.anio;
  const regla = reglaPertinenciaEn({ materia, tema, hayTexto: !!textoFuente });
  const texto = textoFuente ? `\nSESSION BASE TEXT:\n"""\n${textoFuente.substring(0, 8000)}\n"""\n` : "";
  return `You are a relevance checker for a question game in a ${materia} class (${nivel}, year ${anio}).
Topic: "${tema}"${subtema ? `\nSubtopic: "${subtema}"` : ""}
${texto}
A team wrote this question to ask the other team:
"""
${pregunta.replace(/"""/g, '"').slice(0, 500)}
"""

RELEVANCE: judge ONLY whether the question belongs to the session; do not judge whether it is well written or whether it is easy or hard.
${regla.criterio}
If ${regla.ajena}, the question is NOT relevant.

Respond ONLY with valid JSON, with no backticks or extra text. Write the "motivo" value in English:
{"pertinente": true, "motivo": "one short sentence"}   (use false if it is not relevant)`;
}

// ── Prompt del árbitro ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function buildArbitroPromptEn(params: {
  materia: string; nivel: string; anio: string; tema: string; subtema?: string; ejercicio?: string; textoFuente?: string;
  desacuerdo: string; posicionA: string; posicionB: string; esJuegoOral?: boolean;
  equipoPregunta?: string; equipoResponde?: string; contexto?: ContextoArbitroOpcional;
}): string {
  const { tema, subtema, ejercicio, textoFuente, desacuerdo, posicionA, posicionB, esJuegoOral, contexto } = params;
  const materia = materiaEn(params.materia), nivel = nivelEn(params.nivel), anio = params.anio;
  const limpiarNombre = (n?: string) => (n || "").replace(/["\r\n]+/g, " ").trim().slice(0, 60);
  const nombrePregunta = limpiarNombre(params.equipoPregunta);
  const nombreResponde = limpiarNombre(params.equipoResponde);

  // ── Language-level instruction (R02) ──────────────────────────────────────
  const anioNum = parseInt(anio, 10);
  let nivelIdioma: string;
  if (!isNaN(anioNum) && anioNum <= 3) {
    nivelIdioma = "Use very simple, accessible vocabulary with short sentences, as if you were talking to a young primary-school child.";
  } else if (!isNaN(anioNum) && anioNum <= 6) {
    nivelIdioma = "Use clear, direct vocabulary suited to upper primary school or the first cycle of secondary school.";
  } else {
    nivelIdioma = "You may use precise disciplinary terminology, appropriate for a middle or upper secondary student.";
  }

  // ── Questions planned for the session (bank loaded by the teacher) ────────
  const refMaterial = ejercicio ? `\nQuestions planned for the session (the teacher loaded them; the team could pick one of these or write their own):\n${ejercicio}` : "";
  const subtemaLine = subtema ? `\nSubtopic: "${subtema}"` : "";

  // ── Session base text ─────────────────────────────────────────────────────
  const textoFuenteBlock = textoFuente
    ? `\nSESSION BASE TEXT:\n"""\n${textoFuente.substring(0, 8000)}\n"""\n\n${esJuegoOral ? "Support your evaluation by pointing to which part of the text supports or contradicts the answer. If the text is not enough to decide, say so explicitly instead of inventing a justification." : "Support your verdict by pointing to which part of the text supports each position. If the text is not enough to decide between the two, say so explicitly instead of inventing a justification."} The text is there to verify concepts: do not require the answer to repeat its words.\n`
    : "";

  // ── JSON response format (shared) ─────────────────────────────────────────
  const jsonFormat = `Respond ONLY with valid JSON with no backticks or extra text. Keep the JSON keys and the fixed values (such as "A", "completa", "incompleta", "no") exactly as written below; write the text fields in English:
{
  "resultado": "A",
  "elementosClave": "what specific elements a complete answer to THIS particular question would need (just one, or several if the question requires it), and which of those the team mentioned concretely and not generically (even if they said it in other words). Include only what the prompt expressly asks for: if it asks to «identify the error», pointing out which one it is is enough; do not add correcting it, explaining it or justifying it unless the prompt asks for it",
  "calificacionRecomendada": "completa",
  ${esJuegoOral ? `"evaluacion": "one sentence that evaluates the answer in itself: what is correct about it and, if applicable, what it lacks or what is wrong. Do NOT say who is right and do NOT name a team as the winner"` : `"veredicto": "one sentence that sums up who is right"`},
  "explicacion": "2-3 sentences explaining the concept in a pedagogical way",
  "paraSeguirPensando": "a question that invites the group to keep reflecting on their understanding of the concept (why, how, what it relates to), never on the literal terminology"
}

The "elementosClave" field is a mandatory analysis step that you must work out BEFORE deciding "calificacionRecomendada": first think about what a complete answer to this particular question would need to say, and compare that with what the team actually said. Do not skip it — the category below has to come out of that comparison, not out of a general impression.

COMPLETENESS RULE: the parts that make an answer complete come from what THE QUESTION ASKS FOR, not from everything that could be said about the topic. An answer is complete if it gives what the question asks for, even if relevant information is left unmentioned. If the session has a BASE TEXT, use it to verify that what the team said is correct; do NOT use it to demand information the question did not ask for. Examples: if the prompt asks to «identify the error», the answer is complete if it points out which the error is; correcting it is only required if the prompt explicitly asks for it (for example, «identify and correct»), and it is not necessary to explain how or why it came about either; if it asks to «name two causes», it is complete with two correct causes. The same goes for the procedure: showing the calculation or justifying is only required if the prompt explicitly asks for it (for example, «calculate and show your work», «justify»).

EVALUATE THE CONCEPT, NOT THE WORDS: an answer is correct if it expresses the correct concept, even if it says it in other words than those of the base text or of whoever asked. Synonyms, paraphrases and equivalent terms count just the same: for example, «relics» or «archaeological remains» correspond to «material sources». NEVER mark an answer as incorrect or incomplete just because it did not use the exact words of the text, and do not give weight to an argument that boils down to «they did not say the word». For each element of "elementosClave", ask yourself whether the team expressed it as a concept, in whatever words. In "paraSeguirPensando" aim at the understanding of the concept (why, how, what it relates to), never at remembering the exact word from the text.${esJuegoOral ? `

You do NOT write scores or decide who is right: the system does that from your "calificacionRecomendada" (see "HOW TO DECIDE THE GRADE" below).` : ""}

The "resultado" field must be exactly one of: "A", "B", "ambas_correctas", "ambas_incorrectas".${esJuegoOral ? ` In this round, "resultado" is calculated by the system from your grade: write "A", unless "fuera_de_tema" applies.` : ""}

The "calificacionRecomendada" field is INDEPENDENT of "resultado": it indicates what score the team's answer deserves IN ITSELF, as evaluated by you with your own knowledge of the subject — not just by comparing which position in the disagreement "won". It must be exactly one of:
- "completa": the answer is correct and covers the specific elements that were needed for this particular question.
- "incompleta": the answer IS CORRECT in everything it states AND mentions at least one SPECIFIC and CONCRETE fact, name or idea about the topic — not generic or obvious, something that shows the team knows something particular — but it lacks some of the parts the question asked for, or precision in some of them. Development, justification and examples that the question did not ask for do not count as missing. If the complete answer requires several elements (several causes, several names, several steps of a process), use "incompleta" when the team mentions SOME of those elements specifically and correctly, even if others are missing.
- "no": the answer has a conceptual or factual error — a name, fact, concept or relationship that is wrong — no matter how convincing the argument of whoever defends it is, nor how close it is to the correct topic. Mixing up one character, date or fact for another is NEVER "incompleta" or "a bit vague": it is an error, and it goes as "no". An answer that is empty, evasive or so generic that it mentions no specific, verifiable fact about the topic is ALSO "no" — one that would work as an answer to almost any question on the same topic without showing real understanding (example: if they ask who the protagonists are and they answer only "the family" without naming anyone or giving any detail). And it is ALSO "no" when the complete answer required several elements and the team gave only one or two, and those few are generic or obvious instead of specific — that is not enough for "incompleta" either, even if there is no objectively wrong fact. Be strict, not condescending — do not raise the category of an empty or nearly empty answer just to avoid being harsh. Mandatory consistency check: if in "explicacion" you yourself say that something "is incorrect", "is wrong" or "mixes up X with Y", then "calificacionRecomendada" has to be "no" — never "incompleta". Those two fields cannot contradict each other. Use "no" even if the team that originally graded had put "incompleta" — if you detect that it is actually wrong or too empty, correct it to "no".`;

  // ── Relevance (R05) ───────────────────────────────────────────────────────
  const jsonFueraDeTema = `{"resultado":"fuera_de_tema","calificacionRecomendada":"no","veredicto":"This disagreement does not belong to the session's topic.","explicacion":"The referee can only step in on disagreements about ${materia} — topic: ${tema}. Since the question does not belong to the topic, no points are awarded for this answer.","paraSeguirPensando":"Does the question you wanted to ask have to do with ${tema}?"}`;

  const regla = reglaPertinenciaEn({ materia, tema, hayTexto: !!textoFuente });
  const validacionTema = `RELEVANCE: judge relevance ONLY by the question that was asked — not by the quality of the answer or of the arguments. A weak, vague or nearly empty answer does NOT make the question "off topic": that is resolved with the grade, not by rejecting the arbitration.
${regla.criterio}
Only if ${regla.ajena}, respond exactly:
${jsonFueraDeTema}`;

  // ── Context specific to the competitive oral game (Learning Referee) ──────
  const contextoJuego = esJuegoOral ? `
GAME CONTEXT: This is a live round of "Learning Referee", an oral game between two teams with a score. One team asked the other the question out loud, heard the oral answer, and gave it a grade. The team that answered does not agree with that grade and asked for your intervention. Both teams are waiting for your ruling on the spot to keep playing, so your resolution has to be clear, decisive and brief — avoid settling for an "it depends" when an objectively better answer exists.
Act like a sports referee: firm and fair, who acknowledges what is right and corrects what is wrong without discouraging the team.
Very important: "calificacionRecomendada" has to reflect the real merit of the oral answer they gave, not reward the team that argued with more conviction in the dispute — if the answer has a fundamental error, it is "no" even if that team defends its position with confidence. Do not soften the score out of compassion: mixing up a name, a fact or a concept for another is not "answering vaguely", it is an error, and it deserves "no" — be a strict and fair referee, not a condescending one. The same goes for an answer that is empty, evasive or too generic with no concrete fact: having no errors is not enough for "incompleta" if there is nothing specific either — in that case it also deserves "no".
The "paraSeguirPensando" question has to work for BOTH teams equally, because it is read aloud to the whole class.

WHO IS WHO: ${nombrePregunta && nombreResponde ? `the team that ASKED is "${nombrePregunta}" (it is Position A) and the team that ANSWERED is "${nombreResponde}" (it is Position B).` : "the team that ASKED is the one in Position A and the team that ANSWERED is the one in Position B."}

HOW TO DECIDE THE GRADE: you do NOT write scores or decide who is right; the system does that from your "calificacionRecomendada". Decide it by evaluating the answer against the prompt (the question) and, if the session has a BASE TEXT, against that text. The written arguments of the two teams (Position A and Position B) are for you to CONSIDER, not to ADOPT: they may point out something worth looking at, but verify it yourself, and do not let yourself be swayed by whoever wrote with more confidence or with more words.
The "evaluacion", the "explicacion" and "paraSeguirPensando" do NOT say who is right or name a team as the winner: the system adds that sentence. They have to be consistent with your "calificacionRecomendada" and cannot contradict it. If your grade is "incompleta", do NOT say that the answer is incorrect or wrong: say which part is correct and what is missing. Reserve the word «incorrect» for when "calificacionRecomendada" is "no".

Very important: evaluate the real merit of the answer, not who argued with more conviction or who wrote more.
` : "";

  // ── Single prompt ─────────────────────────────────────────────────────────
  const areaTxt = (contexto?.area || "").trim();
  const materiaTxt = (contexto?.materia || "").trim();
  const criterioTxt = (contexto?.criterio || "").trim();
  const areaLine = areaTxt ? `\nArea: ${areaTxt}` : "";
  const materiaLine = materiaTxt ? `\nSubject: ${materiaTxt}` : "";
  const criterioArea = criterioTxt
    ? `\nWHAT COUNTS AS A COMPLETE ANSWER IN THIS AREA${areaTxt ? ` (${areaTxt})` : ""}: ${criterioTxt}\n`
    : "";

  return `You are an expert pedagogical referee in ${materia} at ${nivel} level (year ${anio}).${areaLine}${materiaLine}
Topic: "${tema}"${subtemaLine}${refMaterial}

${nivelIdioma}

Your task is to referee a disagreement between two students with pedagogical judgment and disciplinary precision.
${criterioArea}
${validacionTema}
${contextoJuego}
${jsonFormat}

Rules:
- Only referee on "${tema}".
- If the two positions are equivalent, use "ambas_correctas".
- Do not solve entire exercises; only referee the point in dispute.

${textoFuenteBlock}
Disagreement: ${desacuerdo}
Position A: ${esJuegoOral ? quitarEtiquetaCalificacion(posicionA, params.equipoPregunta) : posicionA}
Position B: ${posicionB}`;
}

// ── Generador de preguntas (consignas) ─────────────────────────────────────────────────────────────────────────────────────────────
export function buildPromptConsignasEn(params: {
  materia: string; nivel: string; anio: string; tema: string; subtema?: string; n: number;
  tipo: "memoristica" | "mixta" | "capacidades"; textoFuente?: string;
}): string {
  const { tema, subtema, n, tipo, textoFuente } = params;
  const materia = materiaEn(params.materia), nivel = nivelEn(params.nivel), anio = params.anio;

  const OPERACIONES_CAPACIDADES = [
    "Compare: present two interpretations, positions or elements of the topic and ask which one is more solid and why.",
    "Detect an error: state a claim with a conceptual error about the topic and ask them to identify and correct it.",
    "Argue a position: ask them to defend a debatable position about the topic with at least two reasons.",
    "Question an assumption: present a widespread idea about the topic and ask them to assess whether it is so or not, and why.",
    "Relate concepts: ask them to explain the connection between two elements of the topic.",
  ];

  const bloqueTipo = tipo === "memoristica"
    ? `Prioritize concrete-fact questions: names, dates, definitions, specific facts about the topic.`
    : tipo === "capacidades"
    ? `The great majority of the questions (at least 8 out of 10) must ask for one of these thinking operations instead of an isolated fact, so that they help develop skills and not just memory:
${OPERACIONES_CAPACIDADES.map((o) => `- ${o}`).join("\n")}
These questions still need an answer that can be verified and justified with the topic — it is not free opinion, it is reasoning that the referee can evaluate.`
    : `Combine two types of questions in similar parts: half concrete-fact questions (names, dates, definitions) and the other half asking for one of these thinking operations, so that they help develop skills and not just memory:
${OPERACIONES_CAPACIDADES.map((o) => `- ${o}`).join("\n")}
These latter ones also need an answer that can be verified and justified with the topic — it is not free opinion, it is reasoning that the referee can evaluate.`;

  const bloqueTexto = textoFuente && textoFuente.trim()
    ? `\nBASE TEXT THAT THE STUDENTS WILL READ BEFORE THE GAME:\n"""\n${textoFuente.trim().substring(0, 8000)}\n"""\n\nVERY IMPORTANT: the questions have to be answerable from this text. Do not make up questions about aspects of the topic that the text does not cover, even if you know them from other sources. Prioritize what the text actually says, so that the referee can later evaluate the answers by citing it.\n`
    : `\nThere is no base text loaded yet, so generate the questions with your general knowledge of the topic.\n`;

  return `You are an expert teacher of ${materia} for ${nivel} ${anio} in Argentina.
Generate exactly ${n} questions on the topic: "${tema}"${subtema ? ` (specifically: ${subtema})` : ""}.
${bloqueTexto}
These questions will be used in an oral team game: one team asks the question out loud
to another, which must also answer out loud, and a referee (or the teacher) evaluates whether the answer is
complete, incomplete or incorrect. Therefore each question must:
- Have a verifiable answer that the referee can evaluate as correct, incomplete or incorrect (avoid free-opinion questions with no possible criterion).
- Be brief and clear enough to say out loud.
- Vary in difficulty (some simpler, others more challenging).
- Not ask the student to cite, name or argue "according to" an author or expert mentioned in the text (even if the text does name them). If the text presents an author's idea, phrase the question about that idea itself, without requiring the student to remember or mention whose it is. Example: instead of "how would you argue this based on the ideas of [author]?", ask "why does the text claim that [idea]? do you agree?".

${bloqueTipo}

Number the questions from 1 to ${n}. Reply ONLY with the numbered questions, in English, with no introduction or closing.`;
}

// ── Una sola pregunta de debate (requestConsigna) ───────────────────────────────────────────────────────────────────────────────────
export function buildPromptConsignaEn(params: { materia: string; nivel: string; anio: string; tema: string; subtema?: string }): string {
  const { tema, subtema } = params;
  const materia = materiaEn(params.materia), nivel = nivelEn(params.nivel), anio = params.anio;
  return `Generate ONE SINGLE debate question for ${materia} students, ${nivel} ${anio}, topic: "${tema}"${subtema ? ` (${subtema})` : ""}.
It must not be a yes/no question. Maximum 2 lines. Reply ONLY with the question, in English.`;
}

// ── Informe de la sesión ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export const RESULTADO_LABEL_EN: Record<string, string> = {
  A: "Position A correct",
  B: "Position B correct",
  ambas_correctas: "Both correct",
  ambas_incorrectas: "Both incorrect",
  fuera_de_tema: "Off topic",
};

export function buildPromptInformeEn(params: {
  materia: string; areaKey: string | null; nivel: string; anio: string; tema: string; subtema?: string;
  consultas: Array<{ desacuerdo?: string; posicionA?: string; posicionB?: string; resultado?: string }>;
  rondasPasadas: Array<{ pregunta?: string; equipoPregunta?: string }>;
}): string {
  const { tema, subtema, consultas, rondasPasadas } = params;
  const materia = materiaEn(params.materia), nivel = nivelEn(params.nivel), anio = params.anio;
  const resumenConsultas = consultas.map((c, i) => {
    return `Query ${i + 1}:
  Disagreement: ${c.desacuerdo}
  Position A: ${c.posicionA}
  Position B: ${c.posicionB}
  Result: ${RESULTADO_LABEL_EN[c.resultado as string] ?? c.resultado}`;
  }).join("\n\n");

  const totalConsultas = consultas.length;
  const fueraDeTema = consultas.filter((c) => c.resultado === "ambas_incorrectas" || c.resultado === "fuera_de_tema").length;
  const correctasA = consultas.filter((c) => c.resultado === "A").length;
  const correctasB = consultas.filter((c) => c.resultado === "B").length;
  const ambasCorrectas = consultas.filter((c) => c.resultado === "ambas_correctas").length;
  const ambasIncorrectas = consultas.filter((c) => c.resultado === "ambas_incorrectas").length;

  const rondasPasadasSection = rondasPasadas.length > 0
    ? `\n\nSKIPPED QUESTIONS (do NOT include them in the pedagogical analysis — they do not count as debate or as errors; list them only so the teacher can see them):\n${
        rondasPasadas.map((r, i) => `${i + 1}. "${r.pregunta || "(no text)"}" — skipped by ${r.equipoPregunta || "a team"}`).join("\n")
      }`
    : "";

  return `You are a pedagogical assistant specialized in the analysis of collaborative learning.
Analyze the following refereed debate session and generate a report for the teacher.

SESSION DATA:
- Subject: ${materia}
- Area: ${params.areaKey ? (AREA_LABEL_EN[params.areaKey] ?? params.areaKey) : "Not specified"}
- Level: ${nivel} — year ${anio}
- Topic: ${tema}
${subtema ? `- Subtopic: ${subtema}` : ""}
- Total queries to the referee: ${totalConsultas}
- Results: A correct: ${correctasA} | B correct: ${correctasB} | Both correct: ${ambasCorrectas} | Both incorrect: ${ambasIncorrectas} | Off topic: ${fueraDeTema}

QUERY DETAILS:
${resumenConsultas}

Respond ONLY with valid JSON with no backticks or additional text. Keep the JSON keys and the "nivelDebate" values exactly as written; write the text values in English:
{
  "resumenEjecutivo": "2-3 sentences that sum up the group's overall performance",
  "conceptosDebatidos": ["list of central concepts or ideas that came up in the queries"],
  "fortalezas": "paragraph describing what the group understood well or debated in depth",
  "areasDeOportunidad": "paragraph describing the concepts where there was the most confusion or errors",
  "patronesObservados": "paragraph describing patterns: whether there was genuine debate, whether the positions were polarized, whether the questions were shallow or deep",
  "recomendacionesDocente": ["3-4 concrete recommendations for the teacher for the next class"],
  "preguntasParaRetomar": ["2-3 questions that were left unresolved or deserve to be taken up again in class"],
  "nivelDebate": "superficial" | "adecuado" | "profundo"
}${rondasPasadasSection}`;
}
