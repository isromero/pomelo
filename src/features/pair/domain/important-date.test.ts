import {
  getPairLocalDate,
  getNextImportantDate,
  validateImportantDate,
  type ImportantDateMember,
} from '@/features/pair/domain/important-date';

const members: ImportantDateMember[] = [
  { birthDate: '1992-08-20', displayName: 'Irene', userId: 'user-1' },
  { birthDate: '1993-12-04', displayName: 'Lucia', userId: 'user-2' },
];

describe('Important Date rules', () => {
  it('uses the Pair timezone when deriving the local date', () => {
    const instant = new Date('2026-08-16T23:30:00.000Z');

    expect(getPairLocalDate(instant, 'Pacific/Kiritimati')).toBe('2026-08-17');
    expect(getPairLocalDate(instant, 'America/Los_Angeles')).toBe('2026-08-16');
  });

  it('requires a named future date and accepts the two supported kinds', () => {
    expect(
      validateImportantDate(
        { date: '2026-08-17', kind: 'trip', name: 'Lisbon', recurrence: 'once' },
        '2026-08-16',
      ),
    ).toBeNull();
    expect(
      validateImportantDate(
        { date: '2026-08-16', kind: 'custom', name: 'Dinner', recurrence: 'yearly' },
        '2026-08-16',
      ),
    ).toBe('future');
    expect(
      validateImportantDate(
        { date: '2026-08-17', kind: 'custom', name: ' ', recurrence: 'once' },
        '2026-08-16',
      ),
    ).toBe('name');
  });

  it('chooses the next anniversary, birthday, or Pair-owned date', () => {
    expect(
      getNextImportantDate({
        anniversary: '2020-08-18',
        dates: [
          {
            date: '2026-08-17',
            id: 'trip-1',
            kind: 'trip',
            name: 'Lisbon',
            pairId: 'pair-1',
            recurrence: 'once',
          },
        ],
        members,
        now: new Date('2026-08-16T12:00:00.000Z'),
        pairId: 'pair-1',
        timeZone: 'UTC',
      }),
    ).toMatchObject({ date: '2026-08-17', id: 'trip-1', kind: 'trip', daysRemaining: 1 });
  });

  it('rolls a passed anniversary into the next year', () => {
    expect(
      getNextImportantDate({
        anniversary: '2020-08-10',
        dates: [],
        members: [],
        now: new Date('2026-08-16T12:00:00.000Z'),
        pairId: 'pair-1',
        timeZone: 'UTC',
      }),
    ).toMatchObject({ date: '2027-08-10', id: 'anniversary:pair-1', kind: 'anniversary' });
  });

  it('repeats yearly dates and archives passed one-time dates', () => {
    const next = getNextImportantDate({
      anniversary: '2020-08-10',
      dates: [
        {
          date: '2026-08-01',
          id: 'trip-1',
          kind: 'trip',
          name: 'Past trip',
          pairId: 'pair-1',
          recurrence: 'once',
        },
        {
          date: '2025-08-12',
          id: 'custom-1',
          kind: 'custom',
          name: 'Yearly date',
          pairId: 'pair-1',
          recurrence: 'yearly',
        },
      ],
      members,
      now: new Date('2026-08-16T12:00:00.000Z'),
      pairId: 'pair-1',
      timeZone: 'UTC',
    });

    expect(next).toMatchObject({ date: '2026-08-20', id: 'birthday:user-1', kind: 'birthday' });
  });
});
