// src/i18n/en.ts
// English Translations

export const en = {
  // ============================================
  // COMMON
  // ============================================
  common: {
    loading: "Loading...",
    error: "Error",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    back: "Back",
    next: "Next",
    continue: "Continue",
    continueVerb: "Continue",
    close: "Close",
    search: "Search",
    filter: "Filter",
    all: "All",
    yes: "Yes",
    no: "No",
    or: "or",

    retry: "Retry",
    ok: "OK",
    copy: "Copy",

    teams: "teams",
    questions: "questions",
  },

  // ============================================
  // AUTH
  // ============================================
  auth: {
    login: "Sign in",
    logout: "Sign out",
    loginWithGoogle: "Sign in with Google",
    loginSubtitle: "Sign in with your Google account to get started",
    welcomeBack: "Welcome back!",
  },

  // ============================================
  // DASHBOARD
  // ============================================
  dashboard: {
    title: "Teacher Dashboard",
    welcome: "Hello!",
    teacherFallbackName: "Teacher",

    createGame: "Create new game",
    createGameDesc: "Set up teams and questions to start playing in minutes.",

    library: "Question library",
    libraryDesc: "Browse official and community question sets and import them instantly.",

    myGames: "My games",
    active: "active",

    noGames: "No active games",
    startFirst: "Create your first game!",

    selectGameMode: "Select game mode",
    selectGameModeSubtitle: "Choose based on your students' age",
    // En la sección dashboard, agrega:
    evaluationsTitle: "Evaluations to review",
    moreGames: "more games",

    // Games list
    loadingGames: "Loading games...",
    noGamesCreated: "You haven't created any games yet.",
    finishedGames: "finished games",
    viewResults: "View results",
    unnamedGame: "Untitled game",

    // Current mode panel
    currentMode: "Current mode",

    // Footer
    aboutThisProject: "About this project",

    // Status labels (GameCard)
    status: {
      finished: "Finished",
      stage0Proposals: "Stage 0 — Proposals",
      collectingProposals: "Collecting proposals",
      curatingProposals: "Curating proposals",
      stage1Playing: "Stage 1 — Playing",
      transitionStage2: "Preparing Stage 2",
      stage2Playing: "Stage 2 — Playing",
      preparing: "Preparing",
    },

    // Relative time (GameCard)
    time: {
      minutesAgo: (n: number) => `${n} min ago`,
      hoursAgo: (n: number) => `${n} h ago`,
      daysAgo: (n: number) => `${n} d ago`,
    },
  },

  // ============================================
  // JOIN (STUDENTS)
  // ============================================
  join: {
    appTitle: "Traffic Light Game",

    // Top text
    welcomeBack: "Welcome back!",
    enterRoomCode: "Enter the room code",
    selectTeam: "Choose your team",

    // Saved session
    previousSessionFound: "Previous session found",
    codeLabel: "Code",
    reconnecting: "Reconnecting...",
    goBackToGame: "↩️ Back to the game",
    newSession: "New",

    // Divider
    orEnterNewCode: "or enter a new code",

    // Errors
    couldntReconnect: "Couldn't reconnect. Please enter the room code.",
    codeMustBe6: "The code must be 6 characters",
    invalidCode: "Invalid code",
    lookupError: "Error looking up the code. Please try again.",
    noTeamsConfigured: "This game has no teams configured",

    // Buttons / actions
    searching: "Searching...",
    findRoom: "Find room →",
    codeOnTeacherScreen: "The code is on the teacher's screen",

    // Stage / phase banners
    proposalsActive: "Proposals stage is active",
    proposalsDesc: "Your team will create questions for the game",
    waitingTeacher: "Waiting for the teacher",
    waitingDesc: "The game is being prepared",

    // Navigation
    changeCode: "← Change code",

    // Join button texts by phase
    joinProposals: "Create proposals! 📝",
    joinWaiting: "Enter room 🚪",
    joinNormal: "Join! 🎮",
  },

  // ============================================
  // GAME MODES
  // ============================================
  gameModes: {
    trafficLight: {
      title: "Traffic Light Game",
      subtitle: "The Traffic Light Game",
      description: "Ideal for elementary students. Colorful and friendly interface.",
      ageRange: "Under 13",
    },
    coopetition: {
      title: "The Coopetition Game",
      subtitle: "Where competition meets collaboration",
      description: "For teenagers and adults. More professional and sober design.",
      ageRange: "13+ years",
    },
  },

  // ============================================
  // SETUP
  // ============================================
  setup: {
    title: "Set up new game",
    step1: "Step 1: Basic information",
    step2: "Step 2: Questions",
    step3: "Step 3: Set up teams",
    step4: "Step 4: Ready to play!",

    // Step 1
    language: "Language",
    spanish: "Spanish",
    english: "English",
    className: "Class name",
    classNamePlaceholder: "3A - Math",
    subject: "Subject",
    subjectPlaceholder: "Mathematics",
    numTeams: "Number of teams",
    studentsPerTeam: "Students per team",

    // Stage 0
    stage0Section: "Stage 0: Preparation (optional)",
    stage0Enable: "Enable group preparation stage",
    stage0Desc: "Teams will have access to study material before starting the game.",
    stage0Warning:
      "💡 First time playing? We recommend skipping Stage 0 and using a game from the library. Stage 0 is designed for students who already understand the game dynamics.",
    stage0MaterialType: "Material type",
    stage0MaterialLink: "External link",
    stage0MaterialText: "Text",
    stage0MaterialTitle: "Material title",
    stage0MaterialContent: "Content",
    stage0MaterialLinkPlaceholder: "https://docs.google.com/...",
    stage0MaterialTextPlaceholder: "Paste here the text that teams should read...",
    stage0GeneratePrompt: "Need to generate material? Use this prompt with ChatGPT",

    // Step 2
    chooseFromLibrary: "Choose from library",
    orUploadFile: "Or upload your own file:",
    uploadCSV: "Upload CSV file",
    loadedFromLibrary: "Loaded from library:",
    questionsLoaded: "questions loaded",
    analyzing: "Analyzing CSV...",

    // Step 3
    enterNames: "Enter names (one per line)",
    assignRandom: "Assign randomly",
    totalStudents: "Total:",
    uniqueStudents: "Unique:",
    duplicates: "Duplicates:",
    duplicatesNote: "Duplicates are ignored when building teams.",
    duplicatesFound: "Duplicates found:",
    teamsConfigured: "Teams configured",
    moveStudentsHint: "You can move students between teams by selecting the destination team",

    // Step 4
    roomCode: "Room code",
    shareCode: "Share this code with your students",
    stage0Enabled: "Stage 0 enabled. Teams will see the preparation material.",
    startGame: "Start game",
    createGame: "Create game",
  },

  // ============================================
  // LIBRARY
  // ============================================
  library: {
    title: "Library",
    pageTitle: "Question banks",
    pageSubtitle: "Explore questions organized by level, area and subject.",

    // Filters
    game: "Game",
    grade: "Grade",
    area: "Area",
    subject: "Subject",
    searchPlaceholder: "Search by title, topic or content...",
    showing: "Showing",
    of: "of",
    items: "items",

    // Card
    use: "Use",
    moreInfo: "More info",
    lessInfo: "Less",
    contents: "Contents",
    skills: "Skills",
    questions: "questions",
    noFile: "No file",
    loading: "Loading...",

    // Stats
    withFile: "with file",

    // Empty
    noResults: "No items found with the selected filters.",

    // Admin
    adminTitle: "Administration",
    adminDesc: "As an administrator, you can upload new question banks.",
    uploadSingle: "Upload single",
    bulkUpload: "Bulk upload",
  },

  // ============================================
  // STAGE 0 - QUESTION PROPOSALS
  // ============================================
  stage0: {
    // Titles
    title: "Stage 0: Preparation",
    subtitle: "Read the material before starting the game",
    teacherTitle: "Stage 0 panel",
    teacherSubtitle: "Review team proposals",

    // Material
    teamName: "Team:",
    materialTitle: "Study material",
    openLink: "Open material",
    noMaterial: "The teacher has not uploaded preparation material.",
    readCarefully: "Read carefully—this content will help you in the game.",

    // Phases
    phaseReading: "Phase: Reading",
    phaseProposing: "Phase: Proposals",
    phaseReviewing: "Phase: Review",
    phaseResults: "Phase: Results",

    // Teacher actions
    startProposals: "Start proposals",
    startReview: "Start review",
    finishAndStart: "Finish and start Stage 1",

    // Proposals - Form
    proposalsTitle: "Propose questions",
    proposalsSubtitle: "Propose questions based on the material",
    proposalCount: "proposals",
    addProposal: "Add question",
    proposalType: "Question type",
    questionText: "Your question",
    questionPlaceholder: "Write your proposed question...",
    hintLabel: "Hint to answer (optional)",
    hintPlaceholder: "A hint to help think about the answer...",
    relatedTopicLabel: "What topic does it relate to?",
    relatedTopicPlaceholder: "E.g.: Water cycle, Fractions...",
    submittedByLabel: "Who proposes it? (optional)",
    submittedByPlaceholder: "Team member name...",
    submit: "Submit question",

    // Proposal types
    typeComprehension: "📝 Comprehension",
    typeComprehensionDesc: "What does it mean...? / Explain in your own words...",
    typeRelation: "🔗 Connection to other topics",
    typeRelationDesc: "How does it connect to...? / What similarities are there with...?",
    typeApplication: "🌍 Practical application",
    typeApplicationDesc: "Where do you see this in real life? / How would you use...?",
    typeAnalysis: "🤔 Analysis / Opinion",
    typeAnalysisDesc: "Why do you think...? / What would happen if...?",
    typeProduction: "💡 Production",
    typeProductionDesc: "Draw / Represent / Order the steps...",

    // Proposal status
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    edited: "Edited",

    // Team ready
    markReady: "We finished proposing",
    unmarkReady: "We want to keep proposing",
    teamReady: "Team ready!",
    waitingReview: "Waiting for the teacher to review proposals...",
    waiting: "Waiting for the teacher to start the game...",

    // Timer
    timeRemaining: "Time remaining",

    // Results
    resultsTitle: "Stage 0 results",
    approvedCount: "approved questions",
    bonusPoints: "bonus points",
    waitingStart: "Waiting for the teacher to start Stage 1...",

    // Errors
    errorEmpty: "Write a question",
    errorRelated: "Indicate what topic it relates to",
    maxReached: "Maximum proposals reached",

    // Teacher panel - Filters
    filterAll: "All",
    filterPending: "Pending",
    filterApproved: "Approved",
    filterRejected: "Rejected",
    allTeams: "All teams",

    // Teacher panel - Stats
    totalProposals: "Total proposals",
    pendingCount: "Pending",
    approvedCountLabel: "Approved",
    rejectedCount: "Rejected",
    teamsReady: "Teams ready",

    // Teacher panel - Actions
    proposedBy: "Proposed by",
    relatedTo: "Related to",
    hint: "Hint",
    approve: "Approve",
    reject: "Reject",
    edit: "Edit",
    saveEdit: "Save",
    cancelEdit: "Cancel",
    bonusLabel: "Bonus points",

    // Teacher panel - Empty
    noProposals: "No proposals yet",
    noProposalsFiltered: "No proposals match these filters",

    // Teacher panel - Confirmations
    pendingWarning: "There are pending proposals to review",
    confirmStart: "Start Stage 1? Bonus points will be applied automatically.",

    // Save to library
    saveToLibrary: "Save to my library",
    savedToLibrary: "Saved to library!",

    // Setup
    enableProposals: "Enable question proposals",
    enableProposalsDesc:
      "Teams can propose questions based on the material. You decide which to approve and how many points to assign.",
    maxProposalsPerTeam: "Max questions per team",
    timeLimitOptional: "Time limit (optional)",
    noLimit: "No limit",
  },

  // ============================================
  // GAME
  // ============================================
  game: {
    stage1: "Stage 1: Individual rating",
    stage2: "Stage 2: Group collaboration",
    round: "Round",
    question: "Question",
    hint: "Hint",
    timeLeft: "Time left",
    submit: "Submit",
    correct: "Correct!",
    incorrect: "Incorrect",
    waiting: "Waiting...",
    results: "Results",
    winner: "Winner!",
    score: "Score",
    team: "Team",
    player: "Player",
  },

  // ============================================
  // ERRORS
  // ============================================
  errors: {
    generic: "Something went wrong. Please try again.",
    loadingCSV: "Error loading file. Please try again.",
    creatingGame: "Error creating game.",
    startingGame: "Error starting game.",
    completeFields: "Complete class name and subject.",
    uploadCSV: "Upload a CSV file with questions.",
    assignStudents: "Assign students to teams.",
    enterStudentNames: "First enter student names.",

    deletingGame: "Error deleting game.",
    notAuthorized: "You don't have permission to do this.",
    notFound: "Not found.",
  },

  // ============================================
  // GRADES
  // ============================================
  grades: {
    "3°": "3rd Grade",
    "4°": "4th Grade",
    "5°": "5th Grade",
    "6°": "6th Grade",
    "7°": "7th Grade",
    secondary: "Secondary",
  },

  // ============================================
  // CSV PARSER
  // ============================================
  csv: {
    warnings: {
      noValidHeadersFallback:
        "ℹ️ This CSV had no valid headers. Columns were interpreted by position and IDs were generated if missing.",
      encodingIssuesPossible:
        "⚠️ The file might have encoding issues (incorrect accents). Consider saving it as UTF-8.",
      repeatedHeaderIgnored: "Row {{rowNumber}}: repeated header (ignored).",
      missingQuestionTextIgnored: "Row {{rowNumber}}: missing question text (ignored).",
      invalidSuggestedStageDefaulted:
        "Row {{rowNumber}}: invalid suggestedStage (\"{{value}}\"). Stage {{defaultStage}} was used.",
    },
    errors: {
      emptyCsvFile: "The CSV file is empty.",
      noValidQuestionsFound: "No valid questions were found in the CSV.",
      papaparseError: "Error reading CSV: {{message}} (row {{row}}).",
      cannotReadCsv: "Could not read CSV: {{message}}.",
      cannotReadCsvFallback: "Could not read CSV (fallback): {{message}}.",
    },
  },

  // ============================================
  // CSV PREVIEW
  // ============================================
  csvPreview: {
    title: "Import preview",
    totalRows: "Total rows",
    validQuestions: "Valid questions",
    warnings: "Warnings",
    errors: "Errors",
    validQuestionsTitle: "Valid questions",
    editBeforeImport: "You can edit before importing",
    question: "Question",
    hint: "Hint",
    noHint: "No hint",
    stage: "Stage",
    cancel: "Cancel",
    import: "Import",
    questions: "questions",
    noValidQuestions: "No valid questions",
    note: "Only valid questions will be imported. Rows with errors will be ignored.",
  },

  // ============================================
  // GAME CONTROLLER
  // ============================================
  gameController: {
    loading: "Loading game...",
    error: "Error",
    gameNotFound: "Could not load game",
    teamNotFound: "Team not found",
    waiting: "Waiting",
    preparingRound: "Preparing next round...",
    viewTeam: "View team",
    viewClassroom: "Classroom view",
    startingStage2: "Starting Stage 2...",
    errorStartingStage2: "Error starting Stage 2",
    resetConfirm: "Reset ALL teams to round 1? They will lose all progress.",
    resetSuccess: "Game reset. All teams return to round 1.",
    resetError: "Error resetting game",
  },

  // ============================================
  // SOUND
  // ============================================
  sound: {
    enable: "Enable sounds",
    disable: "Disable sounds",
    on: "ON",
    off: "OFF",
  },

  // ============================================
  // ADMIN
  // ============================================
  admin: {
    title: "Admin metrics",
    downloadExcel: "Download Excel",
    teachers: "Teachers",
    totalSessions: "Total sessions",
    gamesCreated: "Games created",
    email: "Email",
    uid: "UID",
    sessions: "Sessions",
    games: "Games",
    lastLogin: "Last login",
    lastAccess: "Last access",
    noData: "No teacher data yet",
    backToSetup: "Back to setup",
    accessDenied: "Access denied",
    authDisabled: "Authentication system is disabled.",
    enableAuth: "Enable VITE_AUTH_REQUIRED=true to access metrics.",
    verifyingSession: "Verifying session...",
    verifyingPermissions: "Verifying admin permissions...",
    restrictedAccess: "Restricted access",
    adminsOnly: "This page is for administrators only.",

    // Upload page
    uploadTitle: "Upload new CSV",
    bankTitle: "Question bank title",
    bankTitlePlaceholder: "E.g.: Vertebrates and Invertebrates",
    grade: "Grade",
    subject: "Subject",
    description: "Content description",
    descriptionPlaceholder: "E.g.: Animal classification by vertebral column...",
    csvFile: "CSV file",
    csvValid: "Valid CSV",
    file: "File",
    questionsDetected: "Questions detected",
    completeAllFields: "Complete all fields",
    uploadToLibrary: "Upload to library",
    uploading: "Uploading...",
    uploadSuccess: "CSV uploaded successfully!",
    redirecting: "Redirecting to library...",
  },

  // ============================================
  // TEACHER LIBRARY
  // ============================================
  teacherLibrary: {
    myGames: "My games",
    community: "Community",
    official: "Official library",

    privateGames: "Private games",
    publicGames: "Public games",
    totalUses: "Total uses",
    avgRating: "Average rating",

    saveGame: "Save game",
    editGame: "Edit game",
    deleteGame: "Delete game",
    copyGame: "Copy to my library",
    makePublic: "Make public",
    makePrivate: "Make private",
    useGame: "Use this game",

    private: "Private",
    public: "Public",
    onlyYou: "Only you can see this game",
    everyoneCanSee: "Visible to the entire community",

    rate: "Rate",
    ratings: "ratings",
    noRatingsYet: "No ratings yet",
    yourRating: "Your rating",
    thankYou: "Thanks for rating!",
    cantRateOwn: "You can't rate your own game",

    report: "Report",
    reportGame: "Report game",
    reportReason: "Report reason",
    inappropriate: "Inappropriate content",
    incorrect: "Incorrect information",
    spam: "Spam",
    copyright: "Copyright violation",
    other: "Other",
    reportDetails: "Details (optional)",
    reportSubmitted: "Report submitted. Thanks for helping maintain the community.",
    alreadyReported: "You already reported this game",

    copySuccess: "Game copied to your library!",
    copyAsPrivate: "Saved as private. You can edit and publish it whenever you want.",

    privateLimitReached: "You've reached the private games limit",
    privateLimitDesc: "Make a game public or delete one to create more.",

    noMyGames: "You haven't saved any games yet",
    noMyGamesDesc: "Create a game and save it for later use",
    noCommunityGames: "No community games with these filters",
    noCommunityGamesDesc: "Try changing filters or be the first to share",

    sortBy: "Sort by",
    recent: "Most recent",
    rating: "Best rated",
    popular: "Most used",

    gameTitle: "Game title",
    gameTitlePlaceholder: "E.g.: Fractions Quiz",
    gameDescription: "Description",
    gameDescriptionPlaceholder: "Describe what the game is about and who it's for...",
    selectVisibility: "Do you want to share it with the community?",
    visibilityNote: "You can change visibility later",

    confirmDelete: "Are you sure you want to delete this game?",
    confirmDeleteDesc: "This action cannot be undone.",
    confirmMakePublic: "Publish this game?",
    confirmMakePublicDesc: "It will be visible to all teachers in the community.",

    by: "by",
    you: "you",

    timesUsed: "times used",
    timesCopied: "times copied",
  },

  // ============================================
  // PROMPT GENERATOR
  // ============================================
  promptGenerator: {
    title: "AI prompt generator",
    subtitle: "Create an optimized prompt to generate educational questions",

    step1: "Level & configuration",
    step2: "What topic?",
    step3: "Advanced settings",

    level: "Education level",
    primary: "Elementary",
    secondary: "Secondary/High School",
    grade: "Grade/Year",

    promptLanguage: "Game language",
    spanish: "Spanish",
    english: "English",

    category: "Content category",
    subject: "Curricular subject",
    history: "Historical event",
    book: "Book",
    fun: "Movie/Series",

    selectSubject: "Select a subject",
    selectEvent: "Select a historical event",
    selectBook: "Select a book",
    selectMedia: "Select a movie or series",
    other: "Other (specify)",
    customPlaceholder: "Write the topic...",

    showAll: "Show all",
    forPrimary: "For elementary",
    forSecondary: "For secondary",
    universal: "Universal",
    argentina: "Argentina",
    americas: "Americas",
    movies: "Movies",
    series: "Series",
    documentaries: "Documentaries",

    advancedSettings: "Advanced settings",
    totalQuestions: "Number of prompts",
    stage1Production: "% Production in Stage 1",
    stage2Production: "% Production in Stage 2",
    subtopicsInclude: "Subtopics to INCLUDE",
    subtopicsExclude: "Subtopics to EXCLUDE",
    subtopicsPlaceholder: "Separate with commas...",
    preferredStyle: "Preferred style",
    practical: "More practical",
    analytical: "More analytical",
    mixed: "Mixed",

    stageExplanation: "What are Stage 1 and Stage 2?",
    stage1Title: "Stage 1 - Internal preparation",
    stage1Desc:
      "NOT competitive. Each team works internally to level up. Prompts are introductory and diagnostic. Mistakes are opportunities for group learning.",
    stage2Title: "Stage 2 - Collaborative competition",
    stage2Desc:
      "Competition between teams. More challenging and production-focused prompts. Apply knowledge built in Stage 1. Internal collaboration + external competition.",

    generatePrompt: "Generate prompt",
    copyToClipboard: "Copy to clipboard",
    openInGemini: "Open in Gemini",
    copied: "Copied!",

    savedPresets: "Saved configurations",
    savePreset: "Save configuration",
    presetName: "Configuration name",
    presetNamePlaceholder: "E.g.: Math 6th grade",
    loadPreset: "Load",
    deletePreset: "Delete",
    noPresets: "No saved configurations",
    maxPresetsReached: "Maximum 5 configurations. Oldest will be removed.",
    presetSaved: "Configuration saved!",

    previewTitle: "Prompt preview",
    promptReady: "Your prompt is ready",
    promptReadyDesc:
      "Copy and paste it into Gemini, ChatGPT or another AI assistant to generate the prompts.",

    selectContent: "Select content to continue",
    portuguese: "Portuguese",
  },

  // ============================================
  // PROTECTED ROUTE
  // ============================================
  protectedRoute: {
    verifyingSession: "Verifying session...",
  },
  // ============================================
  // REFERRAL PAGE
  // ============================================
  referral: {
    title: "Refer a colleague",
    subtitle: "Help us grow by sharing the Traffic Light Game with other educators",
    referredName: "Colleague's name",
    referredEmail: "Colleague's email",
    referredSchool: "School/Institution",
    message: "Personal message (optional)",
    messagePlaceholder: "Why do you think they'd be interested?",
    submit: "Submit referral",
    sending: "Sending...",
    successTitle: "Thank you for your referral!",
    successMessage: "We'll contact your colleague. When they sign up, you'll receive your reward.",
    rewards: "Your reward",
    rewardsDetail: "🎴 PDF Card Kit + 🌟 Collaborator Badge",
    errorMessage: "There was an error. Please try again.",
    backToDashboard: "Back to home",
  },

  // ============================================
  // WEBINAR PAGE - ENGLISH
  // ============================================
  // Reemplazar la sección "webinar" en src/i18n/en.ts

  webinar: {
    title: "Webinar Registration",
    noWebinar: "No webinars scheduled",
    noWebinarDesc: "Check back soon for upcoming events.",
    dateLabel: "Date and time",
    timezone: "(Argentina, GMT-3)",
    name: "Your name",
    email: "Your email",
    school: "School/Institution (optional)",

    // New field: teaching level
    teachingLevel: "What level do you teach?",
    levelPrimary: "Primary / Elementary",
    levelSecondary: "Secondary / High School",
    levelHigher: "Higher Education / University",
    levelOther: "Other",

    // Experience - improved text
    experience: "Experience with the Traffic Light Game",
    experienceNone: "Never used it",
    experienceExplored: "I checked it out but haven't tried it in class",
    experienceUsed: "I've used it in class",
    experienceRegular: "I use it regularly",

    questions: "What would you like to learn? (optional)",
    questionsPlaceholder: "Topics you're interested in or questions you have...",
    submit: "Register",
    sending: "Registering...",

    // Success screen - improved
    successTitle: "You're registered!",
    successMessage: "We'll send you the access link by email.",
    successReminder: "In the meantime, you can try the game:",
    successLinkPrimary: "🚦 Primary",
    successLinkSecondary: "🎯 Secondary",

    errorMessage: "There was an error. Please try again.",
    backToDashboard: "Back to home",
    // ========== SECTION 13: Preparation for Self-Assessment ==========
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
} as const;

export type TranslationKeys = typeof en;