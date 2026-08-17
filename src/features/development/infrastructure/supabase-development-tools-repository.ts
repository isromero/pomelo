import {
  DevelopmentToolsError,
  type DevelopmentMoment,
  type DevelopmentMomentFormat,
  type DevelopmentToolsRepository,
} from '@/features/development/application/development-tools';
import type { PomeloSupabaseClient } from '@/lib/supabase';

type JsonObject = Record<string, unknown>;

const formats = new Set<DevelopmentMomentFormat>(['question', 'photo', 'doodle']);

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function applicationError(value: unknown) {
  if (!isObject(value)) {
    return null;
  }
  const error = stringValue(value.error);
  switch (error) {
    case 'first_moment_required':
      return new DevelopmentToolsError('firstMomentRequired');
    case 'moment_in_progress':
      return new DevelopmentToolsError('momentInProgress');
    case 'pair_not_active':
    case 'pair_not_ready':
      return new DevelopmentToolsError('notAllowed');
    default:
      return error ? new DevelopmentToolsError('unexpected') : null;
  }
}

async function functionError(error: unknown) {
  const candidate = error as {
    context?: { json?: () => Promise<unknown> };
    name?: string;
  };
  if (candidate.name !== 'FunctionsHttpError' || typeof candidate.context?.json !== 'function') {
    return null;
  }
  try {
    return applicationError(await candidate.context.json());
  } catch {
    return null;
  }
}

export class SupabaseDevelopmentToolsRepository implements DevelopmentToolsRepository {
  constructor(private readonly client: PomeloSupabaseClient) {}

  async advanceDay() {
    const { data, error } = await this.client.functions.invoke('development-tools', {
      body: { action: 'advance-day' },
    });
    if (error) {
      const knownError = await functionError(error);
      if (knownError) {
        throw knownError;
      }
      throw new DevelopmentToolsError('network');
    }
    const knownError = applicationError(data);
    if (knownError) {
      throw knownError;
    }
    if (!isObject(data)) {
      throw new DevelopmentToolsError('unexpected');
    }
    const format = stringValue(data.format) as DevelopmentMomentFormat | null;
    const localDate = stringValue(data.localDate);
    const promptKey = stringValue(data.promptKey);
    if (!format || !formats.has(format) || !localDate || !promptKey) {
      throw new DevelopmentToolsError('unexpected');
    }
    return { format, localDate, promptKey } satisfies DevelopmentMoment;
  }
}
