import { resolveAppearance } from './appearance-provider';

describe('resolveAppearance', () => {
  it('follows the device in system mode', () => {
    expect(resolveAppearance('system', 'dark')).toBe('dark');
    expect(resolveAppearance('system', 'light')).toBe('light');
  });

  it('uses explicit overrides independently of the device', () => {
    expect(resolveAppearance('light', 'dark')).toBe('light');
    expect(resolveAppearance('dark', 'light')).toBe('dark');
  });
});
