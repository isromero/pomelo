import {
  selectAccessory,
  type AccessoryId,
  type PomProgress,
} from '@/features/pom/domain/progress';

export type PomProgressErrorCode =
  | 'accessoryLocked'
  | 'configuration'
  | 'network'
  | 'notAllowed'
  | 'unexpected';

export class PomProgressError extends Error {
  constructor(public readonly code: PomProgressErrorCode) {
    super(code);
  }
}

export interface PomProgressRepository {
  getProgress(): Promise<PomProgress>;
  setAccessory(accessory: AccessoryId | null): Promise<PomProgress>;
  subscribe(listener: () => void): () => void;
}

type PomProgressStatus = 'error' | 'idle' | 'loading' | 'ready';

export type PomProgressSnapshot = {
  busy: boolean;
  error: PomProgressErrorCode | null;
  progress: PomProgress | null;
  status: PomProgressStatus;
};

const initialSnapshot: PomProgressSnapshot = {
  busy: false,
  error: null,
  progress: null,
  status: 'idle',
};

function errorCode(error: unknown): PomProgressErrorCode {
  return error instanceof PomProgressError ? error.code : 'unexpected';
}

export class PomProgressController {
  private listeners = new Set<() => void>();
  private operation = 0;
  private refreshRequest = 0;
  private snapshot = initialSnapshot;
  private unsubscribeRepository: (() => void) | null = null;

  constructor(private readonly repository: PomProgressRepository) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async start() {
    this.operation += 1;
    this.unsubscribeRepository?.();
    this.update({ error: null, status: 'loading' });
    this.unsubscribeRepository = this.repository.subscribe(() => {
      void this.refresh();
    });
    await this.refresh();
  }

  stop() {
    this.operation += 1;
    this.unsubscribeRepository?.();
    this.unsubscribeRepository = null;
    this.snapshot = initialSnapshot;
    this.emit();
  }

  async refresh() {
    const operation = this.operation;
    const request = ++this.refreshRequest;
    const recovering = this.snapshot.status === 'error';
    if (recovering) {
      this.update({ error: null, status: 'loading' });
    }
    try {
      const progress = await this.repository.getProgress();
      if (operation !== this.operation || request !== this.refreshRequest) {
        return;
      }
      this.update({ busy: false, error: null, progress, status: 'ready' });
    } catch (error) {
      if (operation === this.operation && request === this.refreshRequest) {
        this.update({
          error: errorCode(error),
          status: recovering || this.snapshot.status === 'loading' ? 'error' : 'ready',
        });
      }
    }
  }

  async setAccessory(accessory: AccessoryId | null) {
    const progress = this.snapshot.progress;
    if (!progress) {
      this.update({ error: 'configuration' });
      return;
    }
    try {
      selectAccessory(progress, accessory);
    } catch {
      this.update({ error: 'accessoryLocked' });
      return;
    }
    const operation = ++this.operation;
    this.update({ busy: true, error: null });
    try {
      const nextProgress = await this.repository.setAccessory(accessory);
      if (operation === this.operation) {
        this.update({ busy: false, error: null, progress: nextProgress, status: 'ready' });
      }
    } catch (error) {
      if (operation === this.operation) {
        this.update({ busy: false, error: errorCode(error), status: 'ready' });
      }
    }
  }

  clearMessages() {
    this.update({ error: null });
  }

  private update(patch: Partial<PomProgressSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
