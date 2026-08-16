import AsyncStorage from '@react-native-async-storage/async-storage';

import { LocalMomentDraftStore } from '@/features/moment/infrastructure/local-moment-draft-store';

describe('LocalMomentDraftStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('keeps a Question draft private and removes it after synchronization', async () => {
    const store = new LocalMomentDraftStore();

    await store.save('moment-1', { text: 'Keep this until the network returns.' });

    await expect(store.get('moment-1')).resolves.toEqual({
      text: 'Keep this until the network returns.',
    });
    await store.remove('moment-1');
    await expect(store.get('moment-1')).resolves.toBeNull();
  });

  it('ignores malformed stored drafts', async () => {
    await AsyncStorage.setItem('pomelo.private.moment-draft.moment-1', '{bad');

    await expect(new LocalMomentDraftStore().get('moment-1')).resolves.toBeNull();
  });
});
