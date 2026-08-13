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
});
