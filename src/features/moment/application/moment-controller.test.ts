import {
  MomentController,
  MomentError,
  type MomentDraftStore,
  type MomentRepository,
} from '@/features/moment/application/moment-controller';
import type {
  DailyMoment,
  Memory,
} from '@/features/moment/domain/moment';

const prompt = {
  conceptKey: 'small_gesture_smile',
  options: [],
  responseType: 'text' as const,
  text: 'What made you smile?',
};

const partner = {
  avatarKey: 'affectionate' as const,
  contribution: null,
  displayName: 'Lucia',
  submitted: false,
  userId: 'user-2',
};

const streak = {
  best: 0,
  current: 0,
  lastCompletedLocalDate: null,
  recoveryAvailable: true,
  recoveryLimit: 1,
  recoveryUsed: 0,
};

const openMoment: DailyMoment = {
  format: 'question',
  id: 'moment-1',
  isFree: true,
  lifecycle: {
    normalExpiresAt: '2026-08-17T00:00:00.000Z',
    recoveryExpiresAt: '2026-08-18T00:00:00.000Z',
    window: 'normal',
  },
  localDate: '2026-08-16',
  memoryId: null,
  ownContribution: null,
  pairId: 'pair-1',
  partner,
  pomState: null,
  prompt,
  streak,
  status: 'open',
};

const savedMoment: DailyMoment = {
  ...openMoment,
  lifecycle: { ...openMoment.lifecycle, window: 'complete' },
  ownContribution: {
    id: 'contribution-1',
    responseChoice: null,
    responseText: 'A small kindness.',
    submittedAt: '2026-08-16T10:00:00.000Z',
    userId: 'user-1',
  },
  partner: { ...partner, submitted: true },
  streak: { ...streak, best: 1, current: 1, lastCompletedLocalDate: '2026-08-16' },
  status: 'ready',
};

const memory: Memory = {
  id: 'memory-1',
  localDate: openMoment.localDate,
  momentId: openMoment.id,
  ownContribution: savedMoment.ownContribution!,
  pairId: openMoment.pairId,
  partner: {
    ...partner,
    contribution: {
      id: 'contribution-2',
      responseChoice: null,
      responseText: 'Dinner together.',
      submittedAt: '2026-08-16T10:01:00.000Z',
      userId: 'user-2',
    },
    submitted: true,
  },
  pomState: 'celebrating',
  prompt,
  revealedAt: '2026-08-16T10:02:00.000Z',
};

class FakeMomentRepository implements MomentRepository {
  listener: (() => void) | null = null;
  moment = openMoment;
  history: Memory[] = [];
  submitCalls = 0;
  revealCalls = 0;
  revealError: MomentError | null = null;
  dailyError: MomentError | null = null;
  submitError: MomentError | null = null;
  nextMoment: DailyMoment | null = null;

  subscribe(listener: () => void) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  async getDailyMoment() {
    if (this.dailyError) {
      throw this.dailyError;
    }
    return this.nextMoment ?? this.moment;
  }

  async getHistory() {
    return this.history;
  }

  async submitQuestion() {
    this.submitCalls += 1;
    if (this.submitError) {
      throw this.submitError;
    }
    this.moment = savedMoment;
    return this.moment;
  }

  async revealMoment() {
    this.revealCalls += 1;
    if (this.revealError) {
      throw this.revealError;
    }
    this.moment = {
      ...savedMoment,
      memoryId: memory.id,
      partner: memory.partner,
      pomState: memory.pomState,
      status: 'revealed',
    };
    this.history = [memory];
    return this.moment;
  }
}

class FakeDraftStore implements MomentDraftStore {
  draft: { text?: string; choice?: string } | null = null;
  saveError: Error | null = null;

  async get() {
    return this.draft;
  }

  async remove() {
    this.draft = null;
  }

  async save(_momentId: string, response: { text?: string; choice?: string }) {
    if (this.saveError) {
      throw this.saveError;
    }
    this.draft = response;
  }
}

describe('MomentController', () => {
  it('loads the daily Moment and History through the repository boundary', async () => {
    const repository = new FakeMomentRepository();
    const controller = new MomentController(repository);

    await controller.start();

    expect(controller.getSnapshot()).toMatchObject({
      error: null,
      history: [],
      moment: openMoment,
      status: 'ready',
    });
  });

  it('validates a response before sending it to persistence', async () => {
    const repository = new FakeMomentRepository();
    const controller = new MomentController(repository);
    await controller.start();

    await controller.submitQuestion({ text: '   ' });

    expect(repository.submitCalls).toBe(0);
    expect(controller.getSnapshot().error).toBe('invalidResponse');
  });

  it('shows a saved Contribution and keeps the server lifecycle authoritative', async () => {
    const repository = new FakeMomentRepository();
    const controller = new MomentController(repository);
    await controller.start();

    await controller.submitQuestion({ text: 'A small kindness.' });

    expect(repository.submitCalls).toBe(1);
    expect(controller.getSnapshot()).toMatchObject({
      error: null,
      moment: savedMoment,
      status: 'ready',
    });
  });

  it('refreshes History after an idempotent Reveal result', async () => {
    const repository = new FakeMomentRepository();
    const controller = new MomentController(repository);
    await controller.start();
    repository.moment = savedMoment;
    await controller.refresh();

    await controller.revealMoment();

    expect(repository.revealCalls).toBe(1);
    expect(controller.getSnapshot()).toMatchObject({
      error: null,
      history: [memory],
      moment: expect.objectContaining({ memoryId: 'memory-1', status: 'revealed' }),
    });
  });

  it('shows the next Moment after Reveal when one has already been advanced', async () => {
    const repository = new FakeMomentRepository();
    const controller = new MomentController(repository);
    await controller.start();
    repository.moment = savedMoment;
    await controller.refresh();
    repository.nextMoment = {
      ...openMoment,
      id: 'moment-2',
      localDate: '2026-08-17',
    };

    await controller.revealMoment();

    expect(controller.getSnapshot()).toMatchObject({
      error: null,
      moment: expect.objectContaining({ id: 'moment-2', status: 'open' }),
      status: 'ready',
    });
  });

  it('keeps a failed Reveal retryable without discarding the current Moment', async () => {
    const repository = new FakeMomentRepository();
    repository.moment = savedMoment;
    repository.revealError = new MomentError('momentNotReady');
    const controller = new MomentController(repository);
    await controller.start();

    await controller.revealMoment();

    expect(controller.getSnapshot()).toMatchObject({
      error: 'momentNotReady',
      moment: savedMoment,
      status: 'ready',
    });
  });

  it('refreshes after a repository change without exposing a second data path', async () => {
    const repository = new FakeMomentRepository();
    const controller = new MomentController(repository);
    await controller.start();
    repository.moment = savedMoment;
    repository.listener?.();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(controller.getSnapshot().moment).toEqual(savedMoment);
  });

  it('keeps History readable when the next Moment requires Premium', async () => {
    const repository = new FakeMomentRepository();
    repository.history = [memory];
    repository.dailyError = new MomentError('premiumRequired');
    const controller = new MomentController(repository);

    await controller.start();

    expect(controller.getSnapshot()).toMatchObject({
      error: 'premiumRequired',
      history: [memory],
      moment: null,
      status: 'ready',
    });
  });

  it('restores a private draft and marks it as needing synchronization', async () => {
    const repository = new FakeMomentRepository();
    const draftStore = new FakeDraftStore();
    draftStore.draft = { text: 'Saved before the train tunnel.' };
    const controller = new MomentController(repository, draftStore);

    await controller.start();

    expect(controller.getSnapshot()).toMatchObject({
      draft: { text: 'Saved before the train tunnel.' },
      syncPending: true,
    });
  });

  it('keeps a failed submission retryable without changing the saved response', async () => {
    const repository = new FakeMomentRepository();
    repository.submitError = new MomentError('network');
    const draftStore = new FakeDraftStore();
    const controller = new MomentController(repository, draftStore);
    await controller.start();

    await controller.submitQuestion({ text: 'A response that must not be lost.' });

    expect(repository.submitCalls).toBe(1);
    expect(controller.getSnapshot()).toMatchObject({
      draft: { text: 'A response that must not be lost.' },
      error: 'network',
      syncPending: true,
    });

    repository.submitError = null;
    await controller.submitQuestion({ text: 'A response that must not be lost.' });

    expect(repository.submitCalls).toBe(2);
    expect(controller.getSnapshot()).toMatchObject({
      draft: null,
      error: null,
      moment: savedMoment,
      syncPending: false,
    });
  });

  it('does not send a response when its private draft cannot be persisted', async () => {
    const repository = new FakeMomentRepository();
    const draftStore = new FakeDraftStore();
    draftStore.saveError = new Error('storage unavailable');
    const controller = new MomentController(repository, draftStore);
    await controller.start();

    await controller.submitQuestion({ text: 'Keep this answer private.' });

    expect(repository.submitCalls).toBe(0);
    expect(controller.getSnapshot()).toMatchObject({
      draft: { text: 'Keep this answer private.' },
      error: 'draftStorage',
      syncPending: false,
    });
  });
});
