import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  'pt-BR': {
    translation: {
      common: {
        brand: 'Ponto SaaS',
        brandSubtitle: 'Jornada segura e alinhada com a CLT',
        connectedBadge: 'Conectado ao backend',
        realtime: 'Em tempo real',
        actions: {
          cancel: 'Cancelar',
          submit: 'Enviar',
          close: 'Fechar',
          logout: 'Sair',
        },
        language: {
          label: 'Idioma',
          pt: 'PT',
          en: 'EN',
          es: 'ES',
        },
        sourceFallback: 'web',
      },
      themeToggle: {
        ariaLabel: 'Alternar tema',
      },
      languageSwitcher: {
        ariaLabel: 'Alterar idioma',
      },
      types: {
        in: 'Entrada',
        out: 'Saída',
      },
      dashboard: {
        badge: 'Ponto eletrônico',
        greeting: 'Olá, {{name}}',
        fallbackName: 'colaborador',
        description: 'Registre suas batidas, faça ajustes e acompanhe seu histórico em tempo real.',
        sectionLabel: 'Meu tempo',
        summary: 'Resumo de batidas',
        myPoint: 'Meu ponto',
        details: 'Detalhes',
        menu: {
          history: 'Histórico de pontos',
          signOut: 'Sair',
          theme: 'Alternar tema',
          comingSoon: 'Página ainda não disponível.',
        },
        tokenActive: 'Token ativo',
        lastPunch: 'Última batida',
        registeredAt: 'Registrado às: {{time}}',
        firstPunch: 'Primeiro ponto',
        interval: 'Intervalo',
        lastPunchRow: 'Último ponto',
        openStatus: 'Em aberto',
        todayHistory: 'Histórico do dia',
        noEntriesToday: 'Nenhuma batida registrada hoje',
        lastPunchFallback: 'Nenhuma batida registrada hoje',
        lastPunchType: '{{time}} — {{type}}',
        nowLabel: 'agora',
        requestAdjustment: 'Solicitar ajuste',
        hoursToday: 'Horas trabalhadas hoje',
        hoursTodayHelper: 'Somatório simples das batidas de hoje.',
        hourBank: 'Banco de horas',
        hourBankHelper: 'Valor estático até conectar ao endpoint.',
        backendNote:
          'O backend espera alternância entre {{inLabel}} e {{outLabel}}. O próximo envio será {{nextType}}.',
        registerButton: 'Registrar ponto',
        registering: 'Registrando...',
        nextLabel: {
          in: 'Registrar entrada',
          out: 'Registrar saída',
        },
        employeeCardTitle: 'Dados do colaborador',
        name: 'Nome',
        email: 'E-mail',
        role: 'Papel',
        roleValue: 'Funcionário',
      },
      toast: {
        sessionExpired: {
          title: 'Sessão expirada',
          description: 'Faça login novamente ou use um usuário com permissão de funcionário.',
        },
        fetchEntriesError: {
          title: 'Erro ao buscar batidas',
          description: 'Não foi possível carregar suas batidas. Tente novamente em instantes.',
        },
        clockSuccess: {
          title: 'Batida registrada',
          description: 'Horário salvo como {{time}}.',
        },
        clockRateLimit: {
          title: 'Aguarde um momento',
        },
        clockError: {
          title: 'Erro ao registrar',
          description:
            'Não foi possível registrar o ponto. Verifique permissões ou tente novamente.',
        },
        adjustmentSuccess: {
          title: 'Solicitação enviada',
          description: 'Seu ajuste foi registrado como pendente para aprovação.',
        },
        adjustmentError: {
          title: 'Erro no envio',
          description: 'Não foi possível enviar o ajuste. Confira os campos e tente novamente.',
        },
        logout: {
          title: 'Sessão encerrada',
          description: 'Você saiu do sistema.',
        },
        loginSuccess: {
          title: 'Bem-vindo!',
          description: 'Autenticação realizada com sucesso.',
        },
        loginError: {
          title: 'Erro ao autenticar',
        },
      },
      login: {
        heroBadge: 'Conectado ao backend',
        heroTitle: 'Controle de ponto moderno com foco no colaborador',
        heroDescription:
          'Faça login para registrar batidas, solicitar ajustes e acompanhar seu histórico com uma interface rápida e responsiva.',
        features: [
          'Registro de entrada e saída',
          'Ajustes com justificativa',
          'Histórico de batidas',
          'Modo claro e escuro',
        ],
        cardTitle: 'Acessar conta',
        cardDescription:
          'Use seu e-mail corporativo e senha para autenticar. O token retornado será usado para acessar as rotas protegidas.',
        emailLabel: 'E-mail',
        emailPlaceholder: 'seu.email@empresa.com',
        passwordLabel: 'Senha',
        passwordPlaceholder: '********',
        submit: 'Entrar e acessar dashboard',
        submitting: 'Autenticando...',
      },
      adjustment: {
        dialogTitle: 'Solicitar ajuste',
        dialogDescription: 'Preencha os horários e descreva o motivo da solicitação de ajuste.',
        original: 'Horário original',
        corrected: 'Horário correto',
        reason: 'Justificativa',
        placeholder: 'Descreva o que ocorreu...',
        cancel: 'Cancelar',
        submit: 'Enviar ajuste',
        submitting: 'Enviando...',
      },
      pontoList: {
        title: 'Suas batidas',
        realtime: 'Em tempo real',
        empty: 'Nenhuma batida registrada ainda. Comece registrando sua jornada.',
        dateMissing: 'Data não informada',
      },
      auth: {
        errors: {
          tokenMissing: 'Token não retornado pela API',
          loginFailed: 'Não foi possível fazer login. Verifique as credenciais.',
        },
      },
    },
  },
  en: {
    translation: {
      common: {
        brand: 'Ponto SaaS',
        brandSubtitle: 'Secure journeys aligned with labor law',
        connectedBadge: 'Connected to backend',
        realtime: 'Live',
        actions: {
          cancel: 'Cancel',
          submit: 'Submit',
          close: 'Close',
          logout: 'Sign out',
        },
        language: {
          label: 'Language',
          pt: 'PT',
          en: 'EN',
          es: 'ES',
        },
        sourceFallback: 'web',
      },
      themeToggle: {
        ariaLabel: 'Toggle theme',
      },
      languageSwitcher: {
        ariaLabel: 'Change language',
      },
      types: {
        in: 'Clock-in',
        out: 'Clock-out',
      },
      dashboard: {
        badge: 'Time clock',
        greeting: 'Hello, {{name}}',
        fallbackName: 'teammate',
        description: 'Punch in/out, request adjustments, and track your history in real time.',
        sectionLabel: 'My time',
        summary: 'Punch summary',
        myPoint: 'My punches',
        details: 'Details',
        menu: {
          history: 'Punch history',
          signOut: 'Sign out',
          theme: 'Toggle theme',
          comingSoon: 'Page not available yet.',
        },
        tokenActive: 'Active token',
        lastPunch: 'Last punch',
        registeredAt: 'Registered at: {{time}}',
        firstPunch: 'First punch',
        interval: 'Break',
        lastPunchRow: 'Last punch',
        openStatus: 'Open',
        todayHistory: 'Today history',
        noEntriesToday: 'No punches recorded today',
        lastPunchFallback: 'No punches recorded today',
        lastPunchType: '{{time}} — {{type}}',
        nowLabel: 'now',
        requestAdjustment: 'Request adjustment',
        hoursToday: 'Hours worked today',
        hoursTodayHelper: "Simple sum of today's punches.",
        hourBank: 'Time bank',
        hourBankHelper: 'Static value until the endpoint is connected.',
        backendNote:
          'The backend expects alternating {{inLabel}} and {{outLabel}}. The next send will be {{nextType}}.',
        registerButton: 'Register punch',
        registering: 'Registering...',
        nextLabel: {
          in: 'Register clock-in',
          out: 'Register clock-out',
        },
        employeeCardTitle: 'Team member data',
        name: 'Name',
        email: 'Email',
        role: 'Role',
        roleValue: 'Employee',
      },
      toast: {
        sessionExpired: {
          title: 'Session expired',
          description: 'Log in again or use a user with employee permissions.',
        },
        fetchEntriesError: {
          title: 'Error fetching punches',
          description: 'Could not load your punches. Try again shortly.',
        },
        clockSuccess: {
          title: 'Punch registered',
          description: 'Saved at {{time}}.',
        },
        clockRateLimit: {
          title: 'Please wait a moment',
        },
        clockError: {
          title: 'Error registering',
          description: 'Could not register the punch. Check permissions or try again.',
        },
        adjustmentSuccess: {
          title: 'Request sent',
          description: 'Your adjustment was recorded as pending for approval.',
        },
        adjustmentError: {
          title: 'Send error',
          description: 'Could not send the adjustment. Check the fields and try again.',
        },
        logout: {
          title: 'Session ended',
          description: 'You signed out.',
        },
        loginSuccess: {
          title: 'Welcome!',
          description: 'Authentication completed successfully.',
        },
        loginError: {
          title: 'Authentication error',
        },
      },
      login: {
        heroBadge: 'Connected to backend',
        heroTitle: 'Modern time tracking focused on the employee',
        heroDescription:
          'Sign in to record punches, request adjustments, and track your history with a fast, responsive interface.',
        features: [
          'Clock-in and clock-out logging',
          'Adjustments with justification',
          'Punch history',
          'Light and dark mode',
        ],
        cardTitle: 'Access account',
        cardDescription:
          'Use your corporate email and password to authenticate. The returned token is used for protected routes.',
        emailLabel: 'Email',
        emailPlaceholder: 'your.email@company.com',
        passwordLabel: 'Password',
        passwordPlaceholder: '********',
        submit: 'Sign in and open dashboard',
        submitting: 'Authenticating...',
      },
      adjustment: {
        dialogTitle: 'Request adjustment',
        dialogDescription: 'Fill in the times and describe the reason for the adjustment request.',
        original: 'Original time',
        corrected: 'Correct time',
        reason: 'Reason',
        placeholder: 'Describe what happened...',
        cancel: 'Cancel',
        submit: 'Send adjustment',
        submitting: 'Sending...',
      },
      pontoList: {
        title: 'Your punches',
        realtime: 'Live',
        empty: 'No punches recorded yet. Start by clocking in.',
        dateMissing: 'Date not provided',
      },
      auth: {
        errors: {
          tokenMissing: 'Token not returned by the API',
          loginFailed: 'Unable to log in. Check your credentials.',
        },
      },
    },
  },
  es: {
    translation: {
      common: {
        brand: 'Ponto SaaS',
        brandSubtitle: 'Jornada segura y alineada con la ley laboral',
        connectedBadge: 'Conectado al backend',
        realtime: 'En vivo',
        actions: {
          cancel: 'Cancelar',
          submit: 'Enviar',
          close: 'Cerrar',
          logout: 'Salir',
        },
        language: {
          label: 'Idioma',
          pt: 'PT',
          en: 'EN',
          es: 'ES',
        },
        sourceFallback: 'web',
      },
      themeToggle: {
        ariaLabel: 'Cambiar tema',
      },
      languageSwitcher: {
        ariaLabel: 'Cambiar idioma',
      },
      types: {
        in: 'Entrada',
        out: 'Salida',
      },
      dashboard: {
        badge: 'Reloj de punto',
        greeting: 'Hola, {{name}}',
        fallbackName: 'colaborador',
        description: 'Registra tus marcaciones, pide ajustes y sigue tu historial en tiempo real.',
        sectionLabel: 'Mi tiempo',
        summary: 'Resumen de marcaciones',
        myPoint: 'Mis marcaciones',
        details: 'Detalles',
        menu: {
          history: 'Historial de puntos',
          signOut: 'Salir',
          theme: 'Alternar tema',
          comingSoon: 'Página aún no disponible.',
        },
        tokenActive: 'Token activo',
        lastPunch: 'Última marcación',
        registeredAt: 'Registrado a las: {{time}}',
        firstPunch: 'Primer punto',
        interval: 'Intervalo',
        lastPunchRow: 'Último punto',
        openStatus: 'Abierto',
        todayHistory: 'Historial del día',
        noEntriesToday: 'Ninguna marcación registrada hoy',
        lastPunchFallback: 'Ninguna marcación registrada hoy',
        lastPunchType: '{{time}} — {{type}}',
        nowLabel: 'ahora',
        requestAdjustment: 'Solicitar ajuste',
        hoursToday: 'Horas trabajadas hoy',
        hoursTodayHelper: 'Suma simple de las marcaciones de hoy.',
        hourBank: 'Banco de horas',
        hourBankHelper: 'Valor estático hasta conectar con el endpoint.',
        backendNote:
          'El backend espera alternar {{inLabel}} y {{outLabel}}. El próximo envío será {{nextType}}.',
        registerButton: 'Registrar punto',
        registering: 'Registrando...',
        nextLabel: {
          in: 'Registrar entrada',
          out: 'Registrar salida',
        },
        employeeCardTitle: 'Datos del colaborador',
        name: 'Nombre',
        email: 'Correo',
        role: 'Rol',
        roleValue: 'Empleado',
      },
      toast: {
        sessionExpired: {
          title: 'Sesión expirada',
          description: 'Inicia sesión de nuevo o usa un usuario con permiso de empleado.',
        },
        fetchEntriesError: {
          title: 'Error al buscar marcaciones',
          description: 'No se pudieron cargar tus marcaciones. Intenta nuevamente en instantes.',
        },
        clockSuccess: {
          title: 'Marcación registrada',
          description: 'Horario guardado como {{time}}.',
        },
        clockRateLimit: {
          title: 'Espera un momento',
        },
        clockError: {
          title: 'Error al registrar',
          description:
            'No fue posible registrar el punto. Verifica permisos o inténtalo de nuevo.',
        },
        adjustmentSuccess: {
          title: 'Solicitud enviada',
          description: 'Tu ajuste fue registrado como pendiente para aprobación.',
        },
        adjustmentError: {
          title: 'Error al enviar',
          description: 'No se pudo enviar el ajuste. Revisa los campos e intenta nuevamente.',
        },
        logout: {
          title: 'Sesión cerrada',
          description: 'Saliste del sistema.',
        },
        loginSuccess: {
          title: '¡Bienvenido!',
          description: 'Autenticación realizada con éxito.',
        },
        loginError: {
          title: 'Error al autenticar',
        },
      },
      login: {
        heroBadge: 'Conectado al backend',
        heroTitle: 'Control de punto moderno enfocado en el colaborador',
        heroDescription:
          'Inicia sesión para registrar marcaciones, solicitar ajustes y seguir tu historial con una interfaz rápida y responsiva.',
        features: [
          'Registro de entrada y salida',
          'Ajustes con justificación',
          'Historial de marcaciones',
          'Modo claro y oscuro',
        ],
        cardTitle: 'Acceder a la cuenta',
        cardDescription:
          'Usa tu correo corporativo y contraseña para autenticar. El token se usa en rutas protegidas.',
        emailLabel: 'Correo',
        emailPlaceholder: 'tu.email@empresa.com',
        passwordLabel: 'Contraseña',
        passwordPlaceholder: '********',
        submit: 'Entrar y abrir dashboard',
        submitting: 'Autenticando...',
      },
      adjustment: {
        dialogTitle: 'Solicitar ajuste',
        dialogDescription: 'Completa los horarios y describe el motivo de la solicitud.',
        original: 'Horario original',
        corrected: 'Horario correcto',
        reason: 'Justificación',
        placeholder: 'Describe lo que ocurrió...',
        cancel: 'Cancelar',
        submit: 'Enviar ajuste',
        submitting: 'Enviando...',
      },
      pontoList: {
        title: 'Tus marcaciones',
        realtime: 'En vivo',
        empty: 'Aún no hay marcaciones. Empieza registrando tu jornada.',
        dateMissing: 'Fecha no informada',
      },
      auth: {
        errors: {
          tokenMissing: 'Token no devuelto por la API',
          loginFailed: 'No fue posible iniciar sesión. Verifica las credenciales.',
        },
      },
    },
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt-BR',
    supportedLngs: ['pt-BR', 'en', 'es'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
