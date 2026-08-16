import type {
  MomentDraftStore,
} from '@/features/moment/application/moment-controller';
import {
  momentDraftKey,
  parseMomentDraft,
} from '@/features/moment/infrastructure/local-moment-draft-store.shared';
import type { QuestionResponse } from '@/features/moment/domain/moment';

export class LocalMomentDraftStore implements MomentDraftStore {
  async get(momentId: string) {
    return parseMomentDraft(globalThis.localStorage?.getItem(momentDraftKey(momentId)) ?? null);
  }

  async remove(momentId: string) {
    globalThis.localStorage?.removeItem(momentDraftKey(momentId));
  }

  async save(momentId: string, response: QuestionResponse) {
    globalThis.localStorage?.setItem(momentDraftKey(momentId), JSON.stringify(response));
  }
}
