import {
  advancePairExploration,
  pairExplorationProgress,
} from '@/features/pair/presentation/pair-exploration';

describe('pair exploration', () => {
  it('advances through the simulated product cycle', () => {
    expect(advancePairExploration('moment')).toBe('privacy');
    expect(advancePairExploration('privacy')).toBe('reveal');
    expect(advancePairExploration('reveal')).toBe('memory');
  });

  it('stops at the Memory instead of creating another cycle', () => {
    expect(advancePairExploration('memory')).toBe('memory');
  });

  it('reports human-readable progress for every scene', () => {
    expect(pairExplorationProgress('moment')).toEqual({ current: 1, total: 4 });
    expect(pairExplorationProgress('memory')).toEqual({ current: 4, total: 4 });
  });
});
