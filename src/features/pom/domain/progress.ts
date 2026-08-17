export type PomExpression = 'calm' | 'happy' | 'excited' | 'surprised' | 'affectionate' | 'proud';

export type AccessoryId = 'ribbon' | 'sunhat' | 'scarf' | 'crown';

export const ACCESSORY_MILESTONES: readonly {
  accessory: AccessoryId;
  milestone: number;
}[] = [
  { accessory: 'ribbon', milestone: 2 },
  { accessory: 'sunhat', milestone: 7 },
  { accessory: 'scarf', milestone: 14 },
  { accessory: 'crown', milestone: 30 },
];

export type PomProgress = {
  equippedAccessory: AccessoryId | null;
  expression: PomExpression;
  introduced: boolean;
  memoryCount: number;
  pairId: string;
  unlockedAccessories: AccessoryId[];
};

export function getUnlockedAccessories(memoryCount: number): AccessoryId[] {
  const count = Math.max(0, Math.floor(memoryCount));
  return ACCESSORY_MILESTONES
    .filter(({ milestone }) => count >= milestone)
    .map(({ accessory }) => accessory);
}

export function expressionForMemoryCount(memoryCount: number): PomExpression {
  const count = Math.max(0, Math.floor(memoryCount));
  if (count === 0) {
    return 'calm';
  }
  if (count === 1) {
    return 'happy';
  }
  if (count < 7) {
    return 'excited';
  }
  if (count < 14) {
    return 'surprised';
  }
  if (count < 30) {
    return 'affectionate';
  }
  return 'proud';
}

export function createPomProgress(
  pairId: string,
  memoryCount: number,
  equippedAccessory: AccessoryId | null = null,
): PomProgress {
  const normalizedCount = Math.max(0, Math.floor(memoryCount));
  const unlockedAccessories = getUnlockedAccessories(normalizedCount);
  return {
    equippedAccessory: equippedAccessory && unlockedAccessories.includes(equippedAccessory)
      ? equippedAccessory
      : null,
    expression: expressionForMemoryCount(normalizedCount),
    introduced: normalizedCount >= 1,
    memoryCount: normalizedCount,
    pairId,
    unlockedAccessories,
  };
}

export function accessoryIsUnlocked(progress: PomProgress, accessory: AccessoryId) {
  return progress.unlockedAccessories.includes(accessory);
}

export function selectAccessory(
  progress: PomProgress,
  accessory: AccessoryId | null,
): PomProgress {
  if (accessory !== null && !accessoryIsUnlocked(progress, accessory)) {
    throw new Error('locked');
  }
  return { ...progress, equippedAccessory: accessory };
}
