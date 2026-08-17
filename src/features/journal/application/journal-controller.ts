import {
  projectJournal,
  validateJournalEntryInput,
  type JournalEntry,
  type JournalEntryInput,
  type JournalMilestone,
  type JournalProjection,
} from '@/features/journal/domain/journal';

export type JournalErrorCode =
  | 'configuration'
  | 'conflict'
  | 'invalidEntry'
  | 'network'
  | 'notAllowed'
  | 'notFound'
  | 'premiumRequired'
  | 'unexpected';

export class JournalError extends Error {
  constructor(public readonly code: JournalErrorCode) {
    super(code);
  }
}

export interface JournalRepository {
  getEntries(): Promise<JournalEntry[]>;
  getAccess?(): Promise<JournalAccess>;
  createEntry?(input: JournalEntryInput, requestId: string): Promise<JournalEntry>;
  updateEntry?(entryId: string, version: number, input: JournalEntryInput): Promise<JournalEntry>;
  deleteEntry?(entryId: string): Promise<void>;
  subscribe(listener: () => void): () => void;
}

export type JournalAccess = {
  canCreate: boolean;
  freeEntryConsumed: boolean;
  isPremium: boolean;
  readOnly: boolean;
};

type JournalSources = {
  memories: { id: string; localDate: string; revealedAt: string }[];
  milestones: JournalMilestone[];
  today: string;
};

type JournalStatus = 'error' | 'idle' | 'loading' | 'ready';

export type JournalSnapshot = {
  access: JournalAccess;
  busy: boolean;
  entries: JournalEntry[];
  error: JournalErrorCode | null;
  projection: JournalProjection;
  status: JournalStatus;
};

const initialSources: JournalSources = { memories: [], milestones: [], today: '1970-01-01' };
const emptyProjection = projectJournal({ entries: [], ...initialSources });
const initialSnapshot: JournalSnapshot = {
  access: { canCreate: false, freeEntryConsumed: false, isPremium: false, readOnly: false },
  busy: false,
  entries: [],
  error: null,
  projection: emptyProjection,
  status: 'idle',
};

function errorCode(error: unknown): JournalErrorCode {
  return error instanceof JournalError ? error.code : 'unexpected';
}

export class JournalController {
  private listeners = new Set<() => void>();
  private sources = initialSources;
  private snapshot = initialSnapshot;
  private unsubscribeRepository: (() => void) | null = null;

  constructor(
    private readonly repository: JournalRepository,
    private readonly requestId: () => string = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  ) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async start() {
    this.unsubscribeRepository?.();
    this.update({ error: null, status: 'loading' });
    this.unsubscribeRepository = this.repository.subscribe(() => {
      void this.refresh();
    });
    await this.refresh();
  }

  stop() {
    this.unsubscribeRepository?.();
    this.unsubscribeRepository = null;
    this.sources = initialSources;
    this.snapshot = initialSnapshot;
    this.emit();
  }

  async refresh() {
    try {
      const entries = await this.repository.getEntries();
      const access = this.repository.getAccess
        ? await this.repository.getAccess()
        : this.snapshot.access;
      this.replaceEntries(entries, access);
    } catch (error) {
      this.update({ error: errorCode(error), status: 'error' });
    }
  }

  setSources(sources: JournalSources) {
    this.sources = sources;
    this.update({
      projection: projectJournal({ entries: this.snapshot.entries, ...sources }),
    });
  }

  async createEntry(input: JournalEntryInput) {
    if (validateJournalEntryInput(input)) {
      this.update({ error: 'invalidEntry' });
      return null;
    }
    if (!this.repository.createEntry) {
      this.update({ error: 'configuration' });
      return null;
    }
    this.update({ busy: true, error: null });
    try {
      const entry = await this.repository.createEntry(input, this.requestId());
      const access = this.repository.getAccess
        ? await this.repository.getAccess()
        : this.snapshot.access;
      this.replaceEntries([...this.snapshot.entries.filter((item) => item.id !== entry.id), entry], access);
      this.update({ busy: false });
      return entry;
    } catch (error) {
      this.update({ busy: false, error: errorCode(error) });
      return null;
    }
  }

  async updateEntry(entryId: string, version: number, input: JournalEntryInput) {
    if (validateJournalEntryInput(input)) {
      this.update({ error: 'invalidEntry' });
      return null;
    }
    if (!this.repository.updateEntry) {
      this.update({ error: 'configuration' });
      return null;
    }
    this.update({ busy: true, error: null });
    try {
      const entry = await this.repository.updateEntry(entryId, version, input);
      this.replaceEntries(this.snapshot.entries.map((item) => item.id === entry.id ? entry : item));
      this.update({ busy: false });
      return entry;
    } catch (error) {
      this.update({ busy: false, error: errorCode(error) });
      return null;
    }
  }

  async deleteEntry(entryId: string) {
    if (!this.repository.deleteEntry) {
      this.update({ error: 'configuration' });
      return false;
    }
    this.update({ busy: true, error: null });
    try {
      await this.repository.deleteEntry(entryId);
      this.replaceEntries(this.snapshot.entries.filter((item) => item.id !== entryId));
      this.update({ busy: false });
      return true;
    } catch (error) {
      this.update({ busy: false, error: errorCode(error) });
      return false;
    }
  }

  private replaceEntries(entries: JournalEntry[], access = this.snapshot.access) {
    this.update({
      access,
      entries,
      error: null,
      projection: projectJournal({ entries, ...this.sources }),
      status: 'ready',
    });
  }

  private update(update: Partial<JournalSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}
