import type { StreakState } from '@/features/moment/domain/moment';

export { initialStreakState } from '@/features/moment/domain/moment';

function dateOrdinal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  return Number.isFinite(timestamp) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? timestamp / 86_400_000
    : null;
}

export function applyStreakCompletion(state: StreakState, localDate: string): StreakState {
  const completedOrdinal = dateOrdinal(localDate);
  if (completedOrdinal === null) {
    return state;
  }

  if (!state.lastCompletedLocalDate) {
    return {
      ...state,
      best: Math.max(1, state.best),
      current: 1,
      lastCompletedLocalDate: localDate,
    };
  }

  const previousOrdinal = dateOrdinal(state.lastCompletedLocalDate);
  if (previousOrdinal === null || completedOrdinal <= previousOrdinal) {
    return state;
  }

  const gap = completedOrdinal - previousOrdinal;
  const recovered = gap === 2 && state.recoveryAvailable;
  const current = gap === 1 || recovered ? state.current + 1 : 1;
  const recoveryUsed = recovered ? state.recoveryUsed + 1 : state.recoveryUsed;

  return {
    ...state,
    best: Math.max(state.best, current),
    current,
    lastCompletedLocalDate: localDate,
    recoveryAvailable: recoveryUsed < state.recoveryLimit,
    recoveryUsed,
  };
}
