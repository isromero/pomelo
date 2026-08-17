import {
  normalizeThreadMessage,
  validateThreadMessage,
  type ThreadMessage,
  type ThreadState,
} from '@/features/moment/domain/thread';

export type ThreadErrorCode =
  | 'archiveReadOnly'
  | 'configuration'
  | 'empty'
  | 'memoryNotFound'
  | 'network'
  | 'notAllowed'
  | 'tooLong'
  | 'unexpected';

export class ThreadError extends Error {
  constructor(public readonly code: ThreadErrorCode) {
    super(code);
  }
}

export interface ThreadRepository {
  getThread(targetId: string): Promise<ThreadState>;
  sendThreadMessage(targetId: string, body: string, clientMessageId: string): Promise<ThreadMessage>;
  subscribeToThread(targetId: string, listener: () => void): () => void;
}

export type ThreadControllerStatus = 'error' | 'idle' | 'loading' | 'ready';

export type PendingThreadMessage = {
  body: string;
  clientMessageId: string;
};

export type ThreadSnapshot = {
  busy: boolean;
  canWrite: boolean;
  error: ThreadErrorCode | null;
  targetId: string | null;
  messages: ThreadMessage[];
  pending: PendingThreadMessage | null;
  status: ThreadControllerStatus;
};

const initialSnapshot: ThreadSnapshot = {
  busy: false,
  canWrite: false,
  error: null,
  targetId: null,
  messages: [],
  pending: null,
  status: 'idle',
};

function errorCode(error: unknown): ThreadErrorCode {
  if (error instanceof ThreadError) {
    return error.code;
  }
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('network') || message.includes('fetch') ? 'network' : 'unexpected';
}

function createClientMessageId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `thread-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class ThreadController {
  private listeners = new Set<() => void>();
  private operation = 0;
  private snapshot = initialSnapshot;
  private unsubscribeRepository: (() => void) | null = null;

  constructor(private readonly repository: ThreadRepository) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  open(targetId: string) {
    if (this.snapshot.targetId === targetId && this.snapshot.status !== 'idle') {
      return;
    }
    this.operation += 1;
    this.unsubscribeRepository?.();
    this.snapshot = {
      ...initialSnapshot,
      targetId,
      status: 'loading',
    };
    this.emit();
    this.unsubscribeRepository = this.repository.subscribeToThread(targetId, () => {
      void this.refresh(targetId);
    });
    void this.refresh(targetId);
  }

  close() {
    this.operation += 1;
    this.unsubscribeRepository?.();
    this.unsubscribeRepository = null;
    this.snapshot = initialSnapshot;
    this.emit();
  }

  async refresh(targetId = this.snapshot.targetId) {
    if (!targetId) {
      return;
    }
    const operation = this.operation;
    try {
      const thread = await this.repository.getThread(targetId);
      if (operation !== this.operation || this.snapshot.targetId !== targetId) {
        return;
      }
      this.update({
        canWrite: thread.canWrite,
        error: null,
        messages: thread.messages,
        status: 'ready',
      });
    } catch (error) {
      if (operation === this.operation && this.snapshot.targetId === targetId) {
        this.update({ error: errorCode(error), status: 'error' });
      }
    }
  }

  async send(body: string) {
    const targetId = this.snapshot.targetId;
    if (!targetId) {
      this.update({ error: 'memoryNotFound' });
      return;
    }
    const validationError = validateThreadMessage(body);
    if (validationError) {
      this.update({ error: validationError });
      return;
    }
    if (!this.snapshot.canWrite) {
      this.update({ error: 'archiveReadOnly' });
      return;
    }
    const pending = this.snapshot.pending ?? {
      body: normalizeThreadMessage(body),
      clientMessageId: createClientMessageId(),
    };
    const operation = this.operation;
    this.update({ busy: true, error: null, pending });
    try {
      const message = await this.repository.sendThreadMessage(
        targetId,
        pending.body,
        pending.clientMessageId,
      );
      if (operation !== this.operation || this.snapshot.targetId !== targetId) {
        return;
      }
      const messages = this.snapshot.messages.some((item) => item.id === message.id)
        ? this.snapshot.messages
        : [...this.snapshot.messages, message];
      this.update({ busy: false, error: null, messages, pending: null });
    } catch (error) {
      if (operation === this.operation && this.snapshot.targetId === targetId) {
        this.update({ busy: false, error: errorCode(error), pending });
      }
    }
  }

  clearError() {
    this.update({ error: null });
  }

  private update(patch: Partial<ThreadSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
