import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import {
  JournalError,
  type JournalAccess,
  type JournalRepository,
} from '@/features/journal/application/journal-controller';
import type {
  JournalEntry,
  JournalEntryInput,
  JournalLocation,
  JournalMedia,
} from '@/features/journal/domain/journal';
import { ThreadError, type ThreadRepository } from '@/features/moment/application/thread-controller';
import type { ThreadMessage, ThreadState } from '@/features/moment/domain/thread';
import type { PomeloSupabaseClient } from '@/lib/supabase';

type JsonObject = Record<string, unknown>;

export type JournalPhotoDraft = {
  height: number;
  uri: string;
  width: number;
};

export const JOURNAL_MEDIA_BUCKET = 'journal-media';

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown) {
  return typeof value === 'string' && value ? value : null;
}

function nullableString(value: unknown) {
  return value === null || value === undefined || typeof value === 'string' ? value ?? null : null;
}

function parseLocation(value: unknown): JournalLocation | null {
  if (value === null || value === undefined) return null;
  if (!isObject(value)) throw new JournalError('unexpected');
  const label = requiredString(value.label);
  if (!label || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
    throw new JournalError('unexpected');
  }
  return {
    city: nullableString(value.city),
    countryCode: nullableString(value.countryCode),
    label,
    latitude: value.latitude,
    longitude: value.longitude,
  };
}

function parseMedia(value: unknown): JournalMedia {
  if (!isObject(value)) throw new JournalError('unexpected');
  const createdBy = requiredString(value.createdBy);
  const id = requiredString(value.id);
  const path = requiredString(value.path);
  if (!createdBy || !id || !path || typeof value.height !== 'number'
    || typeof value.position !== 'number' || typeof value.width !== 'number') {
    throw new JournalError('unexpected');
  }
  return { createdBy, height: value.height, id, mimeType: 'image/jpeg', path, position: value.position, width: value.width };
}

function parseEntry(value: unknown): JournalEntry {
  if (!isObject(value) || !Array.isArray(value.media)) throw new JournalError('unexpected');
  const id = requiredString(value.id);
  const pairId = requiredString(value.pairId);
  const title = requiredString(value.title);
  const startDate = requiredString(value.startDate);
  const createdBy = requiredString(value.createdBy);
  const updatedBy = requiredString(value.updatedBy);
  const createdAt = requiredString(value.createdAt);
  const updatedAt = requiredString(value.updatedAt);
  if (!id || !pairId || !title || !startDate || !createdBy || !updatedBy || !createdAt || !updatedAt
    || (value.recurrence !== 'once' && value.recurrence !== 'yearly')
    || typeof value.version !== 'number' || typeof value.widgetHidden !== 'boolean') {
    throw new JournalError('unexpected');
  }
  return {
    body: nullableString(value.body),
    createdAt,
    createdBy,
    endDate: nullableString(value.endDate),
    id,
    location: parseLocation(value.location),
    media: value.media.map(parseMedia),
    pairId,
    recurrence: value.recurrence,
    startDate,
    startTime: nullableString(value.startTime)?.slice(0, 5) ?? null,
    timeZone: nullableString(value.timeZone) ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    title,
    updatedAt,
    updatedBy,
    version: value.version,
    widgetHidden: value.widgetHidden,
  };
}

function parseThreadMessage(value: unknown): ThreadMessage {
  if (!isObject(value)) throw new ThreadError('unexpected');
  const authorId = requiredString(value.authorId);
  const body = requiredString(value.body);
  const clientMessageId = requiredString(value.clientMessageId);
  const createdAt = requiredString(value.createdAt);
  const id = requiredString(value.id);
  if (!authorId || !body || !clientMessageId || !createdAt || !id) throw new ThreadError('unexpected');
  return { authorId, body, clientMessageId, createdAt, id };
}

function journalFailure(value: unknown) {
  if (!isObject(value) || typeof value.error !== 'string') return null;
  const codes = {
    conflict: 'conflict',
    invalid_entry: 'invalidEntry',
    not_allowed: 'notAllowed',
    not_found: 'notFound',
    premium_required: 'premiumRequired',
  } as const;
  return new JournalError(codes[value.error as keyof typeof codes] ?? 'unexpected');
}

function transportFailure(error: { message?: string } | null) {
  if (!error) return null;
  const message = error.message?.toLowerCase() ?? '';
  return new JournalError(message.includes('fetch') || message.includes('network') ? 'network' : 'unexpected');
}

function rpcInput(input: JournalEntryInput) {
  return {
    target_body: input.body,
    target_end_date: input.endDate,
    target_location: input.location,
    target_recurrence: input.recurrence,
    target_start_date: input.startDate,
    target_start_time: input.startTime,
    target_time_zone: input.timeZone,
    target_title: input.title,
    target_widget_hidden: input.widgetHidden,
  };
}

export class SupabaseJournalRepository implements JournalRepository, ThreadRepository {
  private access: JournalAccess = { canCreate: false, freeEntryConsumed: false, isPremium: false, readOnly: false };

  constructor(private readonly client: PomeloSupabaseClient) {}

  async getEntries() {
    const { data, error } = await this.client.rpc('get_journal_entries');
    const transport = transportFailure(error);
    if (transport) throw transport;
    const application = journalFailure(data);
    if (application) throw application;
    if (!isObject(data) || !Array.isArray(data.entries)
      || typeof data.canCreate !== 'boolean' || typeof data.freeEntryConsumed !== 'boolean'
      || typeof data.isPremium !== 'boolean' || typeof data.readOnly !== 'boolean') {
      throw new JournalError('unexpected');
    }
    this.access = {
      canCreate: data.canCreate,
      freeEntryConsumed: data.freeEntryConsumed,
      isPremium: data.isPremium,
      readOnly: data.readOnly,
    };
    return data.entries.map(parseEntry);
  }

  async getAccess() {
    return this.access;
  }

  async createEntry(input: JournalEntryInput, requestId: string) {
    const { data, error } = await this.client.rpc('create_journal_entry', {
      ...rpcInput(input),
      target_client_request_id: requestId,
    } as never);
    const entry = this.entryResult(data, error);
    this.access = {
      ...this.access,
      canCreate: this.access.isPremium,
      freeEntryConsumed: true,
    };
    return entry;
  }

  async updateEntry(entryId: string, version: number, input: JournalEntryInput) {
    const { data, error } = await this.client.rpc('update_journal_entry', {
      ...rpcInput(input),
      expected_version: version,
      target_entry_id: entryId,
    } as never);
    return this.entryResult(data, error);
  }

  async deleteEntry(entryId: string) {
    const entry = (await this.getEntries()).find((candidate) => candidate.id === entryId);
    if (entry?.media.length) {
      await this.client.storage.from(JOURNAL_MEDIA_BUCKET).remove(entry.media.map((media) => media.path));
    }
    const { data, error } = await this.client.rpc('delete_journal_entry', { target_entry_id: entryId });
    const transport = transportFailure(error);
    if (transport) throw transport;
    const application = journalFailure(data);
    if (application) throw application;
  }

  async addPhoto(entry: JournalEntry, draft: JournalPhotoDraft, position: number, clientMediaId: string) {
    const user = await this.client.auth.getUser();
    if (!user.data.user) throw new JournalError('notAllowed');
    const context = ImageManipulator.manipulate(draft.uri);
    if (draft.width > 1800) context.resize({ width: 1800 });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ compress: 0.86, format: SaveFormat.JPEG });
    const path = `${entry.pairId}/${entry.id}/${user.data.user.id}/${clientMediaId}.jpg`;
    const response = await fetch(saved.uri);
    const blob = await response.blob();
    const upload = await this.client.storage.from(JOURNAL_MEDIA_BUCKET).upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (upload.error) throw new JournalError('network');
    const { data, error } = await this.client.rpc('add_journal_entry_media', {
      target_client_media_id: clientMediaId,
      target_entry_id: entry.id,
      target_height: saved.height,
      target_position: position,
      target_storage_path: path,
      target_width: saved.width,
    });
    const failure = transportFailure(error) ?? journalFailure(data);
    if (failure) {
      await this.client.storage.from(JOURNAL_MEDIA_BUCKET).remove([path]);
      throw failure;
    }
  }

  async removePhoto(media: JournalMedia) {
    const storage = await this.client.storage.from(JOURNAL_MEDIA_BUCKET).remove([media.path]);
    if (storage.error) throw new JournalError('network');
    const { data, error } = await this.client.rpc('remove_journal_entry_media', { target_media_id: media.id });
    const failure = transportFailure(error) ?? journalFailure(data);
    if (failure) throw failure;
  }

  async createMediaUrl(path: string) {
    const { data, error } = await this.client.storage.from(JOURNAL_MEDIA_BUCKET).createSignedUrl(path, 5 * 60);
    if (error || !data?.signedUrl) throw new JournalError('network');
    return data.signedUrl;
  }

  async getThread(entryId: string): Promise<ThreadState> {
    const { data, error } = await this.client.rpc('get_journal_thread', { target_entry_id: entryId });
    if (error) throw new ThreadError('network');
    if (isObject(data) && data.error) throw new ThreadError(data.error === 'not_allowed' ? 'notAllowed' : 'unexpected');
    if (!isObject(data) || !Array.isArray(data.messages) || typeof data.canWrite !== 'boolean') {
      throw new ThreadError('unexpected');
    }
    return { canWrite: data.canWrite, memoryId: entryId, messages: data.messages.map(parseThreadMessage) };
  }

  async sendThreadMessage(entryId: string, body: string, clientMessageId: string) {
    const { data, error } = await this.client.rpc('send_journal_thread_message', {
      message_body: body,
      target_client_message_id: clientMessageId,
      target_entry_id: entryId,
    });
    if (error) throw new ThreadError('network');
    if (isObject(data) && data.error) throw new ThreadError(data.error === 'not_allowed' ? 'notAllowed' : 'unexpected');
    return parseThreadMessage(data);
  }

  subscribeToThread(entryId: string, listener: () => void) {
    const channel = this.client.channel(`journal-thread:${entryId}`).on('postgres_changes', {
      event: '*', filter: `journal_entry_id=eq.${entryId}`, schema: 'public', table: 'thread_message_events',
    }, listener).subscribe((status) => { if (status === 'SUBSCRIBED') listener(); });
    return () => { void this.client.removeChannel(channel); };
  }

  subscribe(listener: () => void) {
    const channel = this.client.channel('journal-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries' }, listener)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entry_media' }, listener)
      .subscribe((status) => { if (status === 'SUBSCRIBED') listener(); });
    return () => { void this.client.removeChannel(channel); };
  }

  private entryResult(data: unknown, error: { message?: string } | null) {
    const failure = transportFailure(error) ?? journalFailure(data);
    if (failure) throw failure;
    return parseEntry(data);
  }
}
