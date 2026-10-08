// Documentos exportados en español COPIADOS TEXTUALMENTE de las pantallas antes de la etapa 3 (ArbitroConfigPage / ArbitroJuegoPage).
// verificar-etapa3.cjs comprueba que con idioma 'es' los documentos nuevos (src/utils/arbitroDocumentos.ts) no cambian ni un carácter.
module.exports = function (ta, { materia, tema, nivel, anio, instrucciones, ejercicio, informe, linkSesion, locale, fmt, sesion, equipos, nombreEquipo1, nombreEquipo2, integrantesEquipo1, integrantesEquipo2, metas }) {
  const [meta1E1, meta2E1, meta3E1, meta4E1] = metas[0], [meta1E2, meta2E2, meta3E2, meta4E2] = metas[1];
  const defaultInstrucciones = (t) => (
    `Hoy vamos a practicar: ${t}\n\n` +
    `📖 Antes de jugar: dediquen unos minutos a leer el texto base del tema. Si no lo tienen a mano, pídanle al docente que lo proyecte desde su panel. Durante el juego no lo van a tener disponible en pantalla — el debate se basa en lo que comprendieron.\n\n` +
    `📋 Cómo funciona:\n` +
    `1. Formen 2 equipos.\n` +
    `2. Entren al link de esta sesión desde el dispositivo de un integrante de cada equipo — ahí se juega toda la ronda.\n` +
    `3. Un equipo le hace una pregunta oral al otro; el equipo que responde lo hace en voz alta.\n` +
    `4. El equipo que preguntó califica la respuesta: completa (1 punto), incompleta (0.5) o incorrecta (0). El juego suma los puntos solo, automáticamente.\n` +
    `${ta.rulesStep5Template}\n` +
    `6. Al terminar, cada equipo completa la metacognición dentro del juego, que se manda al profesor.`
  );

  const defaultInforme = (t) => (
    `Al terminar el juego, cada equipo escribe:\n\n` +
    `1. ¿Qué aprendieron hoy sobre "${t}"?\n` +
    `2. ¿En qué momento dudaron más? ¿Cómo lo resolvieron?\n` +
    `3. Contá una disputa donde intervino el árbitro: ¿cuál era tu postura antes de esa decisión y cuál después? ¿Te ayudó a ver el tema desde otro punto de vista?\n` +
    `4. ¿Cómo le explicarían a otro compañero lo que aprendieron hoy?\n\n` +
    `Al terminar, presioná el botón "Enviar informe al docente" dentro del juego. El informe llega automáticamente al panel del docente — no hace falta hacer nada más.`
  );

  // Una sola fuente de contenido: lo que se edita acá es exactamente lo que se
  const buildContenidoCompleto = () => [
    `⚖️ Árbitro de Aprendizaje — ${materia} · ${tema}`,
    `${nivel} ${anio}`,
    instrucciones,
    ejercicio ? `📋 PREGUNTAS PARA EL JUEGO:\n${ejercicio}` : "",
    `✍️ INFORME FINAL:\n${informe}`,
    `🔗 Link del juego: ${linkSesion}`,
    `👩‍🏫 Docente: cuando los equipos terminen de jugar vas a poder ver sus respuestas y el informe pedagógico en https://eljuegodelsemaforo.com/arbitro-panel — entrá con la misma cuenta de Google con la que creaste esta tarea. Los alumnos no tienen acceso a esa vista.`,
  ].filter(Boolean).join("\n\n");
  const generarTextoInforme = () => {
    const lineas = [
      `INFORME DE SESIÓN — ${sesion?.materia} · ${sesion?.tema}`,
      `Fecha: ${new Date().toLocaleDateString(locale)}`,
      "",
    ];

    equipos.forEach(eq => {
      lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      lineas.push(`Equipo: ${eq.nombre} (${eq.integrantes})`);
      lineas.push(`Puntaje final: ${fmt(eq.puntos)} puntos`);
      lineas.push("");
    });

    const preguntasTexto = [
      `¿Qué aprendieron hoy sobre "${sesion?.tema}"?`,
      "¿En qué momento dudaron más? ¿Cómo lo resolvieron?",
      "Contá una disputa donde intervino el árbitro (IA): ¿cuál era tu postura antes y cuál después?",
      "¿Cómo le explicarían a otro compañero lo que aprendieron hoy?",
    ];

    // Equipo 1
    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push(`REFLEXIONES DE ${nombreEquipo1.toUpperCase()} (${integrantesEquipo1})`);
    lineas.push("");
    [meta1E1, meta2E1, meta3E1, meta4E1].forEach((resp, i) => {
      if (resp?.trim()) {
        lineas.push(`${i + 1}. ${preguntasTexto[i]}`);
        lineas.push(resp.trim());
        lineas.push("");
      }
    });

    // Equipo 2
    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push(`REFLEXIONES DE ${nombreEquipo2.toUpperCase()} (${integrantesEquipo2})`);
    lineas.push("");
    [meta1E2, meta2E2, meta3E2, meta4E2].forEach((resp, i) => {
      if (resp?.trim()) {
        lineas.push(`${i + 1}. ${preguntasTexto[i]}`);
        lineas.push(resp.trim());
        lineas.push("");
      }
    });

    lineas.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lineas.push("Árbitro de Aprendizaje · eljuegodelsemaforo.com");

    return lineas.join("\n");
  };
  return { instrucciones: defaultInstrucciones(tema), informe: defaultInforme(tema), contenido: buildContenidoCompleto(), clasroomTitle: `⚖️ Árbitro de Aprendizaje — ${materia}: ${tema}`, sesion: generarTextoInforme() };
};
