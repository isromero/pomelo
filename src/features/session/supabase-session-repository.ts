import { PomeloSupabaseClient } from '@/lib/supabase';

import {
  SessionRepository,
  SessionRepositoryError,
  SessionState,
  SignInCredentials,
} from './session-repository';

function isLocale(value: string): value is 'es' | 'en' {
  return value === 'es' || value === 'en';
}

function isAppearance(value: string): value is 'system' | 'light' | 'dark' {
  return value === 'system' || value === 'light' || value === 'dark';
}

function classifyFailure(message: string): SessionRepositoryError {
  const normalized = message.toLowerCase();
  if (normalized.includes('fetch') || normalized.includes('network')) {
    return new SessionRepositoryError('network');
  }
  return new SessionRepositoryError('session');
}

export class SupabaseSessionRepository implements SessionRepository {
  constructor(private readonly client: PomeloSupabaseClient) {}

  async restore(): Promise<SessionState> {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw classifyFailure(error.message);
    }
    if (!data.session) {
      return { status: 'signed-out' };
    }
    return this.readAuthorizedProfile(data.session.user.id);
  }

  async signIn(credentials: SignInCredentials): Promise<SessionState> {
    const { data, error } = await this.client.auth.signInWithPassword(credentials);
    if (error) {
      throw classifyFailure(error.message);
    }
    if (!data.user) {
      throw new SessionRepositoryError('session');
    }
    return this.readAuthorizedProfile(data.user.id);
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw classifyFailure(error.message);
    }
  }

  private async readAuthorizedProfile(userId: string): Promise<SessionState> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id, display_name, locale, appearance')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw classifyFailure(error.message);
    }
    if (!data) {
      throw new SessionRepositoryError('profile-missing');
    }
    if (!isLocale(data.locale) || !isAppearance(data.appearance)) {
      throw new SessionRepositoryError('session');
    }

    return {
      status: 'authenticated',
      profile: {
        id: data.id,
        displayName: data.display_name,
        locale: data.locale,
        appearance: data.appearance,
      },
    };
  }
}
