import {
  formatMomentRemaining,
  getMomentWindow,
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

  it('distinguishes the normal window, recovery, expiry, and completed states', () => {
    const now = new Date('2026-08-16T12:00:00.000Z');
    const lifecycle = {
      normalExpiresAt: '2026-08-16T13:00:00.000Z',
      recoveryExpiresAt: '2026-08-17T13:00:00.000Z',
    };

    expect(getMomentWindow({ lifecycle, status: 'open' }, now)).toBe('normal');
    expect(
      getMomentWindow(
        { lifecycle, status: 'partially_submitted' },
        new Date('2026-08-16T14:00:00.000Z'),
      ),
    ).toBe('recovery');
    expect(
      getMomentWindow(
        { lifecycle, status: 'partially_submitted' },
        new Date('2026-08-17T14:00:00.000Z'),
      ),
    ).toBe('expired');
    expect(getMomentWindow({ lifecycle, status: 'ready' }, now)).toBe('complete');
  });

  it('formats a remaining duration without hiding a zero deadline', () => {
    expect(formatMomentRemaining(2 * 60 * 60 * 1000 + 7 * 60 * 1000)).toBe('2h 07m');
    expect(formatMomentRemaining(45 * 1000)).toBe('1m');
    expect(formatMomentRemaining(0)).toBe('0m');
  });
});
