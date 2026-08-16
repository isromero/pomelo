import {
  isMomentReady,
  isMomentRevealed,
  validateQuestionResponse,
  type QuestionPrompt,
} from '@/features/moment/domain/moment';

const textPrompt: QuestionPrompt = {
  conceptKey: 'small_gesture_smile',
  options: [],
  responseType: 'text',
  text: 'What made you smile?',
};

const choicePrompt: QuestionPrompt = {
  conceptKey: 'weekend_choice',
  options: ['A', 'B', 'C'],
  responseType: 'choice',
  text: 'Which plan would you choose?',
};

describe('Question response rules', () => {
  it('trims and accepts a non-empty text response', () => {
    expect(validateQuestionResponse(textPrompt, { text: '  A small kindness  ' })).toBeNull();
  });

  it('rejects empty and overlong text responses', () => {
    expect(validateQuestionResponse(textPrompt, { text: '   ' })).toBe('empty');
    expect(validateQuestionResponse(textPrompt, { text: 'x'.repeat(1001) })).toBe('tooLong');
  });

  it('accepts one configured choice and rejects unknown choices', () => {
    expect(validateQuestionResponse(choicePrompt, { choice: 'B' })).toBeNull();
    expect(validateQuestionResponse(choicePrompt, { choice: 'D' })).toBe('invalidChoice');
  });
});

describe('Moment lifecycle helpers', () => {
  it('recognizes ready and revealed states without coupling to persistence', () => {
    expect(isMomentReady({ status: 'ready' })).toBe(true);
    expect(isMomentReady({ status: 'revealed' })).toBe(false);
    expect(isMomentRevealed({ status: 'revealed' })).toBe(true);
    expect(isMomentRevealed({ status: 'ready' })).toBe(false);
  });
});
