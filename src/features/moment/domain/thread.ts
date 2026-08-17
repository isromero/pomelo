export type ThreadMessage = {
  authorId: string;
  body: string;
  clientMessageId: string;
  createdAt: string;
  id: string;
};

export type ThreadState = {
  canWrite: boolean;
  targetId: string;
  messages: ThreadMessage[];
};

export type ThreadMessageError = 'empty' | 'tooLong';

export const THREAD_MESSAGE_MAX_LENGTH = 2000;

export function validateThreadMessage(body: string): ThreadMessageError | null {
  const normalized = body.trim();
  if (!normalized) {
    return 'empty';
  }
  return normalized.length > THREAD_MESSAGE_MAX_LENGTH ? 'tooLong' : null;
}

export function normalizeThreadMessage(body: string) {
  return body.trim();
}
