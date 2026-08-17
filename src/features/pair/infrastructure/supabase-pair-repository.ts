import * as Linking from 'expo-linking';

import {
  PairError,
  type InvitationPreview,
  type InvitationPreviewStatus,
  type InvitationStatus,
  type PairErrorCode,
  type PairRepository,
  type PairState,
  type PairStatus,
} from '@/features/pair/application/pair-controller';
import type { PomeloSupabaseClient } from '@/lib/supabase';

type JsonObject = Record<string, unknown>;

const errorCodes: Record<string, PairErrorCode> = {
  already_paired: 'alreadyPaired',
  invitation_cancelled: 'invitationCancelled',
  invitation_expired: 'invitationExpired',
  invitation_invalid: 'invitationInvalid',
  invitation_used: 'invitationUsed',
  invalid_anniversary: 'invalidAnniversary',
  not_allowed: 'notAllowed',
  pair_full: 'pairFull',
  profile_incomplete: 'profileIncomplete',
};

const pairStatuses = new Set<PairStatus>(['active', 'archived', 'waiting']);
const invitationStatuses = new Set<InvitationStatus>([
  'accepted',
  'cancelled',
  'expired',
  'pending',
]);
const previewStatuses = new Set<InvitationPreviewStatus>([
  'cancelled',
  'expired',
  'invalid',
  'pairFull',
  'used',
  'valid',
]);
const avatarKeys = new Set(['affectionate', 'calm', 'surprised']);

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function applicationError(value: unknown) {
  if (!isObject(value)) {
    return null;
  }
  const code = stringValue(value.error);
  return code ? errorCodes[code] ?? 'unexpected' : null;
}

function repositoryError(error: { message?: string } | null) {
  if (!error) {
    return null;
  }
  const message = error.message?.toLowerCase() ?? '';
  return new PairError(
    message.includes('fetch') || message.includes('network') ? 'network' : 'unexpected',
  );
}

function parseState(value: unknown): PairState {
  const error = applicationError(value);
  if (error) {
    throw new PairError(error);
  }
  if (!isObject(value)) {
    throw new PairError('unexpected');
  }

  const id = stringValue(value.id);
  const anniversary = stringValue(value.anniversary);
  const timeZone = stringValue(value.timeZone) ?? 'UTC';
  const status = stringValue(value.status) as PairStatus | null;
  if (!id || !anniversary || !status || !pairStatuses.has(status)) {
    throw new PairError('unexpected');
  }

  if (!Array.isArray(value.members)) {
    throw new PairError('unexpected');
  }
  const members = value.members.map((member) => {
    if (!isObject(member)) {
      throw new PairError('unexpected');
    }
    const userId = stringValue(member.userId);
    const displayName = stringValue(member.displayName);
    const role = stringValue(member.role);
    const avatarKey = stringValue(member.avatarKey);
    if (
      !userId ||
      !displayName ||
      (role !== 'creator' && role !== 'member') ||
      !avatarKey ||
      !avatarKeys.has(avatarKey)
    ) {
      throw new PairError('unexpected');
    }
    return {
      avatarKey: avatarKey as 'affectionate' | 'calm' | 'surprised',
      birthDate: stringValue(member.birthDate),
      displayName,
      role: role as 'creator' | 'member',
      userId,
    };
  });

  let invitation = null;
  if (value.invitation !== null && value.invitation !== undefined) {
    if (!isObject(value.invitation)) {
      throw new PairError('unexpected');
    }
    const invitationId = stringValue(value.invitation.id);
    const token = stringValue(value.invitation.token);
    const code = stringValue(value.invitation.code);
    const expiresAt = stringValue(value.invitation.expiresAt);
    const invitationStatus = stringValue(value.invitation.status) as InvitationStatus | null;
    if (
      !invitationId ||
      !token ||
      !code ||
      !expiresAt ||
      !invitationStatus ||
      !invitationStatuses.has(invitationStatus)
    ) {
      throw new PairError('unexpected');
    }
    invitation = {
      code,
      expiresAt,
      id: invitationId,
      link: Linking.createURL('invite', { queryParams: { credential: token } }),
      status: invitationStatus,
      token,
    };
  }

  return {
    anniversary,
    id,
    invitation,
    members,
    status,
    timeZone,
  };
}

function parsePreview(value: unknown): InvitationPreview {
  const error = applicationError(value);
  if (error) {
    throw new PairError(error);
  }
  if (!isObject(value)) {
    throw new PairError('unexpected');
  }
  const status = stringValue(value.status) as InvitationPreviewStatus | null;
  if (!status || !previewStatuses.has(status)) {
    throw new PairError('unexpected');
  }
  return {
    anniversary: stringValue(value.anniversary),
    creatorName: stringValue(value.creatorName),
    status,
  };
}

export class SupabasePairRepository implements PairRepository {
  constructor(private readonly client: PomeloSupabaseClient) {}

  async getState() {
    const { data, error } = await this.client.rpc('get_pair_state');
    const failure = repositoryError(error);
    if (failure) {
      throw failure;
    }
    return data === null ? null : parseState(data);
  }

  async createPair(anniversary: string) {
    const { data, error } = await this.client.rpc('create_pair_with_invitation', {
      pair_anniversary: anniversary,
    });
    return this.stateResult(data, error);
  }

  async createInvitation() {
    const { data, error } = await this.client.rpc('create_pair_invitation');
    return this.stateResult(data, error);
  }

  async cancelInvitation(invitationId: string) {
    const { data, error } = await this.client.rpc('cancel_pair_invitation', {
      invitation_id: invitationId,
    });
    return this.stateResult(data, error);
  }

  async previewInvitation(credential: string) {
    const { data, error } = await this.client.rpc('preview_pair_invitation', {
      invitation_credential: credential,
    });
    const failure = repositoryError(error);
    if (failure) {
      throw failure;
    }
    return parsePreview(data);
  }

  async acceptInvitation(credential: string) {
    const { data, error } = await this.client.rpc('accept_pair_invitation', {
      invitation_credential: credential,
    });
    return this.stateResult(data, error);
  }

  async dissolvePair() {
    const { data, error } = await this.client.rpc('dissolve_pair');
    return this.stateResult(data, error);
  }

  subscribe(listener: () => void) {
    const channel = this.client
      .channel('pair-state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pairs' },
        listener,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pair_invitations' },
        listener,
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          listener();
        }
      });

    return () => {
      void this.client.removeChannel(channel);
    };
  }

  private stateResult(data: unknown, error: { message?: string } | null) {
    const failure = repositoryError(error);
    if (failure) {
      throw failure;
    }
    return parseState(data);
  }
}
