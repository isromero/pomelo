import {
  AccountError,
  type ProfileRepository,
} from '@/features/account/application/account-controller';
import {
  appearanceValues,
  avatarKeys,
  localeValues,
  type Appearance,
  type AvatarKey,
  type Locale,
  type Profile,
  type ProfileInput,
} from '@/features/account/domain/profile';
import type { Database } from '@/lib/database.types';
import type { PomeloSupabaseClient } from '@/lib/supabase';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}

function mapProfile(row: ProfileRow): Profile | null {
  if (!row.avatar_key || !row.birth_date) {
    return null;
  }

  if (
    !appearanceValues.includes(row.appearance as Appearance) ||
    !avatarKeys.includes(row.avatar_key as AvatarKey) ||
    !localeValues.includes(row.locale as Locale)
  ) {
    throw new AccountError('profileUnavailable');
  }

  return {
    appearance: row.appearance as Appearance,
    avatarKey: row.avatar_key as AvatarKey,
    birthDate: row.birth_date,
    displayName: row.display_name,
    locale: row.locale as Locale,
    userId: row.id,
  };
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: PomeloSupabaseClient) {}

  async getOwnProfile(userId: string) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new AccountError('profileUnavailable');
    }
    return data ? mapProfile(data) : null;
  }

  async saveOwnProfile(userId: string, input: ProfileInput) {
    const { data, error } = await this.client
      .from('profiles')
      .update({
        appearance: input.appearance,
        avatar_key: input.avatarKey,
        birth_date: input.birthDate,
        display_name: input.displayName.trim(),
        locale: input.locale,
        time_zone: deviceTimeZone(),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      throw new AccountError('profileUnavailable');
    }
    const profile = mapProfile(data);
    if (!profile) {
      throw new AccountError('profileUnavailable');
    }
    return profile;
  }
}
