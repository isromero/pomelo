export type MomentFormat = 'question';
export type MomentStatus =
  | 'expired_incomplete'
  | 'open'
  | 'partially_submitted'
  | 'ready'
  | 'revealed';
export type MomentWindow = 'complete' | 'expired' | 'normal' | 'recovery';
export type QuestionResponseType = 'choice' | 'text';

export type MomentLifecycle = {
  normalExpiresAt: string;
  recoveryExpiresAt: string;
  window: MomentWindow;
};

export type StreakState = {
  best: number;
  current: number;
  lastCompletedLocalDate: string | null;
  recoveryAvailable: boolean;
  recoveryLimit: number;
  recoveryUsed: number;
};

export const STREAK_RECOVERY_LIMIT = 1;

export const initialStreakState: StreakState = {
  best: 0,
  current: 0,
  lastCompletedLocalDate: null,
  recoveryAvailable: true,
  recoveryLimit: STREAK_RECOVERY_LIMIT,
  recoveryUsed: 0,
};

export type QuestionPrompt = {
  conceptKey: string;
  options: string[];
  responseType: QuestionResponseType;
  text: string;
};

export type Contribution = {
  id: string;
  responseChoice: string | null;
  responseText: string | null;
  submittedAt: string;
  userId: string;
};

export type MomentPartner = {
  avatarKey: 'affectionate' | 'calm' | 'surprised';
  contribution: Contribution | null;
  displayName: string;
  submitted: boolean;
  userId: string;
};

export type DailyMoment = {
  format: MomentFormat;
  id: string;
  isFree: boolean;
  lifecycle: MomentLifecycle;
  localDate: string;
  memoryId: string | null;
  ownContribution: Contribution | null;
  pairId: string;
  partner: MomentPartner;
  pomState: 'calm' | 'celebrating' | null;
  prompt: QuestionPrompt;
  streak: StreakState;
  status: MomentStatus;
};

export type Memory = {
  id: string;
  localDate: string;
  momentId: string;
  ownContribution: Contribution;
  pairId: string;
  partner: MomentPartner;
  pomState: 'calm' | 'celebrating';
  prompt: QuestionPrompt;
  revealedAt: string;
};

export type QuestionResponse = {
  choice?: string;
  text?: string;
};

export type QuestionResponseError = 'empty' | 'invalidChoice' | 'tooLong';

export function validateQuestionResponse(
  prompt: QuestionPrompt,
  response: QuestionResponse,
): QuestionResponseError | null {
  if (prompt.responseType === 'choice') {
    return prompt.options.includes(response.choice ?? '') ? null : 'invalidChoice';
  }

  const text = response.text?.trim() ?? '';
  if (!text) {
    return 'empty';
  }
  return text.length > 1000 ? 'tooLong' : null;
}

export function isMomentReady(moment: Pick<DailyMoment, 'status'>) {
  return moment.status === 'ready';
}

export function isMomentRevealed(moment: Pick<DailyMoment, 'status'>) {
  return moment.status === 'revealed';
}

export function getMomentWindow(
  moment: Pick<DailyMoment, 'status'> & {
    lifecycle: Pick<MomentLifecycle, 'normalExpiresAt' | 'recoveryExpiresAt'>;
  },
  now = new Date(),
): MomentWindow {
  if (moment.status === 'ready' || moment.status === 'revealed') {
    return 'complete';
  }
  if (moment.status === 'expired_incomplete') {
    return 'expired';
  }

  const normalExpiresAt = Date.parse(moment.lifecycle.normalExpiresAt);
  const recoveryExpiresAt = Date.parse(moment.lifecycle.recoveryExpiresAt);
  if (!Number.isFinite(normalExpiresAt) || !Number.isFinite(recoveryExpiresAt)) {
    return 'expired';
  }
  if (now.getTime() < normalExpiresAt) {
    return 'normal';
  }
  return now.getTime() < recoveryExpiresAt ? 'recovery' : 'expired';
}

export function momentRemainingMs(
  moment: Pick<DailyMoment, 'status'> & {
    lifecycle: Pick<MomentLifecycle, 'normalExpiresAt' | 'recoveryExpiresAt'>;
  },
  now = new Date(),
) {
  const window = getMomentWindow(moment, now);
  if (window !== 'normal' && window !== 'recovery') {
    return 0;
  }
  const expiresAt = window === 'normal'
    ? moment.lifecycle.normalExpiresAt
    : moment.lifecycle.recoveryExpiresAt;
  return Math.max(0, Date.parse(expiresAt) - now.getTime());
}

export function formatMomentRemaining(milliseconds: number) {
  const minutes = Math.max(0, Math.ceil(milliseconds / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0
    ? `${hours}h ${String(remainingMinutes).padStart(2, '0')}m`
    : `${remainingMinutes}m`;
}
