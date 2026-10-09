// src/i18n/es.ts
// Traducciones en Español

export const es = {
  // ============================================
  // COMÚN
  // ============================================
  common: {
    loading: "Cargando...",
    error: "Error",
    save: "Guardar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    delete: "Eliminar",
    edit: "Editar",
    back: "Atrás",
    next: "Siguiente",
    continue: "Continuar",
    continueVerb: "Continuar",
    close: "Cerrar",
    search: "Buscar",
    filter: "Filtrar",
    all: "Todos",
    yes: "Sí",
    no: "No",
    or: "o",

    // Extras
    retry: "Reintentar",
    ok: "OK",
    copy: "Copiar",

    // Plurales usados en UI
    teams: "equipos",
    questions: "preguntas",
    admin: "Admin",
  },

  // ============================================
  // AUTH
  // ============================================
  auth: {
    login: "Iniciar sesión",
    logout: "Cerrar sesión",
    loginWithGoogle: "Iniciar sesión con Google",
    loginSubtitle: "Ingresá con tu cuenta de Google para comenzar",
    welcomeBack: "¡Bienvenido de nuevo!",
  },

  // ============================================
  // DASHBOARD
  // ============================================
  dashboard: {
    title: "Panel del Docente",
    welcome: "¡Hola!",
    teacherFallbackName: "Docente",
    viewResults: "Ver resultados",
    goToPodium: "Ir al podio",

    createGame: "Crear nuevo juego",
    createGameDesc: "Armá equipos y consignas para empezar a jugar en minutos.",

    library: "Biblioteca de preguntas",
    libraryDesc: "Explorá juegos oficiales y de la comunidad e importalos al instante.",

    myGames: "Mis juegos",
    active: "activos",

    noGames: "No tenés juegos activos",
    startFirst: "¡Creá tu primer juego!",

    selectGameMode: "Seleccioná el modo de juego",
    selectGameModeSubtitle: "Elegí según la edad de tus estudiantes",
    // En la sección dashboard, agrega:
    evaluationsTitle: "Evaluaciones para revisar",
    moreGames: "juegos más",
    // Games list
    loadingGames: "Cargando juegos...",
    noGamesCreated: "Todavía no creaste ningún juego.",
    finishedGames: "juegos finalizados",
    unnamedGame: "Juego sin nombre",

    // Current mode panel
    currentMode: "Modo actual",

    // Footer
    aboutThisProject: "Sobre este proyecto",

    // Status labels (GameCard)
    status: {
      finished: "Finalizado",
      stage0Proposals: "Stage 0 — Propuestas",
      collectingProposals: "Recibiendo propuestas",
      curatingProposals: "Curando propuestas",
      stage1Playing: "Stage 1 — En juego",
      transitionStage2: "Preparando Stage 2",
      stage2Playing: "Stage 2 — En juego",
      preparing: "Preparando",
    },

    // Relative time (GameCard)
    time: {
      minutesAgo: (n: number) => `hace ${n} min`,
      hoursAgo: (n: number) => `hace ${n} h`,
      daysAgo: (n: number) => `hace ${n} d`,
    },
  },

  // ============================================
  // JOIN (ALUMNOS)  ✅ ÚNICA DEFINICIÓN
  // ============================================
  join: {
    appTitle: "Juego del Semáforo",

    // Texto superior
    welcomeBack: "¡Bienvenido de vuelta!",
    enterRoomCode: "Ingresá el código de la sala",
    selectTeam: "Seleccioná tu equipo",

    // Sesión guardada
    previousSessionFound: "Sesión anterior encontrada",
    codeLabel: "Código",
    reconnecting: "Reconectando...",
    goBackToGame: "↩️ Volver al juego",
    newSession: "Nuevo",

    // Separador
    orEnterNewCode: "o ingresá un código nuevo",

    // Errores
    couldntReconnect: "No se pudo reconectar. Intentá con el código de sala.",
    codeMustBe6: "El código debe tener 6 caracteres",
    invalidCode: "Código inválido",
    lookupError: "Error al buscar el código. Intentá de nuevo.",
    noTeamsConfigured: "Este juego no tiene equipos configurados",

    // Botones / acciones
    searching: "Buscando...",
    findRoom: "Buscar sala →",
    codeOnTeacherScreen: "El código está en la pantalla del docente",

    // Banners de fase
    proposalsActive: "Etapa de propuestas activa",
    proposalsDesc: "Tu equipo va a crear consignas para el juego",
    waitingTeacher: "Esperando al profesor",
    waitingDesc: "El juego está siendo preparado",

    // Botón volver
    changeCode: "← Cambiar código",

    // Texto del botón según fase
    joinProposals: "¡Proponer consignas! 📝",
    joinWaiting: "Entrar a la sala 🚪",
    joinNormal: "¡Unirme! 🎮",
  },

  // ============================================
  // GAME MODES
  // ============================================
  gameModes: {
    trafficLight: {
      title: "Traffic Light Game",
      subtitle: "El Juego del Semáforo",
      description: "Ideal para estudiantes de primaria. Interfaz colorida y amigable.",
      ageRange: "Menores de 13 años",
    },
    coopetition: {
      title: "The Coopetition Game",
      subtitle: "Donde la competencia encuentra la colaboración",
      description: "Para adolescentes y adultos. Diseño más profesional y sobrio.",
      ageRange: "+13 años",
    },
  },

  // ============================================
  // SETUP
  // ============================================
  setup: {
    title: "Configurar Nuevo Juego",
    step1: "Paso 1: Información Básica",
    step2: "Paso 2: Preguntas",
    step3: "Paso 3: Configurar Equipos",
    step4: "Paso 4: ¡Listo para Jugar!",

    // Step 1
    language: "Idioma",
    spanish: "Español",
    english: "Inglés",
    className: "Nombre de la clase",
    classNamePlaceholder: "3°A - Matemática",
    subject: "Materia",
    subjectPlaceholder: "Matemática",
    numTeams: "Cantidad de equipos",
    studentsPerTeam: "Alumnos por equipo",

    // Stage 0
    stage0Section: "Etapa 0: Preparación (opcional)",
    stage0Enable: "Habilitar etapa de preparación grupal",
    stage0Desc: "Los equipos tendrán acceso a material de estudio antes de comenzar el juego.",
    stage0Warning:
      "💡 ¿Primera vez jugando? Recomendamos saltar la Etapa 0 y usar un juego de la biblioteca. La Etapa 0 está pensada para estudiantes que ya conocen la dinámica del juego.",
    stage0MaterialType: "Tipo de material",
    stage0MaterialLink: "Link externo",
    stage0MaterialText: "Texto",
    stage0MaterialTitle: "Título del material",
    stage0MaterialContent: "Contenido",
    stage0MaterialLinkPlaceholder: "https://docs.google.com/...",
    stage0MaterialTextPlaceholder: "Pegá aquí el texto que los equipos deben leer...",
    stage0GeneratePrompt: "¿Necesitás generar material? Usá este prompt con ChatGPT",

    // Step 2
    chooseFromLibrary: "Elegir de la biblioteca",
    orUploadFile: "O subir archivo propio:",
    uploadCSV: "Subir archivo CSV",
    loadedFromLibrary: "Cargado desde biblioteca:",
    questionsLoaded: "preguntas cargadas",
    analyzing: "Analizando CSV...",

    // Step 3
    enterNames: "Ingresá los nombres (uno por línea)",
    assignRandom: "Asignar aleatoriamente",
    totalStudents: "Total:",
    uniqueStudents: "Únicos:",
    duplicates: "Duplicados:",
    duplicatesNote: "Se ignoran duplicados al armar los equipos.",
    duplicatesFound: "Duplicados detectados:",
    teamsConfigured: "Equipos configurados",
    moveStudentsHint: "Podés mover estudiantes entre equipos seleccionando el equipo destino",

    // Step 4
    roomCode: "Código de sala",
    shareCode: "Compartí este código con tus estudiantes",
    stage0Enabled: "Etapa 0 habilitada. Los equipos verán el material de preparación.",
    startGame: "Comenzar Juego",
    createGame: "Crear Juego",

    // ========== NUEVAS CLAVES PARA EL TOOLTIP ==========
    selfEvaluationTooltip: '💡 Tip importante: Antes de empezar el juego, avisá a tus alumnos que lleven registro mental de quién los ayudó y a quién ayudaron. Esto mejora significativamente la calidad de las respuestas en la autoevaluación.',
    selfEvaluationGuideLink: '📖 Ver guía completa',
  },

  // ============================================
  // LIBRARY
  // ============================================
  library: {
    title: "Biblioteca",
    pageTitle: "Bancos de Preguntas",
    pageSubtitle: "Explorá preguntas organizadas por nivel, área y materia.",

    // Filters
    game: "Juego",
    grade: "Grado",
    area: "Área",
    subject: "Materia",
    searchPlaceholder: "Buscar por título, tema o contenido...",
    showing: "Mostrando",
    of: "de",
    items: "ítems",

    // Card
    use: "Usar",
    moreInfo: "Más info",
    lessInfo: "Menos",
    contents: "Contenidos",
    skills: "Habilidades",
    questions: "preguntas",
    noFile: "Sin archivo",
    loading: "Cargando...",

    // Stats
    withFile: "con archivo",

    // Empty
    noResults: "No se encontraron ítems con los filtros seleccionados.",

    // Admin
    adminTitle: "Administración",
    adminDesc: "Como administrador, podés subir nuevos bancos de preguntas.",
    uploadSingle: "Subir individual",
    bulkUpload: "Carga masiva",
  },

  // ============================================
  // STAGE 0 - PROPUESTAS DE CONSIGNAS
  // ============================================
  stage0: {
    // Títulos
    title: "Etapa 0: Preparación",
    subtitle: "Lean el material antes de comenzar el juego",
    teacherTitle: "Panel Etapa 0",
    teacherSubtitle: "Revisá las propuestas de los equipos",

    // Material
    teamName: "Equipo:",
    materialTitle: "Material de estudio",
    openLink: "Abrir material",
    noMaterial: "El docente no ha cargado material de preparación.",
    readCarefully: "Lean con atención, este contenido les ayudará en el juego.",

    // Fases
    phaseReading: "Fase: Lectura",
    phaseProposing: "Fase: Propuestas",
    phaseReviewing: "Fase: Revisión",
    phaseResults: "Fase: Resultados",

    // Acciones del docente
    startProposals: "Iniciar propuestas",
    startReview: "Iniciar revisión",
    finishAndStart: "Finalizar y comenzar Etapa 1",

    // Propuestas - Formulario
    proposalsTitle: "Proponer Consignas",
    proposalsSubtitle: "Propongan consignas basadas en el material",
    proposalCount: "propuestas",
    addProposal: "Agregar consigna",
    proposalType: "Tipo de consigna",
    questionText: "Tu consigna",
    questionPlaceholder: "Escribí la consigna que proponés...",
    hintLabel: "Pista para responder (opcional)",
    hintPlaceholder: "Una pista que ayude a pensar la respuesta...",
    relatedTopicLabel: "¿Con qué tema se relaciona?",
    relatedTopicPlaceholder: "Ej: Ciclo del agua, Fracciones...",
    submittedByLabel: "¿Quién la propone? (opcional)",
    submittedByPlaceholder: "Nombre del integrante...",
    submit: "Enviar consigna",

    // Tipos de propuesta
    typeComprehension: "📝 Comprensión",
    typeComprehensionDesc: "¿Qué significa...? / Explicá con tus palabras...",
    typeRelation: "🔗 Relación con otros temas",
    typeRelationDesc: "¿Cómo se conecta con...? / ¿Qué similitudes hay con...?",
    typeApplication: "🌍 Aplicación práctica",
    typeApplicationDesc: "¿Dónde se ve en la vida real? / ¿Cómo usarías...?",
    typeAnalysis: "🤔 Análisis / Opinión",
    typeAnalysisDesc: "¿Por qué crees que...? / ¿Qué pasaría si...?",
    typeProduction: "💡 Producción",
    typeProductionDesc: "Dibujá / Representá / Ordená los pasos...",

    // Estado de propuestas
    pending: "Pendiente",
    approved: "Aprobada",
    rejected: "Rechazada",
    edited: "Editada",

    // Equipo listo
    markReady: "Terminamos de proponer",
    unmarkReady: "Queremos seguir proponiendo",
    teamReady: "¡Equipo listo!",
    waitingReview: "Esperando que el docente revise las propuestas...",
    waiting: "Esperando que el docente inicie el juego...",

    // Timer
    timeRemaining: "Tiempo restante",

    // Resultados
    resultsTitle: "Resultados Etapa 0",
    approvedCount: "consignas aprobadas",
    bonusPoints: "puntos bonus",
    waitingStart: "Esperando que el docente inicie Etapa 1...",

    // Errores
    errorEmpty: "Escribí una consigna",
    errorRelated: "Indicá con qué tema se relaciona",
    maxReached: "Ya enviaron el máximo de consignas",

    // Panel docente - Filtros
    filterAll: "Todas",
    filterPending: "Pendientes",
    filterApproved: "Aprobadas",
    filterRejected: "Rechazadas",
    allTeams: "Todos los equipos",

    // Panel docente - Stats
    totalProposals: "Total propuestas",
    pendingCount: "Pendientes",
    approvedCountLabel: "Aprobadas",
    rejectedCount: "Rechazadas",
    teamsReady: "Equipos listos",

    // Panel docente - Acciones
    proposedBy: "Propuesto por",
    relatedTo: "Relacionado con",
    hint: "Pista",
    approve: "Aprobar",
    reject: "Rechazar",
    edit: "Editar",
    saveEdit: "Guardar",
    cancelEdit: "Cancelar",
    bonusLabel: "Puntos bonus",

    // Panel docente - Vacío
    noProposals: "No hay propuestas todavía",
    noProposalsFiltered: "No hay propuestas con estos filtros",

    // Panel docente - Confirmaciones
    pendingWarning: "Hay propuestas pendientes de revisar",
    confirmStart: "¿Iniciar Etapa 1? Los puntos bonus se aplicarán automáticamente.",

    // Guardar en biblioteca
    saveToLibrary: "Guardar en mi biblioteca",
    savedToLibrary: "¡Guardada en biblioteca!",

    // Setup
    enableProposals: "Habilitar propuestas de consignas",
    enableProposalsDesc:
      "Los equipos podrán proponer consignas basadas en el material. Vos decidís cuáles aprobar y cuántos puntos asignar.",
    maxProposalsPerTeam: "Máx. consignas por equipo",
    timeLimitOptional: "Tiempo límite (opcional)",
    noLimit: "Sin límite",
  },

  // ============================================
  // GAME
  // ============================================
  game: {
    stage1: "Etapa 1: Calificación Individual",
    stage2: "Etapa 2: Colaboración Grupal",
    round: "Ronda",
    question: "Pregunta",
    hint: "Pista",
    timeLeft: "Tiempo restante",
    submit: "Enviar",
    correct: "¡Correcto!",
    incorrect: "Incorrecto",
    waiting: "Esperando...",
    results: "Resultados",
    winner: "¡Ganador!",
    score: "Puntuación",
    team: "Equipo",
    player: "Jugador",
  },

  // ============================================
  // ERRORS
  // ============================================
  errors: {
    generic: "Algo salió mal. Intentá de nuevo.",
    loadingCSV: "Error al cargar el archivo. Intentá de nuevo.",
    creatingGame: "Error al crear el juego.",
    startingGame: "Error al iniciar el juego.",
    completeFields: "Completá el nombre de la clase y la materia.",
    uploadCSV: "Subí un archivo CSV con preguntas.",
    assignStudents: "Asigná los estudiantes a los equipos.",
    enterStudentNames: "Primero ingresá los nombres de los estudiantes.",

    deletingGame: "Error al eliminar el juego.",
    notAuthorized: "No tenés permisos para hacer esto.",
    notFound: "No encontrado.",
  },

  // ============================================
  // GRADES
  // ============================================
  grades: {
    "3°": "3° Primaria",
    "4°": "4° Primaria",
    "5°": "5° Primaria",
    "6°": "6° Primaria",
    "7°": "7° Primaria",
    secondary: "Secundario",
  },

  // ============================================
  // CSV PARSER (warnings/errors por code)
  // ============================================
  csv: {
    warnings: {
      noValidHeadersFallback:
        "ℹ️ Este CSV no tenía encabezados válidos. Se interpretaron columnas por posición y se generaron IDs si faltaban.",
      encodingIssuesPossible:
        "⚠️ El archivo puede tener problemas de encoding (acentos incorrectos). Considerá guardarlo como UTF-8.",
      repeatedHeaderIgnored: "Fila {{rowNumber}}: encabezado repetido (se ignoró).",
      missingQuestionTextIgnored: "Fila {{rowNumber}}: sin texto de pregunta (se ignoró).",
      invalidSuggestedStageDefaulted:
        "Fila {{rowNumber}}: suggestedStage inválido (\"{{value}}\"). Se usó Stage {{defaultStage}}.",
    },
    errors: {
      emptyCsvFile: "El archivo CSV está vacío.",
      noValidQuestionsFound: "No se encontraron preguntas válidas en el CSV.",
      papaparseError: "Error al leer el CSV: {{message}} (fila {{row}}).",
      cannotReadCsv: "No se pudo leer el CSV: {{message}}.",
      cannotReadCsvFallback: "No se pudo leer el CSV (fallback): {{message}}.",
    },
  },

  // ============================================
  // CSV PREVIEW
  // ============================================
  csvPreview: {
    title: "Vista Previa de Importación",
    totalRows: "Filas totales",
    validQuestions: "Preguntas válidas",
    warnings: "Advertencias",
    errors: "Errores",
    validQuestionsTitle: "Preguntas Válidas",
    editBeforeImport: "Podés editar antes de importar",
    question: "Pregunta",
    hint: "Pista",
    noHint: "Sin pista",
    stage: "Etapa",
    cancel: "Cancelar",
    import: "Importar",
    questions: "preguntas",
    noValidQuestions: "No hay preguntas válidas",
    note: "Se importarán solo las preguntas válidas. Las filas con errores serán ignoradas.",
  },

  // ============================================
  // GAME CONTROLLER
  // ============================================
  gameController: {
    loading: "Cargando juego...",
    error: "Error",
    gameNotFound: "No se pudo cargar el juego",
    teamNotFound: "Equipo no encontrado",
    waiting: "Esperando",
    preparingRound: "Preparando la siguiente ronda...",
    viewTeam: "Ver Equipo",
    viewClassroom: "Vista Aula",
    startingStage2: "Iniciando Etapa 2...",
    errorStartingStage2: "Error al iniciar Etapa 2",
    resetConfirm: "¿Resetear TODOS los equipos a ronda 1? Perderán todo el progreso.",
    resetSuccess: "Juego reseteado. Todos los equipos vuelven a ronda 1.",
    resetError: "Error al resetear el juego",
  },

  // ============================================
  // SOUND
  // ============================================
  sound: {
    enable: "Activar sonidos",
    disable: "Desactivar sonidos",
    on: "ON",
    off: "OFF",
  },

  // ============================================
  // ADMIN
  // ============================================
  admin: {
    title: "Métricas de administración",
    downloadExcel: "Descargar Excel",
    teachers: "Docentes",
    totalSessions: "Sesiones totales",
    gamesCreated: "Juegos creados",
    email: "Email",
    uid: "UID",
    sessions: "Sesiones",
    games: "Juegos",
    lastLogin: "Último login",
    lastAccess: "Último acceso",
    noData: "No hay datos de docentes todavía",
    backToSetup: "Volver a Configuración",
    accessDenied: "Acceso denegado",
    authDisabled: "El sistema de autenticación está desactivado.",
    enableAuth: "Activá VITE_AUTH_REQUIRED=true para acceder a métricas.",
    verifyingSession: "Verificando sesión...",
    verifyingPermissions: "Verificando permisos de administrador...",
    restrictedAccess: "Acceso restringido",
    adminsOnly: "Esta página es solo para administradores.",

    // Upload page
    uploadTitle: "Subir nuevo CSV",
    bankTitle: "Título del banco de preguntas",
    bankTitlePlaceholder: "Ej: Vertebrados e Invertebrados",
    grade: "Grado",
    subject: "Materia",
    description: "Descripción del contenido",
    descriptionPlaceholder: "Ej: Clasificación de animales según su columna vertebral...",
    csvFile: "Archivo CSV",
    csvValid: "CSV válido",
    file: "Archivo",
    questionsDetected: "Preguntas detectadas",
    completeAllFields: "Completá todos los campos",
    uploadToLibrary: "Subir a la biblioteca",
    uploading: "Subiendo...",
    uploadSuccess: "¡CSV subido exitosamente!",
    redirecting: "Redirigiendo a la biblioteca...",
  },

  // ============================================
  // TEACHER LIBRARY - Biblioteca del docente
  // ============================================
  teacherLibrary: {
    // Tabs
    myGames: "Mis Juegos",
    community: "Comunidad",
    official: "Biblioteca Oficial",

    // Stats
    privateGames: "Juegos privados",
    publicGames: "Juegos públicos",
    totalUses: "Usos totales",
    avgRating: "Rating promedio",

    // Actions
    saveGame: "Guardar juego",
    editGame: "Editar juego",
    deleteGame: "Eliminar juego",
    copyGame: "Copiar a mi biblioteca",
    makePublic: "Hacer público",
    makePrivate: "Hacer privado",
    useGame: "Usar este juego",

    // Visibility
    private: "Privado",
    public: "Público",
    onlyYou: "Solo vos podés ver este juego",
    everyoneCanSee: "Visible para toda la comunidad",

    // Rating
    rate: "Calificar",
    ratings: "calificaciones",
    noRatingsYet: "Sin calificaciones aún",
    yourRating: "Tu calificación",
    thankYou: "¡Gracias por calificar!",
    cantRateOwn: "No podés calificar tu propio juego",

    // Report
    report: "Reportar",
    reportGame: "Reportar juego",
    reportReason: "Motivo del reporte",
    inappropriate: "Contenido inapropiado",
    incorrect: "Información incorrecta",
    spam: "Spam",
    copyright: "Violación de copyright",
    other: "Otro",
    reportDetails: "Detalles (opcional)",
    reportSubmitted: "Reporte enviado. Gracias por ayudar a mantener la comunidad.",
    alreadyReported: "Ya reportaste este juego",

    // Copy
    copySuccess: "¡Juego copiado a tu biblioteca!",
    copyAsPrivate: "Se guardó como privado. Podés editarlo y publicarlo cuando quieras.",

    // Limits
    privateLimitReached: "Alcanzaste el límite de juegos privados",
    privateLimitDesc: "Hacé público algún juego o eliminá uno para crear más.",

    // Empty states
    noMyGames: "Todavía no guardaste ningún juego",
    noMyGamesDesc: "Creá un juego y guardalo para usarlo después",
    noCommunityGames: "No hay juegos de la comunidad con estos filtros",
    noCommunityGamesDesc: "Probá cambiar los filtros o sé el primero en compartir",

    // Sort
    sortBy: "Ordenar por",
    recent: "Más recientes",
    rating: "Mejor calificados",
    popular: "Más usados",

    // Form
    gameTitle: "Título del juego",
    gameTitlePlaceholder: "Ej: Quiz de Fracciones",
    gameDescription: "Descripción",
    gameDescriptionPlaceholder: "Describí de qué trata el juego y para quién está pensado...",
    selectVisibility: "¿Querés compartirlo con la comunidad?",
    visibilityNote: "Podés cambiar la visibilidad después",

    // Confirmations
    confirmDelete: "¿Estás seguro de eliminar este juego?",
    confirmDeleteDesc: "Esta acción no se puede deshacer.",
    confirmMakePublic: "¿Publicar este juego?",
    confirmMakePublicDesc: "Será visible para todos los docentes de la comunidad.",

    // Author
    by: "por",
    you: "vos",

    // Usage
    timesUsed: "veces usado",
    timesCopied: "veces copiado",
  },

  // ============================================
  // PROMPT GENERATOR
  // ============================================
  promptGenerator: {
    title: "Generador de Consignas con IA",
    subtitle: "Creá un prompt optimizado para generar consignas educativas",

    // Steps
    step1: "Nivel y Configuración",
    step2: "¿Sobre qué tema?",
    step3: "Ajustes Avanzados",

    // Level
    level: "Nivel educativo",
    primary: "Primaria",
    secondary: "Secundaria",
    grade: "Grado/Año",

    // Language
    promptLanguage: "Idioma del juego",
    spanish: "Español",
    english: "Inglés",

    // Categories
    category: "Categoría de contenido",
    subject: "Materia curricular",
    history: "Hecho histórico",
    book: "Libro",
    fun: "Película/Serie",

    // Selection
    selectSubject: "Seleccioná una materia",
    selectEvent: "Seleccioná un hecho histórico",
    selectBook: "Seleccioná un libro",
    selectMedia: "Seleccioná una película o serie",
    other: "Otro (especificar)",
    customPlaceholder: "Escribí el tema...",

    // Filters for lists
    showAll: "Mostrar todos",
    forPrimary: "Para primaria",
    forSecondary: "Para secundaria",
    universal: "Universales",
    argentina: "Argentina",
    americas: "Américas",
    movies: "Películas",
    series: "Series",
    documentaries: "Documentales",

    // Advanced settings
    advancedSettings: "Ajustes avanzados",
    totalQuestions: "Cantidad de consignas",
    stage1Production: "% Producción en Etapa 1",
    stage2Production: "% Producción en Etapa 2",
    subtopicsInclude: "Subtemas a INCLUIR",
    subtopicsExclude: "Subtemas a EXCLUIR",
    subtopicsPlaceholder: "Separar con comas...",
    preferredStyle: "Estilo preferido",
    practical: "Más prácticas",
    analytical: "Más analíticas",
    mixed: "Mixtas",

    // Stage explanation
    stageExplanation: "¿Qué son Etapa 1 y Etapa 2?",
    stage1Title: "Etapa 1 - Preparación Interna",
    stage1Desc:
      "NO es competitivo. Cada equipo trabaja internamente para nivelarse. Las consignas son introductorias y diagnósticas. Los errores son oportunidades de aprendizaje grupal.",
    stage2Title: "Etapa 2 - Competencia Colaborativa",
    stage2Desc:
      "Competencia entre equipos. Consignas más desafiantes y de producción. Se aplica el conocimiento construido en Etapa 1. Colaboración interna + competencia externa.",

    // Actions
    generatePrompt: "Generar Prompt",
    copyToClipboard: "Copiar al portapapeles",
    openInGemini: "Abrir en Gemini",
    copied: "¡Copiado!",

    // Presets
    savedPresets: "Configuraciones guardadas",
    savePreset: "Guardar configuración",
    presetName: "Nombre de la configuración",
    presetNamePlaceholder: "Ej: Matemática 6°",
    loadPreset: "Cargar",
    deletePreset: "Eliminar",
    noPresets: "No hay configuraciones guardadas",
    maxPresetsReached: "Máximo 5 configuraciones. Se eliminará la más antigua.",
    presetSaved: "¡Configuración guardada!",

    // Preview
    previewTitle: "Vista previa del prompt",
    promptReady: "Tu prompt está listo",
    promptReadyDesc:
      "Copialo y pegalo en Gemini, ChatGPT u otro asistente de IA para generar las consignas.",

    // Validation
    selectContent: "Seleccioná un contenido para continuar",
    portuguese: "Português",
  },

  // ============================================
  // PROTECTED ROUTE
  // ============================================
  protectedRoute: {
    verifyingSession: "Verificando sesión...",
  },

  // ============================================
  // REFERRAL PAGE
  // ============================================
  referral: {
    title: "Referir a un colega",
    subtitle: "Ayudanos a crecer compartiendo el Juego del Semáforo con otros educadores",
    referredName: "Nombre del colega",
    referredEmail: "Email del colega",
    referredSchool: "Escuela/Institución",
    message: "Mensaje personal (opcional)",
    messagePlaceholder: "¿Por qué creés que le interesaría?",
    submit: "Enviar referido",
    sending: "Enviando...",
    successTitle: "¡Gracias por tu referido!",
    successMessage: "Vamos a contactar a tu colega. Cuando se registre, recibirás tu recompensa.",
    rewards: "Tu recompensa",
    rewardsDetail: "🎴 Kit de tarjetas PDF + 🌟 Insignia de colaborador",
    errorMessage: "Hubo un error. Por favor intentá de nuevo.",
    backToDashboard: "Volver al inicio",
  },

  // ============================================
  // WEBINAR PAGE
  // ============================================
  webinar: {
    title: "Registro para Webinar",
    noWebinar: "No hay webinars programados",
    noWebinarDesc: "Volvé pronto para ver los próximos eventos.",
    dateLabel: "Fecha y hora",
    timezone: "(Argentina, GMT-3)",
    name: "Tu nombre",
    email: "Tu email",
    school: "Escuela/Institución (opcional)",

    // Nuevo campo: nivel de enseñanza
    teachingLevel: "¿Qué nivel enseñás?",
    levelPrimary: "Primaria",
    levelSecondary: "Secundaria",
    levelHigher: "Superior / Universidad",
    levelOther: "Otro",

    // Experiencia - textos mejorados
    experience: "Experiencia con el Juego del Semáforo",
    experienceNone: "Nunca lo usé",
    experienceExplored: "Entré a verlo pero no lo probé en clase",
    experienceUsed: "Ya lo usé en clase",
    experienceRegular: "Lo uso regularmente",

    questions: "¿Qué te gustaría aprender? (opcional)",
    questionsPlaceholder: "Temas que te interesen o dudas que tengas...",
    submit: "Registrarme",
    sending: "Registrando...",

    // Pantalla de éxito - mejorada
    successTitle: "¡Listo! Tu lugar está reservado",
    successMessage: "Te enviaremos el link de acceso por email.",
    successReminder: "Mientras tanto, podés probar el juego:",
    successLinkPrimary: "🚦 Primaria",
    successLinkSecondary: "🎯 Secundaria",

    errorMessage: "Hubo un error. Por favor intentá de nuevo.",
    backToDashboard: "Volver al inicio",
  },

  // ========== NUEVAS CLAVES PARA LA SECCIÓN 13 DE TEACHER GUIDE ==========
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

  // ============================================
  // ÁRBITRO — accesibilidad (lotes 0 y 1)
  // Textos de lectores de pantalla, nombres de colores y mensajes nuevos.
  // Las rutas /arbitro* y /sesion/* siempre usan esta sección en español
  // (ver useArbitroT en i18n/index.tsx).
  // ============================================
  arbitro: {
    teamColors: {
      red: "Rojo",
      blue: "Azul",
      green: "Verde",
      amber: "Ámbar",
      violet: "Violeta",
      pink: "Rosa",
      teal: "Turquesa",
      orange: "Naranja",
    },
    teamColorGroup: "Color del equipo {team}",
    teamColorNumber: "{n}",
    timerName: "Temporizador de la pregunta",
    timerLastSeconds: "⚠️ ¡Últimos 15 segundos!",
    timerAnnounce15: "Quedan 15 segundos",
    timerAnnounceUp: "Tiempo cumplido",
    soundOff: "Silenciar el sonido del temporizador",
    soundOn: "Activar el sonido del temporizador",
    rulesStep5Who: "La IA lee los argumentos de ambos equipos",
    rulesStep5Desc: "Los equipos se califican entre sí. Si el otro equipo no acepta la calificación, ambos argumentan por escrito y el árbitro reparte el punto citando el texto base. Su reparto es definitivo para esa ronda.",
    rulesStep5Info: "Los equipos se califican entre sí. Si el otro equipo no acepta la calificación, ambos argumentan por escrito y el árbitro (IA) reparte el punto citando el texto base. Su reparto es definitivo para esa ronda.",
    rulesStep5Template: "5. Si el otro equipo no acepta la calificación, ambos equipos argumentan por escrito y el árbitro (IA) reparte el punto citando el texto base desde el juego. Su reparto es definitivo para esa ronda.",
    errorConsultFailed: "No pudimos consultar al árbitro. Revisá la conexión e intentá de nuevo.",
    errorRetryHint: "El reparto del árbitro es definitivo para cada ronda: si no se pudo consultar, reintenten.",
    offTopicQuestion: "La pregunta está fuera del texto: elijan otra",
    offTopicChooseAnother: "Elegir otra pregunta",
    offTopicLabel: "Fuera de tema",
    offTopicNoPoints: "Esta ronda no suma puntos y no cuenta: elijan otra pregunta.",
    resumeQuestion: "Hay una partida en curso: ¿continuar o empezar de nuevo?",
    resumeSummary: "{team1} {points1} · {team2} {points2} — ronda {round} de {total}",
    resumeContinue: "Continuar",
    resumeRestart: "Empezar de nuevo",
    ownQuestionOffTopic: "Esa pregunta no está en el texto: escriban otra o elijan una de la lista",
    ownQuestionChecking: "Verificando la pregunta…",
    allowOwnQuestions: "Permitir preguntas propias",
    allowOwnQuestionsHint: "Los equipos pueden escribir su propia pregunta además de elegir de la lista. Antes de pasarla al otro equipo se verifica que corresponda al texto y al tema.",
    roundsTitle: "Rondas de la sesión",
    roundsLoading: "Cargando rondas…",
    roundsError: "No se pudieron cargar las rondas.",
    gameN: "Partida {n}",
    roundLabel: "Ronda {n}",
    splitLabel: "Reparto",
    verdictLabel: "Veredicto",
    positionsLabel: "Ver las dos posiciones",
    passedLabel: "Pasada",
    correctedByTeacher: "Corregido por el docente",
    correctedDetail: "Árbitro: {original} → Docente: {nuevo} ({fecha})",
    correctSplit: "Corregir el reparto",
    correctSave: "Guardar corrección",
    correctSaving: "Guardando…",
    correctError: "No se pudo guardar la corrección. Probá de nuevo.",
    correctOnlyOwner: "Solo el docente dueño de la sesión puede corregir los repartos.",
    optTotal: "{team} tiene toda la razón",
    optPartial: "{team} tiene la mayor parte de la razón",
    optBoth: "Los dos tienen parte de razón",
    optNone: "Ninguno tiene razón",
    totalCorrected: "Total corregido",
    reportCorrectionsTitle: "Correcciones del docente",
    reportCorrectedRounds: "Rondas corregidas por el docente: {n} de {total}",
    reportBeforeCorrections: "Informe generado antes de las correcciones",
    pointsAbbrev: "pts",
    correctionNote: "La corrección no cambia el marcador que ya vieron los alumnos.",
    aiUnavailable: "El servicio de IA no está disponible en este momento, probá de nuevo en unos minutos.",
    errorNoClearAnswer: "El árbitro no pudo dar una respuesta clara. No se sumó ningún punto. Probá de nuevo.",
    closeConfig: "Cerrar la configuración y volver",
    closeDialog: "Cerrar la ventana",
    questionsFieldName: "Preguntas del juego, una por línea",
    questionsCountName: "Cantidad de preguntas a generar",
    teamPoints: "{points} puntos",
    loginToGenerateQuestions: "Iniciá sesión con Google para generar preguntas",
    loginWithGoogle: "Iniciar sesión con Google",
    loginToGenerateQuestionsFailed: "No se pudo iniciar sesión. Probá de nuevo.",
    questionTypeLegend: "Tipo de preguntas a generar",
    required: "obligatorio",
    themeRequiredHint: "Escribí el tema para continuar.",
    charsNearLimit: "Cerca del límite de caracteres",
    charsOverLimit: "Superaste el límite: el texto se va a cortar al enviarlo al árbitro",
    configFormTitle: "Configuración de la sesión",
    sessionCreatedAnnounce: "Sesión creada. El link para los alumnos está más abajo.",
    generatingQuestions: "Generando preguntas…",
    gameScreenSetup: "Preparar la partida",
    gameScreenAsk: "Turno de pregunta",
    gameScreenGrade: "Calificación de la respuesta",
    gameScreenAccept: "¿Se acepta la calificación?",
    gameScreenDispute: "Argumentos de los equipos",
    gameScreenReferee: "El árbitro analiza",
    gameScreenRound: "Resultado de la ronda",
    gameScreenEnd: "Fin del juego",
    gameScreenReflect: "Reflexión final",
    gameScreenLoading: "Cargando la sesión",
    gameScreenError: "No se pudo abrir la sesión",
    gameScreenResume: "Partida en curso",
    sessionScreenIdentify: "Identificarse para jugar",
    sessionScreenMain: "Consultar al árbitro",
    sessionScreenSummary: "Resumen de la sesión",
    pwaClose: "Cerrar el aviso de instalación",
    pwaInstallText: "Instalar como app",
    correctSaved: "Corrección guardada",
    // Errores del servidor: el texto sale de details.motivo (ver utils/arbitroErrores.ts); si falta, se muestra el mensaje en español.
    errorMotivo_login_requerido: "Tenés que iniciar sesión con Google para hacer esto.",
    errorMotivo_sesion_no_encontrada: "No encontramos la sesión. Revisá el link.",
    errorMotivo_sesion_expirada: "La sesión ya expiró. Pedile un link nuevo a tu docente.",
    errorMotivo_sesion_de_otro_docente: "Esta sesión pertenece a otro docente.",
    errorMotivo_sesion_id_invalido: "El identificador de la sesión no es válido.",
    errorMotivo_datos_incompletos: "Faltan datos para completar la acción. Revisá los campos e intentá de nuevo.",
    errorMotivo_sin_consultas: "La sesión todavía no tiene consultas al árbitro.",
    errorMotivo_ronda_no_encontrada: "No encontramos la ronda.",
    errorMotivo_pregunta_longitud: "La pregunta tiene que tener entre 3 y 500 caracteres.",
    errorMotivo_preguntas_propias_desactivadas: "En esta sesión no se permiten preguntas propias.",
    errorMotivo_ia_no_configurada: "El árbitro no está disponible en este momento. Probá más tarde.",
    errorMotivo_solo_admin: "Solo el administrador puede hacer esto.",
    errorMotivo_error_interno: "Algo salió mal. Intentá de nuevo.",
    pageTitleSuffix: "El Juego del Semáforo",
    gradeCompleta: "Completa",
    gradeIncompleta: "Incompleta",
    gradeIncorrecta: "Incorrecta",
    pointsText: (valor: string, n: number): string => (n === 1 ? `${valor} punto` : `${valor} puntos`),
    pointsUnit: "puntos",
    jgCheckLink: "Verificá el link con tu profe.",
    jgSlow: "El árbitro está tardando más de lo normal. Puede ser la conexión a internet. Probá de nuevo.",
    jgTeamN: "Equipo {n}",
    jgTeamNameLabel: "Nombre del equipo *",
    jgTeamNamePlaceholder: "Ej: Los Narradores, Equipo A...",
    jgMembersLabel: "Integrantes *",
    jgMembersPlaceholder: "Ej: Juan, María, Pedro",
    jgHowManyQuestions: "¿Cuántas preguntas van a jugar en total?",
    jgTotalHint: "Cantidad de preguntas en total · Podés agregar más al terminar",
    jgStart: "⚔️ ¡Empezar el juego!",
    jgQuestionOf: "Pregunta {n} de {total}",
    jgAsksLabel: "Pregunta",
    jgAnswersLabel: "Responde",
    jgQuestionLabel: "Pregunta",
    jgTimeLeft: "⏱️ Tiempo restante",
    jgTimeElapsed: "⏱️ Tiempo transcurrido",
    jgPickFromList: "📋 {team} — elegí una pregunta de la lista:",
    jgWriteOwn: "✏️ Escribir mi propia pregunta",
    jgWriteOwnLabel: "✏️ {team} — escribí la pregunta que le van a hacer",
    jgWriteOwnPlaceholder: "Escribí la pregunta que le van a hacer...",
    jgConfirmQuestion: "✅ Confirmar pregunta",
    jgPickFromListBack: "← Elegir de la lista",
    jgChosenTitle: "📋 Pregunta elegida — leerla en voz alta",
    jgChooseAnother: "← Elegir otra pregunta",
    jgAnswersAloud: "responde en voz alta. Cuando terminen, presioná el botón.",
    jgAnswered: "✅ El equipo ya respondió — calificar",
    jgPass: "⏭️ Pasar esta pregunta (sin puntos)",
    jgAnswerOf: "Respuesta de {team}",
    jgIsComplete: "{team} — ¿es completa la respuesta?",
    jgWhatMissing: "✏️ {team} — ¿qué le faltó a la respuesta?",
    jgWhatMissingPlaceholder: "Explicá qué faltó o qué estuvo mal, con el mayor detalle posible...",
    jgContinue: "Continuar →",
    jgGradedAs: "{team} calificó la respuesta como",
    jgForTeam: "Para el equipo {team}",
    jgSaysMissing: "{team} dice que faltó:",
    jgAccepts: "¿{team} acepta esta calificación?",
    jgYesAccept: "✅ Sí, acepta",
    jgConsult: "⚖️ Consultar al árbitro",
    jgDisputeTitle: "⚖️ Consulta al árbitro",
    jgDisputeHint: "Completá los cuatro campos para que el árbitro pueda dar un veredicto justo.",
    jgWhatQuestion: "📋 ¿Cuál fue la pregunta?",
    jgWhatQuestionPlaceholder: "Escribí la pregunta que hizo el equipo...",
    jgWhatAnswered: "💬 ¿Qué respondió {team}?",
    jgWhatAnsweredPlaceholder: "Resumí la respuesta del equipo...",
    jgWhyGraded: "🗣️ ¿Por qué {team} calificó así?",
    jgWhyGradedPlaceholder: "¿Por qué {team} considera que la respuesta fue {grade}?",
    jgWhyNotAccept: "🗣️ ¿Por qué {team} no acepta esa calificación?",
    jgWhyNotAcceptPlaceholder: "¿Qué argumenta {team} para sostener que merece más puntos?",
    jgBack: "← Volver",
    jgRetry: "🔄 Reintentar",
    jgAnalyzing: "El árbitro está analizando…",
    jgOneMoment: "Un momento",
    jgVerdictTitle: "⚖️ Veredicto del árbitro",
    jgThink: "💭 Para seguir pensando:",
    jgSplitTitle: "Así reparte el punto de esta ronda:",
    jgSumInPlay: (valor: string, n: number): string => `Suma: ${n === 1 ? `${valor} punto` : `${valor} puntos`} de 1 en juego`,
    jgConfirmContinue: "✅ Confirmar y continuar",
    jgLastRound: "Última ronda",
    jgDidNotAnswer: "{team} no respondió esta pregunta.",
    jgPassedNoPoints: "⏭️ Pregunta pasada — sin puntos",
    jgResponded: "respondió",
    jgGradeLabel: "Calificación:",
    jgValidatedByReferee: " · ⚖️ Validado por árbitro",
    jgSeeFinal: "🏆 Ver resultado final",
    jgNext: "▶️ Siguiente — pregunta {n} de {total}",
    jgWon: "¡Ganó {team}!",
    jgTie: "¡Empate!",
    jgRoundSummary: "Resumen de rondas",
    jgRoundLine: "Ronda {n}: {from} → {to} · {grade} · {points}",
    jgAddFive: "➕ Agregar 5 preguntas más",
    jgDoReport: "✍️ Completar informe de metacognición",
    jgMetaQ1: "¿Qué aprendieron hoy sobre \"{tema}\"?",
    jgMetaQ2: "¿En qué momento dudaron más? ¿Cómo lo resolvieron?",
    jgMetaQ3: "Contá una disputa donde intervino el árbitro (IA): ¿cuál era tu postura antes y cuál después? ¿Estuviste de acuerdo con su veredicto, o hubo algo que no pudo evaluar bien?",
    jgMetaQ4: "¿Cómo le explicarían a otro compañero lo que aprendieron hoy?",
    jgReportSent: "¡Informe enviado!",
    jgReportSentDesc1: "El docente puede ver los resultados",
    jgReportSentDesc2: "y las reflexiones de ambos equipos.",
    jgCloseTab: "📱 Podés cerrar esta pestaña.",
    jgTeacherSees: "El docente verá el informe en su panel.",
    jgSendManually: "También podés enviárselo al docente manualmente",
    jgCopiedShort: "✅ ¡Copiado!",
    jgCopyReport: "📋 Copiar informe",
    jgDownloadTxt: "⬇️ Descargar .txt",
    jgManualHint: "Copiá el texto y pegalo como comentario privado en la tarea de Classroom, o descargalo y mandáselo al docente.",
    jgReportOf: "✍️ Informe de {team}",
    jgNextReport: "Siguiente — informe de {team} →",
    jgSending: "📤 Enviando…",
    jgRetrySend: "🔁 Reintentar envío",
    jgSendReport: "📤 Enviar informe al docente",
    jgReportSendError: "No se pudo enviar el informe. Revisá tu conexión e intentá de nuevo.",
    sesVerdictA: "✅ Posición A es correcta",
    sesVerdictB: "✅ Posición B es correcta",
    sesVerdictBothPartial: "⚖️ Ambas posiciones son parcialmente correctas",
    sesVerdictNone: "🔄 Ninguna posición es del todo correcta",
    sesErrFillAll: "Completá los tres campos: el conflicto y las dos posiciones.",
    sesErrSamePositions: "Las dos posiciones tienen que ser distintas. Si el grupo está de acuerdo, ¡no necesitan árbitro!",
    sesErrConsult: "Error al consultar al árbitro: {detail}",
    sesErrName: "Por favor escribí tu nombre o el del grupo.",
    sesSummaryTitle: "INTERACCIONES CON EL ÁRBITRO",
    sesSummaryTeam: "Equipo: {team} — ",
    sesSummarySubject: "Materia: {materia} · Tema: {tema}",
    sesSummaryQuery: "Consulta {n}:",
    sesSummaryDisagreement: "Desacuerdo: {text}",
    sesSummaryPosA: "Posición A: {text}",
    sesSummaryPosB: "Posición B: {text}",
    sesSummaryVerdict: "Veredicto del árbitro: {text}",
    sesSummaryExplanation: "Explicación: {text}",
    sesSummaryFooter: "Usá estas interacciones para responder las preguntas del informe en Classroom.",
    sesLoading: "⏳ Cargando sesión…",
    sesUnavailable: "Sesión no disponible",
    sesExpired: "Esta sesión ya expiró. Pedile a tu profe que genere una nueva.",
    sesNotFound: "Esta sesión no existe. Verificá el link con tu profe.",
    sesTitle: "Árbitro de Aprendizaje",
    sesIdentifyIntro: "Antes de empezar, escribí tu nombre para que el docente pueda ver quién participó.",
    sesNameLabel: "Tu nombre o nombres del grupo",
    sesNamePlaceholder: "Ej: Juan García, o Juan y María",
    sesTeamLabel: "Nombre del equipo",
    sesOptional: "(opcional)",
    sesTeamPlaceholder: "Ej: Equipo 1, Los Bioquímicos...",
    sesEnter: "⚖️ Entrar al Árbitro →",
    sesRefereeOf: "Árbitro de {materia}",
    sesHideInstr: "▲ Ocultar instrucciones",
    sesShowInstr: "📋 Ver cómo funciona →",
    sesHowTitle: "📋 Cómo funciona esta sesión",
    sesHowIntro: "Usá el material que te dio tu profe para trabajar con tus compañeros. Discutan, pregúntense y lleguen a acuerdos entre ustedes —",
    sesHowIntroStrong: "ese intercambio es donde más van a aprender",
    sesHowPlay: "Cómo jugar:",
    sesStep1a: "Formen grupos de",
    sesStep1b: "3 a 6 personas",
    sesStep1c: ". Pueden armar 2 o 3 equipos, o competir individualmente.",
    sesStep2: "Háganse preguntas sobre el tema entre ustedes.",
    sesStep3: "Cuando alguien responde correctamente, ese equipo o persona anota 1 punto.",
    sesStep4: "Vayan tomando registro de las disputas y cómo las resolvieron.",
    sesStep5: "Si el grupo entero tiene un desacuerdo genuino que no puede resolver, recién ahí usen el árbitro.",
    sesStep6a: "Al terminar la clase, el equipo o la persona con más puntos",
    sesStep6b: "¡gana!",
    sesBeforeTitle: "⚠️ Antes de consultar al árbitro:",
    sesBefore1: "Tienen que haber intentado resolver el desacuerdo entre ustedes.",
    sesBefore2: "Cada posición la escribe el alumno que la defiende, con sus propias palabras.",
    sesBefore3: "El árbitro no resuelve ejercicios completos — solo arbitra desacuerdos genuinos.",
    sesMaterial: "📄 Material de trabajo",
    sesConsultTitle: "⚖️ Consultá al árbitro",
    sesConsultHint: "Solo cuando el grupo entero tenga un desacuerdo genuino sobre",
    sesConflictLabel: "¿Cuál es el desacuerdo o la pregunta en disputa?",
    sesConflictPlaceholder: "Ej: \"¿Cuál es la respuesta correcta y por qué?\"",
    sesPosALabel: "Posición A —",
    sesPosAHint: "escribila vos",
    sesPosBLabel: "Posición B —",
    sesPosBHint: "la escribe tu compañero/a",
    sesPosPlaceholder: "Escribí tu respuesta o explicación...",
    sesAnalyzing: "El árbitro está analizando las posiciones…",
    sesConsulting: "⏳ Consultando…",
    sesAskVerdict: "⚖️ Pedir veredicto al árbitro",
    sesWhy: "Por qué",
    sesKeepThinking: "💭 Para seguir pensando",
    sesPosAUpper: "POSICIÓN A",
    sesPosBUpper: "POSICIÓN B",
    sesNewQuery: "Nueva consulta al árbitro",
    sesViewMine: "📋 Ver mis interacciones para el informe ({n})",
    sesMineTitle: "📋 Tus interacciones con el árbitro",
    sesClassroomStrong: "📝 Para tu informe en Classroom:",
    sesClassroomText: "estas son las interacciones que tuviste con el árbitro. Copiálas y usalas como insumo para responder las preguntas del informe que te dejó tu docente en la tarea de Classroom.",
    sesQueryN: "Consulta {n}",
    sesDisagreementLabel: "Desacuerdo: ",
    sesCopied: "✅ ¡Copiado! Pegalo en tu entrega de Classroom",
    sesCopy: "📋 Copiar resumen para Classroom",
    sesCopiedAnnounce: "¡Copiado! Pegalo en tu entrega de Classroom",
    sesFooter: "Árbitro de {materia} · {tema} · Sesión válida hasta {hora}",
    areaNames: { "Ciencias Exactas y Naturales": "Ciencias Exactas y Naturales", "Ciencias Sociales y Humanidades": "Ciencias Sociales y Humanidades", "Comunicación y Lenguajes": "Comunicación y Lenguajes", "Arte y Expresión": "Arte y Expresión" },
    materiaNames: { "Matemática": "Matemática", "Ciencias Naturales": "Ciencias Naturales", "Biología": "Biología", "Física": "Física", "Química": "Química", "Tecnología": "Tecnología", "Informática": "Informática", "Estadística": "Estadística", "Ciencias Sociales": "Ciencias Sociales", "Historia": "Historia", "Geografía": "Geografía", "Formación Ética y Ciudadana": "Formación Ética y Ciudadana", "Filosofía": "Filosofía", "Psicología": "Psicología", "Economía": "Economía", "Derecho": "Derecho", "Antropología": "Antropología", "Lengua y Literatura": "Lengua y Literatura", "Inglés": "Inglés", "Portugués": "Portugués", "Francés": "Francés", "Comunicación": "Comunicación", "TIC y Medios": "TIC y Medios", "Literatura": "Literatura", "Plástica / Artes Visuales": "Plástica / Artes Visuales", "Música": "Música", "Teatro": "Teatro", "Educación Física": "Educación Física", "Danza": "Danza", "Artesanía y Diseño": "Artesanía y Diseño" , "Plástica": "Plástica", "Lengua": "Lengua" },
    levelNames: { "Primaria": "Primaria", "Secundaria": "Secundaria" },
    gradeLabel: (g: string): string => `${g} año`,
    cfgHide: "▲ ocultar",
    cfgShowEdit: "▼ ver / editar",
    cfgAdd: "▼ agregar",
    cfgErrPickSubject: "Elegí la materia y escribí el tema antes de generar preguntas.",
    cfgErrGenQuestions: "No se pudieron generar las preguntas: {detail}",
    cfgTypeMemory: "🧠 Memorísticas",
    cfgTypeMixed: "🔀 Mixtas",
    cfgTypeSkills: "🎯 De desarrollo de capacidades",
    cfgTypeSkillsHint: "Buscan que el equipo compare, argumente o detecte un error en vez de solo recordar un dato — le dan más al árbitro para arbitrar.",
    cfgMissingBoth: "No cargaste preguntas ni texto base todavía.",
    cfgMissingText: "No cargaste un texto base todavía.",
    cfgMissingQuestions: "No cargaste preguntas todavía.",
    cfgErrArea: "Elegí un área.",
    cfgErrMateria: "Elegí una materia.",
    cfgErrTema: "Escribí el tema de la sesión.",
    cfgErrLogin: "Necesitás iniciar sesión con Google para crear la sesión.",
    cfgErrCreate: "Error al crear la sesión: {detail}",
    cfgErrLogout: "No se pudo cerrar la sesión.",
    cfgPickArea: "Seleccioná un área para comenzar",
    cfgMySessions: "📊 Mis sesiones",
    cfgLoggingOut: "Saliendo…",
    cfgLogout: "Salir",
    cfgRefereeOf: "Árbitro de",
    cfgAreaLegend: "Área del conocimiento",
    cfgLevel: "Nivel",
    cfgGradeYear: "Año / Grado",
    cfgSubject: "Materia",
    cfgNoSubjects: "No hay materias para {level} en esta área.",
    cfgTopic: "Tema de la sesión",
    cfgTopicPlaceholder: "Escribí el tema que van a trabajar hoy...",
    cfgDuration: "Duración de la sesión",
    cfgDurClass: "⏱️ Clase",
    cfgDurClassDesc: "Expira en 3 horas",
    cfgDurDay: "📅 Día",
    cfgDurDayDesc: "Expira en 24 horas",
    cfgRoundTime: "Tiempo por ronda",
    cfgNoLimit: "Sin límite",
    cfgMinutes: "{n} min",
    cfgRoundTimeHint: "Cuenta desde que el equipo elige la pregunta hasta que responden. Al vencerse pueden seguir igual o pasar la pregunta. El árbitro no tiene límite de tiempo.",
    cfgSessionLang: "Idioma de la sesión",
    cfgLangEs: "Español",
    cfgLangEn: "English",
    cfgBaseText: "📖 Texto base de la sesión",
    cfgRecommended: "(recomendado)",
    cfgBaseTextPlaceholder: "Pegá acá el texto sobre el que van a trabajar los equipos. El árbitro va a arbitrar citando este texto.\n\nSi no cargás un texto, el árbitro va a trabajar con su conocimiento general del tema — funciona, pero es menos preciso.",
    cfgBeforePlayStrong: "Antes de jugar:",
    cfgBeforePlayA: "dedicá un tiempo a la lectura comprensiva — en grupo o de a dos. Durante el juego el texto",
    cfgBeforePlayStrong2: "no estará disponible en pantalla",
    cfgBeforePlayB: ". Conviene tenerlo impreso.",
    cfgCharCount: (n: string): string => `${n} / 8.000 car.`,
    cfgCutWarning: "El texto se va a cortar al enviarlo al árbitro",
    cfgGameQuestions: "📋 Preguntas para el juego",
    cfgQuestionsHint1: "Las preguntas aparecen en la pantalla del juego: el equipo que pregunta elige una de esta lista en cada turno. Las preguntas ya usadas quedan marcadas para no repetirse.",
    cfgQuestionsHint2: "💡 Si necesitás mostrar el texto durante la clase, podés proyectarlo desde tu panel en cualquier momento.",
    cfgGenerateWithAI: "Generar con IA:",
    cfgQuestionsUnit: "preguntas",
    cfgGenerating: "⏳ Generando…",
    cfgGenerateBtn: "✨ Generar con IA",
    cfgQuestionsPlaceholder: "Pegá las preguntas para el juego, o generalas con IA arriba. Una por línea — el equipo que pregunta elige una de esta lista en cada turno.",
    cfgCreatingSession: "Creando sesión…",
    cfgSessionCreated: "✅ Sesión creada",
    cfgExpires: "Expira: {date}",
    cfgOneLink: "👥 Es un solo link para toda la clase: cada pareja de alumnos lo abre en su propio dispositivo y arma su equipo — no hace falta crear una sesión por pareja.",
    cfgCopied: "✅ Copiado",
    cfgCopyLink: "📋 Copiar link",
    cfgShareClassroom: "📚 Compartir en Classroom",
    cfgSeeHistory: "📊 Ver historial de sesiones →",
    cfgPostInstr: "📋 Instrucciones para los alumnos",
    cfgPostInstrDesc: "Esto es lo que se manda a Classroom y lo que se imprime — editalo si querés cambiar algo.",
    cfgPostQuestionsDesc: "Opcional. No aparece en la pantalla del juego — repartila antes por Classroom o en el PDF.",
    cfgPostReport: "✍️ Informe final (metacognición)",
    cfgPostReportDesc: "Las preguntas que cada equipo responde al terminar el juego.",
    cfgPrint: "🖨️ Imprimir / Guardar PDF",
    cfgPrintHint: "Imprime el contenido de arriba (instrucciones, preguntas e informe) — las instrucciones ya les llegan a los alumnos por Classroom, esto es solo si además querés una copia en papel.",
    cfgCreateAnother: "Crear otra sesión",
    cfgLoginNotice: "🔐 Te vamos a pedir iniciar sesión con Google al crear la sesión, para que el link, el informe y el email de los resultados queden asociados a vos.",
    cfgCreating: "⏳ Creando…",
    cfgGenerateSession: "⚖️ Generar sesión de práctica",
    cfgLoginAndGenerate: "🔐 Iniciar sesión y generar sesión",
    cfgWarnGenerateDesc: "El árbitro funciona mejor cuando tiene un texto para citar y preguntas basadas en ese texto. Podés agregarlos ahora o generar la sesión igual.",
    cfgAddQuestions: "← Agregar preguntas",
    cfgGenerateAnyway: "Generar sesión igual →",
    cfgNoBaseTitle: "Todavía no cargaste el texto base",
    cfgNoBaseDesc: "El árbitro busca mejorar la comprensión lectora: funciona mejor cuando el equipo leyó el texto antes de jugar. Dedicarle unos minutos antes de empezar ayuda mucho.",
    cfgLoadBaseText: "← Cargar texto base",
    cfgGenerateQuestionsAnyway: "Generar igual →",
    cfgNotSharedTitle: "Todavía no compartiste el juego con tus alumnos",
    cfgNotSharedDesc1: "El PDF tiene las instrucciones para los alumnos, pero también van a necesitar el link para entrar al juego.",
    cfgNotSharedDesc2a: "La forma más simple es compartirlo por",
    cfgNotSharedDesc2b: "— un click y el link llega a todos los alumnos automáticamente, junto con las instrucciones.",
    cfgShareByClassroom: "📚 Compartir por Classroom",
    cfgDownloadAnyway: "Descargar PDF igual",
    cfgWarnShareDesc: "El árbitro funciona mejor cuando tiene un texto para citar y preguntas basadas en ese texto. Podés agregarlos ahora o compartir la sesión igual.",
    cfgShareAnyway: "Compartir igual →",
    cfgPublishClassroom: "📚 Publicar en Google Classroom",
    cfgTaskCreated: "¡Tarea creada en Classroom!",
    cfgTaskCreatedDesc: "Los alumnos ya pueden verla en su curso.",
    cfgClose: "Cerrar",
    cfgRetryPlain: "Reintentar",
    cfgLoadingCourses: "⏳ Cargando tus cursos...",
    cfgNoCourses: "No se encontraron cursos activos en tu cuenta.",
    cfgPickCourse: "Elegí el curso donde querés publicar la tarea:",
    cfgCreatingTask: "⏳ Creando tarea...",
    cfgHowTitle: "¿Cómo funciona?",
    cfgTapToSee: "— tocá para ver",
    cfgHow1T: "Lectura previa",
    cfgHow1W: "Todos los alumnos",
    cfgHow1D: "Antes de jugar, leen el texto base que entregó el docente. Durante el juego el texto no está disponible en pantalla.",
    cfgHow2T: "El turno — pregunta y respuesta",
    cfgHow2W: "Equipo A pregunta · Equipo B responde",
    cfgHow2D: "El equipo que pregunta elige una pregunta de la lista y se la hace en voz alta al otro equipo. El otro equipo responde oralmente.",
    cfgHow3T: "Calificación",
    cfgHow3W: "El equipo que preguntó califica",
    cfgHow3D: "Decide si la respuesta fue completa (1 punto), incompleta (0,5 puntos) o incorrecta (0 puntos).",
    cfgHow4T: "¿Se acepta la calificación?",
    cfgHow4W: "El equipo que respondió decide",
    cfgHow4D: "Si acepta, se asigna el punto y sigue el juego. Si no acepta, ambos equipos argumentan por escrito y llaman al árbitro.",
    cfgHow5T: "El árbitro interviene",
    cfgHow6T: "Metacognición",
    cfgHow6W: "Ambos equipos",
    cfgHow6D: "Al terminar, cada equipo completa un informe que llega automáticamente al panel del docente.",
    cfgHowNoteStrong: "Cómo le llega el resultado al docente:",
    cfgHowNote: "al terminar, cada equipo presiona el botón para enviar el informe y las respuestas de metacognición llegan solas a tu panel, sin que tengan que mandarte nada. Por las dudas, el juego también les deja copiar o descargar ese texto.",
    cfgFormTitleDoc: "Configurar sesión",
    landDesc_exactas: "Los alumnos debaten en grupos sobre el tema que vos elegís. La IA solo interviene cuando dos alumnos tienen posiciones distintas que no pueden resolver solos — no explica ni resuelve, solo arbitra el desacuerdo.",
    landEx_exactas: "Ecuaciones, fracciones, funciones, estadística, reacciones químicas, problemas de física…",
    landDesc_sociales: "Los alumnos debaten en grupos sobre fuentes, interpretaciones o conceptos. La IA no opina ni explica — solo arbitra cuando el grupo tiene un desacuerdo genuino que no puede resolver solo.",
    landEx_sociales: "Fuentes históricas, conceptos filosóficos, datos económicos, situaciones jurídicas…",
    landDesc_lenguajes: "Los alumnos trabajan en grupos sobre textos, consignas o producciones. La IA arbitra desacuerdos genuinos sobre interpretación, gramática o uso del lenguaje — sin reemplazar el debate entre pares.",
    landEx_lenguajes: "Análisis de textos, gramática en contexto, interpretación literaria, producción oral…",
    landDesc_arte: "Los alumnos debaten en grupos sobre obras, técnicas o conceptos expresivos. La IA arbitra desacuerdos puntuales — el protagonismo sigue siendo el intercambio entre alumnos.",
    landEx_arte: "Análisis de obras, estilos musicales, reglas de juego, conceptos de expresión…",
    landDone: "✅ Al terminar, cada equipo presiona \"Enviar informe\" dentro del juego. El docente lo ve automáticamente en su panel.",
    landErrLogin: "No se pudo iniciar sesión. Probá de nuevo.",
    landErrLogout: "No se pudo cerrar la sesión. Probá de nuevo.",
    landLoggingIn: "⏳ Ingresando…",
    landUsedBefore: "🔑 Ya lo usé antes",
    landConfigure: "⚖️ Configurar una sesión →",
    landConfigureMine: "⚖️ Configurar mi sesión →",
    landFree: "Gratuito · Solo necesitás un dispositivo por grupo",
    landSubjects: "Materias disponibles en esta área",
    landExamples: "Ejemplos de temas:",
    infTitle: "Árbitros de Aprendizaje",
    infIntro: "Dinámicas grupales donde la IA actúa como árbitro — no explica ni resuelve, solo interviene cuando el grupo tiene un desacuerdo genuino que no puede resolver solo.",
    infSteps: "🪜 Ver pasos de la dinámica",
    infStep1: "El docente inicia sesión con Google, configura el tema y la sesión se genera en segundos.",
    infStep2: "Los alumnos arman 2 equipos y entran al link desde el dispositivo de un integrante de cada equipo.",
    infStep3: "Un equipo le hace una pregunta oral al otro; el que responde lo hace en voz alta.",
    infStep4: "El equipo que preguntó califica la respuesta: completa (1 punto), incompleta (0.5) o incorrecta (0). El juego suma los puntos solo, automáticamente.",
    infStep6: "Al terminar, cada equipo completa una metacognición dentro del juego. El protagonista es el grupo.",
    infPerArea: "Un árbitro por área",
    infConfigure: "Configurar →",
    infWhat: "¿Qué hace este árbitro?",
    infMaterias_exactas: "Matemática, Física, Química, Biología, Estadística",
    infMaterias_sociales: "Historia, Geografía, Filosofía, Economía, Derecho",
    infMaterias_lenguajes: "Lengua, Inglés, Literatura, Comunicación",
    infMaterias_arte: "Plástica, Música, Teatro, Educación Física",
    infWhat_exactas: "El árbitro de Exactas resuelve desacuerdos sobre procedimientos, resultados y conceptos en matemática y ciencias naturales. Cuando dos alumnos no se ponen de acuerdo si un cálculo está bien, si una definición es correcta o si un razonamiento lógico tiene sentido, el árbitro analiza ambas posiciones y da un veredicto fundamentado. No resuelve el ejercicio por el grupo — solo interviene ante un desacuerdo genuino que el grupo no puede resolver solo.",
    infWhat_sociales: "El árbitro de Sociales arbitra desacuerdos sobre interpretaciones históricas, conceptos económicos, análisis geográficos o debates filosóficos y legales. En materias donde muchas respuestas no son blanco o negro, el árbitro evalúa si los argumentos están bien fundamentados y si las posiciones son conceptualmente sólidas, sin imponer una única verdad sino guiando al grupo hacia mayor precisión.",
    infWhat_lenguajes: "El árbitro de Lenguajes resuelve desacuerdos sobre gramática, vocabulario, interpretación de textos y uso correcto del idioma. Si el grupo discute sobre la forma correcta de una construcción gramatical, el significado de una palabra en contexto o la interpretación de un párrafo literario, el árbitro analiza ambas posiciones con criterios lingüísticos y comunicativos claros.",
    infWhat_arte: "El árbitro de Arte arbitra desacuerdos sobre conceptos, técnicas y criterios estéticos en disciplinas artísticas y expresivas. Cuando el grupo no se pone de acuerdo sobre si una técnica es correcta, qué caracteriza un estilo, o cómo interpretar una obra, el árbitro aplica criterios propios de cada disciplina para guiar el debate hacia mayor profundidad conceptual.",
    infSemaforo: "🚦 ¿Qué es el Juego del Semáforo?",
    infSem1a: "Los Árbitros de Aprendizaje forman parte del",
    infSemName: "Juego del Semáforo",
    infSem1b: ", un dispositivo pedagógico que integra evaluación formativa, aprendizaje entre pares y dinámicas de coopetición (colaboración + competencia).",
    infSem2: "El juego organiza el aprendizaje en tres etapas: preparación previa al juego, comprensión individual dentro del equipo, y competencia entre equipos. Los árbitros de IA intervienen en la segunda y tercera etapa cuando el grupo enfrenta un desacuerdo genuino que no puede resolver por sí solo.",
    infMore: "Ver más sobre el proyecto →",
    infFreeNoReg: "Gratuito · Sin registro · Un dispositivo por grupo",
    infBack: "← Volver al inicio",
    landPageTitle: "Árbitro de Aprendizaje",
    panPageTitle: "Panel del docente",
    panLevelShallow: "Superficial",
    panLevelAdequate: "Adecuado",
    panLevelDeep: "Profundo",
    panBackToList: "← Volver al panel",
    panDownloadPdf: "🖨️ Descargar informe (PDF)",
    panShowText: "📖 Mostrar texto a los alumnos",
    panShowTextHint: "Abre en pantalla completa para proyectar",
    panGenerating: "Generando informe pedagógico…",
    panAnalyzing: "Estamos analizando las disputas de la sesión",
    panUpdateReport: "🔄 Actualizar informe",
    panNewQueries: "⏳ Hay consultas al árbitro nuevas desde que se generó este informe — puede que falten grupos.",
    panDebateLevel: "Nivel de debate",
    panExecSummary: "📋 Resumen ejecutivo",
    panConcepts: "💡 Conceptos debatidos",
    panStrengths: "💪 Fortalezas",
    panOpportunities: "🎯 Áreas de oportunidad",
    panPatterns: "🔍 Patrones observados",
    panRecommendations: "📌 Recomendaciones para el docente",
    panRetake: "❓ Preguntas para retomar en clase",
    panPassed: "⏭️ Preguntas pasadas",
    panPassedBy: "Pasada por {team}",
    panAnotherTeam: "un equipo",
    panPassedTime: " · {time} min",
    panNoText: "(sin texto)",
    panPassedNote: "Estas preguntas no se incluyeron en el análisis pedagógico.",
    panReflectionsTitle: (n: number): string => (n > 0 ? `Reflexiones de los equipos (${n} ${n === 1 ? "partida" : "partidas"})` : "Reflexiones de los equipos"),
    panLoadingReflections: "Cargando reflexiones…",
    panNoReflections: "Todavía no hay informes de metacognición enviados.",
    panQ1: "¿Qué aprendieron?",
    panQ2: "¿Momento más difícil?",
    panQ3: "¿Acuerdo con el árbitro?",
    panQ4: "¿Qué le enseñarían a otro?",
    panQ1s: "¿Qué aprendió?",
    panQ4s: "¿Qué le enseñaría a otro?",
    panRoundDetail: (n: number): string => `Detalle de rondas (${n})`,
    panWentToReferee: "⚖️ Fue al árbitro",
    panQuestionColon: "Pregunta: {text}",
    panVerdictColon: "Veredicto: {text}",
    panCloseX: "✕ Cerrar",
    panTitle: "⚖️ Panel del docente",
    panSubtitle: "Tus sesiones de árbitro de aprendizaje",
    panAdminLoading: "⏳ Cargando...",
    panAdminBack: "👤 Ver solo mis sesiones",
    panAdminAll: "🔐 Ver todas las sesiones (Admin)",
    panAdminShowing: "Mostrando sesiones de todos los docentes",
    panLoadingSessions: "⏳ Cargando sesiones…",
    panNoSessions: "Todavía no tenés sesiones registradas.",
    panNoSessionsHint: "Configurá un árbitro y compartilo con tus alumnos.",
    panGamesCount: (n: number): string => `🎮 ${n} ${n === 1 ? "partida" : "partidas"}`,
    panWithReport: "✅ Con informe",
    panNoReport: "Sin informe aún",
    panGroupReading: "📖 Lectura grupal antes de jugar",
    panViewReport: "Ver informe",
    panGenerateReport: "Generar informe",
    docInstrToday: "Hoy vamos a practicar: {t}",
    docInstrBefore: "📖 Antes de jugar: dediquen unos minutos a leer el texto base del tema. Si no lo tienen a mano, pídanle al docente que lo proyecte desde su panel. Durante el juego no lo van a tener disponible en pantalla — el debate se basa en lo que comprendieron.",
    docInstrHow: "📋 Cómo funciona:",
    docInstrStep1: "1. Formen 2 equipos.",
    docInstrStep2: "2. Entren al link de esta sesión desde el dispositivo de un integrante de cada equipo — ahí se juega toda la ronda.",
    docInstrStep3: "3. Un equipo le hace una pregunta oral al otro; el equipo que responde lo hace en voz alta.",
    docInstrStep4: "4. El equipo que preguntó califica la respuesta: completa (1 punto), incompleta (0.5) o incorrecta (0). El juego suma los puntos solo, automáticamente.",
    docInstrStep6: "6. Al terminar, cada equipo completa la metacognición dentro del juego, que se manda al profesor.",
    docRepIntro: "Al terminar el juego, cada equipo escribe:",
    docRep1: "1. ¿Qué aprendieron hoy sobre \"{t}\"?",
    docRep2: "2. ¿En qué momento dudaron más? ¿Cómo lo resolvieron?",
    docRep3: "3. Contá una disputa donde intervino el árbitro: ¿cuál era tu postura antes de esa decisión y cuál después? ¿Te ayudó a ver el tema desde otro punto de vista?",
    docRep4: "4. ¿Cómo le explicarían a otro compañero lo que aprendieron hoy?",
    docRepEnd: "Al terminar, presioná el botón \"Enviar informe al docente\" dentro del juego. El informe llega automáticamente al panel del docente — no hace falta hacer nada más.",
    docTitle: "⚖️ Árbitro de Aprendizaje — {materia} · {tema}",
    docQuestionsHeader: "📋 PREGUNTAS PARA EL JUEGO:",
    docFinalReportHeader: "✍️ INFORME FINAL:",
    docLinkLine: "🔗 Link del juego: {link}",
    docTeacherNote: "👩‍🏫 Docente: cuando los equipos terminen de jugar vas a poder ver sus respuestas y el informe pedagógico en https://eljuegodelsemaforo.com/arbitro-panel — entrá con la misma cuenta de Google con la que creaste esta tarea. Los alumnos no tienen acceso a esa vista.",
    docClassroomTitle: "⚖️ Árbitro de Aprendizaje — {materia}: {tema}",
    docPrintTitle: "Árbitro de {materia}",
    docPrintInstr: "📋 Instrucciones para los alumnos",
    docPrintQuestions: "📋 Preguntas para el juego",
    docPrintReport: "✍️ Informe final",
    docSesionTitle: "INFORME DE SESIÓN — {materia} · {tema}",
    docDate: "Fecha: {fecha}",
    docTeam: "Equipo: {nombre} ({integrantes})",
    docFinalScore: (p: string, n: number): string => `Puntaje final: ${p} puntos`,
    docReflectionsOf: "REFLEXIONES DE {nombre} ({integrantes})",
    docMetaQ1: "¿Qué aprendieron hoy sobre \"{tema}\"?",
    docMetaQ2: "¿En qué momento dudaron más? ¿Cómo lo resolvieron?",
    docMetaQ3: "Contá una disputa donde intervino el árbitro (IA): ¿cuál era tu postura antes y cuál después?",
    docMetaQ4: "¿Cómo le explicarían a otro compañero lo que aprendieron hoy?",
    docFooter: "Árbitro de Aprendizaje · eljuegodelsemaforo.com",
    docFileName: "informe-arbitro",
    modelConflict: "Pregunta: \"{pregunta}\"\n\nRespuesta de {equipo}: \"{respuesta}\"",
    modelPositionB: "{equipo} (no acepta la calificación): {argumento}",
  },
} as const;

// Misma estructura que `es`, pero con los textos como `string` (sin fijarlos a su
// literal en español), para que en.ts y pt.ts puedan cumplir el mismo tipo.
type WidenStrings<T> = T extends string
  ? string
  : T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer U)[]
    ? readonly WidenStrings<U>[]
    : T extends object
      ? { readonly [K in keyof T]: WidenStrings<T[K]> }
      : T;

export type TranslationKeys = WidenStrings<typeof es>;
