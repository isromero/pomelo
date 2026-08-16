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
import {
  importantDateKinds,
  importantDateRecurrences,
  type ImportantDate,
  type ImportantDateInput,
  type NextImportantDate,
} from '@/features/pair/domain/important-date';
import type { PomeloSupabaseClient } from '@/lib/supabase';

type JsonObject = Record<string, unknown>;

const errorCodes: Record<string, PairErrorCode> = {
  already_paired: 'alreadyPaired',
  invitation_cancelled: 'invitationCancelled',
  invitation_expired: 'invitationExpired',
  invitation_invalid: 'invitationInvalid',
  invitation_used: 'invitationUsed',
  invalid_important_date: 'invalidImportantDate',
  invalid_anniversary: 'invalidAnniversary',
  important_date_not_found: 'importantDateNotFound',
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
const nextImportantDateKinds = new Set([
  'anniversary',
  'birthday',
  ...importantDateKinds,
]);
const nextImportantDateRecurrences: ReadonlySet<string> = new Set(importantDateRecurrences);

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

function parseImportantDate(value: unknown): ImportantDate {
  if (!isObject(value)) {
    throw new PairError('unexpected');
  }
  const id = stringValue(value.id);
  const pairId = stringValue(value.pairId);
  const kind = stringValue(value.kind);
  const name = stringValue(value.name);
  const date = stringValue(value.date);
  const recurrence = stringValue(value.recurrence);
  if (
    !id ||
    !pairId ||
    !kind ||
    !importantDateKinds.includes(kind as ImportantDateInput['kind']) ||
    !name ||
    !date ||
    !recurrence ||
    !importantDateRecurrences.includes(recurrence as ImportantDateInput['recurrence'])
  ) {
    throw new PairError('unexpected');
  }
  return {
    date,
    id,
    kind: kind as ImportantDate['kind'],
    name,
    pairId,
    recurrence: recurrence as ImportantDate['recurrence'],
  };
}

function parseNextImportantDate(value: unknown): NextImportantDate | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isObject(value)) {
    throw new PairError('unexpected');
  }
  const id = stringValue(value.id);
  const date = stringValue(value.date);
  const name = stringValue(value.name);
  const kind = stringValue(value.kind);
  const recurrence = stringValue(value.recurrence);
  const daysRemaining = value.daysRemaining;
  const ownerUserId = value.ownerUserId;
  if (
    !id ||
    !date ||
    name === null ||
    !kind ||
    !recurrence ||
    !nextImportantDateKinds.has(kind) ||
    !nextImportantDateRecurrences.has(recurrence) ||
    typeof daysRemaining !== 'number' ||
    (ownerUserId !== null && typeof ownerUserId !== 'string')
  ) {
    throw new PairError('unexpected');
  }
  return {
    date,
    daysRemaining,
    id,
    kind: kind as NextImportantDate['kind'],
    name,
    ownerUserId,
    recurrence: recurrence as NextImportantDate['recurrence'],
  };
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

  const importantDates = Array.isArray(value.importantDates)
    ? value.importantDates.map(parseImportantDate)
    : [];
  return {
    anniversary,
    id,
    importantDates,
    invitation,
    members,
    nextImportantDate: parseNextImportantDate(value.nextImportantDate),
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

  async createImportantDate(input: ImportantDateInput) {
    const { data, error } = await this.client.rpc('create_important_date', {
      date_kind: input.kind,
      date_name: input.name,
      date_recurrence: input.recurrence,
      date_value: input.date,
    });
    return this.stateResult(data, error);
  }

  async updateImportantDate(id: string, input: ImportantDateInput) {
    const { data, error } = await this.client.rpc('update_important_date', {
      date_kind: input.kind,
      date_name: input.name,
      date_recurrence: input.recurrence,
      date_value: input.date,
      target_date_id: id,
    });
    return this.stateResult(data, error);
  }

  async deleteImportantDate(id: string) {
    const { data, error } = await this.client.rpc('delete_important_date', {
      target_date_id: id,
    });
    return this.stateResult(data, error);
  }

  async getImportantDateWidget() {
    const { data, error } = await this.client.rpc('get_important_date_widget');
    const failure = repositoryError(error);
    if (failure) {
      throw failure;
    }
    return parseNextImportantDate(data);
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'important_dates' },
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
