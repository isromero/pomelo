import { EnvironmentError, parseEnvironment } from './env';

const validInput = {
  EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321/',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local-development-key',
};

describe('parseEnvironment', () => {
  it('normalizes a valid public configuration', () => {
    expect(parseEnvironment(validInput)).toEqual({
      supabaseUrl: 'http://127.0.0.1:54321',
      supabasePublishableKey: validInput.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
  });

  it('rejects missing values without exposing them', () => {
    expect(() => parseEnvironment({})).toThrow(EnvironmentError);
    expect(() => parseEnvironment({})).toThrow('Invalid public client configuration (missing)');
  });

  it('rejects malformed URLs and credentials in URLs', () => {
    expect(() =>
      parseEnvironment({ ...validInput, EXPO_PUBLIC_SUPABASE_URL: 'not-a-url' })
    ).toThrow('invalid-url');
    expect(() =>
      parseEnvironment({ ...validInput, EXPO_PUBLIC_SUPABASE_URL: 'https://user:pass@test.co' })
    ).toThrow('invalid-url');
  });

  it('rejects Supabase server keys', () => {
    expect(() =>
      parseEnvironment({
        ...validInput,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_server-only-key',
      })
    ).toThrow('server-secret');
    expect(() =>
      parseEnvironment({
        ...validInput,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          'eyJhbGciOiJub25lIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.',
      })
    ).toThrow('server-secret');
  });

  it('rejects legacy server JWTs without relying on atob', () => {
    const originalAtob = globalThis.atob;
    Object.defineProperty(globalThis, 'atob', { configurable: true, value: undefined });

    try {
      expect(() =>
        parseEnvironment({
          ...validInput,
          EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
            'eyJhbGciOiJub25lIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.',
        })
      ).toThrow('server-secret');
    } finally {
      Object.defineProperty(globalThis, 'atob', { configurable: true, value: originalAtob });
    }
  });

  it('accepts a valid legacy anon JWT', () => {
    expect(
      parseEnvironment({
        ...validInput,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          'eyJhbGciOiJub25lIn0.eyJyb2xlIjoiYW5vbiJ9.',
      }).supabasePublishableKey
    ).toBe('eyJhbGciOiJub25lIn0.eyJyb2xlIjoiYW5vbiJ9.');
  });

  it('rejects malformed legacy JWTs instead of accepting them as public', () => {
    expect(() =>
      parseEnvironment({
        ...validInput,
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'eyJ.invalid-payload.',
      })
    ).toThrow('server-secret');
  });
});
