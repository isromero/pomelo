import {
  projectJournal,
  validateJournalEntryInput,
  journalEntryState,
  nextJournalOccurrence,
  nextWidgetOccurrence,
  type JournalEntry,
} from '@/features/journal/domain/journal';
import type { Memory } from '@/features/moment/moment-api';

const entry: JournalEntry = {
  body: null,
  createdAt: '2026-08-17T10:00:00.000Z',
  createdBy: 'user-1',
  endDate: '2026-08-22',
  id: 'entry-1',
  location: null,
  media: [],
  pairId: 'pair-1',
  recurrence: 'once',
  startDate: '2026-08-20',
  startTime: null,
  timeZone: 'Europe/Madrid',
  title: 'Viaje a Lisboa',
  updatedAt: '2026-08-17T10:00:00.000Z',
  updatedBy: 'user-1',
  version: 1,
  widgetHidden: false,
};

describe('Journal Entry dates', () => {
  it('moves a dated entry from upcoming to lived without changing the entry', () => {
    expect(journalEntryState(entry, '2026-08-19')).toBe('upcoming');
    expect(journalEntryState(entry, '2026-08-21')).toBe('ongoing');
    expect(journalEntryState(entry, '2026-08-23')).toBe('lived');
    expect(entry.startDate).toBe('2026-08-20');
  });

  it('projects a yearly leap-day entry without creating another entry', () => {
    const recurring = {
      ...entry,
      endDate: null,
      recurrence: 'yearly' as const,
      startDate: '2024-02-29',
    };

    expect(nextJournalOccurrence(recurring, '2027-01-10')).toEqual({
      endDate: '2027-02-28',
      startDate: '2027-02-28',
    });
    expect(nextJournalOccurrence(recurring, '2027-03-01')).toEqual({
      endDate: '2028-02-29',
      startDate: '2028-02-29',
    });
    expect(recurring.id).toBe('entry-1');
  });

  it('keeps a yearly range active when it began in the prior calendar year', () => {
    const recurring = {
      ...entry,
      endDate: '2025-01-02',
      recurrence: 'yearly' as const,
      startDate: '2024-12-31',
    };

    expect(nextJournalOccurrence(recurring, '2026-01-01')).toEqual({
      endDate: '2026-01-02',
      startDate: '2025-12-31',
    });
  });

  it('combines Memories and entries while keeping ritual Memories off Map', () => {
    const livedEntry = {
      ...entry,
      endDate: null,
      location: {
        city: 'Lisboa',
        countryCode: 'PT',
        label: 'Lisboa, Portugal',
        latitude: 38.7223,
        longitude: -9.1393,
      },
      startDate: '2026-08-10',
    };
    const upcomingEntry = {
      ...entry,
      endDate: null,
      id: 'entry-2',
      location: {
        city: 'Paris',
        countryCode: 'FR',
        label: 'Paris, France',
        latitude: 48.8566,
        longitude: 2.3522,
      },
      startDate: '2026-09-10',
    };
    const memory = {
      id: 'memory-1',
      localDate: '2026-08-15',
      revealedAt: '2026-08-15T20:00:00.000Z',
    } as Memory;

    const projection = projectJournal({
      entries: [upcomingEntry, livedEntry],
      memories: [memory],
      milestones: [{
        date: '1994-08-25',
        id: 'birthday-user-2',
        kind: 'birthday',
        name: 'Cumpleaños de Alex',
        timeZone: 'Europe/Madrid',
      }],
      today: '2026-08-17',
    });

    expect(projection.history.map((item) => `${item.kind}:${item.id}`)).toEqual([
      'memory:memory-1',
      'entry:entry-1',
    ]);
    expect(projection.upcoming.map((item) => `${item.kind}:${item.id}`)).toEqual([
      'milestone:birthday-user-2',
      'entry:entry-2',
    ]);
    expect(projection.map.map((item) => `${item.id}:${item.state}`)).toEqual([
      'entry-1:lived',
      'entry-2:upcoming',
    ]);
  });

  it('rejects an end date before the start date', () => {
    expect(validateJournalEntryInput({
      body: '',
      endDate: '2026-08-19',
      location: null,
      mediaCount: 0,
      recurrence: 'once',
      startDate: '2026-08-20',
      startTime: null,
      timeZone: 'Europe/Madrid',
      title: 'Viaje',
      widgetHidden: false,
    })).toBe('dateRange');
  });

  it('limits a manual entry to ten photos', () => {
    expect(validateJournalEntryInput({
      body: '',
      endDate: null,
      location: null,
      mediaCount: 11,
      recurrence: 'once',
      startDate: '2026-08-20',
      startTime: null,
      timeZone: 'Europe/Madrid',
      title: 'Viaje',
      widgetHidden: false,
    })).toBe('mediaLimit');
  });

  it('skips hidden entries when selecting the next widget occurrence', () => {
    const hidden = { ...entry, id: 'hidden-entry', widgetHidden: true };
    const visible = { ...entry, id: 'visible-entry', widgetHidden: false };

    expect(nextWidgetOccurrence([hidden, visible], [
      { endDate: '2026-08-20', id: hidden.id, kind: 'entry', name: hidden.title, startDate: '2026-08-20', startTime: null, timeZone: hidden.timeZone },
      { endDate: '2026-08-21', id: visible.id, kind: 'entry', name: visible.title, startDate: '2026-08-21', startTime: null, timeZone: visible.timeZone },
    ])?.id).toBe(visible.id);
  });

  it('projects a recurring map pin using its current annual occurrence', () => {
    const recurring = {
      ...entry,
      endDate: null,
      location: { city: null, countryCode: null, label: 'Un pin', latitude: 40, longitude: -3 },
      recurrence: 'yearly' as const,
      startDate: '2024-09-01',
    };

    expect(projectJournal({ entries: [recurring], memories: [], milestones: [], today: '2026-08-17' }).map[0]).toMatchObject({
      id: recurring.id,
      startDate: '2026-09-01',
      state: 'upcoming',
    });
  });

  it('selects the next widget event by instant across time zones', () => {
    const tokyo = { ...entry, id: 'tokyo', startTime: '09:00', timeZone: 'Asia/Tokyo' };
    const madrid = { ...entry, id: 'madrid', startTime: '09:00', timeZone: 'Europe/Madrid' };
    const occurrences = [tokyo, madrid].map((item) => ({
      endDate: '2026-08-20', id: item.id, kind: 'entry' as const, name: item.title,
      startDate: '2026-08-20', startTime: item.startTime, timeZone: item.timeZone,
    }));

    expect(nextWidgetOccurrence([tokyo, madrid], occurrences, new Date('2026-08-20T01:00:00Z'))?.id).toBe('madrid');
  });

  it('evaluates milestones in the Pair time zone', () => {
    const projection = projectJournal({
      entries: [],
      memories: [],
      milestones: [{
        date: '1994-08-25',
        id: 'birthday-user-2',
        kind: 'birthday',
        name: 'Birthday',
        timeZone: 'Pacific/Kiritimati',
      }],
      today: '2026-08-25',
    });

    expect(projection.upcoming[0]).toMatchObject({ timeZone: 'Pacific/Kiritimati' });
    expect(nextWidgetOccurrence([], projection.upcoming, new Date('2026-08-25T12:00:00Z'))).toBeNull();
  });
});
