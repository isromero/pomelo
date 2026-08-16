import {
  normalizeInvitationCredential,
  validateAnniversary,
} from '@/features/pair/domain/pair';
import type {
  ImportantDateInput,
  ImportantDate,
  NextImportantDate,
} from '@/features/pair/domain/important-date';

export type PairStatus = 'active' | 'archived' | 'waiting';
export type InvitationStatus = 'accepted' | 'cancelled' | 'expired' | 'pending';

export type PairMember = {
  avatarKey: 'affectionate' | 'calm' | 'surprised';
  birthDate: string | null;
  displayName: string;
  role: 'creator' | 'member';
  userId: string;
};

export type PairInvitation = {
  code: string;
  expiresAt: string;
  id: string;
  link: string;
  status: InvitationStatus;
  token: string;
};

export type PairState = {
  anniversary: string;
  id: string;
  importantDates: ImportantDate[];
  invitation: PairInvitation | null;
  members: PairMember[];
  nextImportantDate: NextImportantDate | null;
  status: PairStatus;
  timeZone: string;
};

export function canBrowsePairApp(
  state: PairState | null | undefined,
): state is PairState & { status: 'active' | 'archived' | 'waiting' } {
  return state?.status === 'active' || state?.status === 'archived' || state?.status === 'waiting';
}

export type InvitationPreviewStatus =
  | 'cancelled'
  | 'expired'
  | 'invalid'
  | 'pairFull'
  | 'used'
  | 'valid';

export type InvitationPreview = {
  anniversary: string | null;
  creatorName: string | null;
  status: InvitationPreviewStatus;
};

export type PairErrorCode =
  | 'alreadyPaired'
  | 'configuration'
  | 'invitationCancelled'
  | 'invitationExpired'
  | 'invitationInvalid'
  | 'invitationUsed'
  | 'invalidImportantDate'
  | 'invalidAnniversary'
  | 'importantDateNotFound'
  | 'network'
  | 'notAllowed'
  | 'pairFull'
  | 'profileIncomplete'
  | 'unexpected';

export class PairError extends Error {
  constructor(public readonly code: PairErrorCode) {
    super(code);
  }
}

export interface PairRepository {
  acceptInvitation(credential: string): Promise<PairState>;
  cancelInvitation(invitationId: string): Promise<PairState>;
  createInvitation(): Promise<PairState>;
  createPair(anniversary: string): Promise<PairState>;
  dissolvePair(): Promise<PairState>;
  createImportantDate(input: ImportantDateInput): Promise<PairState>;
  updateImportantDate(id: string, input: ImportantDateInput): Promise<PairState>;
  deleteImportantDate(id: string): Promise<PairState>;
  getImportantDateWidget(): Promise<NextImportantDate | null>;
  getState(): Promise<PairState | null>;
  previewInvitation(credential: string): Promise<InvitationPreview>;
  subscribe(listener: () => void): () => void;
}

type PairControllerStatus = 'error' | 'idle' | 'loading' | 'ready';

export type PairSnapshot = {
  busy: boolean;
  error: PairErrorCode | null;
  preview: InvitationPreview | null;
  state: PairState | null;
  status: PairControllerStatus;
};

const initialSnapshot: PairSnapshot = {
  busy: false,
  error: null,
  preview: null,
  state: null,
  status: 'idle',
};

function errorCode(error: unknown): PairErrorCode {
  return error instanceof PairError ? error.code : 'unexpected';
}

export class PairController {
  private listeners = new Set<() => void>();
  private operation = 0;
  private refreshRequest = 0;
  private snapshot = initialSnapshot;
  private unsubscribeRepository: (() => void) | null = null;

  constructor(private readonly repository: PairRepository) {}

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
    this.update({ error: null, preview: null });
  }

  async refresh() {
    const operation = this.operation;
    const request = ++this.refreshRequest;
    const recovering = this.snapshot.status === 'error';
    if (recovering) {
      this.update({ error: null, status: 'loading' });
    }
    try {
      const state = await this.repository.getState();
      if (operation === this.operation && request === this.refreshRequest) {
        this.update({ error: null, state, status: 'ready' });
      }
    } catch (error) {
      if (operation === this.operation && request === this.refreshRequest) {
        this.update({
          error: errorCode(error),
          status: recovering || this.snapshot.status === 'loading' ? 'error' : 'ready',
        });
      }
    }
  }

  async createPair(anniversary: string) {
    if (validateAnniversary(anniversary)) {
      this.update({ error: 'invalidAnniversary' });
      return;
    }
    await this.runStateOperation(() => this.repository.createPair(anniversary));
  }

  async createInvitation() {
    await this.runStateOperation(() => this.repository.createInvitation());
  }

  async cancelInvitation(invitationId: string) {
    await this.runStateOperation(() =>
      this.repository.cancelInvitation(invitationId),
    );
  }

  async previewInvitation(credential: string) {
    const normalized = normalizeInvitationCredential(credential);
    if (!normalized) {
      this.update({ error: 'invitationInvalid', preview: null });
      return;
    }

    const operation = ++this.operation;
    this.update({ busy: true, error: null, preview: null });
    try {
      const preview = await this.repository.previewInvitation(normalized);
      if (operation === this.operation) {
        this.update({ busy: false, preview });
      }
    } catch (error) {
      if (operation === this.operation) {
        this.update({ busy: false, error: errorCode(error) });
      }
    }
  }

  async acceptInvitation(credential: string) {
    const normalized = normalizeInvitationCredential(credential);
    if (!normalized) {
      this.update({ error: 'invitationInvalid' });
      return null;
    }
    return this.runStateOperation(() =>
      this.repository.acceptInvitation(normalized),
    );
  }

  async dissolvePair() {
    await this.runStateOperation(() => this.repository.dissolvePair());
  }

  async createImportantDate(input: ImportantDateInput) {
    await this.runStateOperation(() => this.repository.createImportantDate(input));
  }

  async updateImportantDate(id: string, input: ImportantDateInput) {
    await this.runStateOperation(() => this.repository.updateImportantDate(id, input));
  }

  async deleteImportantDate(id: string) {
    await this.runStateOperation(() => this.repository.deleteImportantDate(id));
  }

  async getImportantDateWidget() {
    try {
      return await this.repository.getImportantDateWidget();
    } catch (error) {
      throw new PairError(errorCode(error));
    }
  }

  private async runStateOperation(operation: () => Promise<PairState>) {
    const operationId = ++this.operation;
    this.update({ busy: true, error: null });
    try {
      const state = await operation();
      if (operationId === this.operation) {
        this.update({ busy: false, preview: null, state, status: 'ready' });
        return state;
      }
    } catch (error) {
      if (operationId === this.operation) {
        this.update({ busy: false, error: errorCode(error), status: 'ready' });
      }
    }
    return null;
  }

  private update(patch: Partial<PairSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
