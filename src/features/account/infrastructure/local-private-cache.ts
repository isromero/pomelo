import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PrivateCache } from '@/features/account/application/account-controller';

const privatePrefixes = ['pomelo.private.', 'sb-'];

export class LocalPrivateCache implements PrivateCache {
  async clear() {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
      privatePrefixes.some((prefix) => key.startsWith(prefix)),
    );

    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
    }
  }
}
