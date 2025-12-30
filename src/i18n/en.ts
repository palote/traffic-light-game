// src/i18n/en.ts
// English Translations

import type { TranslationKeys } from './es';

export const en: TranslationKeys = {
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
    close: "Close",
    search: "Search",
    filter: "Filter",
    all: "All",
    yes: "Yes",
    no: "No",
    or: "or",
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
    welcome: "Hello",
    createGame: "Create new game",
    library: "Question library",
    myGames: "My games",
    noGames: "No active games",
    startFirst: "Create your first game!",
    selectGameMode: "Select game mode",
    selectGameModeSubtitle: "Choose based on your students' age",
  },

  // ============================================
  // GAME MODES
  // ============================================
  gameModes: {
    trafficLight: {
      title: "Traffic Light Game",
      subtitle: "The Traffic Light Game",
      description: "Ideal for elementary and middle school students. Colorful and friendly interface.",
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
    title: "Setup New Game",
    step1: "Step 1: Basic Information",
    step2: "Step 2: Questions",
    step3: "Step 3: Setup Teams",
    step4: "Step 4: Ready to Play!",
    
    // Step 1
    language: "Language",
    spanish: "Español",
    english: "English",
    className: "Class name",
    classNamePlaceholder: "Grade 3A - Math",
    subject: "Subject",
    subjectPlaceholder: "Mathematics",
    numTeams: "Number of teams",
    studentsPerTeam: "Students per team",
    
    // Stage 0
    stage0Section: "Stage 0: Preparation (optional)",
    stage0Enable: "Enable group preparation stage",
    stage0Desc: "Teams will have access to study material before starting the game.",
    stage0Warning: "💡 First time playing? We recommend skipping Stage 0 and using a game from the library. Stage 0 is designed for students who already understand the game dynamics.",
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
    roomCode: "Room Code",
    shareCode: "Share this code with your students",
    stage0Enabled: "Stage 0 enabled. Teams will see the preparation material.",
    startGame: "Start Game",
    createGame: "Create Game",
  },

  // ============================================
  // LIBRARY
  // ============================================
  library: {
    title: "Library",
    pageTitle: "Question Banks",
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
  // STAGE 0
  // ============================================
  stage0: {
    title: "Stage 0: Preparation",
    subtitle: "Read the material before starting the game",
    teamName: "Team:",
    materialTitle: "Study material",
    openLink: "Open material",
    waiting: "Waiting for the teacher to start the game...",
    noMaterial: "The teacher has not uploaded preparation material.",
    readCarefully: "Read carefully, this content will help you in the game.",
  },

  // ============================================
  // GAME
  // ============================================
  game: {
    stage1: "Stage 1: Individual Rating",
    stage2: "Stage 2: Group Collaboration",
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
  // CSV PREVIEW
  // ============================================
  csvPreview: {
    title: "Import Preview",
    totalRows: "Total rows",
    validQuestions: "Valid questions",
    warnings: "Warnings",
    errors: "Errors",
    validQuestionsTitle: "Valid Questions",
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
    viewTeam: "View Team",
    viewClassroom: "Classroom View",
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
    title: "Admin Metrics",
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
    backToSetup: "Back to Setup",
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
  // TEACHER LIBRARY - Teacher's library
  // ============================================
  teacherLibrary: {
    // Tabs
    myGames: "My Games",
    community: "Community",
    official: "Official Library",
    
    // Stats
    privateGames: "Private games",
    publicGames: "Public games",
    totalUses: "Total uses",
    avgRating: "Average rating",
    
    // Actions
    saveGame: "Save game",
    editGame: "Edit game",
    deleteGame: "Delete game",
    copyGame: "Copy to my library",
    makePublic: "Make public",
    makePrivate: "Make private",
    useGame: "Use this game",
    
    // Visibility
    private: "Private",
    public: "Public",
    onlyYou: "Only you can see this game",
    everyoneCanSee: "Visible to the entire community",
    
    // Rating
    rate: "Rate",
    ratings: "ratings",
    noRatingsYet: "No ratings yet",
    yourRating: "Your rating",
    thankYou: "Thanks for rating!",
    cantRateOwn: "You can't rate your own game",
    
    // Report
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
    
    // Copy
    copySuccess: "Game copied to your library!",
    copyAsPrivate: "Saved as private. You can edit and publish it whenever you want.",
    
    // Limits
    privateLimitReached: "You've reached the private games limit",
    privateLimitDesc: "Make a game public or delete one to create more.",
    
    // Empty states
    noMyGames: "You haven't saved any games yet",
    noMyGamesDesc: "Create a game and save it for later use",
    noCommunityGames: "No community games with these filters",
    noCommunityGamesDesc: "Try changing filters or be the first to share",
    
    // Sort
    sortBy: "Sort by",
    recent: "Most recent",
    rating: "Best rated",
    popular: "Most used",
    
    // Form
    gameTitle: "Game title",
    gameTitlePlaceholder: "E.g.: Fractions Quiz",
    gameDescription: "Description",
    gameDescriptionPlaceholder: "Describe what the game is about and who it's for...",
    selectVisibility: "Do you want to share it with the community?",
    visibilityNote: "You can change visibility later",
    
    // Confirmations
    confirmDelete: "Are you sure you want to delete this game?",
    confirmDeleteDesc: "This action cannot be undone.",
    confirmMakePublic: "Publish this game?",
    confirmMakePublicDesc: "It will be visible to all teachers in the community.",
    
    // Author
    by: "by",
    you: "you",
    
    // Usage
    timesUsed: "times used",
    timesCopied: "times copied",
  },

  // ============================================
  // PROMPT GENERATOR
  // ============================================
  promptGenerator: {
    title: "AI Prompt Generator",
    subtitle: "Create an optimized prompt to generate educational prompts",
    
    // Steps
    step1: "Level & Configuration",
    step2: "What topic?",
    step3: "Advanced Settings",
    
    // Level
    level: "Education level",
    primary: "Elementary",
    secondary: "Secondary/High School",
    grade: "Grade/Year",
    
    // Language
    promptLanguage: "Game language",
    spanish: "Español",
    english: "English",
    
    // Categories
    category: "Content category",
    subject: "Curricular subject",
    history: "Historical event",
    book: "Book",
    fun: "Movie/Series",
    
    // Selection
    selectSubject: "Select a subject",
    selectEvent: "Select a historical event",
    selectBook: "Select a book",
    selectMedia: "Select a movie or series",
    other: "Other (specify)",
    customPlaceholder: "Write the topic...",
    
    // Filters for lists
    showAll: "Show all",
    forPrimary: "For elementary",
    forSecondary: "For secondary",
    universal: "Universal",
    argentina: "Argentina",
    americas: "Americas",
    movies: "Movies",
    series: "Series",
    documentaries: "Documentaries",
    
    // Advanced settings
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
    
    // Stage explanation
    stageExplanation: "What are Stage 1 and Stage 2?",
    stage1Title: "Stage 1 - Internal Preparation",
    stage1Desc: "NOT competitive. Each team works internally to level up. Prompts are introductory and diagnostic. Mistakes are opportunities for group learning.",
    stage2Title: "Stage 2 - Collaborative Competition",
    stage2Desc: "Competition between teams. More challenging and production-focused prompts. Apply knowledge built in Stage 1. Internal collaboration + external competition.",
    
    // Actions
    generatePrompt: "Generate Prompt",
    copyToClipboard: "Copy to clipboard",
    openInGemini: "Open in Gemini",
    copied: "Copied!",
    
    // Presets
    savedPresets: "Saved configurations",
    savePreset: "Save configuration",
    presetName: "Configuration name",
    presetNamePlaceholder: "E.g.: Math 6th grade",
    loadPreset: "Load",
    deletePreset: "Delete",
    noPresets: "No saved configurations",
    maxPresetsReached: "Maximum 5 configurations. Oldest will be removed.",
    presetSaved: "Configuration saved!",
    
    // Preview
    previewTitle: "Prompt preview",
    promptReady: "Your prompt is ready",
    promptReadyDesc: "Copy and paste it into Gemini, ChatGPT or another AI assistant to generate the prompts.",
    
    // Validation
    selectContent: "Select content to continue",
  },

  // ============================================
  // STAGE 0 - PROMPT PROPOSALS
  // ============================================
  stage0: {
    // Titles
    title: "Stage 0: Preparation",
    subtitle: "Read the material before starting the game",
    teacherTitle: "Stage 0 Panel",
    teacherSubtitle: "Review team proposals",
    
    // Material
    teamName: "Team:",
    materialTitle: "Study material",
    openLink: "Open material",
    noMaterial: "The teacher has not uploaded preparation material.",
    readCarefully: "Read carefully, this content will help you in the game.",
    
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
    proposalsTitle: "Propose Prompts",
    proposalsSubtitle: "Propose prompts based on the material",
    proposalCount: "proposals",
    addProposal: "Add prompt",
    proposalType: "Prompt type",
    questionText: "Your prompt",
    questionPlaceholder: "Write your proposed prompt...",
    hintLabel: "Hint to answer (optional)",
    hintPlaceholder: "A hint to help think about the answer...",
    relatedTopicLabel: "What topic does it relate to?",
    relatedTopicPlaceholder: "E.g.: Water cycle, Fractions...",
    submittedByLabel: "Who proposes it? (optional)",
    submittedByPlaceholder: "Team member name...",
    submit: "Submit prompt",
    
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
    resultsTitle: "Stage 0 Results",
    approvedCount: "approved prompts",
    bonusPoints: "bonus points",
    waitingStart: "Waiting for the teacher to start Stage 1...",
    
    // Errors
    errorEmpty: "Write a prompt",
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
    enableProposals: "Enable prompt proposals",
    enableProposalsDesc: "Teams can propose prompts based on the material. You decide which to approve and how many points to assign.",
    maxProposalsPerTeam: "Max prompts per team",
    timeLimitOptional: "Time limit (optional)",
    noLimit: "No limit",
  },

  // ============================================
  // PROTECTED ROUTE
  // ============================================
  protectedRoute: {
    verifyingSession: "Verifying session...",
  },
};