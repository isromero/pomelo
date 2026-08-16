import {
  MomentError,
  type MomentErrorCode,
  type MomentRepository,
} from '@/features/moment/application/moment-controller';
import {
  ThreadError,
  type ThreadRepository,
} from '@/features/moment/application/thread-controller';
import type {
  Contribution,
  DailyMoment,
  DoodleDocument,
  Memory,
  MomentFormat,
  MomentPrompt,
  MomentPartner,
  MomentStatus,
  PhotoAsset,
  PhotoComposition,
  PhotoContribution,
  PhotoDraft,
  QuestionResponse,
  QuestionResponseType,
  StreakState,
} from '@/features/moment/domain/moment';
import { isDoodleDocument } from '@/features/moment/domain/moment';
import type { ThreadMessage, ThreadState } from '@/features/moment/domain/thread';
import type { PomeloSupabaseClient } from '@/lib/supabase';

type JsonObject = Record<string, unknown>;

export const MOMENT_MEDIA_BUCKET = 'pomelo-moment-media';

const errorCodes: Record<string, MomentErrorCode> = {
  already_submitted: 'alreadySubmitted',
  archive_read_only: 'notAllowed',
  doodle_not_ready: 'momentNotReady',
  invalid_doodle: 'invalidResponse',
  invalid_format: 'invalidFormat',
  invalid_message: 'invalidResponse',
  invalid_response: 'invalidResponse',
  moment_closed: 'momentClosed',
  moment_not_found: 'momentNotFound',
  moment_not_ready: 'momentNotReady',
  not_allowed: 'notAllowed',
  pair_not_active: 'pairNotActive',
  pair_not_ready: 'pairNotReady',
  premium_required: 'premiumRequired',
  photo_incomplete: 'photoIncomplete',
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
const momentFormats = new Set<MomentFormat>(['question', 'photo', 'doodle']);
const avatarKeys = new Set(['affectionate', 'calm', 'surprised']);
const pomStates = new Set(['calm', 'celebrating']);
const momentWindows = new Set(['complete', 'expired', 'normal', 'recovery']);

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

function parsePrompt(value: unknown, format: MomentFormat): MomentPrompt {
  if (!isObject(value)) {
    throw new MomentError('unexpected');
  }
  const conceptKey = stringValue(value.conceptKey);
  const text = stringValue(value.text);
  if (!conceptKey || !text) {
    throw new MomentError('unexpected');
  }
  if (format !== 'question') {
    return { conceptKey, text };
  }
  const responseType = stringValue(value.responseType) as QuestionResponseType | null;
  if (!responseType || !responseTypes.has(responseType)) {
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

function parsePhotoAsset(value: unknown): PhotoAsset {
  if (!isObject(value)) {
    throw new MomentError('unexpected');
  }
  const height = value.height;
  const mimeType = stringValue(value.mimeType);
  const path = stringValue(value.path);
  const width = value.width;
  if (
    typeof height !== 'number' ||
    !mimeType ||
    !path ||
    typeof width !== 'number' ||
    width <= 0 ||
    height <= 0
  ) {
    throw new MomentError('unexpected');
  }
  return { height, mimeType, path, width };
}

function parsePhotoContribution(value: unknown): PhotoContribution | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isObject(value)) {
    throw new MomentError('unexpected');
  }
  return {
    front: parsePhotoAsset(value.front),
    rear: parsePhotoAsset(value.rear),
  };
}

function parseDoodleDocument(value: unknown): DoodleDocument | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isDoodleDocument(value)) {
    throw new MomentError('unexpected');
  }
  return value;
}

function parsePhotoComposition(value: unknown): PhotoComposition | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (
    !isObject(value) ||
    value.layout !== 'partner_rear_primary_own_rear_thumbnail' ||
    value.version !== 1
  ) {
    throw new MomentError('unexpected');
  }
  return value as PhotoComposition;
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
    photo: parsePhotoContribution(value.photo),
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

function parseStreak(value: unknown): StreakState {
  if (!isObject(value)) {
    throw new MomentError('unexpected');
  }
  const best = value.best;
  const current = value.current;
  const recoveryAvailable = value.recoveryAvailable;
  const recoveryLimit = value.recoveryLimit;
  const recoveryUsed = value.recoveryUsed;
  const lastCompletedLocalDate = value.lastCompletedLocalDate;
  if (
    typeof best !== 'number' ||
    typeof current !== 'number' ||
    typeof recoveryAvailable !== 'boolean' ||
    typeof recoveryLimit !== 'number' ||
    typeof recoveryUsed !== 'number' ||
    (lastCompletedLocalDate !== null && typeof lastCompletedLocalDate !== 'string')
  ) {
    throw new MomentError('unexpected');
  }
  return {
    best,
    current,
    lastCompletedLocalDate,
    recoveryAvailable,
    recoveryLimit,
    recoveryUsed,
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
  const format = stringValue(value.format) as MomentFormat | null;
  const id = stringValue(value.id);
  const isFree = booleanValue(value.isFree);
  const localDate = stringValue(value.localDate);
  const pairId = stringValue(value.pairId);
  const status = stringValue(value.status) as MomentStatus | null;
  const normalExpiresAt = stringValue(value.normalExpiresAt);
  const recoveryExpiresAt = stringValue(value.recoveryExpiresAt);
  const window = stringValue(value.window);
  if (
    !format ||
    !momentFormats.has(format) ||
    !id ||
    isFree === null ||
    !localDate ||
    !pairId ||
    !status ||
    !momentStatuses.has(status) ||
    !normalExpiresAt ||
    !recoveryExpiresAt ||
    !window ||
    !momentWindows.has(window)
  ) {
    throw new MomentError('unexpected');
  }
  const pomState = nullableString(value.pomState);
  if (pomState !== null && !pomStates.has(pomState)) {
    throw new MomentError('unexpected');
  }
  const partner = parsePartner(value.partner);
  const doodle = value.doodle === null || value.doodle === undefined
    ? null
    : isObject(value.doodle)
      ? {
          document: parseDoodleDocument(value.doodle.document) ?? { strokes: [], version: 0 },
          ownCompleted: Boolean(value.doodle.ownCompleted),
          partnerCompleted: Boolean(value.doodle.partnerCompleted),
        }
      : null;
  return {
    format,
    id,
    isFree,
    lifecycle: {
      normalExpiresAt,
      recoveryExpiresAt,
      window: window as DailyMoment['lifecycle']['window'],
    },
    localDate,
    memoryId: stringValue(value.memoryId),
    ownContribution: parseContribution(value.ownContribution),
    pairId,
    partner,
    pomState: pomState as DailyMoment['pomState'],
    prompt: parsePrompt(value.prompt, format),
    streak: parseStreak(value.streak),
    status,
    doodle,
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
  const format = stringValue(value.format) as MomentFormat | null;
  const pomState = stringValue(value.pomState);
  const revealedAt = stringValue(value.revealedAt);
  const ownContribution = parseContribution(value.ownContribution);
  if (
    !id ||
    !format ||
    !momentFormats.has(format) ||
    !localDate ||
    !momentId ||
    !pairId ||
    !pomState ||
    !pomStates.has(pomState) ||
    !revealedAt
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
    prompt: parsePrompt(value.prompt, format),
    revealedAt,
    format,
    doodleDocument: parseDoodleDocument(value.doodleDocument),
    photoComposition: parsePhotoComposition(value.photoComposition),
    widgetVisualEnabled: Boolean(value.widgetVisualEnabled),
  };
}

export class SupabaseMomentRepository implements MomentRepository, ThreadRepository {
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

  async submitPhoto(momentId: string, draft: PhotoDraft, submissionKey: string) {
    const { data: userResult, error: userError } = await this.client.auth.getUser();
    if (userError || !userResult.user || !draft.rear || !draft.front) {
      throw new MomentError(userError ? 'network' : 'photoIncomplete');
    }
    const basePath = `${userResult.user.id}/${momentId}`;
    const rearPath = `${basePath}/rear.jpg`;
    const frontPath = `${basePath}/front.jpg`;
    const uploads = await Promise.allSettled([
      this.uploadPhoto(rearPath, draft.rear),
      this.uploadPhoto(frontPath, draft.front),
    ]);
    if (uploads.some((result) => result.status === 'rejected')) {
      await this.removeUploadedPhotos([rearPath, frontPath]);
      throw new MomentError('network');
    }
    const { data, error } = await this.client.rpc('submit_photo_contribution', {
      client_submission_id: submissionKey,
      front_height: draft.front.height,
      front_path: frontPath,
      front_width: draft.front.width,
      rear_height: draft.rear.height,
      rear_path: rearPath,
      rear_width: draft.rear.width,
      target_moment_id: momentId,
    });
    if (isObject(data) && data.error) {
      await this.removeUploadedPhotos([rearPath, frontPath]);
    }
    return this.momentResult(data, error);
  }

  async revealMoment(momentId: string) {
    const { data, error } = await this.client.rpc('reveal_moment', {
      target_moment_id: momentId,
    });
    return this.momentResult(data, error);
  }

  async getThread(memoryId: string): Promise<ThreadState> {
    const { data, error } = await this.client.rpc('get_memory_thread', {
      target_memory_id: memoryId,
    });
    const failure = repositoryError(error);
    if (failure) {
      throw failure;
    }
    const threadFailure = threadApplicationError(data);
    if (threadFailure) {
      throw threadFailure;
    }
    if (!isObject(data) || !Array.isArray(data.messages) || typeof data.canWrite !== 'boolean') {
      throw new MomentError('unexpected');
    }
    return {
      canWrite: data.canWrite,
      memoryId,
      messages: data.messages.map(parseThreadMessage),
    };
  }

  async sendThreadMessage(memoryId: string, body: string, clientMessageId: string) {
    const { data, error } = await this.client.rpc('send_thread_message', {
      message_body: body,
      target_client_message_id: clientMessageId,
      target_memory_id: memoryId,
    });
    const failure = repositoryError(error);
    if (failure) {
      throw failure;
    }
    const threadFailure = threadApplicationError(data);
    if (threadFailure) {
      throw threadFailure;
    }
    return parseThreadMessage(data);
  }

  subscribeToThread(memoryId: string, listener: () => void) {
    const channel = this.client
      .channel(`memory-thread:${memoryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `memory_id=eq.${memoryId}`,
          schema: 'public',
          table: 'thread_message_events',
        },
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

  async setMemoryWidgetVisibility(memoryId: string, enabled: boolean) {
    const { data, error } = await this.client.rpc('set_memory_widget_visibility', {
      enabled,
      target_memory_id: memoryId,
    });
    const failure = repositoryError(error);
    if (failure) {
      throw failure;
    }
    return data === true;
  }

  async createPrivateMediaUrl(path: string) {
    const { data, error } = await this.client.storage
      .from(MOMENT_MEDIA_BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) {
      throw new MomentError('network');
    }
    return data.signedUrl;
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pair_streaks' },
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

  private async uploadPhoto(path: string, capture: PhotoDraft['rear']) {
    if (!capture) {
      throw new MomentError('photoIncomplete');
    }
    const response = await fetch(capture.uri);
    if (!response.ok) {
      throw new MomentError('network');
    }
    const blob = await response.blob();
    const { error } = await this.client.storage.from(MOMENT_MEDIA_BUCKET).upload(path, blob, {
      cacheControl: '3600',
      contentType: capture.mimeType,
      upsert: true,
    });
    if (error) {
      throw new MomentError('network');
    }
  }

  private async removeUploadedPhotos(paths: string[]) {
    await this.client.storage.from(MOMENT_MEDIA_BUCKET).remove(paths);
  }
}

function threadApplicationError(value: unknown) {
  if (!isObject(value) || typeof value.error !== 'string') {
    return null;
  }
  switch (value.error) {
    case 'archive_read_only':
      return new ThreadError('archiveReadOnly');
    case 'memory_not_found':
      return new ThreadError('memoryNotFound');
    case 'not_allowed':
      return new ThreadError('notAllowed');
    default:
      return new ThreadError('unexpected');
  }
}

function parseThreadMessage(value: unknown): ThreadMessage {
  if (!isObject(value)) {
    throw new MomentError('unexpected');
  }
  const authorId = stringValue(value.authorId);
  const body = stringValue(value.body);
  const clientMessageId = stringValue(value.clientMessageId);
  const createdAt = stringValue(value.createdAt);
  const id = stringValue(value.id);
  if (!authorId || !body || !clientMessageId || !createdAt || !id) {
    throw new MomentError('unexpected');
  }
  return { authorId, body, clientMessageId, createdAt, id };
}
