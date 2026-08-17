export type PomReaction = 'idle' | 'reveal' | 'accessoryUnlock';

export type PomKeyPose = {
  durationMs: number;
  scale: number;
  translateY: number;
};

export const POM_REACTION_KEY_POSES: Record<PomReaction, PomKeyPose[]> = {
  idle: [
    { durationMs: 900, scale: 1, translateY: 0 },
    { durationMs: 900, scale: 1.015, translateY: -2 },
  ],
  reveal: [
    { durationMs: 90, scale: 0.94, translateY: 3 },
    { durationMs: 170, scale: 1.08, translateY: -7 },
    { durationMs: 220, scale: 1, translateY: 0 },
  ],
  accessoryUnlock: [
    { durationMs: 120, scale: 0.96, translateY: 2 },
    { durationMs: 220, scale: 1.1, translateY: -8 },
    { durationMs: 260, scale: 1, translateY: 0 },
  ],
};

export function reactionKeyPoses(reaction: PomReaction) {
  return POM_REACTION_KEY_POSES[reaction];
}
