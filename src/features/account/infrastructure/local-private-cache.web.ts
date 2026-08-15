import type { PrivateCache } from '@/features/account/application/account-controller';

const privatePrefixes = ['pomelo.private.', 'sb-'];

export class LocalPrivateCache implements PrivateCache {
  async clear() {
    const storage = globalThis.localStorage;
    if (!storage) {
      return;
    }

    const keys = Array.from({ length: storage.length }, (_, index) =>
      storage.key(index),
    ).filter((key): key is string =>
      Boolean(key && privatePrefixes.some((prefix) => key.startsWith(prefix))),
    );

    keys.forEach((key) => storage.removeItem(key));
  }
}
