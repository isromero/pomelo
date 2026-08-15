import AsyncStorage from '@react-native-async-storage/async-storage';

import { LocalPrivateCache } from '@/features/account/infrastructure/local-private-cache';

describe('LocalPrivateCache', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('removes only private native storage entries', async () => {
    await AsyncStorage.multiSet([
      ['pomelo.private.profile', 'profile'],
      ['sb-local-auth-token', 'session'],
      ['pomelo.locale', 'es'],
    ]);

    await new LocalPrivateCache().clear();

    await expect(AsyncStorage.getAllKeys()).resolves.toEqual(['pomelo.locale']);
  });
});
