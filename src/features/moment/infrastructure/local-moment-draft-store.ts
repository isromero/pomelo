import AsyncStorage from '@react-native-async-storage/async-storage';

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
    return parseMomentDraft(await AsyncStorage.getItem(momentDraftKey(momentId)));
  }

  async remove(momentId: string) {
    await AsyncStorage.removeItem(momentDraftKey(momentId));
  }

  async save(momentId: string, response: QuestionResponse) {
    await AsyncStorage.setItem(momentDraftKey(momentId), JSON.stringify(response));
  }
}
