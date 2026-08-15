import {
  PairController,
  PairError,
  type PairRepository,
  type PairState,
} from '@/features/pair/application/pair-controller';

const invitation = {
  code: 'ABCD-EF12',
  expiresAt: '2026-08-22T10:00:00.000Z',
  id: 'invitation-1',
  link: 'pomelo://invite?credential=token-1',
  status: 'pending' as const,
  token: 'token-1',
};

const waitingState: PairState = {
  anniversary: '2021-06-12',
  id: 'pair-1',
  invitation,
  members: [
    {
      avatarKey: 'calm',
      displayName: 'Irene',
      role: 'creator',
      userId: 'user-1',
    },
  ],
  status: 'waiting',
};

const activeState: PairState = {
  ...waitingState,
  invitation: { ...invitation, status: 'accepted' },
  members: [
    ...waitingState.members,
    {
      avatarKey: 'affectionate',
      displayName: 'Lucia',
      role: 'member',
      userId: 'user-2',
    },
  ],
  status: 'active',
};

class FakePairRepository implements PairRepository {
  private listener: (() => void) | null = null;
  state: PairState | null = null;
  preview = {
    anniversary: '2021-06-12',
    creatorName: 'Irene',
    status: 'valid' as const,
  };
  acceptError: PairError | null = null;

  emitChange() {
    this.listener?.();
  }

  subscribe(listener: () => void) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  async getState() {
    return this.state;
  }

  async createPair() {
    this.state = waitingState;
    return waitingState;
  }

  async createInvitation() {
    this.state = waitingState;
    return waitingState;
  }

  async cancelInvitation() {
    this.state = {
      ...waitingState,
      invitation: { ...invitation, status: 'cancelled' },
    };
    return this.state;
  }

  async previewInvitation() {
    return this.preview;
  }

  async acceptInvitation() {
    if (this.acceptError) {
      throw this.acceptError;
    }
    this.state = activeState;
    return activeState;
  }

  async dissolvePair() {
    this.state = { ...activeState, status: 'archived' };
    return this.state;
  }
}

async function waitForAssertion(assertion: () => void) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  throw lastError;
}

describe('PairController', () => {
  it('starts with no Pair for an eligible User', async () => {
    const repository = new FakePairRepository();
    const controller = new PairController(repository);

    await controller.start();

    expect(controller.getSnapshot()).toMatchObject({ state: null, status: 'ready' });
  });

  it('creates a waiting Pair and its single-use Invitation', async () => {
    const repository = new FakePairRepository();
    const controller = new PairController(repository);
    await controller.start();

    await controller.createPair('2021-06-12');

    expect(controller.getSnapshot()).toMatchObject({
      error: null,
      state: waitingState,
      status: 'ready',
    });
  });

  it('refreshes the creator when the second member activates the Pair', async () => {
    const repository = new FakePairRepository();
    repository.state = waitingState;
    const controller = new PairController(repository);
    await controller.start();

    repository.state = activeState;
    repository.emitChange();

    await waitForAssertion(() =>
      expect(controller.getSnapshot().state?.status).toBe('active'),
    );
    expect(controller.getSnapshot().state?.members).toHaveLength(2);
  });

  it('previews and accepts the same Pair through a manual code', async () => {
    const repository = new FakePairRepository();
    const controller = new PairController(repository);
    await controller.start();

    await controller.previewInvitation('abcd-ef12');
    expect(controller.getSnapshot().preview).toEqual(repository.preview);

    await controller.acceptInvitation('abcd-ef12');
    expect(controller.getSnapshot()).toMatchObject({ state: activeState, error: null });
  });

  it('does not let a realtime refresh cancel an accepted Invitation', async () => {
    const repository = new FakePairRepository();
    repository.acceptInvitation = async () => {
      repository.state = activeState;
      repository.emitChange();
      await Promise.resolve();
      return activeState;
    };
    const controller = new PairController(repository);
    await controller.start();

    const accepted = await controller.acceptInvitation('abcd-ef12');

    expect(accepted).toEqual(activeState);
    expect(controller.getSnapshot()).toMatchObject({
      busy: false,
      error: null,
      state: activeState,
    });
  });

  it('keeps a rejected Invitation recoverable without partial Pair state', async () => {
    const repository = new FakePairRepository();
    repository.acceptError = new PairError('invitationExpired');
    const controller = new PairController(repository);
    await controller.start();

    const accepted = await controller.acceptInvitation('ABCD-EF12');

    expect(accepted).toBeNull();
    expect(controller.getSnapshot()).toMatchObject({
      error: 'invitationExpired',
      state: null,
      status: 'ready',
    });
  });

  it('moves both former members into Archive Mode after unlinking', async () => {
    const repository = new FakePairRepository();
    repository.state = activeState;
    const controller = new PairController(repository);
    await controller.start();

    await controller.dissolvePair();

    expect(controller.getSnapshot().state?.status).toBe('archived');
  });

  it('does not restore Pair data after the controller stops', async () => {
    let resolveState!: (state: PairState | null) => void;
    const repository = new FakePairRepository();
    repository.getState = () =>
      new Promise<PairState | null>((resolve) => {
        resolveState = resolve;
      });
    const controller = new PairController(repository);

    const start = controller.start();
    controller.stop();
    resolveState(activeState);
    await start;

    expect(controller.getSnapshot()).toMatchObject({ state: null, status: 'idle' });
  });

  it('keeps an initial load failure distinct from having no Pair', async () => {
    const repository = new FakePairRepository();
    let available = false;
    repository.getState = async () => {
      if (!available) {
        throw new PairError('network');
      }
      return null;
    };
    const controller = new PairController(repository);

    await controller.start();

    expect(controller.getSnapshot()).toMatchObject({
      error: 'network',
      state: null,
      status: 'error',
    });

    available = true;
    await controller.refresh();

    expect(controller.getSnapshot()).toMatchObject({
      error: null,
      state: null,
      status: 'ready',
    });
  });
});
