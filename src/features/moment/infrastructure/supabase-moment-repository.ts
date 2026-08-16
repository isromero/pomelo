import {
  MomentError,
  type MomentErrorCode,
  type MomentRepository,
} from '@/features/moment/application/moment-controller';
import type {
  Contribution,
  DailyMoment,
  Memory,
  MomentPartner,
  MomentStatus,
  QuestionPrompt,
  QuestionResponse,
  QuestionResponseType,
} from '@/features/moment/domain/moment';
import type { PomeloSupabaseClient } from '@/lib/supabase';

type JsonObject = Record<string, unknown>;

const errorCodes: Record<string, MomentErrorCode> = {
  already_submitted: 'alreadySubmitted',
  invalid_format: 'invalidFormat',
  invalid_response: 'invalidResponse',
  moment_closed: 'momentClosed',
  moment_not_found: 'momentNotFound',
  moment_not_ready: 'momentNotReady',
  not_allowed: 'notAllowed',
  pair_not_active: 'pairNotActive',
  pair_not_ready: 'pairNotReady',
  premium_required: 'premiumRequired',
  prompt_unavailable: 'promptUnavailable',
};

const momentStatuses = new Set<MomentStatus>([
  'expired_incomplete',
  'open',
  'partially_submitted',
  'ready',
  'revealed',
]);
const responseTypes = new Set<QuestionResponseType>(['choice', 'text']);
const avatarKeys = new Set(['affectionate', 'calm', 'surprised']);
const pomStates = new Set(['calm', 'celebrating']);

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function nullableString(value: unknown) {
  return value === null || value === undefined || typeof value === 'string'
    ? value ?? null
    : null;
}

function booleanValue(value: unknown) {
  return typeof value === 'boolean' ? value : null;
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
  return new MomentError(
    message.includes('fetch') || message.includes('network') ? 'network' : 'unexpected',
  );
}

function parsePrompt(value: unknown): QuestionPrompt {
  if (!isObject(value)) {
    throw new MomentError('unexpected');
  }
  const conceptKey = stringValue(value.conceptKey);
  const text = stringValue(value.text);
  const responseType = stringValue(value.responseType) as QuestionResponseType | null;
  if (!conceptKey || !text || !responseType || !responseTypes.has(responseType)) {
    throw new MomentError('unexpected');
  }
  if (!Array.isArray(value.options) || !value.options.every((option) => typeof option === 'string')) {
    throw new MomentError('unexpected');
  }
  return {
    conceptKey,
    options: value.options,
    responseType,
    text,
  };
}

function parseContribution(value: unknown): Contribution | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isObject(value)) {
    throw new MomentError('unexpected');
  }
  const id = stringValue(value.id);
  const submittedAt = stringValue(value.submittedAt);
  const userId = stringValue(value.userId);
  if (!id || !submittedAt || !userId) {
    throw new MomentError('unexpected');
  }
  return {
    id,
    responseChoice: nullableString(value.responseChoice),
    responseText: nullableString(value.responseText),
    submittedAt,
    userId,
  };
}

function parsePartner(value: unknown): MomentPartner {
  if (!isObject(value)) {
    throw new MomentError('unexpected');
  }
  const avatarKey = stringValue(value.avatarKey);
  const displayName = stringValue(value.displayName);
  const submitted = booleanValue(value.submitted);
  const userId = stringValue(value.userId);
  if (
    !avatarKey ||
    !avatarKeys.has(avatarKey) ||
    !displayName ||
    submitted === null ||
    !userId
  ) {
    throw new MomentError('unexpected');
  }
  return {
    avatarKey: avatarKey as MomentPartner['avatarKey'],
    contribution: parseContribution(value.contribution),
    displayName,
    submitted,
    userId,
  };
}

function parseDailyMoment(value: unknown): DailyMoment {
  const error = applicationError(value);
  if (error) {
    throw new MomentError(error);
  }
  if (!isObject(value)) {
    throw new MomentError('unexpected');
  }
  const format = stringValue(value.format);
  const id = stringValue(value.id);
  const isFree = booleanValue(value.isFree);
  const localDate = stringValue(value.localDate);
  const pairId = stringValue(value.pairId);
  const status = stringValue(value.status) as MomentStatus | null;
  if (
    format !== 'question' ||
    !id ||
    isFree === null ||
    !localDate ||
    !pairId ||
    !status ||
    !momentStatuses.has(status)
  ) {
    throw new MomentError('unexpected');
  }
  const pomState = nullableString(value.pomState);
  if (pomState !== null && !pomStates.has(pomState)) {
    throw new MomentError('unexpected');
  }
  const partner = parsePartner(value.partner);
  return {
    format,
    id,
    isFree,
    localDate,
    memoryId: stringValue(value.memoryId),
    ownContribution: parseContribution(value.ownContribution),
    pairId,
    partner,
    pomState: pomState as DailyMoment['pomState'],
    prompt: parsePrompt(value.prompt),
    status,
  };
}

function parseMemory(value: unknown): Memory {
  const error = applicationError(value);
  if (error) {
    throw new MomentError(error);
  }
  if (!isObject(value)) {
    throw new MomentError('unexpected');
  }
  const id = stringValue(value.id);
  const localDate = stringValue(value.localDate);
  const momentId = stringValue(value.momentId);
  const pairId = stringValue(value.pairId);
  const pomState = stringValue(value.pomState);
  const revealedAt = stringValue(value.revealedAt);
  const ownContribution = parseContribution(value.ownContribution);
  if (
    !id ||
    !localDate ||
    !momentId ||
    !pairId ||
    !pomState ||
    !pomStates.has(pomState) ||
    !revealedAt ||
    !ownContribution
  ) {
    throw new MomentError('unexpected');
  }
  return {
    id,
    localDate,
    momentId,
    ownContribution,
    pairId,
    partner: parsePartner(value.partner),
    pomState: pomState as Memory['pomState'],
    prompt: parsePrompt(value.prompt),
    revealedAt,
  };
}

export class SupabaseMomentRepository implements MomentRepository {
  constructor(private readonly client: PomeloSupabaseClient) {}

  async getDailyMoment() {
    const { data, error } = await this.client.rpc('get_daily_moment');
    return this.momentResult(data, error);
  }

  async getHistory() {
    const { data, error } = await this.client.rpc('get_memory_history');
    const failure = repositoryError(error);
    if (failure) {
      throw failure;
    }
    if (!Array.isArray(data)) {
      throw new MomentError('unexpected');
    }
    return data.map(parseMemory);
  }

  async submitQuestion(momentId: string, response: QuestionResponse) {
    const { data, error } = await this.client.rpc('submit_question_contribution', {
      response_choice: response.choice ?? undefined,
      response_text: response.text ?? undefined,
      target_moment_id: momentId,
    });
    return this.momentResult(data, error);
  }

  async revealMoment(momentId: string) {
    const { data, error } = await this.client.rpc('reveal_moment', {
      target_moment_id: momentId,
    });
    return this.momentResult(data, error);
  }

  subscribe(listener: () => void) {
    const channel = this.client
      .channel('moment-state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moments' },
        listener,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memories' },
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

  private momentResult(data: unknown, error: { message?: string } | null) {
    const failure = repositoryError(error);
    if (failure) {
      throw failure;
    }
    return parseDailyMoment(data);
  }
}
