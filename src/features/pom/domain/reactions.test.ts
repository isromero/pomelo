import { POM_REACTION_KEY_POSES, reactionKeyPoses } from '@/features/pom/domain/reactions';

describe('Pom reactions', () => {
  it('defines reusable idle, Reveal, and accessory unlock key poses', () => {
    expect(Object.keys(POM_REACTION_KEY_POSES).sort()).toEqual(['accessoryUnlock', 'idle', 'reveal']);
    expect(reactionKeyPoses('reveal').length).toBeGreaterThan(1);
    expect(reactionKeyPoses('accessoryUnlock').length).toBeGreaterThan(1);
  });
});
