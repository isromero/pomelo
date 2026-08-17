import {
  validatePhotoDraft,
  validateQuestionResponse,
  type DailyMoment,
  type Memory,
  type PhotoDraft,
  type QuestionPrompt,
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
  | 'photoIncomplete'
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
  submitPhoto?(momentId: string, draft: PhotoDraft, submissionKey: string): Promise<DailyMoment>;
  setMemoryWidgetVisibility?(memoryId: string, enabled: boolean): Promise<boolean>;
  createPrivateMediaUrl?(path: string): Promise<string>;
  subscribe(listener: () => void): () => void;
}

export interface MomentDraftStore {
  get(momentId: string): Promise<QuestionResponse | null>;
  remove(momentId: string): Promise<void>;
  save(momentId: string, response: QuestionResponse): Promise<void>;
}

export interface PhotoDraftStore {
  get(momentId: string): Promise<PhotoDraft | null>;
  remove(momentId: string): Promise<void>;
  save(momentId: string, draft: PhotoDraft): Promise<PhotoDraft>;
}

type MomentControllerStatus = 'error' | 'idle' | 'loading' | 'ready';

export type MomentSnapshot = {
  busy: boolean;
  draft: QuestionResponse | null;
  error: MomentErrorCode | null;
  history: Memory[];
  moment: DailyMoment | null;
  photoDraft: PhotoDraft | null;
  syncPending: boolean;
  status: MomentControllerStatus;
};

const emptyDraftStore: MomentDraftStore = {
  get: async () => null,
  remove: async () => {},
  save: async () => {},
};

const emptyPhotoDraftStore: PhotoDraftStore = {
  get: async () => null,
  remove: async () => {},
  save: async (_momentId, draft) => draft,
};

const initialSnapshot: MomentSnapshot = {
  busy: false,
  draft: null,
  error: null,
  history: [],
  moment: null,
  photoDraft: null,
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
  private photoSubmissionKeys = new Map<string, string>();
  private unsubscribeRepository: (() => void) | null = null;

  constructor(
    private readonly repository: MomentRepository,
    private readonly draftStore: MomentDraftStore = emptyDraftStore,
    private readonly photoDraftStore: PhotoDraftStore = emptyPhotoDraftStore,
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
    this.photoSubmissionKeys.clear();
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
      const draft = momentResult.value.ownContribution || momentResult.value.format !== 'question'
        ? null
        : await this.readDraft(momentResult.value.id);
      const photoDraft = momentResult.value.ownContribution || momentResult.value.format !== 'photo'
        ? null
        : await this.readPhotoDraft(momentResult.value.id);
      if (momentResult.value.ownContribution) {
        void this.removePersistedDraft(momentResult.value.id);
        void this.removePersistedPhotoDraft(momentResult.value.id);
      }
      this.update({
        draft,
        error: null,
        history: historyResult.value,
        moment: momentResult.value,
        photoDraft,
        syncPending: draft !== null || photoDraft !== null,
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
        photoDraft: null,
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

    if (moment.format !== 'question') {
      this.update({ error: 'invalidFormat' });
      return;
    }
    const validationError = validateQuestionResponse(moment.prompt as QuestionPrompt, response);
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

  async savePhotoDraft(photoDraft: PhotoDraft) {
    const moment = this.snapshot.moment;
    if (!moment || moment.format !== 'photo' || moment.ownContribution || moment.status === 'expired_incomplete') {
      return;
    }
    const hasCapture = Boolean(photoDraft.rear || photoDraft.front);
    if (!hasCapture) {
      await this.removePersistedPhotoDraft(moment.id);
      this.update({ error: null, photoDraft: null, syncPending: false });
      return;
    }
    const persisted = await this.persistPhotoDraft(moment.id, photoDraft);
    this.update({
      error: persisted ? null : 'draftStorage',
      photoDraft: persisted ?? photoDraft,
      syncPending: persisted !== null,
    });
  }

  async submitPhoto() {
    const moment = this.snapshot.moment;
    const photoDraft = this.snapshot.photoDraft;
    if (!moment) {
      this.update({ error: 'momentNotFound' });
      return;
    }
    const validationError = validatePhotoDraft(photoDraft);
    if (moment.format !== 'photo' || !photoDraft || validationError) {
      this.update({ error: 'photoIncomplete' });
      return;
    }
    const persisted = await this.persistPhotoDraft(moment.id, photoDraft);
    if (!persisted) {
      this.update({ error: 'draftStorage', photoDraft, syncPending: false });
      return;
    }
    const submissionKey = this.photoSubmissionKeys.get(moment.id) ?? createClientId();
    this.photoSubmissionKeys.set(moment.id, submissionKey);
    this.update({ error: null, photoDraft: persisted, syncPending: true });
    await this.runMomentOperation(async () => {
      if (!this.repository.submitPhoto) {
        throw new MomentError('configuration');
      }
      const submitted = await this.repository.submitPhoto(moment.id, persisted, submissionKey);
      this.photoSubmissionKeys.delete(moment.id);
      await this.removePersistedPhotoDraft(moment.id);
      this.update({ photoDraft: null, syncPending: false });
      return submitted;
    });
  }

  async revealMoment() {
    const moment = this.snapshot.moment;
    if (!moment) {
      this.update({ error: 'momentNotFound' });
      return;
    }
    await this.runMomentOperation(async () => {
      await this.repository.revealMoment(moment.id);
      await this.refresh();
      return this.snapshot.moment ?? moment;
    });
  }

  acceptExternalMoment(moment: DailyMoment) {
    this.update({ error: null, moment, status: 'ready' });
  }

  async setMemoryWidgetVisibility(memoryId: string, enabled: boolean) {
    if (!this.repository.setMemoryWidgetVisibility) {
      this.update({ error: 'configuration' });
      return;
    }
    try {
      const value = await this.repository.setMemoryWidgetVisibility(memoryId, enabled);
      this.update({
        error: null,
        history: this.snapshot.history.map((memory) =>
          memory.id === memoryId ? { ...memory, widgetVisualEnabled: value } : memory,
        ),
      });
    } catch (error) {
      this.update({ error: errorCode(error) });
    }
  }

  async createPrivateMediaUrl(path: string) {
    if (!this.repository.createPrivateMediaUrl) {
      throw new MomentError('configuration');
    }
    return this.repository.createPrivateMediaUrl(path);
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

  private async readPhotoDraft(momentId: string) {
    try {
      return await this.photoDraftStore.get(momentId);
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

  private async persistPhotoDraft(momentId: string, photoDraft: PhotoDraft) {
    try {
      return await this.photoDraftStore.save(momentId, photoDraft);
    } catch {
      return null;
    }
  }

  private async removePersistedPhotoDraft(momentId: string) {
    try {
      await this.photoDraftStore.remove(momentId);
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

function createClientId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
