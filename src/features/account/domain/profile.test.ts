import {
  formatDateOnly,
  validateProfileInput,
} from '@/features/account/domain/profile';

describe('Profile validation', () => {
  it('requires a visible name, avatar, and complete valid birth date', () => {
    expect(
      validateProfileInput(
        {
          appearance: 'system',
          avatarKey: '',
          birthDate: '2020-02-30',
          displayName: ' ',
          locale: 'es',
        },
        new Date(2026, 7, 13),
      ),
    ).toEqual({
      avatarKey: 'required',
      birthDate: 'invalid',
      displayName: 'required',
    });
  });

  it('rejects future dates and unsupported preference values', () => {
    expect(
      validateProfileInput(
        {
          appearance: 'sepia',
          avatarKey: 'calm',
          birthDate: '2026-08-14',
          displayName: 'Irene',
          locale: 'fr',
        },
        new Date(2026, 7, 13),
      ),
    ).toEqual({
      appearance: 'invalid',
      birthDate: 'future',
      locale: 'invalid',
    });
  });

  it('serializes a native date without losing its calendar day', () => {
    expect(formatDateOnly(new Date(1992, 10, 7, 18, 30))).toBe('1992-11-07');
  });
});
