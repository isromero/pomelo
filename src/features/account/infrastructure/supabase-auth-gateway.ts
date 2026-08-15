import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import {
  AccountError,
  type AccountErrorCode,
  type AuthGateway,
  type AuthSession,
} from '@/features/account/application/account-controller';
import { requestGoogleCredential } from '@/features/account/infrastructure/google-auth';
import type { PomeloSupabaseClient } from '@/lib/supabase';

type SupabaseAuthError = {
  code?: string;
  message?: string;
  status?: number;
};

function accountError(error: SupabaseAuthError) {
  let code: AccountErrorCode = 'unexpected';

  if (error.code === 'invalid_credentials') {
    code = 'invalidCredentials';
  } else if (error.code === 'user_already_exists') {
    code = 'emailAlreadyRegistered';
  } else if (error.code === 'weak_password') {
    code = 'weakPassword';
  } else if (!error.status || error.status >= 500) {
    code = 'network';
  }

  return new AccountError(code);
}

function authSession(session: {
  access_token: string;
  expires_at?: number;
  user: {
    email?: string;
    id: string;
    user_metadata?: { full_name?: unknown };
  };
}): AuthSession {
  const fullName = session.user.user_metadata?.full_name;

  return {
    accessToken: session.access_token,
    expiresAt: session.expires_at ?? null,
    user: {
      displayNameHint: typeof fullName === 'string' ? fullName : null,
      email: session.user.email ?? null,
      id: session.user.id,
    },
  };
}

function randomNonce() {
  return Array.from(Crypto.getRandomBytes(32), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

function isAppleCancellation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ERR_REQUEST_CANCELED'
  );
}

function googleAccountError(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'DEVELOPER_ERROR' || error.code === 'PLAY_SERVICES_NOT_AVAILABLE')
  ) {
    return new AccountError('configuration');
  }

  return error instanceof AccountError ? error : new AccountError('unexpected');
}

export class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly client: PomeloSupabaseClient) {}

  async getSession() {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw accountError(error);
    }
    if (!data.session) {
      return null;
    }

    if (data.session.expires_at && data.session.expires_at <= Date.now() / 1000) {
      const { data: refreshed, error: refreshError } = await this.client.auth.refreshSession();
      if (refreshError || !refreshed.session) {
        await this.client.auth.signOut({ scope: 'local' });
        return null;
      }
      return authSession(refreshed.session);
    }

    return authSession(data.session);
  }

  onAuthStateChange(listener: (session: AuthSession | null) => void) {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(session ? authSession(session) : null);
    });
    return () => data.subscription.unsubscribe();
  }

  async signUpWithEmail(email: string, password: string) {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) {
      throw accountError(error);
    }

    return {
      needsEmailVerification: Boolean(data.user && !data.session),
      session: data.session ? authSession(data.session) : null,
    };
  }

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) {
      throw accountError(error);
    }
    return authSession(data.session);
  }

  async signInWithApple() {
    const nonce = randomNonce();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonce,
    );

    try {
      const credential = await AppleAuthentication.signInAsync({
        nonce: hashedNonce,
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new AccountError('unexpected');
      }

      const { data, error } = await this.client.auth.signInWithIdToken({
        access_token: credential.authorizationCode ?? undefined,
        nonce,
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) {
        throw accountError(error);
      }
      if (!data.session) {
        throw new AccountError('unexpected');
      }

      const fullName = credential.fullName
        ? AppleAuthentication.formatFullName(credential.fullName)
        : '';
      const session = authSession(data.session);
      if (fullName) {
        const { error: updateError } = await this.client.auth.updateUser({
          data: { full_name: fullName },
        });
        if (!updateError) {
          return {
            cancelled: false,
            session: {
              ...session,
              user: { ...session.user, displayNameHint: fullName },
            },
          };
        }
      }

      return { cancelled: false, session };
    } catch (error) {
      if (isAppleCancellation(error)) {
        return { cancelled: true, session: null };
      }
      throw error;
    }
  }

  async signInWithGoogle() {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId?.endsWith('.apps.googleusercontent.com')) {
      throw new AccountError('configuration');
    }

    const nonce = randomNonce();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonce,
    );

    try {
      const credential = await requestGoogleCredential(webClientId, hashedNonce);
      if (credential.cancelled) {
        return { cancelled: true, session: null };
      }

      const { data, error } = await this.client.auth.signInWithIdToken({
        nonce,
        provider: 'google',
        token: credential.idToken,
      });
      if (error) {
        throw accountError(error);
      }
      if (!data.session) {
        throw new AccountError('unexpected');
      }

      return { cancelled: false, session: authSession(data.session) };
    } catch (error) {
      throw googleAccountError(error);
    }
  }

  async signOut() {
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) {
      throw accountError(error);
    }
  }
}
