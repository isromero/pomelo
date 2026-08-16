import {
  applyStreakCompletion,
  initialStreakState,
} from '@/features/moment/domain/streak';

describe('Pair Streak rules', () => {
  it('starts at one and preserves a duplicate completion', () => {
    const first = applyStreakCompletion(initialStreakState, '2026-08-16');

    expect(first).toMatchObject({ current: 1, best: 1, recoveryUsed: 0 });
    expect(applyStreakCompletion(first, '2026-08-16')).toEqual(first);
  });

  it('increments consecutive local days', () => {
    const first = applyStreakCompletion(initialStreakState, '2026-08-16');

    expect(applyStreakCompletion(first, '2026-08-17')).toMatchObject({
      current: 2,
      best: 2,
    });
  });

  it('uses the single free recovery for exactly one missed day', () => {
    const first = applyStreakCompletion(initialStreakState, '2026-08-16');
    const second = applyStreakCompletion(first, '2026-08-18');

    expect(second).toMatchObject({
      current: 2,
      best: 2,
      recoveryAvailable: false,
      recoveryUsed: 1,
    });
  });

  it('breaks the active streak after a larger gap but keeps the record', () => {
    const first = applyStreakCompletion(initialStreakState, '2026-08-16');
    const second = applyStreakCompletion(first, '2026-08-17');
    const broken = applyStreakCompletion(second, '2026-08-20');

    expect(broken).toMatchObject({
      current: 1,
      best: 2,
      recoveryAvailable: true,
      recoveryUsed: 0,
    });
  });
});
