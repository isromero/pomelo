import {
  ACCESSORY_MILESTONES,
  accessoryIsUnlocked,
  createPomProgress,
  getUnlockedAccessories,
  selectAccessory,
  type AccessoryId,
} from '@/features/pom/domain/progress';

describe('Pom Progress', () => {
  it('introduces Pom with the first revealed Memory and unlocks accessories at the agreed milestones', () => {
    expect(createPomProgress('pair-1', 0)).toMatchObject({
      equippedAccessory: null,
      introduced: false,
      memoryCount: 0,
      unlockedAccessories: [],
    });
    expect(createPomProgress('pair-1', 1)).toMatchObject({
      introduced: true,
      unlockedAccessories: [],
    });
    expect(getUnlockedAccessories(2)).toEqual([ACCESSORY_MILESTONES[0].accessory]);
    expect(getUnlockedAccessories(7)).toHaveLength(2);
    expect(getUnlockedAccessories(14)).toHaveLength(3);
    expect(getUnlockedAccessories(30)).toHaveLength(4);
  });

  it('allows only unlocked accessories or no accessory and keeps the selection pair-scoped', () => {
    const progress = createPomProgress('pair-1', 7);
    const first = ACCESSORY_MILESTONES[0].accessory;
    const second = ACCESSORY_MILESTONES[1].accessory;

    expect(selectAccessory(progress, first)).toMatchObject({ equippedAccessory: first });
    expect(selectAccessory(progress, second)).toMatchObject({ equippedAccessory: second });
    expect(selectAccessory(progress, null)).toMatchObject({ equippedAccessory: null });
    expect(() => selectAccessory(progress, 'crown' as AccessoryId)).toThrow('locked');
  });

  it('never removes unlocked accessories when the count is refreshed lower or Streak/Premium state changes', () => {
    const progress = createPomProgress('pair-1', 30);

    expect(accessoryIsUnlocked(progress, 'crown')).toBe(true);
    expect(createPomProgress('pair-1', 30, 'crown')).toMatchObject({
      equippedAccessory: 'crown',
      unlockedAccessories: getUnlockedAccessories(30),
    });
    expect(createPomProgress('pair-1', 29, 'crown').unlockedAccessories).toHaveLength(3);
  });
});
