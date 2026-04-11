import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // ✨ CAMBIO: importar useLocation
import './TeacherGuide.css';
import { useI18n } from "../../i18n";

// Íconos (usando caracteres Unicode por simplicidad - se pueden reemplazar con SVGs después)
const ICONS = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
  lightbulb: '💡',
  warning: '⚠️',
  check: '✅',
  cross: '❌',
  arrowRight: '→',
  book: '📘',
  target: '🎯',
  group: '👥',
  compete: '⚔️',
  teacher: '👨‍🏫',
  ai: '🤖',
  theory: '📚'
};

interface Section {
  id: string;
  title: string;
  content: JSX.Element;
}

const texts = {
  es: {
    // Header / Footer
    headerTitle: '🎓 Guía Pedagógica del Profesor',
    headerSubtitle: 'Traffic Light Game · Coopetition Game · SOLE · Evaluación Cualitativa',
    tabGuides: '📘 Guías y Fundamentos',
    tabEvaluation: '📊 Evaluación y Rúbricas',
    footerText1: 'Esta guía se basa en investigación en ciencia del aprendizaje (Vygotsky, Perkins, Mitra, Hutchins, Wilber).',
    footerText2: 'Para uso exclusivo de docentes que implementan Traffic Light Game.',

    // ========== SECCIÓN 1 ==========
    s1_title: '1. Diseño Intencional: Por Qué NO Hay Feedback Automático',
    s1_warning_strong: 'Decisión Pedagógica, No Limitación Técnica:',
    s1_warning_text: 'Traffic Light Game NO proporciona respuestas "correctas" automáticas. Esta es una decisión intencional para promover debate, argumentación y construcción colectiva del conocimiento.',
    s1_heading_fundamento: 'Fundamento Pedagógico',
    s1_socratic_title: 'Método Socrático (Diálogo Dialéctico)',
    s1_socratic_desc1: 'Al no dar respuestas inmediatas, generamos una tensión cognitiva que obliga a los estudiantes a justificar su razonamiento. La incertidumbre no es un problema - es el motor del aprendizaje profundo.',
    s1_socratic_desc2: 'El método socrático se basa en hacer preguntas que provocan reflexión, no en dar respuestas. Cuando el sistema NO dice "correcto/incorrecto" automáticamente, los estudiantes DEBEN argumentar por qué su respuesta es válida.',
    s1_constructivism_title: 'Constructivismo Social (Vygotsky)',
    s1_constructivism_desc1: 'El aprendizaje ocurre en la interacción social. El profesor como mediador facilita la construcción de significado. Las respuestas automáticas eliminan esta dimensión social crítica.',
    s1_constructivism_desc2: 'Vygotsky demostró que el aprendizaje más profundo sucede en la Zona de Desarrollo Próximo (ZDP) - ese espacio entre lo que el alumno puede hacer solo y lo que puede hacer con ayuda. El debate entre pares y la mediación del profesor son esenciales para navegar esta zona.',
    s1_comparison_bad_header: 'CON Feedback Automático (❌)',
    s1_comparison_good_header: 'SIN Feedback Automático (✅)',
    s1_comparison_row1_bad: 'Estudiantes buscan "la respuesta correcta" sin pensar',
    s1_comparison_row1_good: 'Estudiantes deben argumentar y justificar',
    s1_comparison_row2_bad: 'No hay debate real - solo verificación',
    s1_comparison_row2_good: 'Debate genuino entre pares',
    s1_comparison_row3_bad: 'Aprendizaje superficial y memorístico',
    s1_comparison_row3_good: 'Comprensión conceptual profunda',
    s1_comparison_row4_bad: 'Profesor como observador pasivo',
    s1_comparison_row4_good: 'Profesor como facilitador esencial',
    s1_comparison_row5_bad: 'Tecnología reemplaza la enseñanza',
    s1_comparison_row5_good: 'Tecnología apoya la enseñanza (no la reemplaza)',
    s1_comparison_row6_bad: 'Foco en resultado, no en proceso',
    s1_comparison_row6_good: 'Foco en razonamiento y proceso',
    s1_tip_title: 'Tu Rol como Profesor',
    s1_tip_intro: 'Tú eres quien cierra el ciclo de aprendizaje. El sistema genera el debate, pero TÚ:',
    s1_role1: 'Facilitas la discusión',
    s1_role1_desc: 'Haces preguntas que profundizan el debate',
    s1_role2: 'Aclaras malentendidos conceptuales',
    s1_role2_desc: 'Detectas errores de comprensión y los corriges',
    s1_role3: 'Sintetizas las ideas del grupo',
    s1_role3_desc: 'Conectas diferentes perspectivas',
    s1_role4: 'Conectas con objetivos curriculares',
    s1_role4_desc: 'Vinculas el debate con lo que deben aprender',
    s1_role5: 'Validar o corregir el razonamiento',
    s1_role5_desc: 'Das la palabra final cuando es necesario',
    s1_tip_final: 'Este rol NO puede ser automatizado. Es tu expertise pedagógica en acción.',
    // ========== SECCIÓN 2 ==========
    s2_title: '2. Modelo de 3 Capas: Arquitectura Pedagógica',
    s2_lead: 'Traffic Light Game estructura el aprendizaje en tres capas de complejidad social creciente. Cada capa tiene un propósito pedagógico específico.',

    s2_layer1_badge: 'CAPA 1',
    s2_layer1_title: 'Colaboración Intra-Equipo',
    s2_layer1_stage: 'Stage 0 - Stage 1',
    s2_what_happens: '¿Qué sucede?',
    s2_layer1_list1: 'Estudiantes construyen conocimiento EN EQUIPO',
    s2_layer1_list2: 'Proponen y evalúan preguntas juntos (Stage 0)',
    s2_layer1_list3: 'Practican sin competencia externa (Stage 1)',
    s2_layer1_list4: 'Sistema identifica quién necesita apoyo',
    s2_layer1_list5: 'Mejoran colectivamente antes de competir',
    s2_layer1_theory_note: 'Teoría aplicada: ZDP grupal + SOLE (Sugata Mitra). Una computadora + grupo → auto-organización del aprendizaje.',
    s2_layer1_teacher_role: 'Tu rol: Circula entre equipos, observa dinámicas, NO intervengas aún.',

    s2_layer2_badge: 'CAPA 2',
    s2_layer2_title: 'Competencia Inter-Equipos',
    s2_layer2_stage: 'Stage 2',
    s2_layer2_list1: 'Equipos compiten entre sí',
    s2_layer2_list2: 'Confrontación de ideas diferentes',
    s2_layer2_list3: 'Debate académico riguroso',
    s2_layer2_list4: 'Motivación por competencia sana',
    s2_layer2_list5: 'Exposición a perspectivas diversas',
    s2_layer2_theory_note: 'Teoría aplicada: Coopetition - Solo los equipos que colaboran bien internamente pueden competir efectivamente hacia afuera.',
    s2_layer2_teacher_role: 'Tu rol: Facilitador activo del debate. Pausa, pide argumentos, facilita intercambio, sintetiza.',
    s2_layer3_badge: 'CAPA 3',
    s2_layer3_title: 'Mediación Docente',
    s2_layer3_stage: 'Todo el proceso',
    s2_what_you_do: '¿Qué haces?',
    s2_layer3_list1: 'Facilitas debates cuando hay impasse',
    s2_layer3_list2: 'Aclaras malentendidos conceptuales',
    s2_layer3_list3: 'Conectas con objetivos curriculares',
    s2_layer3_list4: 'Sintetizas patrones que observas',
    s2_layer3_list5: 'Cierras conceptualmente al final',
    s2_layer3_theory_note: 'Teoría aplicada: Mediación cultural (Vygotsky) - Eres el puente entre conocimiento cotidiano y conocimiento científico.',
    s2_layer3_teacher_role: 'Tu rol: Saber cuándo intervenir y cuándo NO.',

    // ========== SECCIÓN 3 ==========
    s3_title: '3. Sistema Verde/Amarillo/Rojo: Más Allá del Correcto/Incorrecto',
    s3_lead: 'El sistema de calificaciones tipo semáforo NO solo evalúa si la respuesta es correcta o incorrecta. Los tres colores 🟢🟡🔴 operan <strong>exactamente igual en Etapa 1 y Etapa 2</strong> — la diferencia entre etapas está en el diseño de las consignas, no en los colores. Lo que importa es la justificación.',

    // Luz verde
    s3_green_light: 'LUZ VERDE',
    s3_green_points: '5 puntos',
    s3_green_meaning_label: 'Significado:',
    s3_green_meaning_value: '"La respuesta está correcta, pero es OBVIA o no aporta nada nuevo"',
    s3_green_why_label: 'Por qué pocos puntos:',
    s3_green_why_value: 'Queremos <strong>desincentivar respuestas superficiales</strong>. Si la respuesta es correcta pero no agrega valor al debate, recibe el puntaje mínimo.',
    s3_green_example_label: 'Ejemplo:',
    s3_green_example: 'Pregunta: "¿Cuál es la capital de Francia?"\nRespuesta: "París"\nCalificación: 🟢 Verde',
    s3_green_perkins_label: 'Señal:',
    s3_green_perkins_value: 'Falta de motivación para buscar conexiones. Cualquier respuesta puede enriquecerse con Amarillo.',

    // Luz amarilla
    s3_yellow_light: 'LUZ AMARILLA',
    s3_yellow_points: '10 puntos',
    s3_yellow_meaning_label: 'Significado:',
    s3_yellow_meaning_value: '"La respuesta APORTA RELACIONES, conexiones o perspectivas no obvias"',
    s3_yellow_why_label: 'Por qué más puntos:',
    s3_yellow_why_value: 'Este es el nivel que <strong>más queremos fomentar</strong>. Indica pensamiento profundo, capacidad de relacionar conceptos, comprensión genuina.',
    s3_yellow_example_label: 'Ejemplo:',
    s3_yellow_example: 'Pregunta: "¿Por qué flotan los barcos?"\nRespuesta: "Por el principio de Arquímedes. El barco desplaza agua cuyo peso es mayor que el del barco. Por eso un barco de acero puede flotar mientras una moneda de acero se hunde: depende del VOLUMEN de agua desplazado, no solo del material."\nCalificación: 🟡 Amarillo',
    s3_yellow_perkins_label: 'Señal:',
    s3_yellow_perkins_value: 'El corazón del método: busca conexiones, relaciones y nuevas perspectivas entre conceptos.',

    // Luz roja
    s3_red_light: 'LUZ ROJA',
    s3_red_points: '12 puntos (para quien detecta)',
    s3_red_meaning_label: 'Significado:',
    s3_red_meaning_value: '"La respuesta tiene un ERROR que otros NO detectaron"',
    s3_red_why_label: 'Por qué máximos puntos:',
    s3_red_why_value: 'Detectar errores requiere <strong>pensamiento crítico</strong> de alto nivel. Es más difícil que dar respuestas correctas. Además, ayuda a todos a aprender del error.',
    s3_red_example_label: 'Ejemplo:',
    s3_red_example: 'Pregunta: "¿Qué causa las estaciones del año?"\nRespuesta de Equipo A: "La distancia variable de la Tierra al Sol."\nEquipo B detecta error: 🔴 "Incorrecto. Las estaciones NO son por distancia, sino por la inclinación del eje terrestre."\nResultado: Equipo B recibe 12 puntos.',
    s3_red_perkins_label: 'Señal:',
    s3_red_perkins_value: 'Requiere atención crítica. Si el Rojo era incorrecto (no había error), quien lo marcó recibe 0 pts.',

    // Beneficios
    s3_benefit1_title: 'Premia la Profundidad',
    s3_benefit1_desc: 'Un alumno que da respuestas amarillas consistentemente demuestra comprensión MÁS profunda que uno que solo acierta (verdes).',
    s3_benefit2_title: 'Incentiva Pensamiento Crítico',
    s3_benefit2_desc: 'Los puntos rojos motivan a CUESTIONAR, no solo aceptar. Desarrolla pensamiento crítico genuino.',
    s3_benefit3_title: 'Hace Visible la Comprensión',
    s3_benefit3_desc: 'Para ti como docente, ver el patrón de calificaciones de un alumno revela su nivel de comprensión.',
    s3_benefit4_title: 'Castiga la Complacencia',
    s3_benefit4_desc: 'Si no detectas un error obvio, aprendes que necesitas estar más atento y crítico.',

    // Tip
    s3_tip_title: 'Tip para el Docente',
    s3_tip_text1: 'Durante Stage 2, NO te fijes solo en los puntos. <strong>Escucha las JUSTIFICACIONES.</strong>',
    s3_tip_bad: 'Superficial:',
    s3_tip_bad_example: '"Es amarillo porque... está bien más o menos" → Débil, no fundamenta',
    s3_tip_good: 'Profunda:',
    s3_tip_good_example: '"Es amarillo porque la respuesta menciona X, pero no conecta con Y que vimos en la clase anterior." → Fuerte, fundamenta, relaciona',
    s3_tip_highlight: 'Tú evalúas CALIDAD, no solo cantidad de puntos.',

    // ========== SECCIÓN 4 ==========
    s4_title: '4. Stage 1 vs Stage 2: Base y Profundidad (Perkins)',
    s4_lead: 'David Perkins (Teoría de la Comprensión) distingue entre conocimiento <strong>superficial/ritual</strong> y <strong>comprensión genuina</strong>. Traffic Light Game estructura esto en dos stages secuenciales.',

    // Stage 1
    s4_stage1_badge: 'STAGE 1',
    s4_stage1_title: 'Fortalecer Equipos (Práctica)',
    s4_stage1_objective_label: 'Objetivo:',
    s4_stage1_objective: 'Construcción de conocimiento BASE y detección de quién necesita apoyo.',
    s4_stage1_list1: '❌ NO hay competencia entre equipos',
    s4_stage1_list2: '📊 Puntos son FEEDBACK, no calificación',
    s4_stage1_list3: '📝 Preguntas más básicas/fundamentales',
    s4_stage1_list4: '🟢🟡🔴 Los tres colores están disponibles en todas las consignas',
    s4_stage1_list5: '🎯 Enfoque: Preparación y colaboración interna',
    s4_stage1_example_label: 'Tipo de preguntas:',
    s4_stage1_example1: 'Definición: "¿Qué es la fotosíntesis?"',
    s4_stage1_example2: 'Procedimiento: "¿Cómo se calcula el área de un triángulo?"',
    s4_stage1_example3: 'Comparación simple: "¿En qué se diferencian células animales y vegetales?"',
    s4_stage1_teacher_role_label: 'Tu rol:',
    s4_stage1_teacher_role: 'Observa dinámicas, detecta quién necesita apoyo, NO intervengas aún.',
    s4_stage1_perkins_label: 'Nivel Perkins:',
    s4_stage1_perkins: 'Conocimiento Ritual → Transición',

    // Stage 2
    s4_stage2_badge: 'STAGE 2',
    s4_stage2_title: 'Competencia entre Equipos (Demostración)',
    s4_stage2_objective_label: 'Objetivo:',
    s4_stage2_objective: 'Comprensión PROFUNDA y aplicación en contextos complejos.',
    s4_stage2_list1: '⚔️ SÍ hay competencia entre equipos',
    s4_stage2_list2: '🏆 Puntos cuentan para podio (motivación)',
    s4_stage2_list3: '🧠 Preguntas más complejas/relacionales',
    s4_stage2_list4: '💬 Mayoría requieren HACER y EXPLICAR',
    s4_stage2_list5: '🎯 Enfoque: Demostración de comprensión genuina',
    s4_stage2_example_label: 'Tipo de preguntas:',
    s4_stage2_example1: 'Explicación compleja: "Explica cómo la fotosíntesis y la respiración celular están conectadas"',
    s4_stage2_example2: 'Aplicación: "¿Cómo usarías Pitágoras para calcular la altura de un edificio?"',
    s4_stage2_example3: 'Relaciones múltiples: "¿Qué tienen en común varias revoluciones?"',
    s4_stage2_example4: 'Hacer + Explicar: "Diseña un experimento y explica tu razonamiento"',
    s4_stage2_teacher_role_label: 'Tu rol:',
    s4_stage2_teacher_role: 'Facilitador ACTIVO del debate. Pausa, facilita argumentación, escucha calidad de justificaciones.',
    s4_stage2_perkins_label: 'Nivel Perkins:',
    s4_stage2_perkins: 'Comprensión Genuina (explicar, aplicar, justificar, relacionar)',

    // Por qué el orden importa
    s4_why_order_title: 'Por Qué el Orden Importa',
    s4_reason1_title: 'Base Conceptual Necesaria',
    s4_reason1_desc: 'Para RELACIONAR conceptos (Stage 2), primero necesitas TENER los conceptos claros (Stage 1). No puedes conectar lo que no existe.',
    s4_reason2_title: 'Confianza del Equipo',
    s4_reason2_desc: 'Stage 1 sin competencia permite que el equipo se fortalezca SIN presión externa. Construye confianza interna necesaria para Stage 2.',
    s4_reason3_title: 'Identificación de Gaps',
    s4_reason3_desc: 'Stage 1 revela quién necesita apoyo. El equipo puede prepararse ANTES de competir.',
    s4_reason4_title: 'Progresión Cognitiva Natural',
    s4_reason4_desc: 'Perkins muestra que la comprensión genuina se construye SOBRE conocimiento ritual, no sin él.',

    // Guía para curar preguntas
    s4_guide_title: 'Guía para Curar Preguntas',
    s4_table_criterion: 'Criterio',
    s4_table_stage1: 'Stage 1',
    s4_table_stage2: 'Stage 2',
    s4_table_complexity: 'Complejidad',
    s4_table_complexity_stage1: 'Baja-Media',
    s4_table_complexity_stage2: 'Media-Alta',
    s4_table_concepts: 'Conceptos involucrados',
    s4_table_concepts_stage1: '1-2 conceptos',
    s4_table_concepts_stage2: '2+ conceptos relacionados',
    s4_table_response_type: 'Tipo de respuesta',
    s4_table_response_stage1: 'Definir, identificar, comparar',
    s4_table_response_stage2: 'Explicar, aplicar, justificar',
    s4_table_debate: 'Admite debate',
    s4_table_debate_stage1: 'Sí — el equipo clasifica con Verde, Amarillo o Rojo',
    s4_table_debate_stage2: 'Mucho (mayoría amarillas)',

    // ========== SECCIÓN 5 ==========
    s5_title: '5. Uso Pedagógico de IA: Investigación, No Oráculo',
    s5_lead: 'Traffic Light Game integra IA (Claude, ChatGPT, etc.) de manera <strong>FORMATIVA</strong>, no como fuente de respuestas. Los estudiantes usan IA para INVESTIGAR y PROFUNDIZAR, no para copiar.',

    s5_philosophy_title: 'Filosofía: IA como Extensión Cognitiva',
    s5_philosophy_desc: 'Basado en la teoría de <strong>Cognición Distribuida</strong> (Edwin Hutchins), las herramientas tecnológicas pueden ser extensiones de nuestro pensamiento. La IA no reemplaza el pensar - lo amplifica.',
    s5_analogy1: 'Analogía: Una calculadora no reemplaza entender matemática. Te permite hacer cálculos complejos MÁS RÁPIDO para enfocarte en la solución del problema.',
    s5_analogy2: 'Similarmente, IA no reemplaza pensar. Te permite acceder a información MÁS RÁPIDO para enfocarte en COMPRENDER y RELACIONAR.',

    s5_comparison_title: 'Uso Correcto vs. Incorrecto',
    s5_correct_title: 'USO CORRECTO (INVESTIGAR)',
    s5_correct_scenario: 'Escenario: En Stage 0, el equipo debe proponer preguntas sobre "Revolución Francesa" pero no entienden bien el contexto.',
    s5_correct_prompt: 'Prompt al IA: "Explícame el contexto social y económico de Francia antes de 1789. ¿Cuáles eran los principales problemas que enfrentaba la población?"',
    s5_correct_why: 'Por qué es correcto:',
    s5_correct_reason1: '✅ Usaron IA para ENTENDER contexto',
    s5_correct_reason2: '✅ Procesaron la información en equipo',
    s5_correct_reason3: '✅ CONSTRUYERON sus propias preguntas',
    s5_correct_reason4: '✅ Desarrollaron comprensión profunda',

    s5_incorrect_title: 'USO INCORRECTO (COPIAR)',
    s5_incorrect_scenario: 'Escenario: En Stage 0, el equipo debe proponer preguntas sobre "Revolución Francesa".',
    s5_incorrect_prompt: 'Prompt al IA: "Dame 10 preguntas sobre la Revolución Francesa para un juego educativo"',
    s5_incorrect_why: 'Por qué es incorrecto:',
    s5_incorrect_reason1: '❌ NO hubo comprensión real',
    s5_incorrect_reason2: '❌ Automatización, no aprendizaje',
    s5_incorrect_reason3: '❌ IA reemplaza pensar',
    s5_incorrect_reason4: '❌ Sin construcción de conocimiento',

    s5_tip_title: 'Cómo Modelar Uso Correcto',
    s5_tip_desc: 'Como docente, debes ENSEÑAR a usar IA correctamente. No asumas que los estudiantes saben hacerlo.',
    s5_tip1: 'Demuestra: Proyecta tu pantalla y modela un prompt de investigación',
    s5_tip2: 'Compara: Muestra lado a lado un buen prompt y un mal prompt',
    s5_tip3: 'Practican: Haz que escriban prompts en papel antes de usar la IA',
    s5_tip4: 'Reflexionan: Pregunta "¿Qué aprendiste de la IA que no sabías antes?"',

    s5_warning_title: 'Señales de Alarma (Mal Uso)',
    s5_warning1: 'Respuestas con vocabulario que no corresponde al nivel del estudiante',
    s5_warning2: 'Preguntas idénticas entre equipos (copiaron del mismo prompt)',
    s5_warning3: 'Estudiantes que no pueden explicar con sus palabras lo que "escribieron"',
    s5_warning4: 'Preguntas que no responden al objetivo pedagógico de la clase',

    // ========== SECCIÓN 6 ==========
    s6_title: '6. Teoría SOLE: Auto-Organización y Una Computadora por Equipo',
    s6_hero_title: 'SOLE: Self-Organized Learning Environment',
    s6_quote: '"El aprendizaje es un fenómeno auto-organizado. Si pones una computadora en una comunidad de niños que no saben inglés y no saben computación, ellos aprenderán ambas cosas por sí mismos." - Sugata Mitra',

    s6_experiment_title: 'Experimento "Hole in the Wall" (1999)',
    s6_experiment_desc: 'Sugata Mitra instaló una computadora empotrada en un muro de un barrio pobre de Nueva Delhi, accesible para niños. Sin supervisión ni instrucción, en cuestión de horas los niños aprendieron a navegar, grabar, reproducir y eventualmente enseñar a otros.',
    s6_experiment_key: 'Hallazgo clave: Los niños pueden aprender tecnologías complejas por sí mismos si tienen acceso, curiosidad y colaboración.',

    s6_principles_title: 'Principios SOLE Aplicados al Juego',
    s6_principle1_title: 'Gran Pregunta',
    s6_principle1_desc: 'El juego comienza con una pregunta curricular provocadora que no tiene respuesta única inmediata.',
    s6_principle2_title: 'Auto-organización',
    s6_principle2_desc: 'Los equipos deciden roles, estrategias y métodos. No hay instrucción paso a paso.',
    s6_principle3_title: 'Recursos Mínimos',
    s6_principle3_desc: 'UNA computadora por equipo (intencional). Esto fuerza colaboración y discusión.',
    s6_principle4_title: 'Libertad y Andamiaje',
    s6_principle4_desc: 'Los estudiantes pueden consultar internet, IA, apuntes. Tú no das respuestas - facilitas el proceso.',

    s6_insight_title: 'Insight Pedagógico',
    s6_insight_desc: '<strong>Una computadora por equipo NO es una limitación presupuestaria.</strong> Es una <strong>decisión pedagógica intencional</strong> para generar interacción social y negociación de significado. Si cada estudiante tuviera su propio dispositivo, el debate se silenciaría y volveríamos al individualismo.',

    // ========== SECCIÓN 7 ==========
    s7_title: '7. Coopetition: Colaboración + Competencia',
    s7_lead: '<strong>Coopetition</strong> = Colaboración interna + Competencia externa. El sweet spot pedagógico donde el todo es mayor que la suma de las partes.',

    s7_sweet_spot_collab: '🤝 Colaboración',
    s7_sweet_spot_compete: '⚔️ Competencia',
    s7_sweet_spot_result: '🎯 Coopetition',

    s7_why_delicate_title: 'Por Qué el Equilibrio es Delicado',
    s7_why_delicate_desc: 'La competencia pura genera toxicidad y ocultamiento de información. La colaboración pura puede generar complacencia y falta de motivación. Coopetition requiere que los equipos colaboren <strong>internamente</strong> para poder competir <strong>externamente</strong>. No hay competencia efectiva sin colaboración interna primero.',

    s7_corruption_title: 'Señales de Corrupción (MALAS)',
    s7_corruption1: '<strong>Sabotaje entre equipos:</strong> "Si no sabemos la respuesta, digamos cualquier cosa para confundir al otro equipo"',
    s7_corruption2: '<strong>Ocultamiento deliberado:</strong> "No les digas cómo lo resolvimos"',
    s7_corruption3: '<strong>Desprecio personal:</strong> Burlas, humillaciones, lenguaje despectivo',
    s7_corruption4: '<strong>Individualismo tóxico:</strong> Un estudiante acapara el dispositivo y no permite que otros participen',
    s7_corruption_highlight: 'Si ves esto, PAUSA EL JUEGO. No importa el tiempo. Es más importante restaurar el clima de respeto que "terminar la actividad".',

    s7_prevent_title: 'Cómo Prevenir Toxicidad',
    s7_prevent1: '<strong>Framing inicial:</strong> "Vamos a competir, pero al final todos vamos a compartir lo que aprendieron. El que enseña gana más."',
    s7_prevent2: '<strong>Refuerzo positivo:</strong> Premia públicamente gestos de colaboración entre equipos',
    s7_prevent3: '<strong>Competencia SIMBÓLICA:</strong> Los puntos NO son la calificación. Son moneda del juego, no nota.',
    s7_prevent4: '<strong>Normas explícitas:</strong> Antes de empezar, el grupo define qué es "competencia justa"',
    s7_prevent5: '<strong>Interrupción inmediata:</strong> Al primer comentario despectivo, paras y reflexionas con el grupo',

    // ========== SECCIÓN 8 ==========
    s8_title: '8. Guía de Evaluación Cualitativa: 4 Componentes',
    s8_lead: 'El sistema entrega datos cuantitativos (puntos, rachas, participantes). TÚ interpretas y transformas esos datos en evaluación cualitativa significativa.',

    s8_components_title: 'Los 4 Componentes de Evaluación',

    // Componente 1 (40%)
    s8_comp1_percent: '40%',
    s8_comp1_title: 'Performance Individual',
    s8_comp1_desc: 'Calidad de respuestas + Justificaciones EN VIVO',
    s8_comp1_rubric_basic: 'Básico (1-3): Respuestas correctas pero superficiales (verdes). Justificación mínima.',
    s8_comp1_rubric_competent: 'Competente (4-7): Respuestas que relacionan conceptos (amarillas). Justifica con fundamentos.',
    s8_comp1_rubric_advanced: 'Avanzado (8-10): Detecta errores (rojas). Justifica con precisión y conexiones múltiples.',

    // Componente 2 (30%)
    s8_comp2_percent: '30%',
    s8_comp2_title: 'Colaboración',
    s8_comp2_desc: 'Menciones entre pares + Observación directa',
    s8_comp2_rubric_basic: 'Básico (1-3): Trabaja individualmente, ignora al equipo.',
    s8_comp2_rubric_competent: 'Competente (4-7): Escucha, aporta, respeta turnos.',
    s8_comp2_rubric_advanced: 'Avanzado (8-10): Genera consenso, sintetiza ideas, invita a participar.',

    // Componente 3 (20%)
    s8_comp3_percent: '20%',
    s8_comp3_title: 'Metacognición',
    s8_comp3_desc: 'Profundidad de reflexión en cierre',
    s8_comp3_rubric_basic: 'Básico (1-3): "Aprendí sobre el tema" (vago).',
    s8_comp3_rubric_competent: 'Competente (4-7): "Aprendí que X se relaciona con Y porque..."',
    s8_comp3_rubric_advanced: 'Avanzado (8-10): "Al principio creía X, pero ahora entiendo Y. Me equivoqué en..."',

    // Componente 4 (10%)
    s8_comp4_percent: '10%',
    s8_comp4_title: 'Crecimiento',
    s8_comp4_desc: 'Mejora desde baseline inicial',
    s8_comp4_rubric_basic: 'Básico (1-3): Sin mejora o empeora.',
    s8_comp4_rubric_competent: 'Competente (4-7): Mejora moderada en participación o calidad.',
    s8_comp4_rubric_advanced: 'Avanzado (8-10): Mejora significativa (estudiante que no participaba ahora argumenta).',

    // Tip - Flujo de trabajo
    s8_tip_title: 'Flujo de Trabajo Práctico',
    s8_tip_step1: '<strong>Durante el juego:</strong> Toma notas rápidas. Usa rúbrica como checklist mental.',
    s8_tip_step2: '<strong>Inmediatamente después:</strong> Asigna puntajes base por componente (1-10).',
    s8_tip_step3: '<strong>Fin de semana:</strong> Revisa evidencia (puntos, justificaciones escritas, observaciones).',
    s8_tip_step4: '<strong>Calificación final:</strong> Promedio ponderado según porcentajes.',
    s8_tip_key: '<strong>Dato clave:</strong> No necesitas calificar CADA intervención. Una sesión de 45-60 minutos te da suficiente evidencia para evaluar los 4 componentes.',

    // ========== SECCIÓN 9 ==========
    s9_title: '9. Dispositivos Pedagógicos Opcionales',
    s9_lead: 'El juego se puede usar solo (mínimo viable) o enriquecer con estos módulos según objetivos, tiempo y nivel.',

    // Módulo 1
    s9_module1_icon: '📝',
    s9_module1_title: 'Módulo 1: Autoevaluación Individual',
    s9_module1_moment: 'Inmediatamente después del juego',
    s9_module1_desc: 'Cada estudiante responde:',
    s9_module1_item1: '"¿Qué tan bien crees que entendiste el tema?" (1-5)',
    s9_module1_item2: '"¿Qué fue lo más difícil?"',
    s9_module1_item3: '"¿Qué harías diferente si jugaras de nuevo?"',
    s9_module1_value: 'Datos de metacognición para evaluación 20%',

    // Módulo 2
    s9_module2_icon: '✅',
    s9_module2_title: 'Módulo 2: Validación del Profesor',
    s9_module2_moment: 'Después de Stage 0 (antes de jugar)',
    s9_module2_desc: 'El profesor revisa las preguntas propuestas por equipos, da feedback y aprueba/rechaza.',
    s9_module2_value: 'Asegura calidad de preguntas + previene mal uso de IA',

    // Módulo 3
    s9_module3_icon: '💬',
    s9_module3_title: 'Módulo 3: Reflexión Grupal',
    s9_module3_moment: 'Cierre pedagógico (últimos 5-10 min)',
    s9_module3_desc: 'Discusión guiada:',
    s9_module3_item1: '"¿Qué estrategia usó el equipo ganador?"',
    s9_module3_item2: '"¿Qué error nos enseñó más?"',
    s9_module3_item3: '"¿Cómo conecta esto con la clase?"',
    s9_module3_value: 'Síntesis colectiva + cierre conceptual',

    // Módulo 4
    s9_module4_icon: '🎬',
    s9_module4_title: 'Módulo 4: Reflexión Inicial',
    s9_module4_moment: 'Antes del juego (activación)',
    s9_module4_desc: 'Pregunta disparadora: "¿Qué saben ya sobre este tema?" en equipo.',
    s9_module4_value: 'Activa conocimiento previo + baseline para evaluación crecimiento',

    // Tabla de recomendaciones
    s9_recommendations_title: 'Recomendaciones por Nivel',
    s9_table_level: 'Nivel',
    s9_table_modules: 'Módulos recomendados',
    s9_table_reason: 'Razón',
    s9_row_primary_level: 'Primaria',
    s9_row_primary_modules: '3 (Reflexión Grupal) + 4 (Reflexión Inicial)',
    s9_row_primary_reason: 'Menos escritura, más oralidad',
    s9_row_secondary_level: 'Secundaria',
    s9_row_secondary_modules: '1 (Autoevaluación) + 3 (Reflexión Grupal)',
    s9_row_secondary_reason: 'Desarrollo metacognitivo',
    s9_row_university_level: 'Universidad',
    s9_row_university_modules: '1 + 2 (Validación) + 3',
    s9_row_university_reason: 'Mayor exigencia y autonomía',


    // ========== SECCIÓN 10 ==========
    s10_title: '10. Referencia: "La Era de la Integración"',
    s10_book_title: 'La Era de la Integración: Coopetition Universal',
    s10_book_subtitle: 'El marco teórico completo del cual Traffic Light Game es una implementación práctica.',

    s10_central_theory_title: 'Teoría Central: Coopetition Universal',
    s10_central_theory_desc: 'Así como la biología evoluciona por simbiosis y competencia, el aprendizaje humano requiere <strong>colaboración para construir conocimiento</strong> y <strong>competencia para validarlo y refinarlo</strong>. Traffic Light Game es un <strong>modelo a escala</strong> de este principio universal.',

    s10_bell_curve_title: 'La Campana de Gauss: Cola Inferior + Cola Superior',
    s10_bell_curve_inferior: '<strong>Cola inferior (estudiantes con dificultades):</strong> El sistema los detecta, el equipo los ayuda, el juego les da práctica segura (Stage 1).',
    s10_bell_curve_superior: '<strong>Cola superior (estudiantes avanzados):</strong> El sistema los desafía con preguntas complejas, pueden responder amarillas y detectar errores (Stage 2).',
    s10_bell_curve_center: '<strong>Centro (mayoría):</strong> Aprenden de ambos extremos - de los que explican y de los errores detectados.',

    s10_wilber_title: 'Conexión con Ken Wilber (Teoría Integral)',
    s10_wilber_desc: 'El juego opera en los 4 cuadrantes:',
    s10_wilber_yo: '<strong>YO (Individual-interior):</strong> Metacognición, reflexión personal',
    s10_wilber_tu: '<strong>TÚ (Individual-exterior):</strong> Performance, respuestas correctas',
    s10_wilber_nosotros: '<strong>NOSOTROS (Colectivo-interior):</strong> Colaboración, cultura de equipo',
    s10_wilber_ellos: '<strong>ELLOS (Colectivo-exterior):</strong> Competencia, reglas del juego',
    s10_wilber_conclusion: 'Ningún aprendizaje profundo ocurre si alguno de estos cuadrantes está ausente.',

    s10_closing_title: 'El Rol del Juego en el Método Más Amplio',
    s10_closing_desc: 'Traffic Light Game <strong>no es un fin en sí mismo</strong>. Es un <strong>dispositivo pedagógico</strong> para activar principios de aprendizaje profundo:',
    s10_closing_list1: '✅ Auto-organización (SOLE)',
    s10_closing_list2: '✅ Coopetition',
    s10_closing_list3: '✅ Comprensión vs. memorización',
    s10_closing_list4: '✅ Mediación docente intencional',
    s10_closing_final: 'Cuando comprendes los <strong>principios</strong>, puedes aplicar el juego a cualquier contenido, nivel y contexto.',

    s10_final_message: '📖 Para profundizar: "La Era de la Integración: Coopetition Universal" (2024) - Disponible en biblioteca digital.',
    s10_final_author: '— Diseño pedagógico por Traffic Light Game Team',

    // ========== SECCIÓN 11 ==========
    s11_title: '11. Desarrollo de Capacidades: Más Allá del Contenido',
    s11_highlight: '<strong>Distinción Clave:</strong> El juego no solo enseña CONTENIDOS (datos, conceptos, hechos), sino que puede desarrollar CAPACIDADES (formas de pensar, habilidades transferibles). Esto requiere diseño intencional de las consignas.',

    s11_what_are_title: '¿Qué son las Capacidades?',
    s11_content_vs_capacity_title: 'Contenido vs. Capacidad',
    s11_content_example: '<strong>Contenido:</strong> "¿Cuál es la capital de Francia?" → El alumno recuerda un dato. Si olvida el dato, no queda nada.',
    s11_capacity_example: '<strong>Capacidad:</strong> "Compará dos fuentes sobre la Revolución Francesa y determiná cuál es más confiable." → El alumno desarrolla una HABILIDAD (evaluar evidencia) que puede usar en cualquier contexto futuro.',
    s11_capacity_transfer: 'Las capacidades son <strong>transferibles</strong>: una vez que aprendés a evaluar evidencia en Historia, podés hacerlo en Ciencias, en noticias, en la vida.',

    s11_capacities_title: 'Las 4 Capacidades del Juego',

    // Pensamiento Crítico
    s11_critical_title: 'Pensamiento Crítico',
    s11_critical_desc: 'Analizar, evaluar y cuestionar información en lugar de aceptarla pasivamente.',
    s11_critical_operations: 'Operaciones cognitivas:',
    s11_critical_op1: '<strong>Evaluar evidencia:</strong> "¿Cuál de estas fuentes es más confiable?"',
    s11_critical_op2: '<strong>Detectar errores:</strong> "¿Qué está mal en este razonamiento?"',
    s11_critical_op3: '<strong>Comparar argumentos:</strong> "¿Qué posición tiene mejores fundamentos?"',
    s11_critical_op4: '<strong>Cuestionar supuestos:</strong> "¿Qué asume esta afirmación?"',
    s11_critical_example: '<strong>Ejemplo en Matemática:</strong> "Acá hay dos formas de resolver este problema. ¿Cuál es más eficiente y por qué?"',

    // Resolución de Problemas
    s11_problem_title: 'Resolución de Problemas',
    s11_problem_desc: 'Identificar problemas, generar soluciones y evaluar alternativas.',
    s11_problem_operations: 'Operaciones cognitivas:',
    s11_problem_op1: '<strong>Identificar el problema:</strong> "¿Cuál es el problema central acá?"',
    s11_problem_op2: '<strong>Proponer soluciones:</strong> "Proponé dos formas diferentes de resolver esto."',
    s11_problem_op3: '<strong>Evaluar alternativas:</strong> "¿Qué ventajas y desventajas tiene cada opción?"',
    s11_problem_op4: '<strong>Diseñar un plan:</strong> "¿Qué pasos seguirías para lograr X?"',
    s11_problem_example: '<strong>Ejemplo en Ciencias:</strong> "Diseñá un experimento para probar esta hipótesis."',

    // Comunicación
    s11_comm_title: 'Comunicación',
    s11_comm_desc: 'Expresar ideas claramente, argumentar posiciones y adaptar el mensaje al público.',
    s11_comm_operations: 'Operaciones cognitivas:',
    s11_comm_op1: '<strong>Explicar a otros:</strong> "Explicá esto como si se lo contaras a alguien que no sabe nada."',
    s11_comm_op2: '<strong>Argumentar posición:</strong> "Defendé tu respuesta con al menos tres argumentos."',
    s11_comm_op3: '<strong>Sintetizar información:</strong> "Resumí las ideas principales en una oración."',
    s11_comm_op4: '<strong>Adaptar al público:</strong> "¿Cómo lo explicarías a un niño de 8 años?"',
    s11_comm_example: '<strong>Ejemplo en Lengua:</strong> "Convencé a tu compañero de que el personaje principal tomó la decisión correcta."',

    // Trabajo Colaborativo
    s11_collab_title: 'Trabajo Colaborativo',
    s11_collab_desc: 'Trabajar efectivamente con otros, integrar perspectivas y llegar a consensos.',
    s11_collab_operations: 'Operaciones cognitivas:',
    s11_collab_op1: '<strong>Integrar perspectivas:</strong> "¿Qué tienen en común las ideas de tu equipo?"',
    s11_collab_op2: '<strong>Negociar consenso:</strong> "¿Cómo llegarían a una solución que considere ambas posiciones?"',
    s11_collab_op3: '<strong>Distribuir roles:</strong> "¿Cómo dividirían las tareas según las fortalezas de cada uno?"',
    s11_collab_op4: '<strong>Dar/recibir feedback:</strong> "¿Qué mejorarías de la respuesta de otro equipo?"',
    s11_collab_example: '<strong>Ejemplo transversal:</strong> "Evalúen la respuesta del otro equipo y denles feedback constructivo."',

    // Generador de Prompts
    s11_prompt_title: 'El Generador de Prompts con IA',
    s11_prompt_desc: 'En el <strong>Paso 3 del Generador de Prompts</strong> encontrarás una sección para seleccionar capacidades y operaciones cognitivas específicas.',
    s11_prompt_step1: '<strong>Elegí la capacidad</strong> que querés desarrollar (ej: Pensamiento crítico)',
    s11_prompt_step2: '<strong>Seleccioná las operaciones</strong> específicas (ej: Evaluar evidencia, Detectar errores)',
    s11_prompt_step3: '<strong>El prompt generado</strong> incluirá instrucciones para que la IA cree consignas orientadas a esas operaciones',
    s11_prompt_note: 'Esto no garantiza automáticamente el desarrollo de la capacidad, pero <strong>orienta las consignas</strong> hacia el tipo de pensamiento que querés fomentar.',

    // Tabla comparativa
    s11_comparison_bad_header: 'Consigna sin orientación (❌)',
    s11_comparison_good_header: 'Consigna orientada a capacidad (✅)',
    s11_comparison_row1_bad: '"¿Qué causó la Revolución Francesa?"',
    s11_comparison_row1_good: '"Acá hay dos historiadores que explican las causas de la Revolución Francesa de forma diferente. ¿Cuál presenta mejor evidencia? Justificá."',
    s11_comparison_row2_bad: '"¿Cómo se calcula el área del triángulo?"',
    s11_comparison_row2_good: '"Un compañero dice que el área del triángulo es base × altura. Otro dice que es (base × altura) / 2. ¿Quién tiene razón y por qué?"',
    s11_comparison_row3_bad: '"¿Qué es la fotosíntesis?"',
    s11_comparison_row3_good: '"Explicale a un niño de 8 años qué es la fotosíntesis sin usar palabras técnicas."',

    s11_insight: '<strong>Recordá:</strong> El contenido es el VEHÍCULO, la capacidad es el DESTINO. Podés enseñar pensamiento crítico usando cualquier contenido curricular. Lo importante es cómo diseñás las consignas.',

    // ========== SECCIÓN 12 ==========
    s12_title: '12. Uso Intencional de la Tecnología: Un Dispositivo por Equipo',
    s12_lead: 'Traffic Light Game utiliza intencionalmente UN SOLO dispositivo por equipo. Esto NO es una limitación técnica ni presupuestaria, sino una <strong>decisión pedagógica fundamentada</strong> para maximizar la interacción social y el aprendizaje profundo.',

    s12_problem_title: 'El Problema del "Cada Uno con su Pantalla"',
    s12_paradox_title: 'La Paradoja de la Conectividad',
    s12_paradox_desc: 'En muchas aulas, cada estudiante tiene su propio dispositivo (computadora, tablet, celular). Paradójicamente, esto puede <strong>reducir la interacción</strong> en lugar de aumentarla.',

    s12_paradox_header_bad: 'Cada uno con su dispositivo (❌)',
    s12_paradox_header_good: 'Un dispositivo por equipo (✅)',
    s12_paradox_row1_bad: 'Cada estudiante mira su propia pantalla',
    s12_paradox_row1_good: 'Todos miran la misma pantalla → discuten',
    s12_paradox_row2_bad: 'Interacción reducida al mínimo',
    s12_paradox_row2_good: 'Interacción OBLIGATORIA para avanzar',
    s12_paradox_row3_bad: 'Trabajo individual disfrazado de grupal',
    s12_paradox_row3_good: 'Trabajo genuinamente colaborativo',
    s12_paradox_row4_bad: 'El más rápido termina primero (y se aburre)',
    s12_paradox_row4_good: 'El equipo termina junto (el rápido ayuda)',
    s12_paradox_row5_bad: 'Copia individual del contenido',
    s12_paradox_row5_good: 'Construcción colectiva del conocimiento',
    s12_paradox_row6_bad: 'Silencio incómodo ("cada uno en lo suyo")',
    s12_paradox_row6_good: 'Debate activo ("¿ponemos A o B?")',

    s12_regulation_title: 'El Dispositivo como Regulador de Interacciones',
    s12_regulation1_title: 'Punto Focal Compartido',
    s12_regulation1_desc: 'La pantalla única se convierte en un <strong>punto focal</strong> alrededor del cual el equipo se organiza físicamente. Todos miran lo mismo, todos ven lo mismo, todos discuten lo mismo.',
    s12_regulation2_title: 'Negociación Obligatoria',
    s12_regulation2_desc: 'Cuando hay un solo dispositivo, el equipo DEBE ponerse de acuerdo antes de responder. No hay forma de que uno responda sin consultar a los demás. La <strong>negociación de significado</strong> está integrada en el diseño.',
    s12_regulation3_title: 'Rotación Natural de Roles',
    s12_regulation3_desc: '¿Quién escribe? ¿Quién dicta? ¿Quién busca información? El dispositivo único <strong>fuerza la distribución de tareas</strong> y la rotación de roles dentro del equipo.',
    s12_regulation4_title: 'Visibilidad del Proceso',
    s12_regulation4_desc: 'El docente puede ver qué hace cada equipo con UN solo vistazo. Si cada estudiante tuviera su pantalla, sería imposible monitorear 30 pantallas simultáneamente.',

    s12_theory_title: 'Fundamento Teórico: SOLE + Cognición Distribuida',
    s12_theory_sole: '<strong>SOLE (Sugata Mitra):</strong> En sus experimentos, Mitra descubrió que los niños aprendían MÁS cuando compartían una computadora que cuando cada uno tenía la suya. La necesidad de colaborar generaba discusiones que profundizaban la comprensión.',
    s12_theory_hutchins: '<strong>Cognición Distribuida (Hutchins):</strong> El conocimiento no reside solo en la mente individual, sino que se distribuye entre las personas y las herramientas. Un equipo alrededor de una pantalla es un <strong>sistema cognitivo</strong> más potente que la suma de individuos aislados.',

    s12_more_devices_title: '¿Y si Tenemos Más Dispositivos que Equipos?',
    s12_complementary_title: 'Usos Complementarios (No Centrales)',
    s12_complementary_desc: 'Si tenés más dispositivos disponibles, podés usarlos como <strong>herramientas de apoyo</strong>, no como pantallas principales:',
    s12_complementary1: '<strong>Dispositivo de consulta:</strong> Para buscar información adicional mientras otro escribe la respuesta',
    s12_complementary2: '<strong>Dispositivo de registro:</strong> Para tomar notas de las discusiones del equipo',
    s12_complementary3: '<strong>Dispositivo personal (Stage 0):</strong> Para que cada uno proponga preguntas ANTES de discutirlas en equipo',
    s12_complementary_note: 'Pero el dispositivo CENTRAL del juego (donde se responden las consignas, se califican las respuestas, se ve el puntaje) siempre es UNO SOLO por equipo.',

    s12_objections_title: 'Objeciones Frecuentes',
    s12_objection1_q: '¿Y si un estudiante acapara el dispositivo?',
    s12_objection1_a: 'Esto es una <strong>oportunidad pedagógica</strong>, no un problema. Establecé reglas claras de rotación ("cada 5 minutos cambia quién escribe") o intervení cuando veas desequilibrio. También es un indicador de dinámicas de equipo que podés evaluar.',
    s12_objection2_q: '¿Y los estudiantes introvertidos que no hablan?',
    s12_objection2_a: 'Justamente, el dispositivo único los OBLIGA a participar de alguna forma. Asigná roles rotativos ("ahora vos leés la pregunta", "ahora vos escribís la respuesta"). Con pantallas individuales, el introvertido desaparece en su propia pantalla.',
    s12_objection3_q: '¿No es más eficiente que cada uno trabaje en paralelo?',
    s12_objection3_a: 'Eficiencia ≠ Aprendizaje. Sí, en paralelo terminan más rápido. Pero el objetivo no es terminar rápido, es <strong>comprender profundamente</strong>. La discusión que genera el dispositivo único es exactamente lo que produce aprendizaje duradero.',
    s12_objection4_q: '¿Y si el equipo es muy grande (7-8 estudiantes)?',
    s12_objection4_a: 'Si el equipo es demasiado grande, dividilo. El tamaño ideal es 4-5 estudiantes por dispositivo. Con más de 6, algunos inevitablemente quedan afuera de la discusión.',

    s12_insight_final: 'El uso "bajo" de tecnología no significa uso POBRE de tecnología. Significa uso INTELIGENTE. La tecnología más sofisticada no es la que tiene más pantallas, sino la que genera <strong>mejores interacciones humanas</strong>. Un dispositivo por equipo es una restricción deliberada que multiplica el aprendizaje.',

    s12_remember_title: 'Para Recordar',
    s12_remember1: '✅ UN dispositivo por equipo = MÁS debate, MÁS colaboración, MÁS aprendizaje',
    s12_remember2: '✅ La "limitación" es en realidad una <strong>affordance pedagógica</strong>',
    s12_remember3: '✅ Dispositivos adicionales son COMPLEMENTARIOS, no centrales',
    s12_remember4: '✅ Si surgen conflictos por el dispositivo, son <strong>oportunidades de aprendizaje</strong>',
    s12_remember5: '✅ El docente puede monitorear mejor con menos pantallas que seguir',

    // ========== SECCIÓN 13 ==========
    s13_title: '13. Preparación para la Autoevaluación',
    s13_warning: '⚠️ Si vas a activar la autoevaluación, es fundamental preparar a los alumnos ANTES de comenzar el juego.',
    s13_before_title: 'Qué hacer ANTES del juego',
    s13_before_list1: 'Explicar a los alumnos que al final deberán reflexionar sobre el proceso',
    s13_before_list2: 'Pedirles que lleven una "bitácora mental" o anotaciones breves:',
    s13_before_sub1: '¿Quién me ayudó a entender algo?',
    s13_before_sub2: '¿A quién ayudé yo?',
    s13_before_sub3: '¿Qué concepto me costó más?',
    s13_before_sub4: '¿Cómo me sentí trabajando en equipo?',
    s13_during_title: 'Qué hacer DURANTE el juego',
    s13_during_list1: 'Podés tener una pizarra visible con las preguntas de reflexión',
    s13_during_list2: 'Recordar brevemente entre stages que observen las interacciones',
    s13_when_use_title: 'Cuándo SÍ usar autoevaluación',
    s13_use_1: '✅ Temas que requieren comprensión profunda',
    s13_use_2: '✅ Cuando hay tiempo suficiente (agregar 10-15 min al final)',
    s13_use_3: '✅ Grupos que ya conocen la dinámica del juego',
    s13_use_4: '✅ Cuando querés identificar "expertos" para el cierre pedagógico',
    s13_when_not_use_title: 'Cuándo NO usar autoevaluación',
    s13_not_use_1: '❌ Primera vez que el grupo juega',
    s13_not_use_2: '❌ Temas introductorios o de repaso rápido',
    s13_not_use_3: '❌ Cuando hay poco tiempo disponible',
    s13_not_use_4: '❌ Grupos muy grandes donde el cierre sería difícil de gestionar',
    s13_tip: '💡 La autoevaluación identifica a los alumnos más mencionados como "ayudantes". Estos alumnos pueden explicar conceptos clave al resto del grupo en el cierre pedagógico, reforzando su propio aprendizaje y el de sus compañeros.',
  },
  en: {
    headerTitle: '🎓 Teacher\'s Pedagogical Guide',
    headerSubtitle: 'Traffic Light Game · Coopetition Game · SOLE · Qualitative Assessment',
    tabGuides: '📘 Guides and Foundations',
    tabEvaluation: '📊 Assessment and Rubrics',
    footerText1: 'This guide is based on learning science research (Vygotsky, Perkins, Mitra, Hutchins, Wilber).',
    footerText2: 'For exclusive use of teachers implementing Traffic Light Game.',

    s1_title: '1. Intentional Design: Why There Is NO Automatic Feedback',
    s1_warning_strong: 'Pedagogical Decision, Not Technical Limitation:',
    s1_warning_text: 'Traffic Light Game does NOT provide automatic "correct" answers. This is an intentional decision to promote debate, argumentation, and collective knowledge construction.',
    s1_heading_fundamento: 'Pedagogical Foundation',
    s1_socratic_title: 'Socratic Method (Dialectical Dialogue)',
    s1_socratic_desc1: 'By not giving immediate answers, we generate cognitive tension that forces students to justify their reasoning. Uncertainty is not a problem – it is the engine of deep learning.',
    s1_socratic_desc2: 'The Socratic method is based on asking questions that provoke reflection, not on giving answers. When the system does NOT automatically say "correct/incorrect," students MUST argue why their answer is valid.',
    s1_constructivism_title: 'Social Constructivism (Vygotsky)',
    s1_constructivism_desc1: 'Learning occurs in social interaction. The teacher as mediator facilitates the construction of meaning. Automatic answers eliminate this critical social dimension.',
    s1_constructivism_desc2: 'Vygotsky showed that deeper learning happens in the Zone of Proximal Development (ZPD) – that space between what the learner can do alone and what they can do with help. Peer debate and teacher mediation are essential to navigate this zone.',
    s1_comparison_bad_header: 'WITH Automatic Feedback (❌)',
    s1_comparison_good_header: 'WITHOUT Automatic Feedback (✅)',
    s1_comparison_row1_bad: 'Students seek "the right answer" without thinking',
    s1_comparison_row1_good: 'Students must argue and justify',
    s1_comparison_row2_bad: 'No real debate – only verification',
    s1_comparison_row2_good: 'Genuine peer debate',
    s1_comparison_row3_bad: 'Superficial and memoristic learning',
    s1_comparison_row3_good: 'Deep conceptual understanding',
    s1_comparison_row4_bad: 'Teacher as passive observer',
    s1_comparison_row4_good: 'Teacher as essential facilitator',
    s1_comparison_row5_bad: 'Technology replaces teaching',
    s1_comparison_row5_good: 'Technology supports teaching (does not replace it)',
    s1_comparison_row6_bad: 'Focus on outcome, not process',
    s1_comparison_row6_good: 'Focus on reasoning and process',
    s1_tip_title: 'Your Role as a Teacher',
    s1_tip_intro: 'You are the one who closes the learning cycle. The system generates debate, but YOU:',
    s1_role1: 'Facilitate discussion',
    s1_role1_desc: 'Ask questions that deepen debate',
    s1_role2: 'Clarify conceptual misunderstandings',
    s1_role2_desc: 'Detect comprehension errors and correct them',
    s1_role3: 'Synthesize group ideas',
    s1_role3_desc: 'Connect different perspectives',
    s1_role4: 'Connect with curricular objectives',
    s1_role4_desc: 'Link debate to what they need to learn',
    s1_role5: 'Validate or correct reasoning',
    s1_role5_desc: 'Give the final word when necessary',
    s1_tip_final: 'This role CANNOT be automated. It is your pedagogical expertise in action.',

    s2_title: '2. 3-Layer Model: Pedagogical Architecture',
    s2_lead: 'Traffic Light Game structures learning in three layers of increasing social complexity. Each layer has a specific pedagogical purpose.',

    s2_layer1_badge: 'LAYER 1',
    s2_layer1_title: 'Intra-Team Collaboration',
    s2_layer1_stage: 'Stage 0 - Stage 1',
    s2_what_happens: 'What happens?',
    s2_layer1_list1: 'Students build knowledge AS A TEAM',
    s2_layer1_list2: 'Propose and evaluate questions together (Stage 0)',
    s2_layer1_list3: 'Practice without external competition (Stage 1)',
    s2_layer1_list4: 'System identifies who needs support',
    s2_layer1_list5: 'Collectively improve before competing',
    s2_layer1_theory_note: 'Applied theory: Group ZPD + SOLE (Sugata Mitra). One computer + group → self-organization of learning.',
    s2_layer1_teacher_role: 'Your role: Circulate among teams, observe dynamics, DO NOT intervene yet.',

    s2_layer2_badge: 'LAYER 2',
    s2_layer2_title: 'Inter-Team Competition',
    s2_layer2_stage: 'Stage 2',
    s2_layer2_list1: 'Teams compete against each other',
    s2_layer2_list2: 'Confrontation of different ideas',
    s2_layer2_list3: 'Rigorous academic debate',
    s2_layer2_list4: 'Motivation through healthy competition',
    s2_layer2_list5: 'Exposure to diverse perspectives',
    s2_layer2_theory_note: 'Applied theory: Coopetition - Only teams that collaborate well internally can compete effectively externally.',
    s2_layer2_teacher_role: 'Your role: Active facilitator of debate. Pause, ask for arguments, facilitate exchange, synthesize.',

    s2_layer3_badge: 'LAYER 3',
    s2_layer3_title: 'Teacher Mediation',
    s2_layer3_stage: 'Throughout the process',
    s2_what_you_do: 'What do you do?',
    s2_layer3_list1: 'Facilitate debates when there is an impasse',
    s2_layer3_list2: 'Clarify conceptual misunderstandings',
    s2_layer3_list3: 'Connect with curricular objectives',
    s2_layer3_list4: 'Synthesize patterns you observe',
    s2_layer3_list5: 'Conceptually close at the end',
    s2_layer3_theory_note: 'Applied theory: Cultural mediation (Vygotsky) - You are the bridge between everyday knowledge and scientific knowledge.',
    s2_layer3_teacher_role: 'Your role: Knowing when to intervene and when NOT to.',


    // ========== SECTION 3 ==========
    s3_title: '3. Green/Yellow/Red System: Beyond Right/Wrong',
    s3_lead: 'The traffic light grading system does NOT only evaluate if the answer is right or wrong. All three colors 🟢🟡🔴 work <strong>exactly the same in Stage 1 and Stage 2</strong> — what differs between stages is the design of the prompts, not the colors. What matters is the justification.',

    s3_green_light: 'GREEN LIGHT',
    s3_green_points: '5 points',
    s3_green_meaning_label: 'Meaning:',
    s3_green_meaning_value: '"The answer is correct, but it is OBVIOUS or adds nothing new"',
    s3_green_why_label: 'Why few points:',
    s3_green_why_value: 'We want to <strong>discourage superficial answers</strong>. If the answer is correct but does not add value to the debate, it receives the minimum score.',
    s3_green_example_label: 'Example:',
    s3_green_example: 'Question: "What is the capital of France?"\nAnswer: "Paris"\nGrade: 🟢 Green',
    s3_green_perkins_label: 'Signal:',
    s3_green_perkins_value: 'Lack of motivation to seek connections. Any answer can be enriched with Yellow.',

    s3_yellow_light: 'YELLOW LIGHT',
    s3_yellow_points: '10 points',
    s3_yellow_meaning_label: 'Meaning:',
    s3_yellow_meaning_value: '"The answer ADDS RELATIONSHIPS, connections, or non-obvious perspectives"',
    s3_yellow_why_label: 'Why more points:',
    s3_yellow_why_value: 'This is the level we <strong>most want to encourage</strong>. It indicates deep thinking, ability to relate concepts, genuine understanding.',
    s3_yellow_example_label: 'Example:',
    s3_yellow_example: 'Question: "Why do ships float?"\nAnswer: "Because of Archimedes\' principle. The ship displaces water whose weight is greater than the ship\'s. That\'s why a steel ship can float while a steel coin sinks: it depends on the VOLUME of water displaced, not just the material."\nGrade: 🟡 Yellow',
    s3_yellow_perkins_label: 'Signal:',
    s3_yellow_perkins_value: 'The heart of the method: seeks connections, relationships, and new perspectives between concepts.',

    s3_red_light: 'RED LIGHT',
    s3_red_points: '12 points (for the detector)',
    s3_red_meaning_label: 'Meaning:',
    s3_red_meaning_value: '"The answer has an ERROR that others DID NOT detect"',
    s3_red_why_label: 'Why maximum points:',
    s3_red_why_value: 'Detecting errors requires <strong>high-level critical thinking</strong>. It is harder than giving correct answers. Also, it helps everyone learn from the mistake.',
    s3_red_example_label: 'Example:',
    s3_red_example: 'Question: "What causes the seasons?"\nTeam A answer: "The varying distance of the Earth to the Sun."\nTeam B detects error: 🔴 "Incorrect. Seasons are NOT due to distance, but because of the tilt of the Earth\'s axis."\nResult: Team B gets 12 points.',
    s3_red_perkins_label: 'Signal:',
    s3_red_perkins_value: 'Requires critical attention. If the Red was incorrect (no error existed), the one who flagged it gets 0 pts.',

    s3_benefit1_title: 'Rewards Depth',
    s3_benefit1_desc: 'A student who consistently gives yellow answers demonstrates DEEPER understanding than one who only gets greens.',
    s3_benefit2_title: 'Encourages Critical Thinking',
    s3_benefit2_desc: 'Red points motivate QUESTIONING, not just accepting. Develops genuine critical thinking.',
    s3_benefit3_title: 'Makes Understanding Visible',
    s3_benefit3_desc: 'For you as a teacher, seeing a student\'s grade pattern reveals their level of understanding.',
    s3_benefit4_title: 'Punishes Complacency',
    s3_benefit4_desc: 'If you miss an obvious error, you learn that you need to be more attentive and critical.',

    s3_tip_title: 'Tip for the Teacher',
    s3_tip_text1: 'During Stage 2, do NOT just look at the points. <strong>Listen to the JUSTIFICATIONS.</strong>',
    s3_tip_bad: 'Superficial:',
    s3_tip_bad_example: '"It\'s yellow because... it\'s kind of correct" → Weak, no foundation',
    s3_tip_good: 'Deep:',
    s3_tip_good_example: '"It\'s yellow because the answer mentions X, but doesn\'t connect with Y we saw in the previous class." → Strong, founded, relates',
    s3_tip_highlight: 'You evaluate QUALITY, not just the number of points.',

    // ========== SECTION 4 ==========
    s4_title: '4. Stage 1 vs Stage 2: Foundation and Depth (Perkins)',
    s4_lead: 'David Perkins (Theory of Understanding) distinguishes between <strong>superficial/ritual knowledge</strong> and <strong>genuine understanding</strong>. Traffic Light Game structures this in two sequential stages.',

    s4_stage1_badge: 'STAGE 1',
    s4_stage1_title: 'Strengthen Teams (Practice)',
    s4_stage1_objective_label: 'Objective:',
    s4_stage1_objective: 'Building BASE knowledge and detecting who needs support.',
    s4_stage1_list1: '❌ NO competition between teams',
    s4_stage1_list2: '📊 Points are FEEDBACK, not grades',
    s4_stage1_list3: '📝 More basic/fundamental questions',
    s4_stage1_list4: '🟢🟡🔴 All three colors are available for every prompt',
    s4_stage1_list5: '🎯 Focus: Preparation and internal collaboration',
    s4_stage1_example_label: 'Question types:',
    s4_stage1_example1: 'Definition: "What is photosynthesis?"',
    s4_stage1_example2: 'Procedure: "How do you calculate the area of a triangle?"',
    s4_stage1_example3: 'Simple comparison: "How are animal and plant cells different?"',
    s4_stage1_teacher_role_label: 'Your role:',
    s4_stage1_teacher_role: 'Observe dynamics, detect who needs support, DO NOT intervene yet.',
    s4_stage1_perkins_label: 'Perkins Level:',
    s4_stage1_perkins: 'Ritual Knowledge → Transition',

    s4_stage2_badge: 'STAGE 2',
    s4_stage2_title: 'Competition between Teams (Demonstration)',
    s4_stage2_objective_label: 'Objective:',
    s4_stage2_objective: 'DEEP understanding and application in complex contexts.',
    s4_stage2_list1: '⚔️ YES competition between teams',
    s4_stage2_list2: '🏆 Points count for podium (motivation)',
    s4_stage2_list3: '🧠 More complex/relational questions',
    s4_stage2_list4: '💬 Most require DOING and EXPLAINING',
    s4_stage2_list5: '🎯 Focus: Demonstration of genuine understanding',
    s4_stage2_example_label: 'Question types:',
    s4_stage2_example1: 'Complex explanation: "Explain how photosynthesis and cellular respiration are connected"',
    s4_stage2_example2: 'Application: "How would you use Pythagoras to calculate the height of a building?"',
    s4_stage2_example3: 'Multiple relationships: "What do several revolutions have in common?"',
    s4_stage2_example4: 'Do + Explain: "Design an experiment and explain your reasoning"',
    s4_stage2_teacher_role_label: 'Your role:',
    s4_stage2_teacher_role: 'ACTIVE facilitator of debate. Pause, facilitate argumentation, listen to quality of justifications.',
    s4_stage2_perkins_label: 'Perkins Level:',
    s4_stage2_perkins: 'Genuine Understanding (explain, apply, justify, relate)',

    s4_why_order_title: 'Why Order Matters',
    s4_reason1_title: 'Necessary Conceptual Foundation',
    s4_reason1_desc: 'To RELATE concepts (Stage 2), you first need to HAVE the concepts clear (Stage 1). You cannot connect what does not exist.',
    s4_reason2_title: 'Team Confidence',
    s4_reason2_desc: 'Stage 1 without competition allows the team to strengthen WITHOUT external pressure. Builds internal confidence necessary for Stage 2.',
    s4_reason3_title: 'Identifying Gaps',
    s4_reason3_desc: 'Stage 1 reveals who needs support. The team can prepare BEFORE competing.',
    s4_reason4_title: 'Natural Cognitive Progression',
    s4_reason4_desc: 'Perkins shows that genuine understanding is built UPON ritual knowledge, not without it.',

    s4_guide_title: 'Guide for Curating Questions',
    s4_table_criterion: 'Criterion',
    s4_table_stage1: 'Stage 1',
    s4_table_stage2: 'Stage 2',
    s4_table_complexity: 'Complexity',
    s4_table_complexity_stage1: 'Low-Medium',
    s4_table_complexity_stage2: 'Medium-High',
    s4_table_concepts: 'Concepts involved',
    s4_table_concepts_stage1: '1-2 concepts',
    s4_table_concepts_stage2: '2+ related concepts',
    s4_table_response_type: 'Response type',
    s4_table_response_stage1: 'Define, identify, compare',
    s4_table_response_stage2: 'Explain, apply, justify',
    s4_table_debate: 'Admits debate',
    s4_table_debate_stage1: 'Yes — teams classify with Green, Yellow, or Red',
    s4_table_debate_stage2: 'A lot (mostly yellows)',

    // ========== SECTION 5 ==========
    s5_title: '5. Pedagogical Use of AI: Research, Not Oracle',
    s5_lead: 'Traffic Light Game integrates AI (Claude, ChatGPT, etc.) in a <strong>FORMATIVE</strong> way, not as a source of answers. Students use AI to RESEARCH and DEEPEN, not to copy.',

    s5_philosophy_title: 'Philosophy: AI as Cognitive Extension',
    s5_philosophy_desc: 'Based on the theory of <strong>Distributed Cognition</strong> (Edwin Hutchins), technological tools can be extensions of our thinking. AI does not replace thinking – it amplifies it.',
    s5_analogy1: 'Analogy: A calculator does not replace understanding math. It lets you do complex calculations FASTER to focus on solving the problem.',
    s5_analogy2: 'Similarly, AI does not replace thinking. It lets you access information FASTER to focus on UNDERSTANDING and RELATING.',

    s5_comparison_title: 'Correct vs. Incorrect Use',
    s5_correct_title: 'CORRECT USE (RESEARCH)',
    s5_correct_scenario: 'Scenario: In Stage 0, the team must propose questions about the "French Revolution" but they don\'t fully understand the context.',
    s5_correct_prompt: 'AI Prompt: "Explain the social and economic context of France before 1789. What were the main problems the population faced?"',
    s5_correct_why: 'Why it is correct:',
    s5_correct_reason1: '✅ They used AI to UNDERSTAND context',
    s5_correct_reason2: '✅ They processed the information as a team',
    s5_correct_reason3: '✅ They BUILT their own questions',
    s5_correct_reason4: '✅ They developed deep understanding',

    s5_incorrect_title: 'INCORRECT USE (COPYING)',
    s5_incorrect_scenario: 'Scenario: In Stage 0, the team must propose questions about the "French Revolution".',
    s5_incorrect_prompt: 'AI Prompt: "Give me 10 questions about the French Revolution for an educational game"',
    s5_incorrect_why: 'Why it is incorrect:',
    s5_incorrect_reason1: '❌ No real understanding',
    s5_incorrect_reason2: '❌ Automation, not learning',
    s5_incorrect_reason3: '❌ AI replaces thinking',
    s5_incorrect_reason4: '❌ No knowledge construction',

    s5_tip_title: 'How to Model Correct Use',
    s5_tip_desc: 'As a teacher, you must TEACH how to use AI correctly. Do not assume students know how.',
    s5_tip1: 'Demonstrate: Project your screen and model a research prompt',
    s5_tip2: 'Compare: Show side by side a good prompt and a bad prompt',
    s5_tip3: 'Practice: Have them write prompts on paper before using AI',
    s5_tip4: 'Reflect: Ask "What did you learn from the AI that you didn\'t know before?"',

    s5_warning_title: 'Warning Signs (Misuse)',
    s5_warning1: 'Answers with vocabulary that does not match the student\'s level',
    s5_warning2: 'Identical questions between teams (they copied the same prompt)',
    s5_warning3: 'Students who cannot explain in their own words what they "wrote"',
    s5_warning4: 'Questions that do not respond to the pedagogical objective of the class',

    // ========== SECTION 6 ==========
    s6_title: '6. SOLE Theory: Self-Organization and One Computer per Team',
    s6_hero_title: 'SOLE: Self-Organized Learning Environment',
    s6_quote: '"Learning is a self-organized phenomenon. If you put a computer in a community of children who don\'t know English and don\'t know computing, they will learn both by themselves." - Sugata Mitra',

    s6_experiment_title: '"Hole in the Wall" Experiment (1999)',
    s6_experiment_desc: 'Sugata Mitra installed a computer embedded in a wall of a poor neighborhood in New Delhi, accessible to children. Without supervision or instruction, within hours the children learned to navigate, record, play, and eventually teach others.',
    s6_experiment_key: 'Key finding: Children can learn complex technologies by themselves if they have access, curiosity, and collaboration.',

    s6_principles_title: 'SOLE Principles Applied to the Game',
    s6_principle1_title: 'Big Question',
    s6_principle1_desc: 'The game starts with a provocative curricular question that has no single immediate answer.',
    s6_principle2_title: 'Self-organization',
    s6_principle2_desc: 'Teams decide roles, strategies, and methods. There is no step-by-step instruction.',
    s6_principle3_title: 'Minimal Resources',
    s6_principle3_desc: 'ONE computer per team (intentional). This forces collaboration and discussion.',
    s6_principle4_title: 'Freedom and Scaffolding',
    s6_principle4_desc: 'Students can consult the internet, AI, notes. You do not give answers – you facilitate the process.',

    s6_insight_title: 'Pedagogical Insight',
    s6_insight_desc: '<strong>One computer per team is NOT a budget limitation.</strong> It is an <strong>intentional pedagogical decision</strong> to generate social interaction and negotiation of meaning. If each student had their own device, debate would be silenced and we would return to individualism.',

    // ========== SECTION 7 ==========
    s7_title: '7. Coopetition: Collaboration + Competition',
    s7_lead: '<strong>Coopetition</strong> = Internal collaboration + External competition. The pedagogical sweet spot where the whole is greater than the sum of the parts.',

    s7_sweet_spot_collab: '🤝 Collaboration',
    s7_sweet_spot_compete: '⚔️ Competition',
    s7_sweet_spot_result: '🎯 Coopetition',

    s7_why_delicate_title: 'Why the Balance is Delicate',
    s7_why_delicate_desc: 'Pure competition generates toxicity and information hiding. Pure collaboration can generate complacency and lack of motivation. Coopetition requires teams to collaborate <strong>internally</strong> in order to compete <strong>externally</strong>. There is no effective competition without internal collaboration first.',

    s7_corruption_title: 'Signs of Corruption (BAD)',
    s7_corruption1: '<strong>Sabotage between teams:</strong> "If we don\'t know the answer, let\'s say anything to confuse the other team"',
    s7_corruption2: '<strong>Deliberate hiding:</strong> "Don\'t tell them how we solved it"',
    s7_corruption3: '<strong>Personal contempt:</strong> Mockery, humiliation, derogatory language',
    s7_corruption4: '<strong>Toxic individualism:</strong> One student hogs the device and does not let others participate',
    s7_corruption_highlight: 'If you see this, PAUSE THE GAME. Time doesn\'t matter. Restoring a respectful climate is more important than "finishing the activity".',

    s7_prevent_title: 'How to Prevent Toxicity',
    s7_prevent1: '<strong>Initial framing:</strong> "We are going to compete, but in the end we will all share what we learned. The one who teaches wins more."',
    s7_prevent2: '<strong>Positive reinforcement:</strong> Publicly reward gestures of collaboration between teams',
    s7_prevent3: '<strong>SYMBOLIC competition:</strong> Points are NOT the grade. They are game currency, not a mark.',
    s7_prevent4: '<strong>Explicit norms:</strong> Before starting, the group defines what "fair competition" means',
    s7_prevent5: '<strong>Immediate interruption:</strong> At the first derogatory comment, stop and reflect with the group',

    // ========== SECTION 8 ==========
    s8_title: '8. Qualitative Assessment Guide: 4 Components',
    s8_lead: 'The system provides quantitative data (points, streaks, participants). YOU interpret and transform that data into meaningful qualitative assessment.',

    s8_components_title: 'The 4 Assessment Components',

    s8_comp1_percent: '40%',
    s8_comp1_title: 'Individual Performance',
    s8_comp1_desc: 'Quality of answers + LIVE Justifications',
    s8_comp1_rubric_basic: 'Basic (1-3): Correct but superficial answers (greens). Minimal justification.',
    s8_comp1_rubric_competent: 'Competent (4-7): Answers that relate concepts (yellows). Justifies with foundations.',
    s8_comp1_rubric_advanced: 'Advanced (8-10): Detects errors (reds). Justifies with precision and multiple connections.',

    s8_comp2_percent: '30%',
    s8_comp2_title: 'Collaboration',
    s8_comp2_desc: 'Peer mentions + Direct observation',
    s8_comp2_rubric_basic: 'Basic (1-3): Works individually, ignores the team.',
    s8_comp2_rubric_competent: 'Competent (4-7): Listens, contributes, respects turns.',
    s8_comp2_rubric_advanced: 'Advanced (8-10): Builds consensus, synthesizes ideas, invites participation.',

    s8_comp3_percent: '20%',
    s8_comp3_title: 'Metacognition',
    s8_comp3_desc: 'Depth of reflection in closure',
    s8_comp3_rubric_basic: 'Basic (1-3): "I learned about the topic" (vague).',
    s8_comp3_rubric_competent: 'Competent (4-7): "I learned that X relates to Y because..."',
    s8_comp3_rubric_advanced: 'Advanced (8-10): "At first I thought X, but now I understand Y. I was wrong about..."',

    s8_comp4_percent: '10%',
    s8_comp4_title: 'Growth',
    s8_comp4_desc: 'Improvement from initial baseline',
    s8_comp4_rubric_basic: 'Basic (1-3): No improvement or worsens.',
    s8_comp4_rubric_competent: 'Competent (4-7): Moderate improvement in participation or quality.',
    s8_comp4_rubric_advanced: 'Advanced (8-10): Significant improvement (student who didn\'t participate now argues).',

    s8_tip_title: 'Practical Workflow',
    s8_tip_step1: '<strong>During the game:</strong> Take quick notes. Use rubric as a mental checklist.',
    s8_tip_step2: '<strong>Immediately after:</strong> Assign base scores per component (1-10).',
    s8_tip_step3: '<strong>End of week:</strong> Review evidence (points, written justifications, observations).',
    s8_tip_step4: '<strong>Final grade:</strong> Weighted average according to percentages.',
    s8_tip_key: '<strong>Key fact:</strong> You don\'t need to grade EVERY intervention. A 45-60 minute session gives you enough evidence to assess all 4 components.',

    // ========== SECTION 9 ==========
    s9_title: '9. Optional Pedagogical Devices',
    s9_lead: 'The game can be used alone (minimum viable) or enriched with these modules according to objectives, time, and level.',

    s9_module1_icon: '📝',
    s9_module1_title: 'Module 1: Individual Self-Assessment',
    s9_module1_moment: 'Immediately after the game',
    s9_module1_desc: 'Each student answers:',
    s9_module1_item1: '"How well do you think you understood the topic?" (1-5)',
    s9_module1_item2: '"What was the most difficult?"',
    s9_module1_item3: '"What would you do differently if you played again?"',
    s9_module1_value: 'Metacognition data for 20% assessment',

    s9_module2_icon: '✅',
    s9_module2_title: 'Module 2: Teacher Validation',
    s9_module2_moment: 'After Stage 0 (before playing)',
    s9_module2_desc: 'The teacher reviews the questions proposed by teams, gives feedback, and approves/rejects.',
    s9_module2_value: 'Ensures question quality + prevents AI misuse',

    s9_module3_icon: '💬',
    s9_module3_title: 'Module 3: Group Reflection',
    s9_module3_moment: 'Pedagogical closing (last 5-10 min)',
    s9_module3_desc: 'Guided discussion:',
    s9_module3_item1: '"What strategy did the winning team use?"',
    s9_module3_item2: '"Which error taught us the most?"',
    s9_module3_item3: '"How does this connect with the class?"',
    s9_module3_value: 'Collective synthesis + conceptual closure',

    s9_module4_icon: '🎬',
    s9_module4_title: 'Module 4: Initial Reflection',
    s9_module4_moment: 'Before the game (activation)',
    s9_module4_desc: 'Trigger question: "What do you already know about this topic?" as a team.',
    s9_module4_value: 'Activates prior knowledge + baseline for growth assessment',

    s9_recommendations_title: 'Recommendations by Level',
    s9_table_level: 'Level',
    s9_table_modules: 'Recommended modules',
    s9_table_reason: 'Reason',
    s9_row_primary_level: 'Elementary',
    s9_row_primary_modules: '3 (Group Reflection) + 4 (Initial Reflection)',
    s9_row_primary_reason: 'Less writing, more orality',
    s9_row_secondary_level: 'Secondary',
    s9_row_secondary_modules: '1 (Self-Assessment) + 3 (Group Reflection)',
    s9_row_secondary_reason: 'Metacognitive development',
    s9_row_university_level: 'University',
    s9_row_university_modules: '1 + 2 (Validation) + 3',
    s9_row_university_reason: 'Higher demand and autonomy',

    // ========== SECTION 10 ==========
    s10_title: '10. Reference: "The Age of Integration"',
    s10_book_title: 'The Age of Integration: Universal Coopetition',
    s10_book_subtitle: 'The complete theoretical framework of which Traffic Light Game is a practical implementation.',

    s10_central_theory_title: 'Central Theory: Universal Coopetition',
    s10_central_theory_desc: 'Just as biology evolves through symbiosis and competition, human learning requires <strong>collaboration to build knowledge</strong> and <strong>competition to validate and refine it</strong>. Traffic Light Game is a <strong>scaled model</strong> of this universal principle.',

    s10_bell_curve_title: 'The Bell Curve: Lower Tail + Upper Tail',
    s10_bell_curve_inferior: '<strong>Lower tail (struggling students):</strong> The system detects them, the team helps them, the game gives them safe practice (Stage 1).',
    s10_bell_curve_superior: '<strong>Upper tail (advanced students):</strong> The system challenges them with complex questions, they can answer yellows and detect errors (Stage 2).',
    s10_bell_curve_center: '<strong>Center (majority):</strong> They learn from both extremes – from those who explain and from errors detected.',

    s10_wilber_title: 'Connection with Ken Wilber (Integral Theory)',
    s10_wilber_desc: 'The game operates in all 4 quadrants:',
    s10_wilber_yo: '<strong>I (Individual-interior):</strong> Metacognition, personal reflection',
    s10_wilber_tu: '<strong>YOU (Individual-exterior):</strong> Performance, correct answers',
    s10_wilber_nosotros: '<strong>WE (Collective-interior):</strong> Collaboration, team culture',
    s10_wilber_ellos: '<strong>THEY (Collective-exterior):</strong> Competition, game rules',
    s10_wilber_conclusion: 'No deep learning occurs if any of these quadrants is missing.',

    s10_closing_title: 'The Role of the Game in the Broader Method',
    s10_closing_desc: 'Traffic Light Game <strong>is not an end in itself</strong>. It is a <strong>pedagogical device</strong> to activate deep learning principles:',
    s10_closing_list1: '✅ Self-organization (SOLE)',
    s10_closing_list2: '✅ Coopetition',
    s10_closing_list3: '✅ Understanding vs. memorization',
    s10_closing_list4: '✅ Intentional teacher mediation',
    s10_closing_final: 'When you understand the <strong>principles</strong>, you can apply the game to any content, level, and context.',

    s10_final_message: '📖 For further reading: "The Age of Integration: Universal Coopetition" (2024) – Available in digital library.',
    s10_final_author: '— Pedagogical design by Traffic Light Game Team',

    // ========== SECTION 11 ==========
    s11_title: '11. Capacity Development: Beyond Content',
    s11_highlight: '<strong>Key Distinction:</strong> The game not only teaches CONTENT (facts, concepts), but can develop CAPACITIES (ways of thinking, transferable skills). This requires intentional design of the prompts.',

    s11_what_are_title: 'What are Capacities?',
    s11_content_vs_capacity_title: 'Content vs. Capacity',
    s11_content_example: '<strong>Content:</strong> "What is the capital of France?" → The student recalls a fact. If they forget the fact, nothing remains.',
    s11_capacity_example: '<strong>Capacity:</strong> "Compare two sources about the French Revolution and determine which is more reliable." → The student develops a SKILL (evaluating evidence) that they can use in any future context.',
    s11_capacity_transfer: 'Capacities are <strong>transferable</strong>: once you learn to evaluate evidence in History, you can do it in Science, in news, in life.',

    s11_capacities_title: 'The 4 Capacities of the Game',

    // Critical Thinking
    s11_critical_title: 'Critical Thinking',
    s11_critical_desc: 'Analyze, evaluate, and question information instead of passively accepting it.',
    s11_critical_operations: 'Cognitive operations:',
    s11_critical_op1: '<strong>Evaluate evidence:</strong> "Which of these sources is more reliable?"',
    s11_critical_op2: '<strong>Detect errors:</strong> "What is wrong with this reasoning?"',
    s11_critical_op3: '<strong>Compare arguments:</strong> "Which position has better foundations?"',
    s11_critical_op4: '<strong>Question assumptions:</strong> "What does this statement assume?"',
    s11_critical_example: '<strong>Example in Math:</strong> "Here are two ways to solve this problem. Which is more efficient and why?"',

    // Problem Solving
    s11_problem_title: 'Problem Solving',
    s11_problem_desc: 'Identify problems, generate solutions, and evaluate alternatives.',
    s11_problem_operations: 'Cognitive operations:',
    s11_problem_op1: '<strong>Identify the problem:</strong> "What is the central problem here?"',
    s11_problem_op2: '<strong>Propose solutions:</strong> "Suggest two different ways to solve this."',
    s11_problem_op3: '<strong>Evaluate alternatives:</strong> "What are the advantages and disadvantages of each option?"',
    s11_problem_op4: '<strong>Design a plan:</strong> "What steps would you follow to achieve X?"',
    s11_problem_example: '<strong>Example in Science:</strong> "Design an experiment to test this hypothesis."',

    // Communication
    s11_comm_title: 'Communication',
    s11_comm_desc: 'Express ideas clearly, argue positions, and adapt the message to the audience.',
    s11_comm_operations: 'Cognitive operations:',
    s11_comm_op1: '<strong>Explain to others:</strong> "Explain this as if to someone who knows nothing about it."',
    s11_comm_op2: '<strong>Argue a position:</strong> "Defend your answer with at least three arguments."',
    s11_comm_op3: '<strong>Synthesize information:</strong> "Summarize the main ideas in one sentence."',
    s11_comm_op4: '<strong>Adapt to audience:</strong> "How would you explain it to an 8-year-old?"',
    s11_comm_example: '<strong>Example in Language:</strong> "Convince your partner that the main character made the right decision."',

    // Collaboration
    s11_collab_title: 'Collaboration',
    s11_collab_desc: 'Work effectively with others, integrate perspectives, and reach consensus.',
    s11_collab_operations: 'Cognitive operations:',
    s11_collab_op1: '<strong>Integrate perspectives:</strong> "What do your team\'s ideas have in common?"',
    s11_collab_op2: '<strong>Negotiate consensus:</strong> "How would you reach a solution that considers both positions?"',
    s11_collab_op3: '<strong>Distribute roles:</strong> "How would you divide tasks according to each person\'s strengths?"',
    s11_collab_op4: '<strong>Give/receive feedback:</strong> "What would you improve about another team\'s answer?"',
    s11_collab_example: '<strong>Cross-cutting example:</strong> "Evaluate the other team\'s answer and give them constructive feedback."',

    // Prompt Generator
    s11_prompt_title: 'The AI Prompt Generator',
    s11_prompt_desc: 'In <strong>Step 3 of the Prompt Generator</strong> you will find a section to select specific capacities and cognitive operations.',
    s11_prompt_step1: '<strong>Choose the capacity</strong> you want to develop (e.g., Critical thinking)',
    s11_prompt_step2: '<strong>Select the specific operations</strong> (e.g., Evaluate evidence, Detect errors)',
    s11_prompt_step3: '<strong>The generated prompt</strong> will include instructions for the AI to create tasks oriented to those operations',
    s11_prompt_note: 'This does not automatically guarantee the development of the capacity, but it <strong>guides the prompts</strong> toward the type of thinking you want to foster.',

    // Comparison table
    s11_comparison_bad_header: 'Unoriented prompt (❌)',
    s11_comparison_good_header: 'Capacity-oriented prompt (✅)',
    s11_comparison_row1_bad: '"What caused the French Revolution?"',
    s11_comparison_row1_good: '"Here are two historians who explain the causes of the French Revolution differently. Which one presents better evidence? Justify."',
    s11_comparison_row2_bad: '"How do you calculate the area of a triangle?"',
    s11_comparison_row2_good: '"A classmate says the area of a triangle is base × height. Another says it\'s (base × height) / 2. Who is right and why?"',
    s11_comparison_row3_bad: '"What is photosynthesis?"',
    s11_comparison_row3_good: '"Explain to an 8-year-old what photosynthesis is without using technical words."',

    s11_insight: '<strong>Remember:</strong> Content is the VEHICLE, capacity is the DESTINATION. You can teach critical thinking using any curricular content. What matters is how you design the prompts.',

    // ========== SECTION 12 ==========
    s12_title: '12. Intentional Use of Technology: One Device per Team',
    s12_lead: 'Traffic Light Game intentionally uses ONE device per team. This is NOT a technical or budget limitation, but a <strong>grounded pedagogical decision</strong> to maximize social interaction and deep learning.',

    s12_problem_title: 'The Problem of "Each with Their Own Screen"',
    s12_paradox_title: 'The Connectivity Paradox',
    s12_paradox_desc: 'In many classrooms, each student has their own device (laptop, tablet, phone). Paradoxically, this can <strong>reduce interaction</strong> instead of increasing it.',

    s12_paradox_header_bad: 'Each with their own device (❌)',
    s12_paradox_header_good: 'One device per team (✅)',
    s12_paradox_row1_bad: 'Each student looks at their own screen',
    s12_paradox_row1_good: 'Everyone looks at the same screen → they discuss',
    s12_paradox_row2_bad: 'Interaction reduced to a minimum',
    s12_paradox_row2_good: 'Interaction MANDATORY to advance',
    s12_paradox_row3_bad: 'Individual work disguised as group work',
    s12_paradox_row3_good: 'Genuinely collaborative work',
    s12_paradox_row4_bad: 'The fastest finishes first (and gets bored)',
    s12_paradox_row4_good: 'The team finishes together (the fast one helps)',
    s12_paradox_row5_bad: 'Individual copying of content',
    s12_paradox_row5_good: 'Collective construction of knowledge',
    s12_paradox_row6_bad: 'Awkward silence ("each one in their own world")',
    s12_paradox_row6_good: 'Active debate ("do we put A or B?")',

    s12_regulation_title: 'The Device as an Interaction Regulator',
    s12_regulation1_title: 'Shared Focal Point',
    s12_regulation1_desc: 'The single screen becomes a <strong>focal point</strong> around which the team physically organizes. Everyone looks at the same thing, sees the same thing, discusses the same thing.',
    s12_regulation2_title: 'Mandatory Negotiation',
    s12_regulation2_desc: 'With a single device, the team MUST agree before answering. There is no way for one person to answer without consulting others. <strong>Negotiation of meaning</strong> is built into the design.',
    s12_regulation3_title: 'Natural Role Rotation',
    s12_regulation3_desc: 'Who writes? Who dictates? Who looks for information? The single device <strong>forces task distribution</strong> and role rotation within the team.',
    s12_regulation4_title: 'Process Visibility',
    s12_regulation4_desc: 'The teacher can see what each team is doing with ONE glance. If each student had their own screen, it would be impossible to monitor 30 screens simultaneously.',

    s12_theory_title: 'Theoretical Foundation: SOLE + Distributed Cognition',
    s12_theory_sole: '<strong>SOLE (Sugata Mitra):</strong> In his experiments, Mitra found that children learned MORE when sharing a computer than when each had their own. The need to collaborate generated discussions that deepened understanding.',
    s12_theory_hutchins: '<strong>Distributed Cognition (Hutchins):</strong> Knowledge does not reside only in the individual mind, but is distributed among people and tools. A team around a screen is a <strong>cognitive system</strong> more powerful than the sum of isolated individuals.',

    s12_more_devices_title: 'What if We Have More Devices than Teams?',
    s12_complementary_title: 'Complementary Uses (Non-Central)',
    s12_complementary_desc: 'If you have more devices available, you can use them as <strong>support tools</strong>, not as main screens:',
    s12_complementary1: '<strong>Consultation device:</strong> To look for additional information while another writes the answer',
    s12_complementary2: '<strong>Recording device:</strong> To take notes of team discussions',
    s12_complementary3: '<strong>Personal device (Stage 0):</strong> For each to propose questions BEFORE discussing them as a team',
    s12_complementary_note: 'But the CENTRAL device of the game (where tasks are answered, responses are graded, scores are seen) is always ONE per team.',

    s12_objections_title: 'Frequent Objections',
    s12_objection1_q: 'What if a student monopolizes the device?',
    s12_objection1_a: 'This is a <strong>pedagogical opportunity</strong>, not a problem. Establish clear rotation rules ("every 5 minutes change who writes") or intervene when you see imbalance. It is also an indicator of team dynamics you can assess.',
    s12_objection2_q: 'What about introverted students who don\'t speak?',
    s12_objection2_a: 'Precisely, the single device FORCES them to participate in some way. Assign rotating roles ("now you read the question", "now you write the answer"). With individual screens, the introvert disappears into their own screen.',
    s12_objection3_q: 'Isn\'t it more efficient for everyone to work in parallel?',
    s12_objection3_a: 'Efficiency ≠ Learning. Yes, in parallel they finish faster. But the goal is not to finish fast, it is to <strong>understand deeply</strong>. The discussion generated by the single device is exactly what produces lasting learning.',
    s12_objection4_q: 'What if the team is very large (7-8 students)?',
    s12_objection4_a: 'If the team is too large, split it. The ideal size is 4-5 students per device. With more than 6, some inevitably are left out of the discussion.',

    s12_insight_final: '"Low" technology use does not mean POOR technology use. It means INTELLIGENT use. The most sophisticated technology is not the one with the most screens, but the one that generates <strong>better human interactions</strong>. One device per team is a deliberate constraint that multiplies learning.',

    s12_remember_title: 'To Remember',
    s12_remember1: '✅ ONE device per team = MORE debate, MORE collaboration, MORE learning',
    s12_remember2: '✅ The "limitation" is actually a <strong>pedagogical affordance</strong>',
    s12_remember3: '✅ Additional devices are COMPLEMENTARY, not central',
    s12_remember4: '✅ If conflicts arise over the device, they are <strong>learning opportunities</strong>',
    s12_remember5: '✅ The teacher can monitor better with fewer screens to follow',


    s13_title: '13. Preparation for Self-Assessment',
    s13_warning: '⚠️ If you are going to enable self-assessment, it is essential to prepare students BEFORE starting the game.',
    s13_before_title: 'What to do BEFORE the game',
    s13_before_list1: 'Explain to students that at the end they will need to reflect on the process',
    s13_before_list2: 'Ask them to keep a "mental log" or brief notes:',
    s13_before_sub1: 'Who helped me understand something?',
    s13_before_sub2: 'Who did I help?',
    s13_before_sub3: 'Which concept was hardest for me?',
    s13_before_sub4: 'How did I feel working in a team?',
    s13_during_title: 'What to do DURING the game',
    s13_during_list1: 'You can have a visible board with the reflection questions',
    s13_during_list2: 'Briefly remind between stages to observe interactions',
    s13_when_use_title: 'When to USE self-assessment',
    s13_use_1: '✅ Topics that require deep understanding',
    s13_use_2: '✅ When there is enough time (add 10-15 min at the end)',
    s13_use_3: '✅ Groups that already know the game dynamics',
    s13_use_4: '✅ When you want to identify "experts" for the pedagogical closing',
    s13_when_not_use_title: 'When NOT to use self-assessment',
    s13_not_use_1: '❌ First time the group plays',
    s13_not_use_2: '❌ Introductory or quick review topics',
    s13_not_use_3: '❌ When time is short',
    s13_not_use_4: '❌ Very large groups where closing would be hard to manage',
    s13_tip: '💡 Self-assessment identifies students most mentioned as "helpers." These students can explain key concepts to the rest of the group during the pedagogical closing, reinforcing their own learning and that of their peers.',
  },
  pt: {
    headerTitle: '🎓 Guia Pedagógica do Professor',
    headerSubtitle: 'Traffic Light Game · Coopetition Game · SOLE · Avaliação Qualitativa',
    tabGuides: '📘 Guias e Fundamentos',
    tabEvaluation: '📊 Avaliação e Rúbricas',
    footerText1: 'Este guia baseia-se em pesquisas em ciência da aprendizagem (Vygotsky, Perkins, Mitra, Hutchins, Wilber).',
    footerText2: 'Para uso exclusivo de professores que implementam o Traffic Light Game.',

    s1_title: '1. Design Intencional: Por Que NÃO Há Feedback Automático',
    s1_warning_strong: 'Decisão Pedagógica, Não Limitação Técnica:',
    s1_warning_text: 'Traffic Light Game NÃO fornece respostas "corretas" automáticas. Esta é uma decisão intencional para promover debate, argumentação e construção coletiva do conhecimento.',
    s1_heading_fundamento: 'Fundamento Pedagógico',
    s1_socratic_title: 'Método Socrático (Diálogo Dialético)',
    s1_socratic_desc1: 'Ao não dar respostas imediatas, geramos uma tensão cognitiva que obriga os estudantes a justificar seu raciocínio. A incerteza não é um problema – é o motor da aprendizagem profunda.',
    s1_socratic_desc2: 'O método socrático baseia-se em fazer perguntas que provocam reflexão, não em dar respostas. Quando o sistema NÃO diz "correto/incorreto" automaticamente, os estudantes DEVEM argumentar por que sua resposta é válida.',
    s1_constructivism_title: 'Construtivismo Social (Vygotsky)',
    s1_constructivism_desc1: 'A aprendizagem ocorre na interação social. O professor como mediador facilita a construção de significado. As respostas automáticas eliminam essa dimensão social crítica.',
    s1_constructivism_desc2: 'Vygotsky demonstrou que a aprendizagem mais profunda acontece na Zona de Desenvolvimento Proximal (ZDP) – esse espaço entre o que o aluno pode fazer sozinho e o que pode fazer com ajuda. O debate entre pares e a mediação do professor são essenciais para navegar nessa zona.',
    s1_comparison_bad_header: 'COM Feedback Automático (❌)',
    s1_comparison_good_header: 'SEM Feedback Automático (✅)',
    s1_comparison_row1_bad: 'Estudantes buscam "a resposta certa" sem pensar',
    s1_comparison_row1_good: 'Estudantes devem argumentar e justificar',
    s1_comparison_row2_bad: 'Não há debate real – apenas verificação',
    s1_comparison_row2_good: 'Debate genuíno entre pares',
    s1_comparison_row3_bad: 'Aprendizagem superficial e memorística',
    s1_comparison_row3_good: 'Compreensão conceitual profunda',
    s1_comparison_row4_bad: 'Professor como observador passivo',
    s1_comparison_row4_good: 'Professor como facilitador essencial',
    s1_comparison_row5_bad: 'Tecnologia substitui o ensino',
    s1_comparison_row5_good: 'Tecnologia apoia o ensino (não o substitui)',
    s1_comparison_row6_bad: 'Foco no resultado, não no processo',
    s1_comparison_row6_good: 'Foco no raciocínio e processo',
    s1_tip_title: 'Seu Papel como Professor',
    s1_tip_intro: 'Você é quem fecha o ciclo de aprendizagem. O sistema gera debate, mas VOCÊ:',
    s1_role1: 'Facilita a discussão',
    s1_role1_desc: 'Faz perguntas que aprofundam o debate',
    s1_role2: 'Esclarece mal-entendidos conceituais',
    s1_role2_desc: 'Detecta erros de compreensão e os corrige',
    s1_role3: 'Sintetiza as ideias do grupo',
    s1_role3_desc: 'Conecta diferentes perspectivas',
    s1_role4: 'Conecta com objetivos curriculares',
    s1_role4_desc: 'Vincula o debate ao que devem aprender',
    s1_role5: 'Valida ou corrige o raciocínio',
    s1_role5_desc: 'Dá a palavra final quando necessário',
    s1_tip_final: 'Este papel NÃO pode ser automatizado. É sua expertise pedagógica em ação.',


    s2_title: '2. Modelo de 3 Camadas: Arquitetura Pedagógica',
    s2_lead: 'Traffic Light Game estrutura a aprendizagem em três camadas de crescente complexidade social. Cada camada tem um propósito pedagógico específico.',

    s2_layer1_badge: 'CAMADA 1',
    s2_layer1_title: 'Colaboração Intra-Equipe',
    s2_layer1_stage: 'Stage 0 - Stage 1',
    s2_what_happens: 'O que acontece?',
    s2_layer1_list1: 'Estudantes constroem conhecimento EM EQUIPE',
    s2_layer1_list2: 'Propõem e avaliam perguntas juntos (Stage 0)',
    s2_layer1_list3: 'Praticam sem competição externa (Stage 1)',
    s2_layer1_list4: 'Sistema identifica quem precisa de apoio',
    s2_layer1_list5: 'Melhoram coletivamente antes de competir',
    s2_layer1_theory_note: 'Teoria aplicada: ZDP grupal + SOLE (Sugata Mitra). Um computador + grupo → auto-organização da aprendizagem.',
    s2_layer1_teacher_role: 'Seu papel: Circule entre as equipes, observe dinâmicas, NÃO intervenha ainda.',

    s2_layer2_badge: 'CAMADA 2',
    s2_layer2_title: 'Competição Inter-Equipes',
    s2_layer2_stage: 'Stage 2',
    s2_layer2_list1: 'Equipes competem entre si',
    s2_layer2_list2: 'Confronto de ideias diferentes',
    s2_layer2_list3: 'Debate acadêmico rigoroso',
    s2_layer2_list4: 'Motivação por competição saudável',
    s2_layer2_list5: 'Exposição a perspectivas diversas',
    s2_layer2_theory_note: 'Teoria aplicada: Coopetition - Somente equipes que colaboram bem internamente podem competir efetivamente externamente.',
    s2_layer2_teacher_role: 'Seu papel: Facilitador ativo do debate. Pause, peça argumentos, facilite a troca, sintetize.',

    s2_layer3_badge: 'CAMADA 3',
    s2_layer3_title: 'Mediação Docente',
    s2_layer3_stage: 'Todo o processo',
    s2_what_you_do: 'O que você faz?',
    s2_layer3_list1: 'Facilita debates quando há impasse',
    s2_layer3_list2: 'Esclarece mal-entendidos conceituais',
    s2_layer3_list3: 'Conecta com objetivos curriculares',
    s2_layer3_list4: 'Sintetiza padrões que observa',
    s2_layer3_list5: 'Fecha conceitualmente no final',
    s2_layer3_theory_note: 'Teoria aplicada: Mediação cultural (Vygotsky) - Você é a ponte entre conhecimento cotidiano e conhecimento científico.',
    s2_layer3_teacher_role: 'Seu papel: Saber quando intervir e quando NÃO.',

    // ========== SEÇÃO 3 ==========
    s3_title: '3. Sistema Verde/Amarelo/Vermelho: Além do Certo/Errado',
    s3_lead: 'O sistema de notas tipo semáforo NÃO avalia apenas se a resposta está certa ou errada. As três cores 🟢🟡🔴 funcionam <strong>exatamente da mesma forma no Stage 1 e no Stage 2</strong> — o que muda entre as etapas é o design das consignas, não as cores. O que importa é a justificativa.',

    s3_green_light: 'LUZ VERDE',
    s3_green_points: '5 pontos',
    s3_green_meaning_label: 'Significado:',
    s3_green_meaning_value: '"A resposta está correta, mas é ÓBVIA ou não acrescenta nada novo"',
    s3_green_why_label: 'Por que poucos pontos:',
    s3_green_why_value: 'Queremos <strong>desincentivar respostas superficiais</strong>. Se a resposta está correta mas não agrega valor ao debate, recebe a pontuação mínima.',
    s3_green_example_label: 'Exemplo:',
    s3_green_example: 'Pergunta: "Qual é a capital da França?"\nResposta: "Paris"\nNota: 🟢 Verde',
    s3_green_perkins_label: 'Sinal:',
    s3_green_perkins_value: 'Falta de motivação para buscar conexões. Qualquer resposta pode ser enriquecida com Amarelo.',

    s3_yellow_light: 'LUZ AMARELA',
    s3_yellow_points: '10 pontos',
    s3_yellow_meaning_label: 'Significado:',
    s3_yellow_meaning_value: '"A resposta ACRESCENTA RELAÇÕES, conexões ou perspectivas não óbvias"',
    s3_yellow_why_label: 'Por que mais pontos:',
    s3_yellow_why_value: 'Este é o nível que <strong>mais queremos incentivar</strong>. Indica pensamento profundo, capacidade de relacionar conceitos, compreensão genuína.',
    s3_yellow_example_label: 'Exemplo:',
    s3_yellow_example: 'Pergunta: "Por que os navios flutuam?"\nResposta: "Pelo princípio de Arquimedes. O navio desloca água cujo peso é maior que o do navio. Por isso um navio de aço pode flutuar enquanto uma moeda de aço afunda: depende do VOLUME de água deslocado, não só do material."\nNota: 🟡 Amarelo',
    s3_yellow_perkins_label: 'Sinal:',
    s3_yellow_perkins_value: 'O coração do método: busca conexões, relações e novas perspectivas entre conceitos.',

    s3_red_light: 'LUZ VERMELHA',
    s3_red_points: '12 pontos (para quem detecta)',
    s3_red_meaning_label: 'Significado:',
    s3_red_meaning_value: '"A resposta tem um ERRO que outros NÃO detectaram"',
    s3_red_why_label: 'Por que pontos máximos:',
    s3_red_why_value: 'Detectar erros requer <strong>pensamento crítico</strong> de alto nível. É mais difícil do que dar respostas corretas. Além disso, ajuda todos a aprender com o erro.',
    s3_red_example_label: 'Exemplo:',
    s3_red_example: 'Pergunta: "O que causa as estações do ano?"\nResposta do Equipe A: "A distância variável da Terra ao Sol."\nEquipe B detecta erro: 🔴 "Incorreto. As estações NÃO são por distância, mas pela inclinação do eixo terrestre."\nResultado: Equipe B ganha 12 pontos.',
    s3_red_perkins_label: 'Sinal:',
    s3_red_perkins_value: 'Requer atenção crítica. Se o Vermelho estava incorreto (não havia erro), quem o sinalizou recebe 0 pts.',

    s3_benefit1_title: 'Premia a Profundidade',
    s3_benefit1_desc: 'Um aluno que dá respostas amarelas consistentemente demonstra compreensão MAIS profunda do que aquele que só acerta (verdes).',
    s3_benefit2_title: 'Incentiva Pensamento Crítico',
    s3_benefit2_desc: 'Os pontos vermelhos motivam a QUESTIONAR, não apenas aceitar. Desenvolve pensamento crítico genuíno.',
    s3_benefit3_title: 'Torna a Compreensão Visível',
    s3_benefit3_desc: 'Para você como professor, ver o padrão de notas de um aluno revela seu nível de compreensão.',
    s3_benefit4_title: 'Pune a Complacência',
    s3_benefit4_desc: 'Se você não detecta um erro óbvio, aprende que precisa estar mais atento e crítico.',

    s3_tip_title: 'Dica para o Professor',
    s3_tip_text1: 'Durante o Stage 2, NÃO se fixe apenas nos pontos. <strong>Ouça as JUSTIFICATIVAS.</strong>',
    s3_tip_bad: 'Superficial:',
    s3_tip_bad_example: '"É amarelo porque... está mais ou menos certo" → Fraco, não fundamenta',
    s3_tip_good: 'Profunda:',
    s3_tip_good_example: '"É amarelo porque a resposta menciona X, mas não conecta com Y que vimos na aula anterior." → Forte, fundamenta, relaciona',
    s3_tip_highlight: 'Você avalia QUALIDADE, não apenas a quantidade de pontos.',


    // ========== SEÇÃO 4 ==========
    s4_title: '4. Stage 1 vs Stage 2: Base e Profundidade (Perkins)',
    s4_lead: 'David Perkins (Teoria da Compreensão) distingue entre conhecimento <strong>superficial/ritual</strong> e <strong>compreensão genuína</strong>. Traffic Light Game estrutura isso em dois estágios sequenciais.',

    s4_stage1_badge: 'STAGE 1',
    s4_stage1_title: 'Fortalecer Equipes (Prática)',
    s4_stage1_objective_label: 'Objetivo:',
    s4_stage1_objective: 'Construção de conhecimento BASE e detecção de quem precisa de apoio.',
    s4_stage1_list1: '❌ NÃO há competição entre equipes',
    s4_stage1_list2: '📊 Pontos são FEEDBACK, não nota',
    s4_stage1_list3: '📝 Perguntas mais básicas/fundamentais',
    s4_stage1_list4: '🟢🟡🔴 As três cores estão disponíveis em todas as consignas',
    s4_stage1_list5: '🎯 Foco: Preparação e colaboração interna',
    s4_stage1_example_label: 'Tipos de perguntas:',
    s4_stage1_example1: 'Definição: "O que é fotossíntese?"',
    s4_stage1_example2: 'Procedimento: "Como se calcula a área de um triângulo?"',
    s4_stage1_example3: 'Comparação simples: "Como as células animais e vegetais são diferentes?"',
    s4_stage1_teacher_role_label: 'Seu papel:',
    s4_stage1_teacher_role: 'Observe dinâmicas, detecte quem precisa de apoio, NÃO intervenha ainda.',
    s4_stage1_perkins_label: 'Nível Perkins:',
    s4_stage1_perkins: 'Conhecimento Ritual → Transição',

    s4_stage2_badge: 'STAGE 2',
    s4_stage2_title: 'Competição entre Equipes (Demonstração)',
    s4_stage2_objective_label: 'Objetivo:',
    s4_stage2_objective: 'Compreensão PROFUNDA e aplicação em contextos complexos.',
    s4_stage2_list1: '⚔️ SIM competição entre equipes',
    s4_stage2_list2: '🏆 Pontos contam para pódio (motivação)',
    s4_stage2_list3: '🧠 Perguntas mais complexas/relacionais',
    s4_stage2_list4: '💬 Maioria requer FAZER e EXPLICAR',
    s4_stage2_list5: '🎯 Foco: Demonstração de compreensão genuína',
    s4_stage2_example_label: 'Tipos de perguntas:',
    s4_stage2_example1: 'Explicação complexa: "Explique como a fotossíntese e a respiração celular estão conectadas"',
    s4_stage2_example2: 'Aplicação: "Como você usaria Pitágoras para calcular a altura de um edifício?"',
    s4_stage2_example3: 'Relações múltiplas: "O que várias revoluções têm em comum?"',
    s4_stage2_example4: 'Fazer + Explicar: "Projete um experimento e explique seu raciocínio"',
    s4_stage2_teacher_role_label: 'Seu papel:',
    s4_stage2_teacher_role: 'Facilitador ATIVO do debate. Pause, facilite argumentação, ouça qualidade das justificativas.',
    s4_stage2_perkins_label: 'Nível Perkins:',
    s4_stage2_perkins: 'Compreensão Genuína (explicar, aplicar, justificar, relacionar)',

    s4_why_order_title: 'Por Que a Ordem Importa',
    s4_reason1_title: 'Base Conceitual Necessária',
    s4_reason1_desc: 'Para RELACIONAR conceitos (Stage 2), primeiro você precisa TER os conceitos claros (Stage 1). Não se pode conectar o que não existe.',
    s4_reason2_title: 'Confiança da Equipe',
    s4_reason2_desc: 'Stage 1 sem competição permite que a equipe se fortaleça SEM pressão externa. Constrói confiança interna necessária para o Stage 2.',
    s4_reason3_title: 'Identificação de Lacunas',
    s4_reason3_desc: 'Stage 1 revela quem precisa de apoio. A equipe pode se preparar ANTES de competir.',
    s4_reason4_title: 'Progressão Cognitiva Natural',
    s4_reason4_desc: 'Perkins mostra que a compreensão genuína é construída SOBRE conhecimento ritual, não sem ele.',

    s4_guide_title: 'Guia para Curar Perguntas',
    s4_table_criterion: 'Critério',
    s4_table_stage1: 'Stage 1',
    s4_table_stage2: 'Stage 2',
    s4_table_complexity: 'Complexidade',
    s4_table_complexity_stage1: 'Baixa-Média',
    s4_table_complexity_stage2: 'Média-Alta',
    s4_table_concepts: 'Conceitos envolvidos',
    s4_table_concepts_stage1: '1-2 conceitos',
    s4_table_concepts_stage2: '2+ conceitos relacionados',
    s4_table_response_type: 'Tipo de resposta',
    s4_table_response_stage1: 'Definir, identificar, comparar',
    s4_table_response_stage2: 'Explicar, aplicar, justificar',
    s4_table_debate: 'Admite debate',
    s4_table_debate_stage1: 'Sim — a equipe classifica com Verde, Amarelo ou Vermelho',
    s4_table_debate_stage2: 'Muito (maioria amarelas)',


    // ========== SEÇÃO 5 ==========
    s5_title: '5. Uso Pedagógico de IA: Pesquisa, Não Oráculo',
    s5_lead: 'Traffic Light Game integra IA (Claude, ChatGPT, etc.) de maneira <strong>FORMATIVA</strong>, não como fonte de respostas. Os estudantes usam IA para PESQUISAR e APROFUNDAR, não para copiar.',

    s5_philosophy_title: 'Filosofia: IA como Extensão Cognitiva',
    s5_philosophy_desc: 'Baseado na teoria de <strong>Cognição Distribuída</strong> (Edwin Hutchins), ferramentas tecnológicas podem ser extensões do nosso pensamento. A IA não substitui o pensar – ela o amplifica.',
    s5_analogy1: 'Analogia: Uma calculadora não substitui entender matemática. Ela permite fazer cálculos complexos MAIS RÁPIDO para focar na solução do problema.',
    s5_analogy2: 'Similarmente, IA não substitui pensar. Ela permite acessar informações MAIS RÁPIDO para focar em COMPREENDER e RELACIONAR.',

    s5_comparison_title: 'Uso Correto vs. Incorreto',
    s5_correct_title: 'USO CORRETO (PESQUISAR)',
    s5_correct_scenario: 'Cenário: No Stage 0, a equipe deve propor perguntas sobre a "Revolução Francesa" mas não entendem bem o contexto.',
    s5_correct_prompt: 'Prompt para IA: "Explique o contexto social e econômico da França antes de 1789. Quais eram os principais problemas que a população enfrentava?"',
    s5_correct_why: 'Por que é correto:',
    s5_correct_reason1: '✅ Usaram IA para ENTENDER contexto',
    s5_correct_reason2: '✅ Processaram a informação em equipe',
    s5_correct_reason3: '✅ CONSTRUÍRAM suas próprias perguntas',
    s5_correct_reason4: '✅ Desenvolveram compreensão profunda',

    s5_incorrect_title: 'USO INCORRETO (COPIAR)',
    s5_incorrect_scenario: 'Cenário: No Stage 0, a equipe deve propor perguntas sobre a "Revolução Francesa".',
    s5_incorrect_prompt: 'Prompt para IA: "Me dê 10 perguntas sobre a Revolução Francesa para um jogo educativo"',
    s5_incorrect_why: 'Por que é incorreto:',
    s5_incorrect_reason1: '❌ Não houve compreensão real',
    s5_incorrect_reason2: '❌ Automação, não aprendizado',
    s5_incorrect_reason3: '❌ IA substitui o pensar',
    s5_incorrect_reason4: '❌ Sem construção de conhecimento',

    s5_tip_title: 'Como Modelar Uso Correto',
    s5_tip_desc: 'Como professor, você deve ENSINAR a usar IA corretamente. Não presuma que os estudantes sabem como fazer.',
    s5_tip1: 'Demonstre: Projete sua tela e modele um prompt de pesquisa',
    s5_tip2: 'Compare: Mostre lado a lado um bom prompt e um mau prompt',
    s5_tip3: 'Pratiquem: Faça com que escrevam prompts no papel antes de usar a IA',
    s5_tip4: 'Reflitam: Pergunte "O que você aprendeu com a IA que não sabia antes?"',

    s5_warning_title: 'Sinais de Alarme (Mau Uso)',
    s5_warning1: 'Respostas com vocabulário que não corresponde ao nível do estudante',
    s5_warning2: 'Perguntas idênticas entre equipes (copiaram o mesmo prompt)',
    s5_warning3: 'Estudantes que não conseguem explicar com suas palavras o que "escreveram"',
    s5_warning4: 'Perguntas que não respondem ao objetivo pedagógico da aula',

    // ========== SEÇÃO 6 ==========
    s6_title: '6. Teoria SOLE: Auto-Organização e Um Computador por Equipe',
    s6_hero_title: 'SOLE: Self-Organized Learning Environment',
    s6_quote: '"A aprendizagem é um fenômeno auto-organizado. Se você colocar um computador em uma comunidade de crianças que não sabem inglês e não sabem computação, elas aprenderão ambas por si mesmas." - Sugata Mitra',

    s6_experiment_title: 'Experimento "Hole in the Wall" (1999)',
    s6_experiment_desc: 'Sugata Mitra instalou um computador embutido em um muro de um bairro pobre de Nova Delhi, acessível a crianças. Sem supervisão nem instrução, em questão de horas as crianças aprenderam a navegar, gravar, reproduzir e eventualmente ensinar outros.',
    s6_experiment_key: 'Descoberta chave: Crianças podem aprender tecnologias complexas por si mesmas se tiverem acesso, curiosidade e colaboração.',

    s6_principles_title: 'Princípios SOLE Aplicados ao Jogo',
    s6_principle1_title: 'Grande Pergunta',
    s6_principle1_desc: 'O jogo começa com uma pergunta curricular provocadora que não tem resposta única imediata.',
    s6_principle2_title: 'Auto-organização',
    s6_principle2_desc: 'As equipes decidem papéis, estratégias e métodos. Não há instrução passo a passo.',
    s6_principle3_title: 'Recursos Mínimos',
    s6_principle3_desc: 'UM computador por equipe (intencional). Isso força colaboração e discussão.',
    s6_principle4_title: 'Liberdade e Andaime',
    s6_principle4_desc: 'Os estudantes podem consultar internet, IA, anotações. Você não dá respostas – facilita o processo.',

    s6_insight_title: 'Insight Pedagógico',
    s6_insight_desc: '<strong>Um computador por equipe NÃO é uma limitação orçamentária.</strong> É uma <strong>decisão pedagógica intencional</strong> para gerar interação social e negociação de significado. Se cada estudante tivesse seu próprio dispositivo, o debate seria silenciado e voltaríamos ao individualismo.',

    // ========== SEÇÃO 7 ==========
    s7_title: '7. Coopetition: Colaboração + Competição',
    s7_lead: '<strong>Coopetition</strong> = Colaboração interna + Competição externa. O ponto ideal pedagógico onde o todo é maior que a soma das partes.',

    s7_sweet_spot_collab: '🤝 Colaboração',
    s7_sweet_spot_compete: '⚔️ Competição',
    s7_sweet_spot_result: '🎯 Coopetition',

    s7_why_delicate_title: 'Por Que o Equilíbrio é Delicado',
    s7_why_delicate_desc: 'A competição pura gera toxicidade e ocultação de informação. A colaboração pura pode gerar complacência e falta de motivação. Coopetition exige que as equipes colaborem <strong>internamente</strong> para poder competir <strong>externamente</strong>. Não há competição efetiva sem colaboração interna primeiro.',

    s7_corruption_title: 'Sinais de Corrupção (RUINS)',
    s7_corruption1: '<strong>Sabotagem entre equipes:</strong> "Se não sabemos a resposta, digamos qualquer coisa para confundir a outra equipe"',
    s7_corruption2: '<strong>Ocultação deliberada:</strong> "Não conte a eles como resolvemos"',
    s7_corruption3: '<strong>Desprezo pessoal:</strong> Zombarias, humilhações, linguagem depreciativa',
    s7_corruption4: '<strong>Individualismo tóxico:</strong> Um estudante monopoliza o dispositivo e não permite que outros participem',
    s7_corruption_highlight: 'Se você vir isso, PAUSE O JOGO. O tempo não importa. É mais importante restaurar o clima de respeito do que "terminar a atividade".',

    s7_prevent_title: 'Como Prevenir Toxicidade',
    s7_prevent1: '<strong>Enquadramento inicial:</strong> "Vamos competir, mas no final todos vamos compartilhar o que aprenderam. Quem ensina ganha mais."',
    s7_prevent2: '<strong>Reforço positivo:</strong> Premie publicamente gestos de colaboração entre equipes',
    s7_prevent3: '<strong>Competição SIMBÓLICA:</strong> Os pontos NÃO são a nota. São moeda do jogo, não avaliação.',
    s7_prevent4: '<strong>Normas explícitas:</strong> Antes de começar, o grupo define o que é "competição justa"',
    s7_prevent5: '<strong>Interrupção imediata:</strong> Ao primeiro comentário depreciativo, pare e reflita com o grupo',

    // ========== SEÇÃO 8 ==========
    s8_title: '8. Guia de Avaliação Qualitativa: 4 Componentes',
    s8_lead: 'O sistema fornece dados quantitativos (pontos, sequências, participantes). VOCÊ interpreta e transforma esses dados em avaliação qualitativa significativa.',

    s8_components_title: 'Os 4 Componentes de Avaliação',

    s8_comp1_percent: '40%',
    s8_comp1_title: 'Performance Individual',
    s8_comp1_desc: 'Qualidade das respostas + Justificativas AO VIVO',
    s8_comp1_rubric_basic: 'Básico (1-3): Respostas corretas mas superficiais (verdes). Justificativa mínima.',
    s8_comp1_rubric_competent: 'Competente (4-7): Respostas que relacionam conceitos (amarelas). Justifica com fundamentos.',
    s8_comp1_rubric_advanced: 'Avançado (8-10): Detecta erros (vermelhas). Justifica com precisão e conexões múltiplas.',

    s8_comp2_percent: '30%',
    s8_comp2_title: 'Colaboração',
    s8_comp2_desc: 'Menções entre pares + Observação direta',
    s8_comp2_rubric_basic: 'Básico (1-3): Trabalha individualmente, ignora a equipe.',
    s8_comp2_rubric_competent: 'Competente (4-7): Escuta, contribui, respeita turnos.',
    s8_comp2_rubric_advanced: 'Avançado (8-10): Gera consenso, sintetiza ideias, convida a participar.',

    s8_comp3_percent: '20%',
    s8_comp3_title: 'Metacognição',
    s8_comp3_desc: 'Profundidade da reflexão no fechamento',
    s8_comp3_rubric_basic: 'Básico (1-3): "Aprendi sobre o tema" (vago).',
    s8_comp3_rubric_competent: 'Competente (4-7): "Aprendi que X se relaciona com Y porque..."',
    s8_comp3_rubric_advanced: 'Avançado (8-10): "No início eu pensava X, mas agora entendo Y. Eu estava errado sobre..."',

    s8_comp4_percent: '10%',
    s8_comp4_title: 'Crescimento',
    s8_comp4_desc: 'Melhora desde a linha de base inicial',
    s8_comp4_rubric_basic: 'Básico (1-3): Sem melhora ou piora.',
    s8_comp4_rubric_competent: 'Competente (4-7): Melhora moderada na participação ou qualidade.',
    s8_comp4_rubric_advanced: 'Avançado (8-10): Melhora significativa (estudante que não participava agora argumenta).',

    s8_tip_title: 'Fluxo de Trabalho Prático',
    s8_tip_step1: '<strong>Durante o jogo:</strong> Tome notas rápidas. Use a rubrica como checklist mental.',
    s8_tip_step2: '<strong>Imediatamente após:</strong> Atribua pontuações base por componente (1-10).',
    s8_tip_step3: '<strong>Final da semana:</strong> Revise evidências (pontos, justificativas escritas, observações).',
    s8_tip_step4: '<strong>Nota final:</strong> Média ponderada conforme percentuais.',
    s8_tip_key: '<strong>Fato chave:</strong> Você não precisa avaliar CADA intervenção. Uma sessão de 45-60 minutos fornece evidência suficiente para avaliar os 4 componentes.',

    // ========== SEÇÃO 9 ==========
    s9_title: '9. Dispositivos Pedagógicos Opcionais',
    s9_lead: 'O jogo pode ser usado sozinho (mínimo viável) ou enriquecido com estes módulos conforme objetivos, tempo e nível.',

    s9_module1_icon: '📝',
    s9_module1_title: 'Módulo 1: Autoavaliação Individual',
    s9_module1_moment: 'Imediatamente após o jogo',
    s9_module1_desc: 'Cada estudante responde:',
    s9_module1_item1: '"O quão bem você acha que entendeu o tema?" (1-5)',
    s9_module1_item2: '"O que foi mais difícil?"',
    s9_module1_item3: '"O que você faria diferente se jogasse de novo?"',
    s9_module1_value: 'Dados de metacognição para avaliação 20%',

    s9_module2_icon: '✅',
    s9_module2_title: 'Módulo 2: Validação do Professor',
    s9_module2_moment: 'Após o Stage 0 (antes de jogar)',
    s9_module2_desc: 'O professor revisa as perguntas propostas pelas equipes, dá feedback e aprova/rejeita.',
    s9_module2_value: 'Garante qualidade das perguntas + previne mau uso de IA',

    s9_module3_icon: '💬',
    s9_module3_title: 'Módulo 3: Reflexão em Grupo',
    s9_module3_moment: 'Fechamento pedagógico (últimos 5-10 min)',
    s9_module3_desc: 'Discussão guiada:',
    s9_module3_item1: '"Qual estratégia a equipe vencedora usou?"',
    s9_module3_item2: '"Qual erro nos ensinou mais?"',
    s9_module3_item3: '"Como isso se conecta com a aula?"',
    s9_module3_value: 'Síntese coletiva + fechamento conceitual',

    s9_module4_icon: '🎬',
    s9_module4_title: 'Módulo 4: Reflexão Inicial',
    s9_module4_moment: 'Antes do jogo (ativação)',
    s9_module4_desc: 'Pergunta disparadora: "O que vocês já sabem sobre este tema?" em equipe.',
    s9_module4_value: 'Ativa conhecimento prévio + linha de base para avaliação de crescimento',

    s9_recommendations_title: 'Recomendações por Nível',
    s9_table_level: 'Nível',
    s9_table_modules: 'Módulos recomendados',
    s9_table_reason: 'Razão',
    s9_row_primary_level: 'Ensino Fundamental',
    s9_row_primary_modules: '3 (Reflexão em Grupo) + 4 (Reflexão Inicial)',
    s9_row_primary_reason: 'Menos escrita, mais oralidade',
    s9_row_secondary_level: 'Ensino Médio',
    s9_row_secondary_modules: '1 (Autoavaliação) + 3 (Reflexão em Grupo)',
    s9_row_secondary_reason: 'Desenvolvimento metacognitivo',
    s9_row_university_level: 'Universidade',
    s9_row_university_modules: '1 + 2 (Validação) + 3',
    s9_row_university_reason: 'Maior exigência e autonomia',

    // ========== SEÇÃO 10 ==========
    s10_title: '10. Referência: "A Era da Integração"',
    s10_book_title: 'A Era da Integração: Coopetition Universal',
    s10_book_subtitle: 'O marco teórico completo do qual Traffic Light Game é uma implementação prática.',

    s10_central_theory_title: 'Teoria Central: Coopetition Universal',
    s10_central_theory_desc: 'Assim como a biologia evolui por simbiose e competição, a aprendizagem humana requer <strong>colaboração para construir conhecimento</strong> e <strong>competição para validá-lo e refiná-lo</strong>. Traffic Light Game é um <strong>modelo em escala</strong> deste princípio universal.',

    s10_bell_curve_title: 'A Curva de Gauss: Cauda Inferior + Cauda Superior',
    s10_bell_curve_inferior: '<strong>Cauda inferior (estudantes com dificuldades):</strong> O sistema os detecta, a equipe os ajuda, o jogo lhes dá prática segura (Stage 1).',
    s10_bell_curve_superior: '<strong>Cauda superior (estudantes avançados):</strong> O sistema os desafia com perguntas complexas, podem responder amarelas e detectar erros (Stage 2).',
    s10_bell_curve_center: '<strong>Centro (maioria):</strong> Aprendem com ambos os extremos – dos que explicam e dos erros detectados.',

    s10_wilber_title: 'Conexão com Ken Wilber (Teoria Integral)',
    s10_wilber_desc: 'O jogo opera nos 4 quadrantes:',
    s10_wilber_yo: '<strong>EU (Individual-interior):</strong> Metacognição, reflexão pessoal',
    s10_wilber_tu: '<strong>TU (Individual-exterior):</strong> Performance, respostas corretas',
    s10_wilber_nosotros: '<strong>NÓS (Coletivo-interior):</strong> Colaboração, cultura de equipe',
    s10_wilber_ellos: '<strong>ELES (Coletivo-exterior):</strong> Competição, regras do jogo',
    s10_wilber_conclusion: 'Nenhuma aprendizagem profunda ocorre se algum desses quadrantes estiver ausente.',

    s10_closing_title: 'O Papel do Jogo no Método Mais Amplo',
    s10_closing_desc: 'Traffic Light Game <strong>não é um fim em si mesmo</strong>. É um <strong>dispositivo pedagógico</strong> para ativar princípios de aprendizagem profunda:',
    s10_closing_list1: '✅ Auto-organização (SOLE)',
    s10_closing_list2: '✅ Coopetition',
    s10_closing_list3: '✅ Compreensão vs. memorização',
    s10_closing_list4: '✅ Mediação docente intencional',
    s10_closing_final: 'Quando você compreende os <strong>princípios</strong>, pode aplicar o jogo a qualquer conteúdo, nível e contexto.',

    s10_final_message: '📖 Para aprofundar: "A Era da Integração: Coopetition Universal" (2024) – Disponível na biblioteca digital.',
    s10_final_author: '— Design pedagógico por Traffic Light Game Team',

    // ========== SEÇÃO 11 ==========
    s11_title: '11. Desenvolvimento de Capacidades: Além do Conteúdo',
    s11_highlight: '<strong>Distinção Chave:</strong> O jogo não apenas ensina CONTEÚDOS (dados, conceitos, fatos), mas pode desenvolver CAPACIDADES (formas de pensar, habilidades transferíveis). Isso requer design intencional das consignas.',

    s11_what_are_title: 'O que são Capacidades?',
    s11_content_vs_capacity_title: 'Conteúdo vs. Capacidade',
    s11_content_example: '<strong>Conteúdo:</strong> "Qual é a capital da França?" → O aluno lembra um fato. Se esquecer o fato, nada resta.',
    s11_capacity_example: '<strong>Capacidade:</strong> "Compare duas fontes sobre a Revolução Francesa e determine qual é mais confiável." → O aluno desenvolve uma HABILIDADE (avaliar evidências) que pode usar em qualquer contexto futuro.',
    s11_capacity_transfer: 'As capacidades são <strong>transferíveis</strong>: uma vez que você aprende a avaliar evidências em História, pode fazê-lo em Ciências, em notícias, na vida.',

    s11_capacities_title: 'As 4 Capacidades do Jogo',

    // Pensamento Crítico
    s11_critical_title: 'Pensamento Crítico',
    s11_critical_desc: 'Analisar, avaliar e questionar informações em vez de aceitá-las passivamente.',
    s11_critical_operations: 'Operações cognitivas:',
    s11_critical_op1: '<strong>Avaliar evidências:</strong> "Qual destas fontes é mais confiável?"',
    s11_critical_op2: '<strong>Detectar erros:</strong> "O que está errado neste raciocínio?"',
    s11_critical_op3: '<strong>Comparar argumentos:</strong> "Qual posição tem melhores fundamentos?"',
    s11_critical_op4: '<strong>Questionar suposições:</strong> "O que esta afirmação assume?"',
    s11_critical_example: '<strong>Exemplo em Matemática:</strong> "Aqui estão duas formas de resolver este problema. Qual é mais eficiente e por quê?"',

    // Resolução de Problemas
    s11_problem_title: 'Resolução de Problemas',
    s11_problem_desc: 'Identificar problemas, gerar soluções e avaliar alternativas.',
    s11_problem_operations: 'Operações cognitivas:',
    s11_problem_op1: '<strong>Identificar o problema:</strong> "Qual é o problema central aqui?"',
    s11_problem_op2: '<strong>Propor soluções:</strong> "Sugira duas formas diferentes de resolver isto."',
    s11_problem_op3: '<strong>Avaliar alternativas:</strong> "Quais são as vantagens e desvantagens de cada opção?"',
    s11_problem_op4: '<strong>Projetar um plano:</strong> "Que passos você seguiria para alcançar X?"',
    s11_problem_example: '<strong>Exemplo em Ciências:</strong> "Projete um experimento para testar esta hipótese."',

    // Comunicação
    s11_comm_title: 'Comunicação',
    s11_comm_desc: 'Expressar ideias claramente, argumentar posições e adaptar a mensagem ao público.',
    s11_comm_operations: 'Operações cognitivas:',
    s11_comm_op1: '<strong>Explicar a outros:</strong> "Explique isto como se estivesse contando a alguém que não sabe nada."',
    s11_comm_op2: '<strong>Argumentar posição:</strong> "Defenda sua resposta com pelo menos três argumentos."',
    s11_comm_op3: '<strong>Sintetizar informações:</strong> "Resuma as ideias principais em uma frase."',
    s11_comm_op4: '<strong>Adaptar ao público:</strong> "Como você explicaria isso a uma criança de 8 anos?"',
    s11_comm_example: '<strong>Exemplo em Língua:</strong> "Convença seu colega de que o personagem principal tomou a decisão certa."',

    // Colaboração
    s11_collab_title: 'Colaboração',
    s11_collab_desc: 'Trabalhar efetivamente com outros, integrar perspectivas e chegar a consensos.',
    s11_collab_operations: 'Operações cognitivas:',
    s11_collab_op1: '<strong>Integrar perspectivas:</strong> "O que as ideias da sua equipe têm em comum?"',
    s11_collab_op2: '<strong>Negociar consenso:</strong> "Como vocês chegariam a uma solução que considere ambas as posições?"',
    s11_collab_op3: '<strong>Distribuir papéis:</strong> "Como vocês dividiriam as tarefas de acordo com os pontos fortes de cada um?"',
    s11_collab_op4: '<strong>Dar/receber feedback:</strong> "O que você melhoraria na resposta de outra equipe?"',
    s11_collab_example: '<strong>Exemplo transversal:</strong> "Avalie a resposta da outra equipe e dê feedback construtivo."',

    // Gerador de Prompts
    s11_prompt_title: 'O Gerador de Prompts com IA',
    s11_prompt_desc: 'No <strong>Passo 3 do Gerador de Prompts</strong> você encontrará uma seção para selecionar capacidades e operações cognitivas específicas.',
    s11_prompt_step1: '<strong>Escolha a capacidade</strong> que deseja desenvolver (ex: Pensamento crítico)',
    s11_prompt_step2: '<strong>Selecione as operações</strong> específicas (ex: Avaliar evidências, Detectar erros)',
    s11_prompt_step3: '<strong>O prompt gerado</strong> incluirá instruções para a IA criar consignas orientadas a essas operações',
    s11_prompt_note: 'Isso não garante automaticamente o desenvolvimento da capacidade, mas <strong>orienta as consignas</strong> para o tipo de pensamento que você quer fomentar.',

    // ========== SEÇÃO 12 ==========
    s12_title: '12. Uso Intencional da Tecnologia: Um Dispositivo por Equipe',
    s12_lead: 'Traffic Light Game utiliza intencionalmente UM ÚNICO dispositivo por equipe. Isso NÃO é uma limitação técnica ou orçamentária, mas uma <strong>decisão pedagógica fundamentada</strong> para maximizar a interação social e a aprendizagem profunda.',

    s12_problem_title: 'O Problema de "Cada Um com Sua Tela"',
    s12_paradox_title: 'O Paradoxo da Conectividade',
    s12_paradox_desc: 'Em muitas salas de aula, cada estudante tem seu próprio dispositivo (computador, tablet, celular). Paradoxalmente, isso pode <strong>reduzir a interação</strong> em vez de aumentá-la.',

    s12_paradox_header_bad: 'Cada um com seu dispositivo (❌)',
    s12_paradox_header_good: 'Um dispositivo por equipe (✅)',
    s12_paradox_row1_bad: 'Cada estudante olha para sua própria tela',
    s12_paradox_row1_good: 'Todos olham para a mesma tela → discutem',
    s12_paradox_row2_bad: 'Interação reduzida ao mínimo',
    s12_paradox_row2_good: 'Interação OBRIGATÓRIA para avançar',
    s12_paradox_row3_bad: 'Trabalho individual disfarçado de grupal',
    s12_paradox_row3_good: 'Trabalho genuinamente colaborativo',
    s12_paradox_row4_bad: 'O mais rápido termina primeiro (e fica entediado)',
    s12_paradox_row4_good: 'A equipe termina junta (o rápido ajuda)',
    s12_paradox_row5_bad: 'Cópia individual do conteúdo',
    s12_paradox_row5_good: 'Construção coletiva do conhecimento',
    s12_paradox_row6_bad: 'Silêncio constrangedor ("cada um no seu mundo")',
    s12_paradox_row6_good: 'Debate ativo ("colocamos A ou B?")',

    s12_regulation_title: 'O Dispositivo como Regulador de Interações',
    s12_regulation1_title: 'Ponto Focal Compartilhado',
    s12_regulation1_desc: 'A tela única se torna um <strong>ponto focal</strong> em torno do qual a equipe se organiza fisicamente. Todos olham a mesma coisa, veem a mesma coisa, discutem a mesma coisa.',
    s12_regulation2_title: 'Negociação Obrigatória',
    s12_regulation2_desc: 'Com um único dispositivo, a equipe DEVE entrar em acordo antes de responder. Não há como um responder sem consultar os demais. A <strong>negociação de significado</strong> está integrada ao design.',
    s12_regulation3_title: 'Rotação Natural de Papéis',
    s12_regulation3_desc: 'Quem escreve? Quem dita? Quem busca informação? O dispositivo único <strong>força a distribuição de tarefas</strong> e a rotação de papéis dentro da equipe.',
    s12_regulation4_title: 'Visibilidade do Processo',
    s12_regulation4_desc: 'O professor pode ver o que cada equipe faz com UM único olhar. Se cada estudante tivesse sua própria tela, seria impossível monitorar 30 telas simultaneamente.',

    s12_theory_title: 'Fundamento Teórico: SOLE + Cognição Distribuída',
    s12_theory_sole: '<strong>SOLE (Sugata Mitra):</strong> Em seus experimentos, Mitra descobriu que as crianças aprendiam MAIS quando compartilhavam um computador do que quando cada uma tinha o seu. A necessidade de colaborar gerava discussões que aprofundavam a compreensão.',
    s12_theory_hutchins: '<strong>Cognição Distribuída (Hutchins):</strong> O conhecimento não reside apenas na mente individual, mas se distribui entre pessoas e ferramentas. Uma equipe em torno de uma tela é um <strong>sistema cognitivo</strong> mais poderoso que a soma de indivíduos isolados.',

    s12_more_devices_title: 'E se Tivermos Mais Dispositivos que Equipes?',
    s12_complementary_title: 'Usos Complementares (Não Centrais)',
    s12_complementary_desc: 'Se você tiver mais dispositivos disponíveis, pode usá-los como <strong>ferramentas de apoio</strong>, não como telas principais:',
    s12_complementary1: '<strong>Dispositivo de consulta:</strong> Para buscar informações adicionais enquanto outro escreve a resposta',
    s12_complementary2: '<strong>Dispositivo de registro:</strong> Para anotar as discussões da equipe',
    s12_complementary3: '<strong>Dispositivo pessoal (Stage 0):</strong> Para que cada um proponha perguntas ANTES de discuti-las em equipe',
    s12_complementary_note: 'Mas o dispositivo CENTRAL do jogo (onde se respondem as consignas, se avaliam as respostas, se vê a pontuação) é sempre UM por equipe.',

    s12_objections_title: 'Objeções Frequentes',
    s12_objection1_q: 'E se um estudante monopolizar o dispositivo?',
    s12_objection1_a: 'Isso é uma <strong>oportunidade pedagógica</strong>, não um problema. Estabeleça regras claras de rotação ("a cada 5 minutos muda quem escreve") ou intervenha quando vir desequilíbrio. Também é um indicador de dinâmicas de equipe que você pode avaliar.',
    s12_objection2_q: 'E os estudantes introvertidos que não falam?',
    s12_objection2_a: 'Justamente, o dispositivo único os OBRIGA a participar de alguma forma. Atribua papéis rotativos ("agora você lê a pergunta", "agora você escreve a resposta"). Com telas individuais, o introvertido desaparece em sua própria tela.',
    s12_objection3_q: 'Não é mais eficiente cada um trabalhar em paralelo?',
    s12_objection3_a: 'Eficiência ≠ Aprendizagem. Sim, em paralelo terminam mais rápido. Mas o objetivo não é terminar rápido, é <strong>compreender profundamente</strong>. A discussão gerada pelo dispositivo único é exatamente o que produz aprendizado duradouro.',
    s12_objection4_q: 'E se a equipe for muito grande (7-8 estudantes)?',
    s12_objection4_a: 'Se a equipe for grande demais, divida-a. O tamanho ideal é 4-5 estudantes por dispositivo. Com mais de 6, alguns inevitavelmente ficam de fora da discussão.',

    s12_insight_final: 'O uso "baixo" de tecnologia não significa uso POBRE de tecnologia. Significa uso INTELIGENTE. A tecnologia mais sofisticada não é a que tem mais telas, mas a que gera <strong>melhores interações humanas</strong>. Um dispositivo por equipe é uma restrição deliberada que multiplica a aprendizagem.',

    s12_remember_title: 'Para Lembrar',
    s12_remember1: '✅ UM dispositivo por equipe = MAIS debate, MAIS colaboração, MAIS aprendizagem',
    s12_remember2: '✅ A "limitação" é na verdade uma <strong>affordance pedagógica</strong>',
    s12_remember3: '✅ Dispositivos adicionais são COMPLEMENTARES, não centrais',
    s12_remember4: '✅ Se surgirem conflitos pelo dispositivo, são <strong>oportunidades de aprendizagem</strong>',
    s12_remember5: '✅ O professor pode monitorar melhor com menos telas para acompanhar',

    // Tabela comparativa
    s11_comparison_bad_header: 'Consigna sem orientação (❌)',
    s11_comparison_good_header: 'Consigna orientada à capacidade (✅)',
    s11_comparison_row1_bad: '"O que causou a Revolução Francesa?"',
    s11_comparison_row1_good: '"Aqui estão dois historiadores que explicam as causas da Revolução Francesa de forma diferente. Qual apresenta melhor evidência? Justifique."',
    s11_comparison_row2_bad: '"Como se calcula a área do triângulo?"',
    s11_comparison_row2_good: '"Um colega diz que a área do triângulo é base × altura. Outro diz que é (base × altura) / 2. Quem está certo e por quê?"',
    s11_comparison_row3_bad: '"O que é fotossíntese?"',
    s11_comparison_row3_good: '"Explique a uma criança de 8 anos o que é fotossíntese sem usar palavras técnicas."',

    s11_insight: '<strong>Lembre-se:</strong> O conteúdo é o VEÍCULO, a capacidade é o DESTINO. Você pode ensinar pensamento crítico usando qualquer conteúdo curricular. O importante é como você projeta as consignas.',

    s13_title: '13. Preparação para a Autoavaliação',
    s13_warning: '⚠️ Se você for ativar a autoavaliação, é fundamental preparar os alunos ANTES de começar o jogo.',
    s13_before_title: 'O que fazer ANTES do jogo',
    s13_before_list1: 'Explique aos alunos que no final eles deverão refletir sobre o processo',
    s13_before_list2: 'Peça que mantenham um "registro mental" ou anotações breves:',
    s13_before_sub1: 'Quem me ajudou a entender algo?',
    s13_before_sub2: 'A quem eu ajudei?',
    s13_before_sub3: 'Qual conceito foi mais difícil para mim?',
    s13_before_sub4: 'Como me senti trabalhando em equipe?',
    s13_during_title: 'O que fazer DURANTE o jogo',
    s13_during_list1: 'Você pode ter um quadro visível com as perguntas de reflexão',
    s13_during_list2: 'Lembre brevemente entre as etapas de observar as interações',
    s13_when_use_title: 'Quando USAR autoavaliação',
    s13_use_1: '✅ Tópicos que exigem compreensão profunda',
    s13_use_2: '✅ Quando houver tempo suficiente (adicione 10-15 min no final)',
    s13_use_3: '✅ Grupos que já conhecem a dinâmica do jogo',
    s13_use_4: '✅ Quando você quer identificar "especialistas" para o fechamento pedagógico',
    s13_when_not_use_title: 'Quando NÃO usar autoavaliação',
    s13_not_use_1: '❌ Primeira vez que o grupo joga',
    s13_not_use_2: '❌ Tópicos introdutórios ou de revisão rápida',
    s13_not_use_3: '❌ Quando há pouco tempo disponível',
    s13_not_use_4: '❌ Grupos muito grandes onde o fechamento seria difícil de gerenciar',
    s13_tip: '💡 A autoavaliação identifica os alunos mais mencionados como "ajudantes". Esses alunos podem explicar conceitos-chave para o restante do grupo no fechamento pedagógico, reforçando seu próprio aprendizado e o de seus colegas.',
  },
};

const TeacherGuide: React.FC = () => {
  const { language } = useI18n();
  const t = texts[language as keyof typeof texts] || texts.es;
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['seccion-1']));
  const [activeTab, setActiveTab] = useState<'guias' | 'evaluacion'>('guias');

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const sections: Section[] = [
    // SECCIÓN 1: DISEÑO INTENCIONAL
    {
      id: 'seccion-1',
      title: t.s1_title,
      content: (
        <div className="section-body">
          <div className="highlight-box warning">
            <span className="icon">{ICONS.warning}</span>
            <strong>{t.s1_warning_strong}</strong> {t.s1_warning_text}
          </div>

          <h4>{t.s1_heading_fundamento}</h4>

          <div className="theory-card">
            <h5>{ICONS.lightbulb} {t.s1_socratic_title}</h5>
            <p>{t.s1_socratic_desc1}</p>
            <p>{t.s1_socratic_desc2}</p>
          </div>

          <div className="theory-card">
            <h5>{ICONS.group} {t.s1_constructivism_title}</h5>
            <p>{t.s1_constructivism_desc1}</p>
            <p>{t.s1_constructivism_desc2}</p>
          </div>

          <div className="comparison-table">
            <div className="comparison-header">
              <span className="badge bad">{t.s1_comparison_bad_header}</span>
              <span className="badge good">{t.s1_comparison_good_header}</span>
            </div>
            <div className="comparison-row">
              <div className="bad-column">{t.s1_comparison_row1_bad}</div>
              <div className="good-column">{t.s1_comparison_row1_good}</div>
            </div>
            <div className="comparison-row">
              <div className="bad-column">{t.s1_comparison_row2_bad}</div>
              <div className="good-column">{t.s1_comparison_row2_good}</div>
            </div>
            <div className="comparison-row">
              <div className="bad-column">{t.s1_comparison_row3_bad}</div>
              <div className="good-column">{t.s1_comparison_row3_good}</div>
            </div>
            <div className="comparison-row">
              <div className="bad-column">{t.s1_comparison_row4_bad}</div>
              <div className="good-column">{t.s1_comparison_row4_good}</div>
            </div>
            <div className="comparison-row">
              <div className="bad-column">{t.s1_comparison_row5_bad}</div>
              <div className="good-column">{t.s1_comparison_row5_good}</div>
            </div>
            <div className="comparison-row">
              <div className="bad-column">{t.s1_comparison_row6_bad}</div>
              <div className="good-column">{t.s1_comparison_row6_good}</div>
            </div>
          </div>

          <div className="tip-box">
            <h5>{ICONS.teacher} {t.s1_tip_title}</h5>
            <p>{t.s1_tip_intro}</p>
            <ul>
              <li><strong>✅ {t.s1_role1}</strong> - {t.s1_role1_desc}</li>
              <li><strong>✅ {t.s1_role2}</strong> - {t.s1_role2_desc}</li>
              <li><strong>✅ {t.s1_role3}</strong> - {t.s1_role3_desc}</li>
              <li><strong>✅ {t.s1_role4}</strong> - {t.s1_role4_desc}</li>
              <li><strong>✅ {t.s1_role5}</strong> - {t.s1_role5_desc}</li>
            </ul>
            <p className="highlight"><strong>{t.s1_tip_final}</strong></p>
          </div>
        </div>
      )
    },

    // SECCIÓN 2: MODELO DE 3 CAPAS
    {
      id: 'seccion-2',
      title: t.s2_title,
      content: (
        <div className="section-body">
          <p className="lead">{t.s2_lead}</p>

          <div className="layers-container">
            {/* CAPA 1 */}
            <div className="layer-card layer-1">
              <div className="layer-header">
                <span className="layer-badge">{t.s2_layer1_badge}</span>
                <h4>{t.s2_layer1_title}</h4>
                <span className="stage-tag">{t.s2_layer1_stage}</span>
              </div>
              <div className="layer-content">
                <p><strong>{t.s2_what_happens}</strong></p>
                <ul>
                  <li>{t.s2_layer1_list1}</li>
                  <li>{t.s2_layer1_list2}</li>
                  <li>{t.s2_layer1_list3}</li>
                  <li>{t.s2_layer1_list4}</li>
                  <li>{t.s2_layer1_list5}</li>
                </ul>
                <div className="theory-note">
                  <strong>{t.s2_layer1_theory_note}</strong>
                </div>
                <div className="teacher-role">
                  <span className="role-icon">{ICONS.teacher}</span>
                  <strong>{t.s2_layer1_teacher_role}</strong>
                </div>
              </div>
            </div>

            {/* CAPA 2 */}
            <div className="layer-card layer-2">
              <div className="layer-header">
                <span className="layer-badge">{t.s2_layer2_badge}</span>
                <h4>{t.s2_layer2_title}</h4>
                <span className="stage-tag">{t.s2_layer2_stage}</span>
              </div>
              <div className="layer-content">
                <p><strong>{t.s2_what_happens}</strong></p>
                <ul>
                  <li>{t.s2_layer2_list1}</li>
                  <li>{t.s2_layer2_list2}</li>
                  <li>{t.s2_layer2_list3}</li>
                  <li>{t.s2_layer2_list4}</li>
                  <li>{t.s2_layer2_list5}</li>
                </ul>
                <div className="theory-note">
                  <strong>{t.s2_layer2_theory_note}</strong>
                </div>
                <div className="teacher-role">
                  <span className="role-icon">{ICONS.teacher}</span>
                  <strong>{t.s2_layer2_teacher_role}</strong>
                </div>
              </div>
            </div>

            {/* CAPA 3 */}
            <div className="layer-card layer-3">
              <div className="layer-header">
                <span className="layer-badge">{t.s2_layer3_badge}</span>
                <h4>{t.s2_layer3_title}</h4>
                <span className="stage-tag">{t.s2_layer3_stage}</span>
              </div>
              <div className="layer-content">
                <p><strong>{t.s2_what_you_do}</strong></p>
                <ul>
                  <li>{t.s2_layer3_list1}</li>
                  <li>{t.s2_layer3_list2}</li>
                  <li>{t.s2_layer3_list3}</li>
                  <li>{t.s2_layer3_list4}</li>
                  <li>{t.s2_layer3_list5}</li>
                </ul>
                <div className="theory-note">
                  <strong>{t.s2_layer3_theory_note}</strong>
                </div>
                <div className="teacher-role">
                  <span className="role-icon">{ICONS.teacher}</span>
                  <strong>{t.s2_layer3_teacher_role}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },


    // SECCIÓN 3: SISTEMA VERDE/AMARILLO/ROJO
    {
      id: 'seccion-3',
      title: t.s3_title,
      content: (
        <div className="section-body">
          <p className="lead" dangerouslySetInnerHTML={{ __html: t.s3_lead }} />

          {/* LUZ VERDE */}
          <div className="traffic-card green">
            <div className="traffic-header">
              <span className="traffic-light green">{ICONS.green} {t.s3_green_light}</span>
              <span className="points">{t.s3_green_points}</span>
            </div>
            <div className="traffic-content">
              <p><strong>{t.s3_green_meaning_label}</strong> {t.s3_green_meaning_value}</p>
              <p><strong>{t.s3_green_why_label}</strong> <span dangerouslySetInnerHTML={{ __html: t.s3_green_why_value }} /></p>
              <div className="example">
                <strong>{t.s3_green_example_label}</strong>
                <p style={{ whiteSpace: 'pre-line' }}>{t.s3_green_example}</p>
              </div>
              <p><strong>{t.s3_green_perkins_label}</strong> {t.s3_green_perkins_value}</p>
            </div>
          </div>

          {/* LUZ AMARILLA */}
          <div className="traffic-card yellow">
            <div className="traffic-header">
              <span className="traffic-light yellow">{ICONS.yellow} {t.s3_yellow_light}</span>
              <span className="points">{t.s3_yellow_points}</span>
            </div>
            <div className="traffic-content">
              <p><strong>{t.s3_yellow_meaning_label}</strong> {t.s3_yellow_meaning_value}</p>
              <p><strong>{t.s3_yellow_why_label}</strong> <span dangerouslySetInnerHTML={{ __html: t.s3_yellow_why_value }} /></p>
              <div className="example">
                <strong>{t.s3_yellow_example_label}</strong>
                <p style={{ whiteSpace: 'pre-line' }}>{t.s3_yellow_example}</p>
              </div>
              <p><strong>{t.s3_yellow_perkins_label}</strong> {t.s3_yellow_perkins_value}</p>
            </div>
          </div>

          {/* LUZ ROJA */}
          <div className="traffic-card red">
            <div className="traffic-header">
              <span className="traffic-light red">{ICONS.red} {t.s3_red_light}</span>
              <span className="points">{t.s3_red_points}</span>
            </div>
            <div className="traffic-content">
              <p><strong>{t.s3_red_meaning_label}</strong> {t.s3_red_meaning_value}</p>
              <p><strong>{t.s3_red_why_label}</strong> <span dangerouslySetInnerHTML={{ __html: t.s3_red_why_value }} /></p>
              <div className="example">
                <strong>{t.s3_red_example_label}</strong>
                <p style={{ whiteSpace: 'pre-line' }}>{t.s3_red_example}</p>
              </div>
              <p><strong>{t.s3_red_perkins_label}</strong> {t.s3_red_perkins_value}</p>
            </div>
          </div>

          {/* Beneficios Pedagógicos */}
          <div className="benefits-grid">
            <div className="benefit-card">
              <span className="benefit-icon">🎯</span>
              <h5>{t.s3_benefit1_title}</h5>
              <p>{t.s3_benefit1_desc}</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">🧠</span>
              <h5>{t.s3_benefit2_title}</h5>
              <p>{t.s3_benefit2_desc}</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">📊</span>
              <h5>{t.s3_benefit3_title}</h5>
              <p>{t.s3_benefit3_desc}</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">⚠️</span>
              <h5>{t.s3_benefit4_title}</h5>
              <p>{t.s3_benefit4_desc}</p>
            </div>
          </div>

          {/* Tip para el docente */}
          <div className="tip-box">
            <h5>{ICONS.teacher} {t.s3_tip_title}</h5>
            <p dangerouslySetInnerHTML={{ __html: t.s3_tip_text1 }} />
            <p><span className="bad">{t.s3_tip_bad}</span> {t.s3_tip_bad_example}</p>
            <p><span className="good">{t.s3_tip_good}</span> {t.s3_tip_good_example}</p>
            <p className="highlight">{t.s3_tip_highlight}</p>
          </div>
        </div>
      )
    },

    // SECCIÓN 4: STAGE 1 VS STAGE 2 (PERKINS)
    {
      id: 'seccion-4',
      title: t.s4_title,
      content: (
        <div className="section-body">
          <p className="lead" dangerouslySetInnerHTML={{ __html: t.s4_lead }} />

          <div className="stages-comparison">
            {/* STAGE 1 */}
            <div className="stage-card stage-1">
              <div className="stage-header">
                <span className="stage-badge">{t.s4_stage1_badge}</span>
                <h4>{t.s4_stage1_title}</h4>
              </div>
              <div className="stage-content">
                <p><strong>{t.s4_stage1_objective_label}</strong> {t.s4_stage1_objective}</p>
                <ul>
                  <li>{t.s4_stage1_list1}</li>
                  <li>{t.s4_stage1_list2}</li>
                  <li>{t.s4_stage1_list3}</li>
                  <li>{t.s4_stage1_list4}</li>
                  <li>{t.s4_stage1_list5}</li>
                </ul>
                <div className="example">
                  <strong>{t.s4_stage1_example_label}</strong>
                  <ul>
                    <li>{t.s4_stage1_example1}</li>
                    <li>{t.s4_stage1_example2}</li>
                    <li>{t.s4_stage1_example3}</li>
                  </ul>
                </div>
                <div className="teacher-role">
                  <strong>{t.s4_stage1_teacher_role_label}</strong> {t.s4_stage1_teacher_role}
                </div>
                <div className="perkins-level">
                  <strong>{t.s4_stage1_perkins_label}</strong> {t.s4_stage1_perkins}
                </div>
              </div>
            </div>

            {/* STAGE 2 */}
            <div className="stage-card stage-2">
              <div className="stage-header">
                <span className="stage-badge">{t.s4_stage2_badge}</span>
                <h4>{t.s4_stage2_title}</h4>
              </div>
              <div className="stage-content">
                <p><strong>{t.s4_stage2_objective_label}</strong> {t.s4_stage2_objective}</p>
                <ul>
                  <li>{t.s4_stage2_list1}</li>
                  <li>{t.s4_stage2_list2}</li>
                  <li>{t.s4_stage2_list3}</li>
                  <li>{t.s4_stage2_list4}</li>
                  <li>{t.s4_stage2_list5}</li>
                </ul>
                <div className="example">
                  <strong>{t.s4_stage2_example_label}</strong>
                  <ul>
                    <li>{t.s4_stage2_example1}</li>
                    <li>{t.s4_stage2_example2}</li>
                    <li>{t.s4_stage2_example3}</li>
                    <li>{t.s4_stage2_example4}</li>
                  </ul>
                </div>
                <div className="teacher-role">
                  <strong>{t.s4_stage2_teacher_role_label}</strong> {t.s4_stage2_teacher_role}
                </div>
                <div className="perkins-level">
                  <strong>{t.s4_stage2_perkins_label}</strong> {t.s4_stage2_perkins}
                </div>
              </div>
            </div>
          </div>

          {/* Por qué el orden importa */}
          <div className="why-order">
            <h4>{t.s4_why_order_title}</h4>
            <div className="order-reasons">
              <div className="reason">
                <span className="reason-number">1</span>
                <h5>{t.s4_reason1_title}</h5>
                <p>{t.s4_reason1_desc}</p>
              </div>
              <div className="reason">
                <span className="reason-number">2</span>
                <h5>{t.s4_reason2_title}</h5>
                <p>{t.s4_reason2_desc}</p>
              </div>
              <div className="reason">
                <span className="reason-number">3</span>
                <h5>{t.s4_reason3_title}</h5>
                <p>{t.s4_reason3_desc}</p>
              </div>
              <div className="reason">
                <span className="reason-number">4</span>
                <h5>{t.s4_reason4_title}</h5>
                <p>{t.s4_reason4_desc}</p>
              </div>
            </div>
          </div>

          {/* Guía para curar preguntas */}
          <div className="guide-table">
            <h4>{t.s4_guide_title}</h4>
            <table className="criteria-table">
              <thead>
                <tr>
                  <th>{t.s4_table_criterion}</th>
                  <th>{t.s4_table_stage1}</th>
                  <th>{t.s4_table_stage2}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t.s4_table_complexity}</td>
                  <td>{t.s4_table_complexity_stage1}</td>
                  <td>{t.s4_table_complexity_stage2}</td>
                </tr>
                <tr>
                  <td>{t.s4_table_concepts}</td>
                  <td>{t.s4_table_concepts_stage1}</td>
                  <td>{t.s4_table_concepts_stage2}</td>
                </tr>
                <tr>
                  <td>{t.s4_table_response_type}</td>
                  <td>{t.s4_table_response_stage1}</td>
                  <td>{t.s4_table_response_stage2}</td>
                </tr>
                <tr>
                  <td>{t.s4_table_debate}</td>
                  <td>{t.s4_table_debate_stage1}</td>
                  <td>{t.s4_table_debate_stage2}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    },

    // SECCIÓN 5: USO PEDAGÓGICO DE IA
    {
      id: 'seccion-5',
      title: t.s5_title,
      content: (
        <div className="section-body">
          <p className="lead" dangerouslySetInnerHTML={{ __html: t.s5_lead }} />

          <div className="theory-card">
            <h5>{ICONS.ai} {t.s5_philosophy_title}</h5>
            <p dangerouslySetInnerHTML={{ __html: t.s5_philosophy_desc }} />
            <div className="analogy">
              <p>{t.s5_analogy1}</p>
              <p>{t.s5_analogy2}</p>
            </div>
          </div>

          <div className="usage-comparison">
            <h4>{t.s5_comparison_title}</h4>

            <div className="usage-card correct">
              <h5>{ICONS.check} {t.s5_correct_title}</h5>
              <div className="scenario">
                <strong>{t.s5_correct_scenario}</strong>
              </div>
              <div className="prompt">
                <strong>{t.s5_correct_prompt}</strong>
              </div>
              <div className="why-correct">
                <strong>{t.s5_correct_why}</strong>
                <ul>
                  <li>{t.s5_correct_reason1}</li>
                  <li>{t.s5_correct_reason2}</li>
                  <li>{t.s5_correct_reason3}</li>
                  <li>{t.s5_correct_reason4}</li>
                </ul>
              </div>
            </div>

            <div className="usage-card incorrect">
              <h5>{ICONS.cross} {t.s5_incorrect_title}</h5>
              <div className="scenario">
                <strong>{t.s5_incorrect_scenario}</strong>
              </div>
              <div className="prompt">
                <strong>{t.s5_incorrect_prompt}</strong>
              </div>
              <div className="why-incorrect">
                <strong>{t.s5_incorrect_why}</strong>
                <ul>
                  <li>{t.s5_incorrect_reason1}</li>
                  <li>{t.s5_incorrect_reason2}</li>
                  <li>{t.s5_incorrect_reason3}</li>
                  <li>{t.s5_incorrect_reason4}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="tip-box">
            <h5>{ICONS.teacher} {t.s5_tip_title}</h5>
            <p>{t.s5_tip_desc}</p>
            <ul>
              <li>{t.s5_tip1}</li>
              <li>{t.s5_tip2}</li>
              <li>{t.s5_tip3}</li>
              <li>{t.s5_tip4}</li>
            </ul>
          </div>

          <div className="warning-list">
            <h5>{ICONS.warning} {t.s5_warning_title}</h5>
            <ul>
              <li>{t.s5_warning1}</li>
              <li>{t.s5_warning2}</li>
              <li>{t.s5_warning3}</li>
              <li>{t.s5_warning4}</li>
            </ul>
          </div>
        </div>
      )
    },

    // SECCIÓN 6: TEORÍA SOLE (SUGATA MITRA)
    {
      id: 'seccion-6',
      title: t.s6_title,
      content: (
        <div className="section-body">
          <div className="theory-hero">
            <h4>{ICONS.theory} {t.s6_hero_title}</h4>
            <p className="quote">{t.s6_quote}</p>
          </div>

          <div className="theory-card">
            <h5>{t.s6_experiment_title}</h5>
            <p>{t.s6_experiment_desc}</p>
            <p><strong>{t.s6_experiment_key}</strong></p>
          </div>

          <div className="sole-principles">
            <h4>{t.s6_principles_title}</h4>

            <div className="principle">
              <span className="principle-number">1</span>
              <h5>{t.s6_principle1_title}</h5>
              <p>{t.s6_principle1_desc}</p>
            </div>

            <div className="principle">
              <span className="principle-number">2</span>
              <h5>{t.s6_principle2_title}</h5>
              <p>{t.s6_principle2_desc}</p>
            </div>

            <div className="principle">
              <span className="principle-number">3</span>
              <h5>{t.s6_principle3_title}</h5>
              <p>{t.s6_principle3_desc}</p>
            </div>

            <div className="principle">
              <span className="principle-number">4</span>
              <h5>{t.s6_principle4_title}</h5>
              <p>{t.s6_principle4_desc}</p>
            </div>
          </div>

          <div className="insight-box">
            <h5>{ICONS.lightbulb} {t.s6_insight_title}</h5>
            <p dangerouslySetInnerHTML={{ __html: t.s6_insight_desc }} />
          </div>
        </div>
      )
    },

    // SECCIÓN 7: COOPETITION - EL EQUILIBRIO DELICADO
    {
      id: 'seccion-7',
      title: t.s7_title,
      content: (
        <div className="section-body">
          <p className="lead" dangerouslySetInnerHTML={{ __html: t.s7_lead }} />

          <div className="sweet-spot">
            <div className="sweet-spot-visual">
              <span className="collab">{t.s7_sweet_spot_collab}</span>
              <span className="plus">+</span>
              <span className="compete">{t.s7_sweet_spot_compete}</span>
              <span className="equals">=</span>
              <span className="result">{t.s7_sweet_spot_result}</span>
            </div>
          </div>

          <div className="theory-card">
            <h5>{t.s7_why_delicate_title}</h5>
            <p dangerouslySetInnerHTML={{ __html: t.s7_why_delicate_desc }} />
          </div>

          <div className="warning-list bad">
            <h5>{ICONS.cross} {t.s7_corruption_title}</h5>
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t.s7_corruption1 }} />
              <li dangerouslySetInnerHTML={{ __html: t.s7_corruption2 }} />
              <li dangerouslySetInnerHTML={{ __html: t.s7_corruption3 }} />
              <li dangerouslySetInnerHTML={{ __html: t.s7_corruption4 }} />
            </ul>
            <p className="highlight">{t.s7_corruption_highlight}</p>
          </div>

          <div className="tip-box">
            <h5>{ICONS.lightbulb} {t.s7_prevent_title}</h5>
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t.s7_prevent1 }} />
              <li>{t.s7_prevent2}</li>
              <li>{t.s7_prevent3}</li>
              <li>{t.s7_prevent4}</li>
              <li>{t.s7_prevent5}</li>
            </ul>
          </div>
        </div>
      )
    },
    // SECCIÓN 8: EVALUACIÓN CUALITATIVA
    {
      id: 'seccion-8',
      title: t.s8_title,
      content: (
        <div className="section-body">
          <p className="lead">{t.s8_lead}</p>

          <h4>{t.s8_components_title}</h4>

          <div className="evaluation-components">
            {/* Componente 1: Performance Individual */}
            <div className="component-card">
              <div className="component-header weight-40">
                <span className="component-percent">{t.s8_comp1_percent}</span>
                <h5>{t.s8_comp1_title}</h5>
              </div>
              <div className="component-content">
                <p><strong>¿Qué evalúa?</strong> {t.s8_comp1_desc}</p>
                <div className="rubric">
                  <p><span className="bad">{t.s8_comp1_rubric_basic}</span></p>
                  <p><span className="good">{t.s8_comp1_rubric_competent}</span></p>
                  <p><span className="excellent">{t.s8_comp1_rubric_advanced}</span></p>
                </div>
              </div>
            </div>

            {/* Componente 2: Colaboración */}
            <div className="component-card">
              <div className="component-header weight-30">
                <span className="component-percent">{t.s8_comp2_percent}</span>
                <h5>{t.s8_comp2_title}</h5>
              </div>
              <div className="component-content">
                <p><strong>¿Qué evalúa?</strong> {t.s8_comp2_desc}</p>
                <div className="rubric">
                  <p><span className="bad">{t.s8_comp2_rubric_basic}</span></p>
                  <p><span className="good">{t.s8_comp2_rubric_competent}</span></p>
                  <p><span className="excellent">{t.s8_comp2_rubric_advanced}</span></p>
                </div>
              </div>
            </div>

            {/* Componente 3: Metacognición */}
            <div className="component-card">
              <div className="component-header weight-20">
                <span className="component-percent">{t.s8_comp3_percent}</span>
                <h5>{t.s8_comp3_title}</h5>
              </div>
              <div className="component-content">
                <p><strong>¿Qué evalúa?</strong> {t.s8_comp3_desc}</p>
                <div className="rubric">
                  <p><span className="bad">{t.s8_comp3_rubric_basic}</span></p>
                  <p><span className="good">{t.s8_comp3_rubric_competent}</span></p>
                  <p><span className="excellent">{t.s8_comp3_rubric_advanced}</span></p>
                </div>
              </div>
            </div>

            {/* Componente 4: Crecimiento */}
            <div className="component-card">
              <div className="component-header weight-10">
                <span className="component-percent">{t.s8_comp4_percent}</span>
                <h5>{t.s8_comp4_title}</h5>
              </div>
              <div className="component-content">
                <p><strong>¿Qué evalúa?</strong> {t.s8_comp4_desc}</p>
                <div className="rubric">
                  <p><span className="bad">{t.s8_comp4_rubric_basic}</span></p>
                  <p><span className="good">{t.s8_comp4_rubric_competent}</span></p>
                  <p><span className="excellent">{t.s8_comp4_rubric_advanced}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Tip - Flujo de trabajo */}
          <div className="tip-box">
            <h5>{ICONS.teacher} {t.s8_tip_title}</h5>
            <ol>
              <li dangerouslySetInnerHTML={{ __html: t.s8_tip_step1 }} />
              <li dangerouslySetInnerHTML={{ __html: t.s8_tip_step2 }} />
              <li dangerouslySetInnerHTML={{ __html: t.s8_tip_step3 }} />
              <li dangerouslySetInnerHTML={{ __html: t.s8_tip_step4 }} />
            </ol>
            <p dangerouslySetInnerHTML={{ __html: t.s8_tip_key }} />
          </div>
        </div>
      )
    },
    // SECCIÓN 9: DISPOSITIVOS PEDAGÓGICOS OPCIONALES
    {
      id: 'seccion-9',
      title: t.s9_title,
      content: (
        <div className="section-body">
          <p className="lead">{t.s9_lead}</p>

          <div className="modules-grid">
            {/* Módulo 1 */}
            <div className="module-card">
              <span className="module-icon">{t.s9_module1_icon}</span>
              <h5>{t.s9_module1_title}</h5>
              <p className="module-desc"><strong>Momento:</strong> {t.s9_module1_moment}</p>
              <p>{t.s9_module1_desc}</p>
              <ul>
                <li>{t.s9_module1_item1}</li>
                <li>{t.s9_module1_item2}</li>
                <li>{t.s9_module1_item3}</li>
              </ul>
              <p className="module-value"><strong>Valor:</strong> {t.s9_module1_value}</p>
            </div>

            {/* Módulo 2 */}
            <div className="module-card">
              <span className="module-icon">{t.s9_module2_icon}</span>
              <h5>{t.s9_module2_title}</h5>
              <p className="module-desc"><strong>Momento:</strong> {t.s9_module2_moment}</p>
              <p>{t.s9_module2_desc}</p>
              <p className="module-value"><strong>Valor:</strong> {t.s9_module2_value}</p>
            </div>

            {/* Módulo 3 */}
            <div className="module-card">
              <span className="module-icon">{t.s9_module3_icon}</span>
              <h5>{t.s9_module3_title}</h5>
              <p className="module-desc"><strong>Momento:</strong> {t.s9_module3_moment}</p>
              <p>{t.s9_module3_desc}</p>
              <ul>
                <li>{t.s9_module3_item1}</li>
                <li>{t.s9_module3_item2}</li>
                <li>{t.s9_module3_item3}</li>
              </ul>
              <p className="module-value"><strong>Valor:</strong> {t.s9_module3_value}</p>
            </div>

            {/* Módulo 4 */}
            <div className="module-card">
              <span className="module-icon">{t.s9_module4_icon}</span>
              <h5>{t.s9_module4_title}</h5>
              <p className="module-desc"><strong>Momento:</strong> {t.s9_module4_moment}</p>
              <p>{t.s9_module4_desc}</p>
              <p className="module-value"><strong>Valor:</strong> {t.s9_module4_value}</p>
            </div>
          </div>

          {/* Tabla de recomendaciones */}
          <div className="recommendations">
            <h4>{t.s9_recommendations_title}</h4>
            <table className="level-table">
              <thead>
                <tr>
                  <th>{t.s9_table_level}</th>
                  <th>{t.s9_table_modules}</th>
                  <th>{t.s9_table_reason}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t.s9_row_primary_level}</td>
                  <td>{t.s9_row_primary_modules}</td>
                  <td>{t.s9_row_primary_reason}</td>
                </tr>
                <tr>
                  <td>{t.s9_row_secondary_level}</td>
                  <td>{t.s9_row_secondary_modules}</td>
                  <td>{t.s9_row_secondary_reason}</td>
                </tr>
                <tr>
                  <td>{t.s9_row_university_level}</td>
                  <td>{t.s9_row_university_modules}</td>
                  <td>{t.s9_row_university_reason}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    },
    // SECCIÓN 10: LA ERA DE LA INTEGRACIÓN
    {
      id: 'seccion-10',
      title: t.s10_title,
      content: (
        <div className="section-body">
          <div className="book-reference">
            <span className="book-icon">{ICONS.book}</span>
            <h4>{t.s10_book_title}</h4>
            <p className="subtitle">{t.s10_book_subtitle}</p>
          </div>

          <div className="theory-card">
            <h5>{t.s10_central_theory_title}</h5>
            <p dangerouslySetInnerHTML={{ __html: t.s10_central_theory_desc }} />
          </div>

          <div className="bell-curve">
            <h5>{t.s10_bell_curve_title}</h5>
            <div className="curve-explanation">
              <p dangerouslySetInnerHTML={{ __html: t.s10_bell_curve_inferior }} />
              <p dangerouslySetInnerHTML={{ __html: t.s10_bell_curve_superior }} />
              <p dangerouslySetInnerHTML={{ __html: t.s10_bell_curve_center }} />
            </div>
          </div>

          <div className="wilber-connection">
            <h5>{t.s10_wilber_title}</h5>
            <p>{t.s10_wilber_desc}</p>
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t.s10_wilber_yo }} />
              <li dangerouslySetInnerHTML={{ __html: t.s10_wilber_tu }} />
              <li dangerouslySetInnerHTML={{ __html: t.s10_wilber_nosotros }} />
              <li dangerouslySetInnerHTML={{ __html: t.s10_wilber_ellos }} />
            </ul>
            <p>{t.s10_wilber_conclusion}</p>
          </div>

          <div className="closing-reflection">
            <h5>{t.s10_closing_title}</h5>
            <p dangerouslySetInnerHTML={{ __html: t.s10_closing_desc }} />
            <ul>
              <li>{t.s10_closing_list1}</li>
              <li>{t.s10_closing_list2}</li>
              <li>{t.s10_closing_list3}</li>
              <li>{t.s10_closing_list4}</li>
            </ul>
            <p dangerouslySetInnerHTML={{ __html: t.s10_closing_final }} />
          </div>

          <div className="final-message">
            <p className="highlight">{t.s10_final_message}</p>
            <p className="author">{t.s10_final_author}</p>
          </div>
        </div>
      )
    },

    // SECCIÓN 11: DESARROLLO DE CAPACIDADES
    {
      id: 'seccion-11',
      title: t.s11_title,
      content: (
        <div className="section-body">
          <div className="highlight-box warning">
            <span className="icon">{ICONS.target}</span>
            <span dangerouslySetInnerHTML={{ __html: t.s11_highlight }} />
          </div>

          <h4>{t.s11_what_are_title}</h4>

          <div className="theory-card">
            <h5>{ICONS.lightbulb} {t.s11_content_vs_capacity_title}</h5>
            <p dangerouslySetInnerHTML={{ __html: t.s11_content_example }} />
            <p dangerouslySetInnerHTML={{ __html: t.s11_capacity_example }} />
            <p className="highlight" dangerouslySetInnerHTML={{ __html: t.s11_capacity_transfer }} />
          </div>

          <h4>{t.s11_capacities_title}</h4>

          <div className="capacities-grid">
            {/* Pensamiento Crítico */}
            <div className="capacity-card critical">
              <div className="capacity-header">
                <span className="capacity-icon">🧠</span>
                <h5>{t.s11_critical_title}</h5>
              </div>
              <div className="capacity-content">
                <p><strong>{t.s11_critical_desc}</strong></p>
                <p>{t.s11_critical_operations}</p>
                <ul>
                  <li dangerouslySetInnerHTML={{ __html: t.s11_critical_op1 }} />
                  <li dangerouslySetInnerHTML={{ __html: t.s11_critical_op2 }} />
                  <li dangerouslySetInnerHTML={{ __html: t.s11_critical_op3 }} />
                  <li dangerouslySetInnerHTML={{ __html: t.s11_critical_op4 }} />
                </ul>
                <p className="example" dangerouslySetInnerHTML={{ __html: t.s11_critical_example }} />
              </div>
            </div>

            {/* Resolución de Problemas */}
            <div className="capacity-card problem">
              <div className="capacity-header">
                <span className="capacity-icon">🔍</span>
                <h5>{t.s11_problem_title}</h5>
              </div>
              <div className="capacity-content">
                <p><strong>{t.s11_problem_desc}</strong></p>
                <p>{t.s11_problem_operations}</p>
                <ul>
                  <li dangerouslySetInnerHTML={{ __html: t.s11_problem_op1 }} />
                  <li dangerouslySetInnerHTML={{ __html: t.s11_problem_op2 }} />
                  <li dangerouslySetInnerHTML={{ __html: t.s11_problem_op3 }} />
                  <li dangerouslySetInnerHTML={{ __html: t.s11_problem_op4 }} />
                </ul>
                <p className="example" dangerouslySetInnerHTML={{ __html: t.s11_problem_example }} />
              </div>
            </div>

            {/* Comunicación */}
            <div className="capacity-card communication">
              <div className="capacity-header">
                <span className="capacity-icon">💬</span>
                <h5>{t.s11_comm_title}</h5>
              </div>
              <div className="capacity-content">
                <p><strong>{t.s11_comm_desc}</strong></p>
                <p>{t.s11_comm_operations}</p>
                <ul>
                  <li dangerouslySetInnerHTML={{ __html: t.s11_comm_op1 }} />
                  <li dangerouslySetInnerHTML={{ __html: t.s11_comm_op2 }} />
                  <li dangerouslySetInnerHTML={{ __html: t.s11_comm_op3 }} />
                  <li dangerouslySetInnerHTML={{ __html: t.s11_comm_op4 }} />
                </ul>
                <p className="example" dangerouslySetInnerHTML={{ __html: t.s11_comm_example }} />
              </div>
            </div>

            {/* Trabajo Colaborativo */}
            <div className="capacity-card collaboration">
              <div className="capacity-header">
                <span className="capacity-icon">🤝</span>
                <h5>{t.s11_collab_title}</h5>
              </div>
              <div className="capacity-content">
                <p><strong>{t.s11_collab_desc}</strong></p>
                <p>{t.s11_collab_operations}</p>
                <ul>
                  <li dangerouslySetInnerHTML={{ __html: t.s11_collab_op1 }} />
                  <li dangerouslySetInnerHTML={{ __html: t.s11_collab_op2 }} />
                  <li dangerouslySetInnerHTML={{ __html: t.s11_collab_op3 }} />
                  <li dangerouslySetInnerHTML={{ __html: t.s11_collab_op4 }} />
                </ul>
                <p className="example" dangerouslySetInnerHTML={{ __html: t.s11_collab_example }} />
              </div>
            </div>
          </div>

          <h4>{t.s11_prompt_title}</h4>

          <div className="tip-box">
            <h5>{ICONS.ai} {t.s11_prompt_title}</h5>
            <p dangerouslySetInnerHTML={{ __html: t.s11_prompt_desc }} />
            <ol>
              <li dangerouslySetInnerHTML={{ __html: t.s11_prompt_step1 }} />
              <li dangerouslySetInnerHTML={{ __html: t.s11_prompt_step2 }} />
              <li dangerouslySetInnerHTML={{ __html: t.s11_prompt_step3 }} />
            </ol>
            <p className="highlight" dangerouslySetInnerHTML={{ __html: t.s11_prompt_note }} />
          </div>

          <div className="comparison-table">
            <div className="comparison-header">
              <span className="badge bad">{t.s11_comparison_bad_header}</span>
              <span className="badge good">{t.s11_comparison_good_header}</span>
            </div>
            <div className="comparison-row">
              <div className="bad-column">{t.s11_comparison_row1_bad}</div>
              <div className="good-column">{t.s11_comparison_row1_good}</div>
            </div>
            <div className="comparison-row">
              <div className="bad-column">{t.s11_comparison_row2_bad}</div>
              <div className="good-column">{t.s11_comparison_row2_good}</div>
            </div>
            <div className="comparison-row">
              <div className="bad-column">{t.s11_comparison_row3_bad}</div>
              <div className="good-column">{t.s11_comparison_row3_good}</div>
            </div>
          </div>

          <div className="insight-box">
            <span className="insight-icon">{ICONS.lightbulb}</span>
            <p dangerouslySetInnerHTML={{ __html: t.s11_insight }} />
          </div>
        </div>
      )
    },
    // SECCIÓN 12: USO INTENCIONAL DE LA TECNOLOGÍA
    {
      id: 'seccion-12',
      title: t.s12_title,
      content: (
        <div className="section-body">
          <div className="highlight-box warning">
            <span className="icon">{ICONS.warning}</span>
            <span dangerouslySetInnerHTML={{ __html: t.s12_lead }} />
          </div>

          <h4>{t.s12_problem_title}</h4>

          <div className="theory-card">
            <h5>{ICONS.warning} {t.s12_paradox_title}</h5>
            <p dangerouslySetInnerHTML={{ __html: t.s12_paradox_desc }} />
            <div className="comparison-table">
              <div className="comparison-header">
                <span className="badge bad">{t.s12_paradox_header_bad}</span>
                <span className="badge good">{t.s12_paradox_header_good}</span>
              </div>
              <div className="comparison-row">
                <div className="bad-column">{t.s12_paradox_row1_bad}</div>
                <div className="good-column">{t.s12_paradox_row1_good}</div>
              </div>
              <div className="comparison-row">
                <div className="bad-column">{t.s12_paradox_row2_bad}</div>
                <div className="good-column">{t.s12_paradox_row2_good}</div>
              </div>
              <div className="comparison-row">
                <div className="bad-column">{t.s12_paradox_row3_bad}</div>
                <div className="good-column">{t.s12_paradox_row3_good}</div>
              </div>
              <div className="comparison-row">
                <div className="bad-column">{t.s12_paradox_row4_bad}</div>
                <div className="good-column">{t.s12_paradox_row4_good}</div>
              </div>
              <div className="comparison-row">
                <div className="bad-column">{t.s12_paradox_row5_bad}</div>
                <div className="good-column">{t.s12_paradox_row5_good}</div>
              </div>
              <div className="comparison-row">
                <div className="bad-column">{t.s12_paradox_row6_bad}</div>
                <div className="good-column">{t.s12_paradox_row6_good}</div>
              </div>
            </div>
          </div>

          <h4>{t.s12_regulation_title}</h4>

          <div className="regulation-cards">
            <div className="regulation-card">
              <span className="regulation-icon">🎯</span>
              <h5>{t.s12_regulation1_title}</h5>
              <p dangerouslySetInnerHTML={{ __html: t.s12_regulation1_desc }} />
            </div>
            <div className="regulation-card">
              <span className="regulation-icon">⚖️</span>
              <h5>{t.s12_regulation2_title}</h5>
              <p dangerouslySetInnerHTML={{ __html: t.s12_regulation2_desc }} />
            </div>
            <div className="regulation-card">
              <span className="regulation-icon">🔄</span>
              <h5>{t.s12_regulation3_title}</h5>
              <p dangerouslySetInnerHTML={{ __html: t.s12_regulation3_desc }} />
            </div>
            <div className="regulation-card">
              <span className="regulation-icon">👁️</span>
              <h5>{t.s12_regulation4_title}</h5>
              <p dangerouslySetInnerHTML={{ __html: t.s12_regulation4_desc }} />
            </div>
          </div>

          <div className="theory-card">
            <h5>{ICONS.theory} {t.s12_theory_title}</h5>
            <p dangerouslySetInnerHTML={{ __html: t.s12_theory_sole }} />
            <p dangerouslySetInnerHTML={{ __html: t.s12_theory_hutchins }} />
          </div>

          <h4>{t.s12_more_devices_title}</h4>

          <div className="tip-box">
            <h5>{ICONS.lightbulb} {t.s12_complementary_title}</h5>
            <p dangerouslySetInnerHTML={{ __html: t.s12_complementary_desc }} />
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t.s12_complementary1 }} />
              <li dangerouslySetInnerHTML={{ __html: t.s12_complementary2 }} />
              <li dangerouslySetInnerHTML={{ __html: t.s12_complementary3 }} />
            </ul>
            <p className="highlight" dangerouslySetInnerHTML={{ __html: t.s12_complementary_note }} />
          </div>

          <h4>{t.s12_objections_title}</h4>

          <div className="objections-grid">
            <div className="objection-card">
              <h5>{t.s12_objection1_q}</h5>
              <p dangerouslySetInnerHTML={{ __html: t.s12_objection1_a }} />
            </div>
            <div className="objection-card">
              <h5>{t.s12_objection2_q}</h5>
              <p dangerouslySetInnerHTML={{ __html: t.s12_objection2_a }} />
            </div>
            <div className="objection-card">
              <h5>{t.s12_objection3_q}</h5>
              <p dangerouslySetInnerHTML={{ __html: t.s12_objection3_a }} />
            </div>
            <div className="objection-card">
              <h5>{t.s12_objection4_q}</h5>
              <p dangerouslySetInnerHTML={{ __html: t.s12_objection4_a }} />
            </div>
          </div>

          <div className="insight-box">
            <span className="insight-icon">{ICONS.lightbulb}</span>
            <p dangerouslySetInnerHTML={{ __html: t.s12_insight_final }} />
          </div>

          <div className="tip-box">
            <h5>{ICONS.teacher} {t.s12_remember_title}</h5>
            <ul>
              <li dangerouslySetInnerHTML={{ __html: t.s12_remember1 }} />
              <li dangerouslySetInnerHTML={{ __html: t.s12_remember2 }} />
              <li>{t.s12_remember3}</li>
              <li dangerouslySetInnerHTML={{ __html: t.s12_remember4 }} />
              <li>{t.s12_remember5}</li>
            </ul>
          </div>
        </div>
      )
    },

    // ============================================
    // 🆕 SECCIÓN 13: Preparación para la Autoevaluación
    // ============================================
    {
      id: 'seccion-13',
      title: t.s13_title,
      content: (
        <div className="section-body">
          <div className="highlight-box warning">
            <span className="icon">{ICONS.warning}</span>
            <strong>{t.s13_warning}</strong>
          </div>

          <h4>{t.s13_before_title}</h4>
          <ul>
            <li>{t.s13_before_list1}</li>
            <li>
              {t.s13_before_list2}
              <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                <li>{t.s13_before_sub1}</li>
                <li>{t.s13_before_sub2}</li>
                <li>{t.s13_before_sub3}</li>
                <li>{t.s13_before_sub4}</li>
              </ul>
            </li>
          </ul>

          <h4>{t.s13_during_title}</h4>
          <ul>
            <li>{t.s13_during_list1}</li>
            <li>{t.s13_during_list2}</li>
          </ul>

          <h4>{t.s13_when_use_title}</h4>
          <ul>
            <li>{t.s13_use_1}</li>
            <li>{t.s13_use_2}</li>
            <li>{t.s13_use_3}</li>
            <li>{t.s13_use_4}</li>
          </ul>

          <h4>{t.s13_when_not_use_title}</h4>
          <ul>
            <li>{t.s13_not_use_1}</li>
            <li>{t.s13_not_use_2}</li>
            <li>{t.s13_not_use_3}</li>
            <li>{t.s13_not_use_4}</li>
          </ul>

          <div className="tip-box">
            <p>{t.s13_tip}</p>
          </div>
        </div>
      )
    }
  ];
// ✨ Efecto para manejar el hash de la URL (expandir sección y hacer scroll)
useEffect(() => {
  const hash = location.hash.replace('#', ''); // usamos location de useLocation
  if (hash) {
    const sectionExists = sections.some(s => s.id === hash);
    if (sectionExists) {
      // Expandir la sección
      setExpandedSections(prev => new Set([...prev, hash]));

      // Pequeño retraso para que el DOM se actualice y luego hacer scroll
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }
}, [location.hash]); // Dependencia: solo cuando cambia el hash

  return (
    <div className="teacher-guide-container">
      <div className="teacher-guide-header">
        <h1>{t.headerTitle}</h1>
        <p className="subtitle">{t.headerSubtitle}</p>
        <div className="header-tabs">
          <button
            className={`tab-button ${activeTab === 'guias' ? 'active' : ''}`}
            onClick={() => setActiveTab('guias')}
          >
            {t.tabGuides}
          </button>
          <button
            className={`tab-button ${activeTab === 'evaluacion' ? 'active' : ''}`}
            onClick={() => setActiveTab('evaluacion')}
          >
            {t.tabEvaluation}
          </button>
        </div>
      </div>

      <div className="guide-layout">
        <aside className="guide-sidebar">
          <div className="sidebar-header">
            <h3>📑 Contenido</h3>
            <span className="sections-count">{sections.length} secciones</span>
          </div>
          <nav className="sidebar-nav">
            {sections.map(section => (
              <button
                key={section.id}
                className={`nav-item ${expandedSections.has(section.id) ? 'active' : ''}`}
                onClick={() => {
                  toggleSection(section.id);
                  document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {section.title.split(':')[0]}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="traffic-mini">
              <span className="light green">{ICONS.green} 5pts</span>
              <span className="light yellow">{ICONS.yellow} 10pts</span>
              <span className="light red">{ICONS.red} 12pts</span>
            </div>
            <p className="version">v2.1 · Pedagogía Activa</p>
          </div>
        </aside>

        <main className="guide-content">
          {sections.map(section => (
            <article
              key={section.id}
              id={section.id}
              className={`guide-section ${expandedSections.has(section.id) ? 'expanded' : 'collapsed'}`}
            >
              <div
                className="section-header"
                onClick={() => toggleSection(section.id)}
              >
                <h2>{section.title}</h2>
                <button className="expand-button">
                  {expandedSections.has(section.id) ? '▼' : '▶'}
                </button>
              </div>

              {expandedSections.has(section.id) && section.content}
            </article>
          ))}

          <div className="guide-footer">
            <p>{t.footerText1}</p>
            <p>{t.footerText2}</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherGuide;