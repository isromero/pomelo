export type MomentFormat = 'question';
export type MomentStatus =
  | 'expired_incomplete'
  | 'open'
  | 'partially_submitted'
  | 'ready'
  | 'revealed';
export type QuestionResponseType = 'choice' | 'text';

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
  localDate: string;
  memoryId: string | null;
  ownContribution: Contribution | null;
  pairId: string;
  partner: MomentPartner;
  pomState: 'calm' | 'celebrating' | null;
  prompt: QuestionPrompt;
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
