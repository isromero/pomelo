import type { Profile, ProfileInput } from '@/features/account/domain/profile';

export type AccountUser = {
  displayNameHint?: string | null;
  email: string | null;
  id: string;
};

export type AuthSession = {
  accessToken: string;
  expiresAt: number | null;
  user: AccountUser;
};

export type EmailSignUpResult = {
  needsEmailVerification: boolean;
  session: AuthSession | null;
};

export type SocialSignInResult = {
  cancelled: boolean;
  session: AuthSession | null;
};

export interface AuthGateway {
  getSession(): Promise<AuthSession | null>;
  onAuthStateChange(listener: (session: AuthSession | null) => void): () => void;
  signInWithApple(): Promise<SocialSignInResult>;
  signInWithEmail(email: string, password: string): Promise<AuthSession>;
  signInWithGoogle(): Promise<SocialSignInResult>;
  signOut(): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<EmailSignUpResult>;
}

export interface ProfileRepository {
  getOwnProfile(userId: string): Promise<Profile | null>;
  saveOwnProfile(userId: string, input: ProfileInput): Promise<Profile>;
}

export interface PrivateCache {
  clear(): Promise<void>;
}

export type AccountErrorCode =
  | 'configuration'
  | 'emailAlreadyRegistered'
  | 'invalidCredentials'
  | 'network'
  | 'profileUnavailable'
  | 'unexpected'
  | 'weakPassword';

export class AccountError extends Error {
  constructor(public readonly code: AccountErrorCode) {
    super(code);
  }
}

export type AccountStatus =
  | 'booting'
  | 'profileRequired'
  | 'profileUnavailable'
  | 'ready'
  | 'signedOut';
export type AccountNotice = 'emailVerificationRequired' | null;

export type AccountSnapshot = {
  busy: boolean;
  error: AccountErrorCode | null;
  notice: AccountNotice;
  profile: Profile | null;
  status: AccountStatus;
  user: AccountUser | null;
};

type AccountDependencies = {
  auth: AuthGateway;
  cache: PrivateCache;
  profiles: ProfileRepository;
};

const initialSnapshot: AccountSnapshot = {
  busy: false,
  error: null,
  notice: null,
  profile: null,
  status: 'booting',
  user: null,
};

function errorCode(error: unknown): AccountErrorCode {
  return error instanceof AccountError ? error.code : 'unexpected';
}

export class AccountController {
  private listeners = new Set<() => void>();
  private operation = 0;
  private sessionVersion = 0;
  private snapshot = initialSnapshot;
  private unsubscribeAuth: (() => void) | null = null;

  constructor(private readonly dependencies: AccountDependencies) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async start() {
    this.unsubscribeAuth?.();
    this.unsubscribeAuth = this.dependencies.auth.onAuthStateChange((session) => {
      void this.applySession(session);
    });

    try {
      await this.applySession(await this.dependencies.auth.getSession());
    } catch (error) {
      this.update({
        busy: false,
        error: errorCode(error),
        status: 'signedOut',
      });
    }
  }

  stop() {
    this.operation += 1;
    this.sessionVersion += 1;
    this.unsubscribeAuth?.();
    this.unsubscribeAuth = null;
  }

  clearMessages() {
    this.update({ error: null, notice: null });
  }

  async signUpWithEmail(email: string, password: string) {
    await this.runAuthOperation(async () => {
      const result = await this.dependencies.auth.signUpWithEmail(email, password);
      if (!result.session) {
        this.update({
          busy: false,
          notice: result.needsEmailVerification ? 'emailVerificationRequired' : null,
          profile: null,
          status: 'signedOut',
          user: null,
        });
        return;
      }
      await this.applySession(result.session);
    });
  }

  async signInWithEmail(email: string, password: string) {
    await this.runAuthOperation(async () => {
      await this.applySession(
        await this.dependencies.auth.signInWithEmail(email, password),
      );
    });
  }

  async signInWithApple() {
    await this.runAuthOperation(async () => {
      const result = await this.dependencies.auth.signInWithApple();
      if (result.cancelled || !result.session) {
        this.update({ busy: false });
        return;
      }
      await this.applySession(result.session);
    });
  }

  async signInWithGoogle() {
    await this.runAuthOperation(async () => {
      const result = await this.dependencies.auth.signInWithGoogle();
      if (result.cancelled || !result.session) {
        this.update({ busy: false });
        return;
      }
      await this.applySession(result.session);
    });
  }

  async saveProfile(input: ProfileInput) {
    const user = this.snapshot.user;
    if (!user) {
      return;
    }

    const sessionVersion = this.sessionVersion;
    this.update({ busy: true, error: null });
    try {
      const profile = await this.dependencies.profiles.saveOwnProfile(user.id, input);
      if (
        sessionVersion !== this.sessionVersion ||
        this.snapshot.user?.id !== user.id
      ) {
        return;
      }
      this.update({ busy: false, profile, status: 'ready' });
    } catch (error) {
      if (
        sessionVersion !== this.sessionVersion ||
        this.snapshot.user?.id !== user.id
      ) {
        return;
      }
      this.update({ busy: false, error: errorCode(error) });
    }
  }

  async retryProfile() {
    const user = this.snapshot.user;
    if (!user) {
      return;
    }

    await this.loadProfile(user, ++this.operation);
  }

  async signOut() {
    this.operation += 1;
    this.sessionVersion += 1;
    this.update({ busy: true, error: null, notice: null });
    let failure: AccountErrorCode | null = null;

    try {
      await this.dependencies.auth.signOut();
    } catch (error) {
      failure = errorCode(error);
    } finally {
      await this.dependencies.cache.clear();
      this.update({
        busy: false,
        error: failure,
        profile: null,
        status: 'signedOut',
        user: null,
      });
    }
  }

  private async runAuthOperation(operation: () => Promise<void>) {
    this.update({ busy: true, error: null, notice: null });
    try {
      await operation();
    } catch (error) {
      this.update({ busy: false, error: errorCode(error) });
    }
  }

  private async applySession(session: AuthSession | null) {
    const operation = ++this.operation;

    if (!session) {
      this.sessionVersion += 1;
      await this.dependencies.cache.clear();
      if (operation === this.operation) {
        this.update({
          busy: false,
          profile: null,
          status: 'signedOut',
          user: null,
        });
      }
      return;
    }

    const identityChanged = this.snapshot.user?.id !== session.user.id;
    if (identityChanged) {
      this.sessionVersion += 1;
      this.update({ profile: null, status: 'booting' });
    }

    await this.loadProfile(session.user, operation);
  }

  private async loadProfile(user: AccountUser, operation: number) {
    this.update({ busy: true, error: null, user });
    try {
      const profile = await this.dependencies.profiles.getOwnProfile(user.id);
      if (operation !== this.operation) {
        return;
      }
      this.update({
        busy: false,
        profile,
        status: profile ? 'ready' : 'profileRequired',
        user,
      });
    } catch {
      if (operation === this.operation) {
        const currentProfile =
          this.snapshot.profile?.userId === user.id ? this.snapshot.profile : null;
        this.update({
          busy: false,
          error: 'profileUnavailable',
          profile: currentProfile,
          status: currentProfile ? 'ready' : 'profileUnavailable',
          user,
        });
      }
    }
  }

  private update(patch: Partial<AccountSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
