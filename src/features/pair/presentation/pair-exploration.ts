export const pairExplorationSteps = [
  'moment',
  'privacy',
  'reveal',
  'memory',
] as const;

export type PairExplorationStep = (typeof pairExplorationSteps)[number];

export function advancePairExploration(
  step: PairExplorationStep,
): PairExplorationStep {
  const index = pairExplorationSteps.indexOf(step);
  return pairExplorationSteps[Math.min(index + 1, pairExplorationSteps.length - 1)];
}

export function pairExplorationProgress(step: PairExplorationStep) {
  return {
    current: pairExplorationSteps.indexOf(step) + 1,
    total: pairExplorationSteps.length,
  };
}
