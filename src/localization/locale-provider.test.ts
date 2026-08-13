import { resolveLocale } from './locale-provider';

describe('resolveLocale', () => {
  it('uses the first supported device language', () => {
    expect(resolveLocale(['fr', 'en', 'es'])).toBe('en');
  });

  it('falls back to Spanish', () => {
    expect(resolveLocale(['fr', null])).toBe('es');
  });
});
