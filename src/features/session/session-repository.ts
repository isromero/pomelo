export type ViewerProfile = {
  id: string;
  displayName: string;
  locale: 'es' | 'en';
  appearance: 'system' | 'light' | 'dark';
};

export type SessionState =
  | { status: 'signed-out' }
  | { status: 'authenticated'; profile: ViewerProfile };

export type SignInCredentials = {
  email: string;
  password: string;
};

export interface SessionRepository {
  restore(): Promise<SessionState>;
  signIn(credentials: SignInCredentials): Promise<SessionState>;
  signOut(): Promise<void>;
}

export class SessionRepositoryError extends Error {
  constructor(
    public readonly code: 'network' | 'session' | 'profile-missing',
    public readonly recoverable = true
  ) {
    super(`Session repository failed (${code})`);
    this.name = 'SessionRepositoryError';
  }
}
