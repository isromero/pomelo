import {
  MomentController,
  MomentError,
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

const openMoment: DailyMoment = {
  format: 'question',
  id: 'moment-1',
  isFree: true,
  localDate: '2026-08-16',
  memoryId: null,
  ownContribution: null,
  pairId: 'pair-1',
  partner,
  pomState: null,
  prompt,
  status: 'open',
};

const savedMoment: DailyMoment = {
  ...openMoment,
  ownContribution: {
    id: 'contribution-1',
    responseChoice: null,
    responseText: 'A small kindness.',
    submittedAt: '2026-08-16T10:00:00.000Z',
    userId: 'user-1',
  },
  partner: { ...partner, submitted: true },
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
    return this.moment;
  }

  async getHistory() {
    return this.history;
  }

  async submitQuestion() {
    this.submitCalls += 1;
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
});
