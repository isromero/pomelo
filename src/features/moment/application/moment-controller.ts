import {
  validateQuestionResponse,
  type DailyMoment,
  type Memory,
  type QuestionResponse,
} from '@/features/moment/domain/moment';

export type MomentErrorCode =
  | 'alreadySubmitted'
  | 'configuration'
  | 'draftStorage'
  | 'invalidFormat'
  | 'invalidResponse'
  | 'momentClosed'
  | 'momentNotFound'
  | 'momentNotReady'
  | 'network'
  | 'notAllowed'
  | 'pairNotActive'
  | 'pairNotReady'
  | 'premiumRequired'
  | 'promptUnavailable'
  | 'unexpected';

export class MomentError extends Error {
  constructor(public readonly code: MomentErrorCode) {
    super(code);
  }
}

export interface MomentRepository {
  getDailyMoment(): Promise<DailyMoment>;
  getHistory(): Promise<Memory[]>;
  revealMoment(momentId: string): Promise<DailyMoment>;
  submitQuestion(momentId: string, response: QuestionResponse): Promise<DailyMoment>;
  subscribe(listener: () => void): () => void;
}

export interface MomentDraftStore {
  get(momentId: string): Promise<QuestionResponse | null>;
  remove(momentId: string): Promise<void>;
  save(momentId: string, response: QuestionResponse): Promise<void>;
}

type MomentControllerStatus = 'error' | 'idle' | 'loading' | 'ready';

export type MomentSnapshot = {
  busy: boolean;
  draft: QuestionResponse | null;
  error: MomentErrorCode | null;
  history: Memory[];
  moment: DailyMoment | null;
  syncPending: boolean;
  status: MomentControllerStatus;
};

const emptyDraftStore: MomentDraftStore = {
  get: async () => null,
  remove: async () => {},
  save: async () => {},
};

const initialSnapshot: MomentSnapshot = {
  busy: false,
  draft: null,
  error: null,
  history: [],
  moment: null,
  syncPending: false,
  status: 'idle',
};

function errorCode(error: unknown): MomentErrorCode {
  return error instanceof MomentError ? error.code : 'unexpected';
}

export class MomentController {
  private listeners = new Set<() => void>();
  private operation = 0;
  private refreshRequest = 0;
  private snapshot = initialSnapshot;
  private unsubscribeRepository: (() => void) | null = null;

  constructor(
    private readonly repository: MomentRepository,
    private readonly draftStore: MomentDraftStore = emptyDraftStore,
  ) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async start() {
    this.operation += 1;
    this.unsubscribeRepository?.();
    this.update({ busy: false, error: null, status: 'loading' });
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

  clearMessages() {
    this.update({ error: null });
  }

  async refresh() {
    const operation = this.operation;
    const request = ++this.refreshRequest;
    const recovering = this.snapshot.status === 'error';
    if (recovering) {
      this.update({ error: null, status: 'loading' });
    }

    const [momentResult, historyResult] = await Promise.allSettled([
      this.repository.getDailyMoment(),
      this.repository.getHistory(),
    ]);
    if (operation !== this.operation || request !== this.refreshRequest) {
      return;
    }

    if (historyResult.status === 'rejected') {
      this.update({
        error: errorCode(historyResult.reason),
        status: recovering || this.snapshot.status === 'loading' ? 'error' : 'ready',
      });
      return;
    }

    if (momentResult.status === 'fulfilled') {
      const draft = momentResult.value.ownContribution
        ? null
        : await this.readDraft(momentResult.value.id);
      if (momentResult.value.ownContribution) {
        void this.removePersistedDraft(momentResult.value.id);
      }
      this.update({
        draft,
        error: null,
        history: historyResult.value,
        moment: momentResult.value,
        syncPending: draft !== null,
        status: 'ready',
      });
      return;
    }

    const dailyError = errorCode(momentResult.reason);
    if (dailyError === 'premiumRequired' || dailyError === 'pairNotActive') {
      this.update({
        draft: null,
        error: dailyError,
        history: historyResult.value,
        moment: null,
        syncPending: false,
        status: 'ready',
      });
      return;
    }

    this.update({
      error: dailyError,
      history: historyResult.value,
      status: recovering || this.snapshot.status === 'loading' ? 'error' : 'ready',
    });
  }

  async submitQuestion(response: QuestionResponse) {
    const moment = this.snapshot.moment;
    if (!moment) {
      this.update({ error: 'momentNotFound' });
      return;
    }

    const validationError = validateQuestionResponse(moment.prompt, response);
    if (validationError) {
      this.update({ error: 'invalidResponse' });
      return;
    }

    const persisted = await this.persistDraft(moment.id, response);
    if (!persisted) {
      this.update({ draft: response, error: 'draftStorage', syncPending: false });
      return;
    }
    this.update({ draft: response, syncPending: true });
    await this.runMomentOperation(async () => {
      const submitted = await this.repository.submitQuestion(moment.id, response);
      await this.removePersistedDraft(moment.id);
      this.update({ draft: null, syncPending: false });
      return submitted;
    });
  }

  async saveDraft(response: QuestionResponse) {
    const moment = this.snapshot.moment;
    if (!moment || moment.ownContribution || moment.status === 'expired_incomplete') {
      return;
    }
    const hasContent = Boolean(response.choice?.trim() || response.text?.trim());
    if (!hasContent) {
      await this.removePersistedDraft(moment.id);
      this.update({ draft: null, syncPending: false });
      return;
    }
    const persisted = await this.persistDraft(moment.id, response);
    this.update({
      draft: response,
      error: persisted ? null : 'draftStorage',
      syncPending: persisted,
    });
  }

  async revealMoment() {
    const moment = this.snapshot.moment;
    if (!moment) {
      this.update({ error: 'momentNotFound' });
      return;
    }
    await this.runMomentOperation(async () => {
      const revealed = await this.repository.revealMoment(moment.id);
      const history = await this.repository.getHistory();
      this.update({ history, moment: revealed });
      return revealed;
    });
  }

  private async runMomentOperation(operation: () => Promise<DailyMoment>) {
    const operationId = ++this.operation;
    this.update({ busy: true, error: null });
    try {
      const moment = await operation();
      if (operationId === this.operation) {
        this.update({ busy: false, error: null, moment, status: 'ready' });
      }
    } catch (error) {
      if (operationId === this.operation) {
        this.update({ busy: false, error: errorCode(error), status: 'ready' });
      }
    }
  }

  private async readDraft(momentId: string) {
    try {
      return await this.draftStore.get(momentId);
    } catch {
      return null;
    }
  }

  private async persistDraft(momentId: string, response: QuestionResponse) {
    try {
      await this.draftStore.save(momentId, response);
      return true;
    } catch {
      return false;
    }
  }

  private async removePersistedDraft(momentId: string) {
    try {
      await this.draftStore.remove(momentId);
    } catch {
      return;
    }
  }

  private update(patch: Partial<MomentSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
