import type { QuestionResponse } from '@/features/moment/domain/moment';

const keyPrefix = 'pomelo.private.moment-draft.';

export function momentDraftKey(momentId: string) {
  return `${keyPrefix}${momentId}`;
}

export function parseMomentDraft(value: string | null): QuestionResponse | null {
  if (!value) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    const response = parsed as Record<string, unknown>;
    if (typeof response.choice === 'string') {
      return { choice: response.choice };
    }
    if (typeof response.text === 'string') {
      return { text: response.text };
    }
    return null;
  } catch {
    return null;
  }
}
