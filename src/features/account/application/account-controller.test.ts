import {
  AccountController,
  type AuthGateway,
  type AuthSession,
  type PrivateCache,
  type ProfileRepository,
} from '@/features/account/application/account-controller';
import type { Profile, ProfileInput } from '@/features/account/domain/profile';

const session: AuthSession = {
  accessToken: 'access-token',
  expiresAt: 2_000_000_000,
  user: { email: 'irene@example.com', id: 'user-1' },
};

const profile: Profile = {
  appearance: 'system',
  avatarKey: 'calm',
  birthDate: '1992-11-07',
  displayName: 'Irene',
  locale: 'es',
  userId: 'user-1',
};

class FakeAuthGateway implements AuthGateway {
  private listener: ((session: AuthSession | null) => void) | null = null;
  currentSession: AuthSession | null = null;
  signUpResult: Awaited<ReturnType<AuthGateway['signUpWithEmail']>> = {
    needsEmailVerification: false,
    session,
  };
  signInResult = session;
  appleResult: Awaited<ReturnType<AuthGateway['signInWithApple']>> = {
    cancelled: false,
    session,
  };
  googleResult: Awaited<ReturnType<AuthGateway['signInWithGoogle']>> = {
    cancelled: false,
    session,
  };

  emit(nextSession: AuthSession | null) {
    this.currentSession = nextSession;
    this.listener?.(nextSession);
  }

  async getSession() {
    return this.currentSession;
  }

  onAuthStateChange(listener: (session: AuthSession | null) => void) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  async signInWithApple() {
    return this.appleResult;
  }

  async signInWithEmail() {
    return this.signInResult;
  }

  async signInWithGoogle() {
    return this.googleResult;
  }

  async signOut() {}

  async signUpWithEmail() {
    return this.signUpResult;
  }
}

class FakeProfileRepository implements ProfileRepository {
  profiles = new Map<string, Profile>();
  readError: Error | null = null;
  savePromise: Promise<Profile> | null = null;

  async getOwnProfile(userId: string) {
    if (this.readError) {
      throw this.readError;
    }
    return this.profiles.get(userId) ?? null;
  }

  async saveOwnProfile(userId: string, input: ProfileInput) {
    if (this.savePromise) {
      return this.savePromise;
    }
    const saved = { ...input, userId };
    this.profiles.set(userId, saved);
    return saved;
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

async function waitForAssertion(assertion: () => void) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  throw lastError;
}

function createHarness() {
  const auth = new FakeAuthGateway();
  const profiles = new FakeProfileRepository();
  const cache: PrivateCache = { clear: jest.fn(async () => {}) };
  const controller = new AccountController({ auth, cache, profiles });

  return { auth, cache, controller, profiles };
}

describe('AccountController', () => {
  it('creates an account and resumes incomplete onboarding at Profile', async () => {
    const { controller } = createHarness();

    await controller.start();
    await controller.signUpWithEmail('irene@example.com', 'correct horse battery staple');

    expect(controller.getSnapshot()).toMatchObject({
      status: 'profileRequired',
      user: session.user,
    });
  });

  it('shows email verification instead of creating a partial session', async () => {
    const { auth, controller } = createHarness();
    auth.signUpResult = { needsEmailVerification: true, session: null };

    await controller.start();
    await controller.signUpWithEmail('irene@example.com', 'correct horse battery staple');

    expect(controller.getSnapshot()).toMatchObject({
      notice: 'emailVerificationRequired',
      status: 'signedOut',
      user: null,
    });
  });

  it('logs in and recovers the same Profile without duplicating it', async () => {
    const { controller, profiles } = createHarness();
    profiles.profiles.set(session.user.id, profile);

    await controller.start();
    await controller.signInWithEmail('irene@example.com', 'correct horse battery staple');

    expect(controller.getSnapshot()).toMatchObject({ profile, status: 'ready' });
    expect(profiles.profiles.size).toBe(1);
  });

  it('restores a persisted session and continues completed onboarding', async () => {
    const { auth, controller, profiles } = createHarness();
    auth.currentSession = session;
    profiles.profiles.set(session.user.id, profile);

    await controller.start();

    expect(controller.getSnapshot()).toMatchObject({ profile, status: 'ready' });
  });

  it('keeps Profile recovery retryable when the backend is unavailable', async () => {
    const { auth, controller, profiles } = createHarness();
    auth.currentSession = session;
    profiles.readError = new Error('offline');

    await controller.start();

    expect(controller.getSnapshot()).toMatchObject({
      error: 'profileUnavailable',
      status: 'profileUnavailable',
      user: session.user,
    });

    profiles.readError = null;
    profiles.profiles.set(session.user.id, profile);
    await controller.retryProfile();

    expect(controller.getSnapshot()).toMatchObject({
      error: null,
      profile,
      status: 'ready',
    });
  });

  it('keeps a loaded Profile visible when a refresh read fails', async () => {
    const { auth, controller, profiles } = createHarness();
    auth.currentSession = session;
    profiles.profiles.set(session.user.id, profile);
    await controller.start();
    profiles.readError = new Error('offline');

    auth.emit(session);
    await waitForAssertion(() =>
      expect(controller.getSnapshot().error).toBe('profileUnavailable'),
    );

    expect(controller.getSnapshot()).toMatchObject({ profile, status: 'ready' });
  });

  it('returns to signed out and clears private cache when a session expires', async () => {
    const { auth, cache, controller, profiles } = createHarness();
    auth.currentSession = session;
    profiles.profiles.set(session.user.id, profile);
    await controller.start();

    auth.emit(null);
    await waitForAssertion(() =>
      expect(controller.getSnapshot().status).toBe('signedOut'),
    );

    expect(cache.clear).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().profile).toBeNull();
  });

  it('clears all private state on logout without deleting the Profile', async () => {
    const { auth, cache, controller, profiles } = createHarness();
    auth.currentSession = session;
    profiles.profiles.set(session.user.id, profile);
    await controller.start();

    await controller.signOut();

    expect(cache.clear).toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({
      profile: null,
      status: 'signedOut',
      user: null,
    });
    expect(profiles.profiles.get(session.user.id)).toEqual(profile);
  });

  it('does not restore private state when a Profile save finishes after expiry', async () => {
    const { auth, controller, profiles } = createHarness();
    auth.currentSession = session;
    await controller.start();
    const save = deferred<Profile>();
    profiles.savePromise = save.promise;

    const pendingSave = controller.saveProfile({
      appearance: 'system',
      avatarKey: 'calm',
      birthDate: '1992-11-07',
      displayName: 'Irene',
      locale: 'es',
    });
    auth.emit(null);
    await waitForAssertion(() =>
      expect(controller.getSnapshot().status).toBe('signedOut'),
    );
    save.resolve(profile);
    await pendingSave;

    expect(controller.getSnapshot()).toMatchObject({
      profile: null,
      status: 'signedOut',
      user: null,
    });
  });

  it('treats Apple cancellation as a no-op with no partial session', async () => {
    const { auth, controller } = createHarness();
    auth.appleResult = { cancelled: true, session: null };
    await controller.start();

    await controller.signInWithApple();

    expect(controller.getSnapshot()).toMatchObject({
      error: null,
      status: 'signedOut',
      user: null,
    });
  });

  it('recovers the existing Profile after signing in with Google', async () => {
    const { controller, profiles } = createHarness();
    profiles.profiles.set(session.user.id, profile);
    await controller.start();

    await controller.signInWithGoogle();

    expect(controller.getSnapshot()).toMatchObject({ profile, status: 'ready' });
    expect(profiles.profiles.size).toBe(1);
  });

  it('treats Google cancellation as a no-op with no partial session', async () => {
    const { auth, controller } = createHarness();
    auth.googleResult = { cancelled: true, session: null };
    await controller.start();

    await controller.signInWithGoogle();

    expect(controller.getSnapshot()).toMatchObject({
      error: null,
      status: 'signedOut',
      user: null,
    });
  });
});
