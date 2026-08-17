import {
  PomProgressController,
  PomProgressError,
  type PomProgressRepository,
} from '@/features/pom/application/progress-controller';
import { createPomProgress, type PomProgress } from '@/features/pom/domain/progress';

const initialProgress = createPomProgress('pair-1', 2);

class FakePomProgressRepository implements PomProgressRepository {
  progress: PomProgress = initialProgress;
  listener: (() => void) | null = null;
  selectCalls: (string | null)[] = [];
  failure: PomProgressError | null = null;

  async getProgress() {
    if (this.failure) {
      throw this.failure;
    }
    return this.progress;
  }

  async setAccessory(accessory: 'ribbon' | 'sunhat' | 'scarf' | 'crown' | null) {
    this.selectCalls.push(accessory);
    if (this.failure) {
      throw this.failure;
    }
    this.progress = { ...this.progress, equippedAccessory: accessory };
    return this.progress;
  }

  subscribe(listener: () => void) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }
}

describe('PomProgressController', () => {
  it('loads pair Progress through the repository boundary', async () => {
    const repository = new FakePomProgressRepository();
    const controller = new PomProgressController(repository);

    await controller.start();

    expect(controller.getSnapshot()).toMatchObject({
      error: null,
      progress: initialProgress,
      status: 'ready',
    });
  });

  it('synchronizes the latest valid wardrobe selection for the Pair', async () => {
    const repository = new FakePomProgressRepository();
    const controller = new PomProgressController(repository);
    await controller.start();

    await controller.setAccessory('ribbon');
    expect(repository.selectCalls).toEqual(['ribbon']);
    expect(controller.getSnapshot().progress?.equippedAccessory).toBe('ribbon');

    await controller.setAccessory(null);
    expect(controller.getSnapshot().progress?.equippedAccessory).toBeNull();
  });

  it('keeps the last valid selection visible when the server rejects a change', async () => {
    const repository = new FakePomProgressRepository();
    const controller = new PomProgressController(repository);
    await controller.start();
    repository.progress = { ...createPomProgress('pair-1', 7), equippedAccessory: 'ribbon' };
    await controller.refresh();
    repository.failure = new PomProgressError('notAllowed');

    await controller.setAccessory('sunhat');

    expect(controller.getSnapshot()).toMatchObject({
      error: 'notAllowed',
      progress: expect.objectContaining({ equippedAccessory: 'ribbon' }),
    });
  });
});
