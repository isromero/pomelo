import type {
  DoodleRealtimeEvent,
  DoodleRepository,
  DoodleSession,
} from '@/features/moment/application/doodle-controller';
import { MomentError } from '@/features/moment/application/moment-controller';
import type {
  DailyMoment,
  DoodleDocument,
  DoodleState,
} from '@/features/moment/domain/moment';
import { isDoodleDocument } from '@/features/moment/domain/moment';
import type { PomeloSupabaseClient } from '@/lib/supabase';

type ObjectValue = Record<string, unknown>;

function isObject(value: unknown): value is ObjectValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDocument(value: unknown): DoodleDocument {
  if (!isDoodleDocument(value)) {
    throw new MomentError('unexpected');
  }
  return value;
}

function applicationError(value: unknown) {
  if (!isObject(value) || typeof value.error !== 'string') {
    return null;
  }
  return value.error;
}

export class SupabaseDoodleRepository implements DoodleRepository {
  private channels = new Map<string, ReturnType<PomeloSupabaseClient['channel']>>();

  constructor(
    private readonly client: PomeloSupabaseClient,
    private readonly getDailyMoment: () => Promise<DailyMoment>,
  ) {}

  async getDoodleSession(momentId: string): Promise<DoodleSession> {
    const { data, error } = await this.client.rpc('get_doodle_session', {
      target_moment_id: momentId,
    });
    if (error) {
      throw new MomentError(error.message.toLowerCase().includes('network') ? 'network' : 'unexpected');
    }
    const applicationFailure = applicationError(data);
    if (applicationFailure) {
      throw new MomentError(applicationFailure === 'not_allowed' ? 'notAllowed' : 'unexpected');
    }
    if (!isObject(data)) {
      throw new MomentError('unexpected');
    }
    const state: DoodleState = {
      document: parseDocument(data.document),
      ownCompleted: data.ownCompleted === true,
      partnerCompleted: data.partnerCompleted === true,
    };
    if (typeof data.userId !== 'string') {
      throw new MomentError('unexpected');
    }
    return { ...state, userId: data.userId };
  }

  async saveDoodleSnapshot(momentId: string, document: DoodleDocument, operationId: string) {
    const { data, error } = await this.client.rpc('save_doodle_snapshot', {
      client_operation_id: operationId,
      target_document: document,
      target_moment_id: momentId,
    });
    if (error) {
      throw new MomentError(error.message.toLowerCase().includes('network') ? 'network' : 'unexpected');
    }
    const applicationFailure = applicationError(data);
    if (applicationFailure) {
      throw new MomentError(applicationFailure === 'not_allowed' ? 'notAllowed' : 'unexpected');
    }
    if (!isObject(data)) {
      throw new MomentError('unexpected');
    }
    const savedDocument = parseDocument(data.document);
    const channel = this.channels.get(momentId);
    if (channel) {
      await channel.send({
        event: 'snapshot',
        payload: { document: savedDocument },
        type: 'broadcast',
      });
    }
    return savedDocument;
  }

  async completeDoodle(momentId: string, completionId: string): Promise<DailyMoment> {
    const { data, error } = await this.client.rpc('complete_doodle', {
      client_completion_id: completionId,
      target_moment_id: momentId,
    });
    if (error) {
      throw new MomentError(error.message.toLowerCase().includes('network') ? 'network' : 'unexpected');
    }
    const applicationFailure = applicationError(data);
    if (applicationFailure) {
      throw new MomentError(applicationFailure === 'doodle_not_ready' ? 'momentNotReady' : 'notAllowed');
    }
    return this.getDailyMoment();
  }

  subscribeToDoodle(momentId: string, listener: (event: DoodleRealtimeEvent) => void) {
    const channel = this.client
      .channel(`doodle:${momentId}`)
      .on('broadcast', { event: 'snapshot' }, (payload) => {
        if (isObject(payload.payload) && payload.payload.document) {
          listener({
            document: parseDocument(payload.payload.document),
            type: 'snapshot',
          });
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const presence = channel.presenceState();
        listener({ memberCount: Math.max(1, Object.keys(presence).length), type: 'presence' });
      })
      .subscribe((status) => {
        const connected = status === 'SUBSCRIBED';
        listener({ connected, type: 'connection' });
        if (connected) {
          void channel.track({ joinedAt: new Date().toISOString() });
        }
      });
    this.channels.set(momentId, channel);
    return () => {
      this.channels.delete(momentId);
      void this.client.removeChannel(channel);
    };
  }
}
