import type { AccountErrorCode, AccountNotice } from '@/features/account/application/account-controller';
import type { Locale } from '@/features/account/domain/profile';

const catalogs = {
  es: {
    appearance: 'Apariencia',
    appearanceDark: 'Oscura',
    appearanceLight: 'Clara',
    appearanceSystem: 'Sistema',
    apple: 'Continuar con Apple',
    google: 'Continuar con Google',
    authBack: 'Volver',
    authCreate: 'Crear mi cuenta',
    authCreateTitle: 'Crea tu cuenta',
    authEmail: 'Correo electrónico',
    authExisting: 'Inicia sesión y recupera tu Profile y vuestra historia.',
    authLogin: 'Iniciar sesión',
    authLoginTitle: 'Qué alegría verte de nuevo',
    authPassword: 'Contraseña',
    authPasswordHint: 'Mínimo 8 caracteres',
    authSwitchLogin: 'Ya tengo cuenta',
    authSwitchSignUp: 'Crear una cuenta nueva',
    authTerms: 'Al continuar aceptas crear un espacio privado y compartido solo con tu pareja.',
    birthDate: 'Fecha de nacimiento',
    birthDateDone: 'Hecho',
    birthDateFuture: 'La fecha no puede estar en el futuro.',
    birthDateInvalid: 'Elige una fecha completa y válida, incluido el año.',
    birthDateSelect: 'Seleccionar fecha',
    errorConfiguration: 'La autenticación no está configurada por completo en este entorno.',
    errorEmailAlreadyRegistered: 'Ese correo ya tiene una cuenta. Prueba a iniciar sesión.',
    errorInvalidCredentials: 'El correo o la contraseña no coinciden.',
    errorNetwork: 'No hemos podido conectar. Revisa tu conexión e inténtalo de nuevo.',
    errorProfileUnavailable: 'No hemos podido recuperar tu Profile. Inténtalo de nuevo.',
    errorUnexpected: 'Algo no ha salido bien. Inténtalo de nuevo.',
    errorWeakPassword: 'Usa una contraseña de al menos 8 caracteres.',
    heroBody: 'Una pequeña cosa juntos cada día. La descubrís, Pom reacciona y pasa a ser parte de vuestra historia.',
    heroEyebrow: 'UN RITUAL PARA DOS',
    heroTitle: 'Un momento al día.\nUna historia vuestra.',
    locale: 'Idioma',
    localeEnglish: 'English',
    localeSpanish: 'Español',
    accountOpen: 'Abrir menú de cuenta',
    logout: 'Cerrar sesión',
    logoutBody: 'Tus datos seguirán a salvo y podrás volver a iniciar sesión cuando quieras.',
    logoutCancel: 'Cancelar',
    logoutTitle: '¿Cerrar sesión?',
    name: 'Tu nombre',
    namePlaceholder: 'Como quieres que te llamemos',
    nameRequired: 'Escribe el nombre que verá tu pareja.',
    noticeEmailVerificationRequired: 'Te hemos enviado un enlace. Confirma tu correo y después inicia sesión.',
    profileAvatar: 'Tu avatar',
    profileAvatarReroll: 'Probar otro',
    profileContinue: 'Guardar y continuar',
    profileIntro: 'Esto es solo tuyo. Los datos compartidos con tu pareja vendrán después.',
    profileProgress: 'TU PROFILE · 1 DE 2',
    profileRecoveryBody: 'Tu sesión sigue a salvo. Vuelve a intentar recuperar tus datos antes de continuar.',
    profileRecoveryTitle: 'No hemos podido cargar tu Profile',
    profileRetry: 'Volver a intentar',
    profileTitle: 'Primero, tú.',
    start: 'Empezar',
    welcomeLogin: 'Iniciar sesión',
    welcomeLoginPrompt: '¿Ya tienes cuenta?',
  },
  en: {
    appearance: 'Appearance',
    appearanceDark: 'Dark',
    appearanceLight: 'Light',
    appearanceSystem: 'System',
    apple: 'Continue with Apple',
    google: 'Continue with Google',
    authBack: 'Back',
    authCreate: 'Create my account',
    authCreateTitle: 'Create your account',
    authEmail: 'Email address',
    authExisting: 'Sign in to recover your Profile and your shared story.',
    authLogin: 'Sign in',
    authLoginTitle: 'So good to see you again',
    authPassword: 'Password',
    authPasswordHint: 'At least 8 characters',
    authSwitchLogin: 'I already have an account',
    authSwitchSignUp: 'Create a new account',
    authTerms: 'By continuing, you agree to create a private space shared only with your partner.',
    birthDate: 'Date of birth',
    birthDateDone: 'Done',
    birthDateFuture: 'The date cannot be in the future.',
    birthDateInvalid: 'Choose a complete, valid date including the year.',
    birthDateSelect: 'Select date',
    errorConfiguration: 'Authentication is not fully configured in this environment.',
    errorEmailAlreadyRegistered: 'That email already has an account. Try signing in.',
    errorInvalidCredentials: 'The email or password does not match.',
    errorNetwork: 'We could not connect. Check your connection and try again.',
    errorProfileUnavailable: 'We could not recover your Profile. Please try again.',
    errorUnexpected: 'Something went wrong. Please try again.',
    errorWeakPassword: 'Use a password with at least 8 characters.',
    heroBody: 'One small thing together every day. You reveal it, Pom reacts, and it becomes part of your story.',
    heroEyebrow: 'A RITUAL FOR TWO',
    heroTitle: 'One moment a day.\nA story of your own.',
    locale: 'Language',
    localeEnglish: 'English',
    localeSpanish: 'Español',
    accountOpen: 'Open account menu',
    logout: 'Sign out',
    logoutBody: 'Your data will stay safe and you can sign in again whenever you want.',
    logoutCancel: 'Cancel',
    logoutTitle: 'Sign out?',
    name: 'Your name',
    namePlaceholder: 'What should we call you?',
    nameRequired: 'Enter the name your partner will see.',
    noticeEmailVerificationRequired: 'We sent you a link. Confirm your email, then sign in.',
    profileAvatar: 'Your avatar',
    profileAvatarReroll: 'Try another',
    profileContinue: 'Save and continue',
    profileIntro: 'This is just yours. The details shared with your partner come next.',
    profileProgress: 'YOUR PROFILE · 1 OF 2',
    profileRecoveryBody: 'Your session is still safe. Try recovering your details again before continuing.',
    profileRecoveryTitle: 'We could not load your Profile',
    profileRetry: 'Try again',
    profileTitle: 'First, you.',
    start: 'Get started',
    welcomeLogin: 'Sign in',
    welcomeLoginPrompt: 'Already have an account?',
  },
} as const;

export type AccountCopy = {
  [Key in keyof (typeof catalogs)['es']]: string;
};

export function deviceLocale(): Locale {
  return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('en')
    ? 'en'
    : 'es';
}

export function accountCopy(locale: Locale): AccountCopy {
  return catalogs[locale];
}

export function errorCopy(copy: AccountCopy, error: AccountErrorCode | null) {
  if (!error) {
    return null;
  }

  const keys: Record<AccountErrorCode, keyof AccountCopy> = {
    configuration: 'errorConfiguration',
    emailAlreadyRegistered: 'errorEmailAlreadyRegistered',
    invalidCredentials: 'errorInvalidCredentials',
    network: 'errorNetwork',
    profileUnavailable: 'errorProfileUnavailable',
    unexpected: 'errorUnexpected',
    weakPassword: 'errorWeakPassword',
  };
  return copy[keys[error]];
}

export function noticeCopy(copy: AccountCopy, notice: AccountNotice) {
  return notice === 'emailVerificationRequired'
    ? copy.noticeEmailVerificationRequired
    : null;
}
