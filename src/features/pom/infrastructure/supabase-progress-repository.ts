import {
  PomProgressError,
  type PomProgressRepository,
} from '@/features/pom/application/progress-controller';
import {
  createPomProgress,
  type AccessoryId,
  type PomProgress,
} from '@/features/pom/domain/progress';
import type { PomeloSupabaseClient } from '@/lib/supabase';

type JsonObject = Record<string, unknown>;

const accessoryIds = new Set<AccessoryId>(['ribbon', 'sunhat', 'scarf', 'crown']);

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function applicationError(value: unknown) {
  if (!isObject(value) || typeof value.error !== 'string') {
    return null;
  }
  switch (value.error) {
    case 'accessory_locked':
      return new PomProgressError('accessoryLocked');
    case 'not_allowed':
    case 'pair_not_active':
      return new PomProgressError('notAllowed');
    default:
      return new PomProgressError('unexpected');
  }
}

function repositoryError(error: { message?: string } | null) {
  if (!error) {
    return null;
  }
  const message = error.message?.toLowerCase() ?? '';
  return new PomProgressError(
    message.includes('fetch') || message.includes('network') ? 'network' : 'unexpected',
  );
}

function parseProgress(value: unknown): PomProgress {
  const error = applicationError(value);
  if (error) {
    throw error;
  }
  if (!isObject(value)) {
    throw new PomProgressError('unexpected');
  }
  const pairId = stringValue(value.pairId);
  const memoryCount = value.memoryCount;
  const equippedAccessory = value.equippedAccessory;
  if (
    !pairId ||
    typeof memoryCount !== 'number' ||
    !Number.isFinite(memoryCount) ||
    memoryCount < 0 ||
    (equippedAccessory !== null && equippedAccessory !== undefined &&
      (typeof equippedAccessory !== 'string' || !accessoryIds.has(equippedAccessory as AccessoryId)))
  ) {
    throw new PomProgressError('unexpected');
  }
  return createPomProgress(
    pairId,
    memoryCount,
    equippedAccessory === null || equippedAccessory === undefined
      ? null
      : equippedAccessory as AccessoryId,
  );
}

export class SupabasePomProgressRepository implements PomProgressRepository {
  constructor(private readonly client: PomeloSupabaseClient) {}

  async getProgress() {
    const { data, error } = await this.client.rpc('get_pom_progress');
    const failure = repositoryError(error);
    if (failure) {
      throw failure;
    }
    return parseProgress(data);
  }

  async setAccessory(accessory: AccessoryId | null) {
    const { data, error } = await this.client.rpc('set_pom_accessory', {
      target_accessory: accessory ?? undefined,
    });
    const failure = repositoryError(error);
    if (failure) {
      throw failure;
    }
    return parseProgress(data);
  }

  subscribe(listener: () => void) {
    const channel = this.client
      .channel('pom-progress')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pair_progress' },
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
}
