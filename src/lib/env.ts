export type Environment = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export type EnvironmentInput = {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

export class EnvironmentError extends Error {
  constructor(public readonly code: 'missing' | 'invalid-url' | 'server-secret') {
    super(`Invalid public client configuration (${code})`);
    this.name = 'EnvironmentError';
  }
}

function isServerSecret(value: string): boolean {
  if (value.startsWith('sb_secret_') || value.toLowerCase().includes('service_role')) {
    return true;
  }

  if (!value.startsWith('eyJ')) {
    return false;
  }

  try {
    const payload = value.split('.')[1];
    return JSON.parse(decodeBase64Url(payload)).role !== 'anon';
  } catch {
    return true;
  }
}

function decodeBase64Url(value: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');

  if (normalized.length % 4 === 1) {
    throw new Error('Invalid base64url value');
  }

  let buffer = 0;
  let bufferedBits = 0;
  let decoded = '';

  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index === -1) {
      throw new Error('Invalid base64url character');
    }

    buffer = (buffer << 6) | index;
    bufferedBits += 6;

    if (bufferedBits >= 8) {
      bufferedBits -= 8;
      decoded += String.fromCharCode((buffer >> bufferedBits) & 0xff);
      buffer &= (1 << bufferedBits) - 1;
    }
  }

  return decoded;
}

export function parseEnvironment(input: EnvironmentInput): Environment {
  const supabaseUrl = input.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const supabasePublishableKey = input.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new EnvironmentError('missing');
  }

  try {
    const url = new URL(supabaseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('invalid');
    }
  } catch {
    throw new EnvironmentError('invalid-url');
  }

  if (isServerSecret(supabasePublishableKey)) {
    throw new EnvironmentError('server-secret');
  }

  return { supabaseUrl: supabaseUrl.replace(/\/$/, ''), supabasePublishableKey };
}

export function loadEnvironment(): Environment {
  return parseEnvironment({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
