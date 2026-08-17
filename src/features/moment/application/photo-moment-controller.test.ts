import {
  MomentController,
  MomentError,
  type MomentRepository,
  type PhotoDraftStore,
} from '@/features/moment/application/moment-controller';
import type {
  DailyMoment,
  Memory,
  PhotoDraft,
} from '@/features/moment/domain/moment';

const partner = {
  avatarKey: 'affectionate' as const,
  contribution: null,
  displayName: 'Lucia',
  submitted: false,
  userId: 'user-2',
};

const photoMoment: DailyMoment = {
  format: 'photo',
  id: 'photo-moment-1',
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
  prompt: { conceptKey: 'photo_today_together', text: 'Capture a moment.' },
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

const completeDraft: PhotoDraft = {
  front: {
    height: 1200,
    mimeType: 'image/jpeg',
    uri: 'file:///front.jpg',
    width: 900,
  },
  rear: {
    height: 1600,
    mimeType: 'image/jpeg',
    uri: 'file:///rear.jpg',
    width: 1200,
  },
};

class FakePhotoDraftStore implements PhotoDraftStore {
  draft: PhotoDraft | null = null;

  async get() {
    return this.draft;
  }

  async remove() {
    this.draft = null;
  }

  async save(_momentId: string, draft: PhotoDraft) {
    this.draft = draft;
    return draft;
  }
}

class FakePhotoRepository implements MomentRepository {
  listener: (() => void) | null = null;
  moment = photoMoment;
  submitError: MomentError | null = null;
  submitCalls: { draft: PhotoDraft; key: string }[] = [];

  subscribe(listener: () => void) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  async getDailyMoment() {
    return this.moment;
  }

  async getHistory(): Promise<Memory[]> {
    return [];
  }

  async submitQuestion() {
    return this.moment;
  }

  async submitPhoto(_momentId: string, draft: PhotoDraft, key: string) {
    this.submitCalls.push({ draft, key });
    if (this.submitError) {
      throw this.submitError;
    }
    this.moment = {
      ...photoMoment,
      lifecycle: { ...photoMoment.lifecycle, window: 'complete' },
      ownContribution: {
        id: 'photo-contribution-1',
        photo: {
          front: { ...draft.front!, path: 'front.jpg' },
          rear: { ...draft.rear!, path: 'rear.jpg' },
        },
        responseChoice: null,
        responseText: null,
        submittedAt: '2026-08-16T10:00:00.000Z',
        userId: 'user-1',
      },
      status: 'partially_submitted',
    };
    return this.moment;
  }

  async revealMoment() {
    return this.moment;
  }
}

describe('Photo MomentController flow', () => {
  it('restores a private partial Photo draft and blocks incomplete submission', async () => {
    const repository = new FakePhotoRepository();
    const draftStore = new FakePhotoDraftStore();
    draftStore.draft = { ...completeDraft, front: null };
    const controller = new MomentController(repository, undefined, draftStore);

    await controller.start();
    await controller.submitPhoto();

    expect(controller.getSnapshot()).toMatchObject({
      error: 'photoIncomplete',
      photoDraft: { rear: completeDraft.rear, front: null },
      syncPending: true,
    });
    expect(repository.submitCalls).toHaveLength(0);
  });

  it('retries a failed upload/submission with the same id and no partial Contribution', async () => {
    const repository = new FakePhotoRepository();
    repository.submitError = new MomentError('network');
    const draftStore = new FakePhotoDraftStore();
    const controller = new MomentController(repository, undefined, draftStore);
    await controller.start();

    await controller.savePhotoDraft(completeDraft);
    await controller.submitPhoto();

    expect(repository.submitCalls).toHaveLength(1);
    expect(controller.getSnapshot()).toMatchObject({
      error: 'network',
      photoDraft: completeDraft,
      syncPending: true,
    });
    expect(controller.getSnapshot().moment?.ownContribution).toBeNull();

    repository.submitError = null;
    await controller.submitPhoto();

    expect(repository.submitCalls).toHaveLength(2);
    expect(repository.submitCalls[1].key).toBe(repository.submitCalls[0].key);
    expect(controller.getSnapshot()).toMatchObject({
      error: null,
      photoDraft: null,
      syncPending: false,
    });
    expect(controller.getSnapshot().moment?.ownContribution?.photo?.rear.path).toBe('rear.jpg');
  });
});
