import {
  JournalController,
  JournalError,
  type JournalRepository,
} from '@/features/journal/application/journal-controller';
import type { JournalEntry, JournalEntryInput } from '@/features/journal/domain/journal';
import type { Memory } from '@/features/moment/moment-api';

const entry: JournalEntry = {
  body: 'Nuestro primer viaje juntos.',
  createdAt: '2026-08-17T10:00:00.000Z',
  createdBy: 'user-1',
  endDate: null,
  id: 'entry-1',
  location: null,
  media: [],
  pairId: 'pair-1',
  recurrence: 'once',
  startDate: '2026-08-10',
  startTime: null,
  timeZone: 'Europe/Madrid',
  title: 'Lisboa',
  updatedAt: '2026-08-17T10:00:00.000Z',
  updatedBy: 'user-1',
  version: 1,
  widgetHidden: false,
};

class Repository implements JournalRepository {
  access = { canCreate: true, freeEntryConsumed: false, isPremium: false, readOnly: false };
  createError: JournalError | null = null;
  entries = [entry];
  requestIds: string[] = [];

  async getEntries() {
    return this.entries;
  }

  async getAccess() {
    return this.access;
  }

  async createEntry(input: JournalEntryInput, requestId: string) {
    this.requestIds.push(requestId);
    if (this.createError) {
      const error = this.createError;
      this.createError = null;
      throw error;
    }
    const created = {
      ...entry,
      body: input.body || null,
      id: 'entry-2',
      startDate: input.startDate,
      title: input.title,
    };
    this.entries = [...this.entries, created];
    this.access = { ...this.access, canCreate: false, freeEntryConsumed: true };
    return created;
  }

  async updateEntry(_entryId: string, version: number, input: JournalEntryInput) {
    if (version !== this.entries[0].version) {
      throw new JournalError('conflict');
    }
    const updated = {
      ...this.entries[0],
      title: input.title,
      version: version + 1,
    };
    this.entries = [updated, ...this.entries.slice(1)];
    return updated;
  }

  subscribe() {
    return () => {};
  }
}

describe('JournalController', () => {
  it('projects repository entries with composed Memories and milestones', async () => {
    const controller = new JournalController(new Repository());
    await controller.start();
    controller.setSources({
      memories: [{
        id: 'memory-1',
        localDate: '2026-08-15',
        revealedAt: '2026-08-15T20:00:00.000Z',
      } as Memory],
      milestones: [{
        date: '1994-08-25',
        id: 'birthday-user-2',
        kind: 'birthday',
        name: 'Cumpleaños de Alex',
      }],
      today: '2026-08-17',
    });

    expect(controller.getSnapshot()).toMatchObject({
      entries: [{ id: 'entry-1' }],
      projection: {
        history: [
          { id: 'memory-1', kind: 'memory' },
          { id: 'entry-1', kind: 'entry' },
        ],
        upcoming: [{ id: 'birthday-user-2', kind: 'milestone' }],
      },
      status: 'ready',
    });
  });

  it('creates an idempotent manual entry through the repository seam', async () => {
    const repository = new Repository();
    const controller = new JournalController(repository, () => 'request-1');
    await controller.start();

    const created = await controller.createEntry({
      body: '',
      endDate: null,
      location: null,
      mediaCount: 0,
      recurrence: 'once',
      startDate: '2026-09-10',
      startTime: null,
      timeZone: 'Europe/Madrid',
      title: 'París',
      widgetHidden: false,
    });

    expect(created?.id).toBe('entry-2');
    expect(controller.getSnapshot()).toMatchObject({
      access: { canCreate: false, freeEntryConsumed: true },
      entries: [{ id: 'entry-1' }, { id: 'entry-2' }],
      error: null,
    });
  });

  it('surfaces a stale edit without overwriting the current entry', async () => {
    const controller = new JournalController(new Repository());
    await controller.start();

    const updated = await controller.updateEntry('entry-1', 0, {
      body: '',
      endDate: null,
      location: null,
      mediaCount: 0,
      recurrence: 'once',
      startDate: '2026-08-10',
      startTime: null,
      timeZone: 'Europe/Madrid',
      title: 'Título obsoleto',
      widgetHidden: false,
    });

    expect(updated).toBeNull();
    expect(controller.getSnapshot()).toMatchObject({
      entries: [{ title: 'Lisboa', version: 1 }],
      error: 'conflict',
    });
  });

  it('reuses the creation key after an uncertain network response', async () => {
    const repository = new Repository();
    repository.createError = new JournalError('network');
    const controller = new JournalController(repository, () => 'stable-request');
    await controller.start();
    const input: JournalEntryInput = {
      body: '', endDate: null, location: null, mediaCount: 0, recurrence: 'once',
      startDate: '2026-09-10', startTime: null, timeZone: 'Europe/Madrid', title: 'París', widgetHidden: false,
    };

    expect(await controller.createEntry(input)).toBeNull();
    expect((await controller.createEntry(input))?.id).toBe('entry-2');
    expect(repository.requestIds).toEqual(['stable-request', 'stable-request']);
  });
});
