import {
  validateQuestionResponse,
  type DailyMoment,
  type Memory,
  type QuestionResponse,
} from '@/features/moment/domain/moment';

export type MomentErrorCode =
  | 'alreadySubmitted'
  | 'configuration'
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

type MomentControllerStatus = 'error' | 'idle' | 'loading' | 'ready';

export type MomentSnapshot = {
  busy: boolean;
  error: MomentErrorCode | null;
  history: Memory[];
  moment: DailyMoment | null;
  status: MomentControllerStatus;
};

const initialSnapshot: MomentSnapshot = {
  busy: false,
  error: null,
  history: [],
  moment: null,
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

  constructor(private readonly repository: MomentRepository) {}

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
      this.update({
        error: null,
        history: historyResult.value,
        moment: momentResult.value,
        status: 'ready',
      });
      return;
    }

    const dailyError = errorCode(momentResult.reason);
    if (dailyError === 'premiumRequired' || dailyError === 'pairNotActive') {
      this.update({
        error: dailyError,
        history: historyResult.value,
        moment: null,
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

    await this.runMomentOperation(() =>
      this.repository.submitQuestion(moment.id, response),
    );
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

  private update(patch: Partial<MomentSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
