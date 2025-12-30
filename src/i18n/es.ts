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
    close: "Cerrar",
    search: "Buscar",
    filter: "Filtrar",
    all: "Todos",
    yes: "Sí",
    no: "No",
    or: "o",
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
    welcome: "¡Hola",
    createGame: "Crear nuevo juego",
    library: "Biblioteca de preguntas",
    myGames: "Mis juegos",
    noGames: "No tenés juegos activos",
    startFirst: "¡Creá tu primer juego!",
    selectGameMode: "Seleccioná el modo de juego",
    selectGameModeSubtitle: "Elegí según la edad de tus estudiantes",
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
    english: "English",
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
    stage0Warning: "💡 ¿Primera vez jugando? Recomendamos saltar la Etapa 0 y usar un juego de la biblioteca. La Etapa 0 está pensada para estudiantes que ya conocen la dinámica del juego.",
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
    items: "items",
    
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
    noResults: "No se encontraron items con los filtros seleccionados.",
    
    // Admin
    adminTitle: "Administración",
    adminDesc: "Como administrador, podés subir nuevos bancos de preguntas.",
    uploadSingle: "Subir individual",
    bulkUpload: "Bulk upload",
  },

  // ============================================
  // STAGE 0
  // ============================================
  stage0: {
    title: "Etapa 0: Preparación",
    subtitle: "Lean el material antes de comenzar el juego",
    teamName: "Equipo:",
    materialTitle: "Material de estudio",
    openLink: "Abrir material",
    waiting: "Esperando que el docente inicie el juego...",
    noMaterial: "El docente no ha cargado material de preparación.",
    readCarefully: "Lean con atención, este contenido les ayudará en el juego.",
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
    startingStage2: "Iniciando Stage 2...",
    errorStartingStage2: "Error al iniciar Stage 2",
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
    title: "Admin Metrics",
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
    backToSetup: "Volver a Setup",
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
    english: "English",
    
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
    stage1Production: "% Producción en Stage 1",
    stage2Production: "% Producción en Stage 2",
    subtopicsInclude: "Subtemas a INCLUIR",
    subtopicsExclude: "Subtemas a EXCLUIR",
    subtopicsPlaceholder: "Separar con comas...",
    preferredStyle: "Estilo preferido",
    practical: "Más prácticas",
    analytical: "Más analíticas",
    mixed: "Mixtas",
    
    // Stage explanation
    stageExplanation: "¿Qué son Stage 1 y Stage 2?",
    stage1Title: "Stage 1 - Preparación Interna",
    stage1Desc: "NO es competitivo. Cada equipo trabaja internamente para nivelarse. Las consignas son introductorias y diagnósticas. Los errores son oportunidades de aprendizaje grupal.",
    stage2Title: "Stage 2 - Competencia Colaborativa",
    stage2Desc: "Competencia entre equipos. Consignas más desafiantes y de producción. Se aplica el conocimiento construido en Stage 1. Colaboración interna + competencia externa.",
    
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
    promptReadyDesc: "Copialo y pegalo en Gemini, ChatGPT u otro asistente de IA para generar las consignas.",
    
    // Validation
    selectContent: "Seleccioná un contenido para continuar",
  },

  // ============================================
  // STAGE 0 - PROPUESTAS DE CONSIGNAS
  // ============================================
  stage0: {
    // Títulos
    title: "Etapa 0: Preparación",
    subtitle: "Lean el material antes de comenzar el juego",
    teacherTitle: "Panel Stage 0",
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
    finishAndStart: "Finalizar y comenzar Stage 1",
    
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
    resultsTitle: "Resultados Stage 0",
    approvedCount: "consignas aprobadas",
    bonusPoints: "puntos bonus",
    waitingStart: "Esperando que el docente inicie Stage 1...",
    
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
    confirmStart: "¿Iniciar Stage 1? Los puntos bonus se aplicarán automáticamente.",
    
    // Guardar en biblioteca
    saveToLibrary: "Guardar en mi biblioteca",
    savedToLibrary: "¡Guardada en biblioteca!",
    
    // Setup
    enableProposals: "Habilitar propuestas de consignas",
    enableProposalsDesc: "Los equipos podrán proponer consignas basadas en el material. Vos decidís cuáles aprobar y cuántos puntos asignar.",
    maxProposalsPerTeam: "Máx. consignas por equipo",
    timeLimitOptional: "Tiempo límite (opcional)",
    noLimit: "Sin límite",
  },

  // ============================================
  // PROTECTED ROUTE
  // ============================================
  protectedRoute: {
    verifyingSession: "Verificando sesión...",
  },
};

export type TranslationKeys = typeof es;