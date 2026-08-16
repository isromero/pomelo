import {
  AccountController,
  AccountError,
  type AuthGateway,
  type ProfileRepository,
} from '@/features/account/application/account-controller';
import { LocalPrivateCache } from '@/features/account/infrastructure/local-private-cache';
import { SupabaseAuthGateway } from '@/features/account/infrastructure/supabase-auth-gateway';
import { SupabaseProfileRepository } from '@/features/account/infrastructure/supabase-profile-repository';
import { captureDiagnostic } from '@/lib/diagnostics';
import { EnvironmentError, loadEnvironment } from '@/lib/env';
import { createSupabaseRuntime } from '@/lib/supabase';

const unavailableAuth: AuthGateway = {
  getSession: async () => {
    throw new AccountError('configuration');
  },
  onAuthStateChange: () => () => {},
  signInWithApple: async () => {
    throw new AccountError('configuration');
  },
  signInWithEmail: async () => {
    throw new AccountError('configuration');
  },
  signInWithGoogle: async () => {
    throw new AccountError('configuration');
  },
  signOut: async () => {},
  signUpWithEmail: async () => {
    throw new AccountError('configuration');
  },
};

const unavailableProfiles: ProfileRepository = {
  getOwnProfile: async () => {
    throw new AccountError('configuration');
  },
  saveOwnProfile: async () => {
    throw new AccountError('configuration');
  },
};

export function createAccountRuntime() {
  const cache = new LocalPrivateCache();

  try {
    const native = createSupabaseRuntime(loadEnvironment());
    return {
      activate: native.activate,
      client: native.client,
      controller: new AccountController({
        auth: new SupabaseAuthGateway(native.client),
        cache,
        profiles: new SupabaseProfileRepository(native.client),
      }),
    };
  } catch (error) {
    captureDiagnostic({
      area: 'configuration',
      code: error instanceof EnvironmentError ? error.code : 'unknown',
      recoverable: true,
    });
    return {
      activate: () => () => {},
      client: null,
      controller: new AccountController({
        auth: unavailableAuth,
        cache,
        profiles: unavailableProfiles,
      }),
    };
  }
}
