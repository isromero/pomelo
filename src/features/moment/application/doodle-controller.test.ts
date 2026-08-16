import {
  DoodleController,
  type DoodleRealtimeEvent,
  type DoodleRepository,
} from '@/features/moment/application/doodle-controller';
import {
  emptyDoodleDocument,
  mergeDoodleDocuments,
  type DailyMoment,
  type DoodleDocument,
} from '@/features/moment/domain/moment';

const moment: DailyMoment = {
  format: 'doodle',
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
  partner: {
    avatarKey: 'affectionate',
    contribution: null,
    displayName: 'Lucia',
    submitted: false,
    userId: 'user-2',
  },
  pomState: null,
  prompt: { conceptKey: 'doodle_today_together', text: 'Draw something.' },
  doodle: {
    document: emptyDoodleDocument(),
    ownCompleted: false,
    partnerCompleted: false,
  },
  streak: {
    best: 0,
    current: 0,
    lastCompletedLocalDate: null,
    recoveryAvailable: true,
    recoveryLimit: 1,
    recoveryUsed: 0,
  },
  status: 'open',
};

class FakeDoodleRepository implements DoodleRepository {
  listener: ((event: DoodleRealtimeEvent) => void) | null = null;
  document: DoodleDocument = emptyDoodleDocument();
  saveCalls: { document: DoodleDocument; operationId: string }[] = [];
  failNextSave = false;
  completeCalls = 0;

  async getDoodleSession() {
    return {
      document: this.document,
      ownCompleted: false,
      partnerCompleted: false,
      userId: 'user-1',
    };
  }

  async saveDoodleSnapshot(
    _momentId: string,
    document: DoodleDocument,
    operationId: string,
  ) {
    this.saveCalls.push({ document, operationId });
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error('network');
    }
    this.document = {
      ...mergeDoodleDocuments(this.document, document),
      version: this.document.version + 1,
    };
    return this.document;
  }

  async completeDoodle() {
    this.completeCalls += 1;
    return {
      ...moment,
      status: 'ready' as const,
      doodle: {
        document: this.document,
        ownCompleted: true,
        partnerCompleted: true,
      },
    };
  }

  subscribeToDoodle(_momentId: string, listener: (event: DoodleRealtimeEvent) => void) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }
}

describe('DoodleController', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('batches a gesture into one snapshot write', async () => {
    jest.useFakeTimers();
    const repository = new FakeDoodleRepository();
    const controller = new DoodleController(repository, jest.fn());
    controller.open('moment-1');
    await controller.refresh();

    controller.addStroke({
      color: '#F4714B',
      mode: 'brush',
      points: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
      width: 5,
    });
    controller.addStroke({
      color: '#85CADF',
      mode: 'brush',
      points: [{ x: 3, y: 3 }, { x: 4, y: 4 }],
      width: 3,
    });

    expect(repository.saveCalls).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(250);

    expect(repository.saveCalls).toHaveLength(1);
    expect(repository.saveCalls[0].document.strokes).toHaveLength(2);
  });

  it('merges a partner snapshot and retries a failed flush without losing strokes', async () => {
    const repository = new FakeDoodleRepository();
    const onMomentChanged = jest.fn();
    const controller = new DoodleController(repository, onMomentChanged);
    controller.open('moment-1');
    await controller.refresh();

    controller.addStroke({
      color: '#F4714B',
      mode: 'brush',
      points: [{ x: 1, y: 1 }],
      width: 5,
    });
    const localStroke = controller.getSnapshot().document.strokes[0];
    repository.listener?.({
      document: {
        strokes: [
          {
            color: '#85CADF',
            createdAt: '2026-08-16T10:00:00.000Z',
            id: 'partner-stroke',
            mode: 'brush',
            points: [{ x: 4, y: 4 }],
            userId: 'user-2',
            width: 5,
          },
        ],
        version: 1,
      },
      type: 'snapshot',
    });
    expect(controller.getSnapshot().document.strokes.map((stroke) => stroke.id)).toEqual([
      'partner-stroke',
      localStroke.id,
    ]);

    repository.failNextSave = true;
    await controller.complete();
    expect(repository.completeCalls).toBe(0);
    expect(controller.getSnapshot().syncPending).toBe(true);

    await controller.complete();

    expect(repository.completeCalls).toBe(1);
    expect(onMomentChanged).toHaveBeenCalledWith(expect.objectContaining({ status: 'ready' }));
    expect(repository.saveCalls).toHaveLength(2);
    expect(repository.saveCalls[1].document.strokes).toHaveLength(2);
  });
});
