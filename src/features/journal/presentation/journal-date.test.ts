import { formatJournalDate, formatJournalDateRange } from '@/features/journal/presentation/journal-date';

describe('Journal date presentation', () => {
  it('localizes map dates instead of exposing ISO values', () => {
    expect(formatJournalDate('2026-08-17', 'en')).toBe('Aug 17, 2026');
    expect(formatJournalDate('2026-08-17', 'es')).toBe('17 ago 2026');
  });

  it('includes the end date and localized time in entry details', () => {
    expect(formatJournalDateRange('2026-08-17', '2026-08-19', '15:30', 'en'))
      .toBe('Aug 17, 2026 - Aug 19, 2026 - 3:30 PM');
  });
});
