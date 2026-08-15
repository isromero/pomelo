import type { PrivateCache } from '@/features/account/application/account-controller';

const privatePrefixes = ['pomelo.private.', 'sb-'];

export class LocalPrivateCache implements PrivateCache {
  async clear() {
    const keys = Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).filter((key): key is string =>
      Boolean(key && privatePrefixes.some((prefix) => key.startsWith(prefix))),
    );

    keys.forEach((key) => localStorage.removeItem(key));
  }
}
