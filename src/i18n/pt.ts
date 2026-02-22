// src/i18n/pt.ts
// Portuguese Translations (Brazilian Portuguese)

export const pt = {
  // ============================================
  // COMMON
  // ============================================
  common: {
    loading: "Carregando...",
    error: "Erro",
    save: "Salvar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    delete: "Excluir",
    edit: "Editar",
    back: "Voltar",
    next: "Próximo",
    continue: "Continuar",
    continueVerb: "Continuar",
    close: "Fechar",
    search: "Buscar",
    filter: "Filtrar",
    all: "Todos",
    yes: "Sim",
    no: "Não",
    or: "ou",

    retry: "Tentar novamente",
    ok: "OK",
    copy: "Copiar",

    teams: "equipes",
    questions: "perguntas",
  },

  // ============================================
  // AUTH
  // ============================================
  auth: {
    login: "Entrar",
    logout: "Sair",
    loginWithGoogle: "Entrar com Google",
    loginSubtitle: "Entre com sua conta Google para começar",
    welcomeBack: "Bem-vindo de volta!",
  },

  // ============================================
  // DASHBOARD
  // ============================================
  dashboard: {
    title: "Painel do Professor",
    welcome: "Olá!",
    teacherFallbackName: "Professor",

    createGame: "Criar novo jogo",
    createGameDesc: "Configure equipes e perguntas para começar a jogar em minutos.",

    library: "Biblioteca de perguntas",
    libraryDesc: "Explore bancos de perguntas oficiais e da comunidade e importe-os instantaneamente.",

    myGames: "Meus jogos",
    active: "ativos",

    noGames: "Sem jogos ativos",
    startFirst: "Crie seu primeiro jogo!",

    selectGameMode: "Selecione o modo de jogo",
    selectGameModeSubtitle: "Escolha de acordo com a idade dos seus alunos",
    // En la sección dashboard, agrega:
    evaluationsTitle: "Evaluations to review",
    moreGames: "more games",
    // Games list
    loadingGames: "Carregando jogos...",
    noGamesCreated: "Você ainda não criou nenhum jogo.",
    finishedGames: "jogos finalizados",
    viewResults: "Ver resultados",
    unnamedGame: "Jogo sem título",

    // Current mode panel
    currentMode: "Modo atual",

    // Footer
    aboutThisProject: "Sobre este projeto",

    // Status labels (GameCard)
    status: {
      finished: "Finalizado",
      stage0Proposals: "Etapa 0 — Propostas",
      collectingProposals: "Coletando propostas",
      curatingProposals: "Curando propostas",
      stage1Playing: "Etapa 1 — Jogando",
      transitionStage2: "Preparando Etapa 2",
      stage2Playing: "Etapa 2 — Jogando",
      preparing: "Preparando",
    },

    // Relative time (GameCard)
    time: {
      minutesAgo: (n: number) => `há ${n} min`,
      hoursAgo: (n: number) => `há ${n} h`,
      daysAgo: (n: number) => `há ${n} d`,
    },
  },

  // ============================================
  // JOIN (STUDENTS)
  // ============================================
  join: {
    appTitle: "Jogo do Semáforo",

    // Top text
    welcomeBack: "Bem-vindo de volta!",
    enterRoomCode: "Digite o código da sala",
    selectTeam: "Escolha sua equipe",

    // Saved session
    previousSessionFound: "Sessão anterior encontrada",
    codeLabel: "Código",
    reconnecting: "Reconectando...",
    goBackToGame: "↩️ Voltar ao jogo",
    newSession: "Nova",

    // Divider
    orEnterNewCode: "ou digite um novo código",

    // Errors
    couldntReconnect: "Não foi possível reconectar. Por favor, digite o código da sala.",
    codeMustBe6: "O código deve ter 6 caracteres",
    invalidCode: "Código inválido",
    lookupError: "Erro ao buscar o código. Tente novamente.",
    noTeamsConfigured: "Este jogo não tem equipes configuradas",

    // Buttons / actions
    searching: "Buscando...",
    findRoom: "Encontrar sala →",
    codeOnTeacherScreen: "O código está na tela do professor",

    // Stage / phase banners
    proposalsActive: "Etapa de propostas ativa",
    proposalsDesc: "Sua equipe vai criar perguntas para o jogo",
    waitingTeacher: "Aguardando o professor",
    waitingDesc: "O jogo está sendo preparado",

    // Navigation
    changeCode: "← Alterar código",

    // Join button texts by phase
    joinProposals: "Criar propostas! 📝",
    joinWaiting: "Entrar na sala 🚪",
    joinNormal: "Participar! 🎮",
  },

  // ============================================
  // GAME MODES
  // ============================================
  gameModes: {
    trafficLight: {
      title: "Jogo do Semáforo",
      subtitle: "O Jogo do Semáforo",
      description: "Ideal para alunos do ensino fundamental. Interface colorida e amigável.",
      ageRange: "Menores de 13 anos",
    },
    coopetition: {
      title: "O Jogo da Coopetição",
      subtitle: "Onde competição encontra colaboração",
      description: "Para adolescentes e adultos. Design mais profissional e sóbrio.",
      ageRange: "13+ anos",
    },
  },

  // ============================================
  // SETUP
  // ============================================
  setup: {
    title: "Configurar novo jogo",
    step1: "Passo 1: Informações básicas",
    step2: "Passo 2: Perguntas",
    step3: "Passo 3: Configurar equipes",
    step4: "Passo 4: Pronto para jogar!",

    // Step 1
    language: "Idioma",
    spanish: "Espanhol",
    english: "Inglês",
    portuguese: "Português",
    className: "Nome da turma",
    classNamePlaceholder: "3A - Matemática",
    subject: "Disciplina",
    subjectPlaceholder: "Matemática",
    numTeams: "Número de equipes",
    studentsPerTeam: "Alunos por equipe",

    // Stage 0
    stage0Section: "Etapa 0: Preparação (opcional)",
    stage0Enable: "Habilitar etapa de preparação em grupo",
    stage0Desc: "As equipes terão acesso ao material de estudo antes de começar o jogo.",
    stage0Warning:
      "💡 Primeira vez jogando? Recomendamos pular a Etapa 0 e usar um jogo da biblioteca. A Etapa 0 é projetada para alunos que já entendem a dinâmica do jogo.",
    stage0MaterialType: "Tipo de material",
    stage0MaterialLink: "Link externo",
    stage0MaterialText: "Texto",
    stage0MaterialTitle: "Título do material",
    stage0MaterialContent: "Conteúdo",
    stage0MaterialLinkPlaceholder: "https://docs.google.com/...",
    stage0MaterialTextPlaceholder: "Cole aqui o texto que as equipes devem ler...",
    stage0GeneratePrompt: "Precisa gerar material? Use este prompt com ChatGPT",

    // Step 2
    chooseFromLibrary: "Escolher da biblioteca",
    orUploadFile: "Ou envie seu próprio arquivo:",
    uploadCSV: "Enviar arquivo CSV",
    loadedFromLibrary: "Carregado da biblioteca:",
    questionsLoaded: "perguntas carregadas",
    analyzing: "Analisando CSV...",

    // Step 3
    enterNames: "Digite os nomes (um por linha)",
    assignRandom: "Atribuir aleatoriamente",
    totalStudents: "Total:",
    uniqueStudents: "Únicos:",
    duplicates: "Duplicados:",
    duplicatesNote: "Duplicados são ignorados ao formar equipes.",
    duplicatesFound: "Duplicados encontrados:",
    teamsConfigured: "Equipes configuradas",
    moveStudentsHint: "Você pode mover alunos entre equipes selecionando a equipe de destino",

    // Step 4
    roomCode: "Código da sala",
    shareCode: "Compartilhe este código com seus alunos",
    stage0Enabled: "Etapa 0 habilitada. As equipes verão o material de preparação.",
    startGame: "Iniciar jogo",
    createGame: "Criar jogo",
  },

  // ============================================
  // LIBRARY
  // ============================================
  library: {
    title: "Biblioteca",
    pageTitle: "Bancos de perguntas",
    pageSubtitle: "Explore perguntas organizadas por nível, área e disciplina.",

    // Filters
    game: "Jogo",
    grade: "Série",
    area: "Área",
    subject: "Disciplina",
    searchPlaceholder: "Buscar por título, tema ou conteúdo...",
    showing: "Mostrando",
    of: "de",
    items: "itens",

    // Card
    use: "Usar",
    moreInfo: "Mais info",
    lessInfo: "Menos",
    contents: "Conteúdos",
    skills: "Habilidades",
    questions: "perguntas",
    noFile: "Sem arquivo",
    loading: "Carregando...",

    // Stats
    withFile: "com arquivo",

    // Empty
    noResults: "Nenhum item encontrado com os filtros selecionados.",

    // Admin
    adminTitle: "Administração",
    adminDesc: "Como administrador, você pode enviar novos bancos de perguntas.",
    uploadSingle: "Enviar único",
    bulkUpload: "Envio em lote",
  },

  // ============================================
  // STAGE 0 - QUESTION PROPOSALS
  // ============================================
  stage0: {
    // Titles
    title: "Etapa 0: Preparação",
    subtitle: "Leia o material antes de começar o jogo",
    teacherTitle: "Painel da Etapa 0",
    teacherSubtitle: "Revise as propostas das equipes",

    // Material
    teamName: "Equipe:",
    materialTitle: "Material de estudo",
    openLink: "Abrir material",
    noMaterial: "O professor não enviou material de preparação.",
    readCarefully: "Leia com atenção—este conteúdo vai ajudar no jogo.",

    // Phases
    phaseReading: "Fase: Leitura",
    phaseProposing: "Fase: Propostas",
    phaseReviewing: "Fase: Revisão",
    phaseResults: "Fase: Resultados",

    // Teacher actions
    startProposals: "Iniciar propostas",
    startReview: "Iniciar revisão",
    finishAndStart: "Finalizar e iniciar Etapa 1",

    // Proposals - Form
    proposalsTitle: "Propor perguntas",
    proposalsSubtitle: "Proponha perguntas baseadas no material",
    proposalCount: "propostas",
    addProposal: "Adicionar pergunta",
    proposalType: "Tipo de pergunta",
    questionText: "Sua pergunta",
    questionPlaceholder: "Escreva sua pergunta proposta...",
    hintLabel: "Dica para responder (opcional)",
    hintPlaceholder: "Uma dica para ajudar a pensar na resposta...",
    relatedTopicLabel: "Com qual tema se relaciona?",
    relatedTopicPlaceholder: "Ex.: Ciclo da água, Frações...",
    submittedByLabel: "Quem propõe? (opcional)",
    submittedByPlaceholder: "Nome do membro da equipe...",
    submit: "Enviar pergunta",

    // Proposal types
    typeComprehension: "📝 Compreensão",
    typeComprehensionDesc: "O que significa...? / Explique com suas palavras...",
    typeRelation: "🔗 Conexão com outros temas",
    typeRelationDesc: "Como se conecta com...? / Que semelhanças há com...?",
    typeApplication: "🌍 Aplicação prática",
    typeApplicationDesc: "Onde você vê isso na vida real? / Como você usaria...?",
    typeAnalysis: "🤔 Análise / Opinião",
    typeAnalysisDesc: "Por que você acha...? / O que aconteceria se...?",
    typeProduction: "💡 Produção",
    typeProductionDesc: "Desenhe / Represente / Ordene os passos...",

    // Proposal status
    pending: "Pendente",
    approved: "Aprovada",
    rejected: "Rejeitada",
    edited: "Editada",

    // Team ready
    markReady: "Terminamos de propor",
    unmarkReady: "Queremos continuar propondo",
    teamReady: "Equipe pronta!",
    waitingReview: "Aguardando o professor revisar as propostas...",
    waiting: "Aguardando o professor iniciar o jogo...",

    // Timer
    timeRemaining: "Tempo restante",

    // Results
    resultsTitle: "Resultados da Etapa 0",
    approvedCount: "perguntas aprovadas",
    bonusPoints: "pontos bônus",
    waitingStart: "Aguardando o professor iniciar a Etapa 1...",

    // Errors
    errorEmpty: "Escreva uma pergunta",
    errorRelated: "Indique com qual tema se relaciona",
    maxReached: "Máximo de propostas atingido",

    // Teacher panel - Filters
    filterAll: "Todas",
    filterPending: "Pendentes",
    filterApproved: "Aprovadas",
    filterRejected: "Rejeitadas",
    allTeams: "Todas as equipes",

    // Teacher panel - Stats
    totalProposals: "Total de propostas",
    pendingCount: "Pendentes",
    approvedCountLabel: "Aprovadas",
    rejectedCount: "Rejeitadas",
    teamsReady: "Equipes prontas",

    // Teacher panel - Actions
    proposedBy: "Proposta por",
    relatedTo: "Relacionada a",
    hint: "Dica",
    approve: "Aprovar",
    reject: "Rejeitar",
    edit: "Editar",
    saveEdit: "Salvar",
    cancelEdit: "Cancelar",
    bonusLabel: "Pontos bônus",

    // Teacher panel - Empty
    noProposals: "Sem propostas ainda",
    noProposalsFiltered: "Nenhuma proposta corresponde a esses filtros",

    // Teacher panel - Confirmations
    pendingWarning: "Há propostas pendentes para revisar",
    confirmStart: "Iniciar Etapa 1? Os pontos bônus serão aplicados automaticamente.",

    // Save to library
    saveToLibrary: "Salvar na minha biblioteca",
    savedToLibrary: "Salvo na biblioteca!",

    // Setup
    enableProposals: "Habilitar propostas de perguntas",
    enableProposalsDesc:
      "As equipes podem propor perguntas baseadas no material. Você decide quais aprovar e quantos pontos atribuir.",
    maxProposalsPerTeam: "Máximo de perguntas por equipe",
    timeLimitOptional: "Limite de tempo (opcional)",
    noLimit: "Sem limite",
  },

  // ============================================
  // GAME
  // ============================================
  game: {
    stage1: "Etapa 1: Avaliação individual",
    stage2: "Etapa 2: Colaboração em grupo",
    round: "Rodada",
    question: "Pergunta",
    hint: "Dica",
    timeLeft: "Tempo restante",
    submit: "Enviar",
    correct: "Correto!",
    incorrect: "Incorreto",
    waiting: "Aguardando...",
    results: "Resultados",
    winner: "Vencedor!",
    score: "Pontuação",
    team: "Equipe",
    player: "Jogador",
  },

  // ============================================
  // ERRORS
  // ============================================
  errors: {
    generic: "Algo deu errado. Por favor, tente novamente.",
    loadingCSV: "Erro ao carregar arquivo. Por favor, tente novamente.",
    creatingGame: "Erro ao criar jogo.",
    startingGame: "Erro ao iniciar jogo.",
    completeFields: "Complete o nome da turma e a disciplina.",
    uploadCSV: "Envie um arquivo CSV com perguntas.",
    assignStudents: "Atribua alunos às equipes.",
    enterStudentNames: "Primeiro digite os nomes dos alunos.",

    deletingGame: "Erro ao excluir jogo.",
    notAuthorized: "Você não tem permissão para fazer isso.",
    notFound: "Não encontrado.",
  },

  // ============================================
  // GRADES
  // ============================================
  grades: {
    "3°": "3º Ano",
    "4°": "4º Ano",
    "5°": "5º Ano",
    "6°": "6º Ano",
    "7°": "7º Ano",
    secondary: "Ensino Médio",
  },

  // ============================================
  // CSV PARSER
  // ============================================
  csv: {
    warnings: {
      noValidHeadersFallback:
        "ℹ️ Este CSV não tinha cabeçalhos válidos. As colunas foram interpretadas por posição e IDs foram gerados se ausentes.",
      encodingIssuesPossible:
        "⚠️ O arquivo pode ter problemas de codificação (acentos incorretos). Considere salvá-lo como UTF-8.",
      repeatedHeaderIgnored: "Linha {{rowNumber}}: cabeçalho repetido (ignorado).",
      missingQuestionTextIgnored: "Linha {{rowNumber}}: texto da pergunta ausente (ignorado).",
      invalidSuggestedStageDefaulted:
        "Linha {{rowNumber}}: suggestedStage inválido (\"{{value}}\"). Etapa {{defaultStage}} foi usada.",
    },
    errors: {
      emptyCsvFile: "O arquivo CSV está vazio.",
      noValidQuestionsFound: "Nenhuma pergunta válida foi encontrada no CSV.",
      papaparseError: "Erro ao ler CSV: {{message}} (linha {{row}}).",
      cannotReadCsv: "Não foi possível ler CSV: {{message}}.",
      cannotReadCsvFallback: "Não foi possível ler CSV (fallback): {{message}}.",
    },
  },

  // ============================================
  // CSV PREVIEW
  // ============================================
  csvPreview: {
    title: "Prévia de importação",
    totalRows: "Total de linhas",
    validQuestions: "Perguntas válidas",
    warnings: "Avisos",
    errors: "Erros",
    validQuestionsTitle: "Perguntas válidas",
    editBeforeImport: "Você pode editar antes de importar",
    question: "Pergunta",
    hint: "Dica",
    noHint: "Sem dica",
    stage: "Etapa",
    cancel: "Cancelar",
    import: "Importar",
    questions: "perguntas",
    noValidQuestions: "Sem perguntas válidas",
    note: "Apenas perguntas válidas serão importadas. Linhas com erros serão ignoradas.",
  },

  // ============================================
  // GAME CONTROLLER
  // ============================================
  gameController: {
    loading: "Carregando jogo...",
    error: "Erro",
    gameNotFound: "Não foi possível carregar o jogo",
    teamNotFound: "Equipe não encontrada",
    waiting: "Aguardando",
    preparingRound: "Preparando próxima rodada...",
    viewTeam: "Ver equipe",
    viewClassroom: "Visão da sala",
    startingStage2: "Iniciando Etapa 2...",
    errorStartingStage2: "Erro ao iniciar Etapa 2",
    resetConfirm: "Resetar TODAS as equipes para rodada 1? Elas perderão todo o progresso.",
    resetSuccess: "Jogo resetado. Todas as equipes voltam à rodada 1.",
    resetError: "Erro ao resetar jogo",
  },

  // ============================================
  // SOUND
  // ============================================
  sound: {
    enable: "Habilitar sons",
    disable: "Desabilitar sons",
    on: "LIGADO",
    off: "DESLIGADO",
  },

  // ============================================
  // ADMIN
  // ============================================
  admin: {
    title: "Métricas do admin",
    downloadExcel: "Baixar Excel",
    teachers: "Professores",
    totalSessions: "Total de sessões",
    gamesCreated: "Jogos criados",
    email: "E-mail",
    uid: "UID",
    sessions: "Sessões",
    games: "Jogos",
    lastLogin: "Último login",
    lastAccess: "Último acesso",
    noData: "Sem dados de professores ainda",
    backToSetup: "Voltar à configuração",
    accessDenied: "Acesso negado",
    authDisabled: "Sistema de autenticação está desabilitado.",
    enableAuth: "Habilite VITE_AUTH_REQUIRED=true para acessar métricas.",
    verifyingSession: "Verificando sessão...",
    verifyingPermissions: "Verificando permissões de admin...",
    restrictedAccess: "Acesso restrito",
    adminsOnly: "Esta página é apenas para administradores.",

    // Upload page
    uploadTitle: "Enviar novo CSV",
    bankTitle: "Título do banco de perguntas",
    bankTitlePlaceholder: "Ex.: Vertebrados e Invertebrados",
    grade: "Série",
    subject: "Disciplina",
    description: "Descrição do conteúdo",
    descriptionPlaceholder: "Ex.: Classificação de animais pela coluna vertebral...",
    csvFile: "Arquivo CSV",
    csvValid: "CSV válido",
    file: "Arquivo",
    questionsDetected: "Perguntas detectadas",
    completeAllFields: "Complete todos os campos",
    uploadToLibrary: "Enviar para biblioteca",
    uploading: "Enviando...",
    uploadSuccess: "CSV enviado com sucesso!",
    redirecting: "Redirecionando para biblioteca...",
  },

  // ============================================
  // TEACHER LIBRARY
  // ============================================
  teacherLibrary: {
    myGames: "Meus jogos",
    community: "Comunidade",
    official: "Biblioteca oficial",

    privateGames: "Jogos privados",
    publicGames: "Jogos públicos",
    totalUses: "Usos totais",
    avgRating: "Avaliação média",

    saveGame: "Salvar jogo",
    editGame: "Editar jogo",
    deleteGame: "Excluir jogo",
    copyGame: "Copiar para minha biblioteca",
    makePublic: "Tornar público",
    makePrivate: "Tornar privado",
    useGame: "Usar este jogo",

    private: "Privado",
    public: "Público",
    onlyYou: "Apenas você pode ver este jogo",
    everyoneCanSee: "Visível para toda a comunidade",

    rate: "Avaliar",
    ratings: "avaliações",
    noRatingsYet: "Sem avaliações ainda",
    yourRating: "Sua avaliação",
    thankYou: "Obrigado por avaliar!",
    cantRateOwn: "Você não pode avaliar seu próprio jogo",

    report: "Denunciar",
    reportGame: "Denunciar jogo",
    reportReason: "Motivo da denúncia",
    inappropriate: "Conteúdo inapropriado",
    incorrect: "Informação incorreta",
    spam: "Spam",
    copyright: "Violação de direitos autorais",
    other: "Outro",
    reportDetails: "Detalhes (opcional)",
    reportSubmitted: "Denúncia enviada. Obrigado por ajudar a manter a comunidade.",
    alreadyReported: "Você já denunciou este jogo",

    copySuccess: "Jogo copiado para sua biblioteca!",
    copyAsPrivate: "Salvo como privado. Você pode editar e publicar quando quiser.",

    privateLimitReached: "Você atingiu o limite de jogos privados",
    privateLimitDesc: "Torne um jogo público ou exclua um para criar mais.",

    noMyGames: "Você ainda não salvou nenhum jogo",
    noMyGamesDesc: "Crie um jogo e salve para usar depois",
    noCommunityGames: "Sem jogos da comunidade com esses filtros",
    noCommunityGamesDesc: "Tente alterar os filtros ou seja o primeiro a compartilhar",

    sortBy: "Ordenar por",
    recent: "Mais recentes",
    rating: "Melhor avaliados",
    popular: "Mais usados",

    gameTitle: "Título do jogo",
    gameTitlePlaceholder: "Ex.: Quiz de Frações",
    gameDescription: "Descrição",
    gameDescriptionPlaceholder: "Descreva sobre o que é o jogo e para quem é...",
    selectVisibility: "Deseja compartilhar com a comunidade?",
    visibilityNote: "Você pode alterar a visibilidade depois",

    confirmDelete: "Tem certeza que deseja excluir este jogo?",
    confirmDeleteDesc: "Esta ação não pode ser desfeita.",
    confirmMakePublic: "Publicar este jogo?",
    confirmMakePublicDesc: "Ele ficará visível para todos os professores da comunidade.",

    by: "por",
    you: "você",

    timesUsed: "vezes usado",
    timesCopied: "vezes copiado",
  },

  // ============================================
  // PROMPT GENERATOR
  // ============================================
  promptGenerator: {
    title: "Gerador de prompts IA",
    subtitle: "Crie um prompt otimizado para gerar perguntas educacionais",

    step1: "Nível & configuração",
    step2: "Qual tema?",
    step3: "Configurações avançadas",

    level: "Nível de ensino",
    primary: "Fundamental",
    secondary: "Médio",
    grade: "Série/Ano",

    promptLanguage: "Idioma do jogo",
    spanish: "Espanhol",
    english: "Inglês",
    portuguese: "Português",

    category: "Categoria de conteúdo",
    subject: "Disciplina curricular",
    history: "Evento histórico",
    book: "Livro",
    fun: "Filme/Série",

    selectSubject: "Selecione uma disciplina",
    selectEvent: "Selecione um evento histórico",
    selectBook: "Selecione um livro",
    selectMedia: "Selecione um filme ou série",
    other: "Outro (especificar)",
    customPlaceholder: "Escreva o tema...",

    showAll: "Mostrar todos",
    forPrimary: "Para fundamental",
    forSecondary: "Para médio",
    universal: "Universal",
    argentina: "Argentina",
    americas: "Américas",
    movies: "Filmes",
    series: "Séries",
    documentaries: "Documentários",

    advancedSettings: "Configurações avançadas",
    totalQuestions: "Número de prompts",
    stage1Production: "% Produção na Etapa 1",
    stage2Production: "% Produção na Etapa 2",
    subtopicsInclude: "Subtemas a INCLUIR",
    subtopicsExclude: "Subtemas a EXCLUIR",
    subtopicsPlaceholder: "Separe com vírgulas...",
    preferredStyle: "Estilo preferido",
    practical: "Mais prático",
    analytical: "Mais analítico",
    mixed: "Misto",

    stageExplanation: "O que são Etapa 1 e Etapa 2?",
    stage1Title: "Etapa 1 - Preparação interna",
    stage1Desc:
      "NÃO competitiva. Cada equipe trabalha internamente para se nivelar. Prompts são introdutórios e diagnósticos. Erros são oportunidades de aprendizado em grupo.",
    stage2Title: "Etapa 2 - Competição colaborativa",
    stage2Desc:
      "Competição entre equipes. Prompts mais desafiadores e focados em produção. Aplicar conhecimento construído na Etapa 1. Colaboração interna + competição externa.",

    generatePrompt: "Gerar prompt",
    copyToClipboard: "Copiar para área de transferência",
    openInGemini: "Abrir no Gemini",
    copied: "Copiado!",

    savedPresets: "Configurações salvas",
    savePreset: "Salvar configuração",
    presetName: "Nome da configuração",
    presetNamePlaceholder: "Ex.: Matemática 6º ano",
    loadPreset: "Carregar",
    deletePreset: "Excluir",
    noPresets: "Sem configurações salvas",
    maxPresetsReached: "Máximo 5 configurações. A mais antiga será removida.",
    presetSaved: "Configuração salva!",

    previewTitle: "Prévia do prompt",
    promptReady: "Seu prompt está pronto",
    promptReadyDesc:
      "Copie e cole no Gemini, ChatGPT ou outro assistente de IA para gerar os prompts.",

    selectContent: "Selecione conteúdo para continuar",
    portuguese: "Português",
  },

  // ============================================
  // PROTECTED ROUTE
  // ============================================
  protectedRoute: {
    verifyingSession: "Verificando sessão...",
  },
  // ============================================
  // REFERRAL PAGE
  // ============================================
  referral: {
    title: "Indicar um colega",
    subtitle: "Ajude-nos a crescer compartilhando o Jogo do Semáforo com outros educadores",
    referredName: "Nome do colega",
    referredEmail: "Email do colega",
    referredSchool: "Escola/Instituição",
    message: "Mensagem pessoal (opcional)",
    messagePlaceholder: "Por que você acha que ele se interessaria?",
    submit: "Enviar indicação",
    sending: "Enviando...",
    successTitle: "Obrigado pela sua indicação!",
    successMessage: "Vamos entrar em contato com seu colega. Quando ele se cadastrar, você receberá sua recompensa.",
    rewards: "Sua recompensa",
    rewardsDetail: "🎴 Kit de cartões PDF + 🌟 Distintivo de colaborador",
    errorMessage: "Houve um erro. Por favor, tente novamente.",
    backToDashboard: "Voltar ao início",
  },

  // ============================================
  // WEBINAR PAGE - PORTUGUÊS
  // ============================================
  // Reemplazar la sección "webinar" en src/i18n/pt.ts

  webinar: {
    title: "Inscrição para Webinar",
    noWebinar: "Não há webinars programados",
    noWebinarDesc: "Volte em breve para ver os próximos eventos.",
    dateLabel: "Data e hora",
    timezone: "(Argentina, GMT-3)",
    name: "Seu nome",
    email: "Seu email",
    school: "Escola/Instituição (opcional)",

    // Novo campo: nível de ensino
    teachingLevel: "Que nível você ensina?",
    levelPrimary: "Ensino Fundamental",
    levelSecondary: "Ensino Médio",
    levelHigher: "Ensino Superior / Universidade",
    levelOther: "Outro",

    // Experiência - textos melhorados
    experience: "Experiência com o Jogo do Semáforo",
    experienceNone: "Nunca usei",
    experienceExplored: "Vi o jogo mas não testei em aula",
    experienceUsed: "Já usei em aula",
    experienceRegular: "Uso regularmente",

    questions: "O que você gostaria de aprender? (opcional)",
    questionsPlaceholder: "Temas de interesse ou dúvidas que tenha...",
    submit: "Inscrever-me",
    sending: "Inscrevendo...",

    // Tela de sucesso - melhorada
    successTitle: "Pronto! Sua vaga está reservada",
    successMessage: "Enviaremos o link de acesso por email.",
    successReminder: "Enquanto isso, você pode experimentar o jogo:",
    successLinkPrimary: "🚦 Fundamental",
    successLinkSecondary: "🎯 Médio",

    errorMessage: "Houve um erro. Por favor tente novamente.",
    backToDashboard: "Voltar ao início",

    // ========== SEÇÃO 13: Preparação para a Autoavaliação ==========
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
} as const;

export type TranslationKeysPt = typeof pt;