import { SupabaseAuthGateway } from '@/features/account/infrastructure/supabase-auth-gateway';
import type { PomeloSupabaseClient } from '@/lib/supabase';

const mockAppleSignInAsync = jest.fn();
const mockFormatFullName = jest.fn();

jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: { EMAIL: 0, FULL_NAME: 1 },
  formatFullName: (...args: unknown[]) => mockFormatFullName(...args),
  signInAsync: (...args: unknown[]) => mockAppleSignInAsync(...args),
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async () => 'hashed-nonce'),
  getRandomBytes: jest.fn(() => new Uint8Array(32)),
}));

jest.mock('@/features/account/infrastructure/google-auth', () => ({
  requestGoogleCredential: jest.fn(),
}));

function createGateway() {
  const auth = {
    getSession: jest.fn(),
    getUser: jest.fn(),
    refreshSession: jest.fn(),
    signInWithIdToken: jest.fn(),
    signOut: jest.fn(),
    updateUser: jest.fn(),
  };
  const gateway = new SupabaseAuthGateway({ auth } as unknown as PomeloSupabaseClient);
  return { auth, gateway };
}

function appleCredential() {
  return {
    authorizationCode: 'authorization-code',
    fullName: { givenName: 'Irene' },
    identityToken: 'identity-token',
  };
}

describe('SupabaseAuthGateway Apple sign-in', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppleSignInAsync.mockResolvedValue(appleCredential());
    mockFormatFullName.mockReturnValue('Irene');
  });

  it('rejects an authenticated response that has no session', async () => {
    const { auth, gateway } = createGateway();
    auth.signInWithIdToken.mockResolvedValue({ data: { session: null }, error: null });

    await expect(gateway.signInWithApple()).rejects.toEqual(
      expect.objectContaining({ code: 'unexpected' }),
    );
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('returns the Apple name without mutating Supabase session metadata', async () => {
    const { auth, gateway } = createGateway();
    const session = {
      access_token: 'access-token',
      expires_at: 2_000_000_000,
      user: {
        email: 'irene@example.com',
        id: 'user-1',
        user_metadata: undefined,
      },
    };
    auth.signInWithIdToken.mockResolvedValue({ data: { session }, error: null });
    auth.updateUser.mockResolvedValue({ data: { user: session.user }, error: null });

    await expect(gateway.signInWithApple()).resolves.toMatchObject({
      cancelled: false,
      session: { user: { displayNameHint: 'Irene' } },
    });
    expect(session.user.user_metadata).toBeUndefined();
  });
});

describe('SupabaseAuthGateway session recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears a persisted session when the Auth user was removed', async () => {
    const { auth, gateway } = createGateway();
    const session = {
      access_token: 'access-token',
      expires_at: 2_000_000_000,
      user: { email: 'irene@example.com', id: 'user-1' },
    };
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User from sub claim does not exist', status: 401 },
    });
    auth.signOut.mockResolvedValue({ error: null });

    await expect(gateway.getSession()).resolves.toBeNull();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('keeps a persisted session when Auth still validates its user', async () => {
    const { auth, gateway } = createGateway();
    const session = {
      access_token: 'access-token',
      expires_at: 2_000_000_000,
      user: { email: 'irene@example.com', id: 'user-1' },
    };
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    await expect(gateway.getSession()).resolves.toMatchObject({
      user: { id: 'user-1' },
    });
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
