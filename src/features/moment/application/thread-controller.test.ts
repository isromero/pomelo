import {
  ThreadController,
  ThreadError,
  type ThreadRepository,
} from '@/features/moment/application/thread-controller';
import type { ThreadMessage, ThreadState } from '@/features/moment/domain/thread';

const firstMessage: ThreadMessage = {
  authorId: 'user-1',
  body: 'The blue door.',
  clientMessageId: 'client-1',
  createdAt: '2026-08-16T10:00:00.000Z',
  id: 'message-1',
};

class FakeThreadRepository implements ThreadRepository {
  listener: (() => void) | null = null;
  state: ThreadState = {
    canWrite: true,
    memoryId: 'memory-1',
    messages: [firstMessage],
  };
  calls: { body: string; clientMessageId: string }[] = [];
  nextError: ThreadError | null = null;

  async getThread() {
    return this.state;
  }

  async sendThreadMessage(_memoryId: string, body: string, clientMessageId: string) {
    this.calls.push({ body, clientMessageId });
    if (this.nextError) {
      const error = this.nextError;
      this.nextError = null;
      throw error;
    }
    const message = {
      ...firstMessage,
      authorId: 'user-2',
      body,
      clientMessageId,
      id: `message-${this.calls.length + 1}`,
    };
    this.state = { ...this.state, messages: [...this.state.messages, message] };
    return message;
  }

  subscribeToThread(_memoryId: string, listener: () => void) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }
}

describe('ThreadController', () => {
  it('loads only the revealed Memory thread through its repository seam', async () => {
    const repository = new FakeThreadRepository();
    const controller = new ThreadController(repository);

    controller.open('memory-1');
    await controller.refresh();

    expect(controller.getSnapshot()).toMatchObject({
      canWrite: true,
      memoryId: 'memory-1',
      messages: [firstMessage],
      status: 'ready',
    });
  });

  it('keeps one client id across a failed send and retries without a duplicate', async () => {
    const repository = new FakeThreadRepository();
    repository.nextError = new ThreadError('network');
    const controller = new ThreadController(repository);
    controller.open('memory-1');
    await controller.refresh();

    await controller.send('  A memory worth keeping.  ');

    expect(repository.calls).toHaveLength(1);
    expect(repository.calls[0].body).toBe('A memory worth keeping.');
    expect(controller.getSnapshot()).toMatchObject({
      error: 'network',
      pending: {
        body: 'A memory worth keeping.',
      },
    });

    await controller.send('A memory worth keeping.');

    expect(repository.calls).toHaveLength(2);
    expect(repository.calls[1].clientMessageId).toBe(repository.calls[0].clientMessageId);
    expect(controller.getSnapshot()).toMatchObject({
      error: null,
      pending: null,
      messages: expect.arrayContaining([
        expect.objectContaining({ body: 'A memory worth keeping.' }),
      ]),
    });
  });

  it('does not write when Archive Mode marks the thread read-only', async () => {
    const repository = new FakeThreadRepository();
    repository.state = { ...repository.state, canWrite: false };
    const controller = new ThreadController(repository);
    controller.open('memory-1');
    await controller.refresh();

    await controller.send('This should stay read-only.');

    expect(repository.calls).toHaveLength(0);
    expect(controller.getSnapshot().error).toBe('archiveReadOnly');
  });
});
