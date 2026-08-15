import {
  formatInvitationCode,
  normalizeInvitationCredential,
  validateAnniversary,
} from '@/features/pair/domain/pair';

describe('Pair domain', () => {
  it('normalizes a manually entered Invitation code', () => {
    expect(normalizeInvitationCredential(' abcd-ef12 ')).toBe('ABCDEF12');
  });

  it('preserves a link token while trimming surrounding whitespace', () => {
    const token = '9e70da75-3c4e-4a9f-90e2-cfbf9bd82ea0';

    expect(normalizeInvitationCredential(`  ${token}  `)).toBe(token);
  });

  it('formats compact Invitation codes for sharing', () => {
    expect(formatInvitationCode('ABCDEF12')).toBe('ABCD-EF12');
  });

  it('accepts a real anniversary that is not in the future', () => {
    expect(validateAnniversary('2021-06-12', new Date(2026, 7, 15))).toBeNull();
  });

  it('rejects invalid and future anniversaries', () => {
    expect(validateAnniversary('2025-02-30', new Date(2026, 7, 15))).toBe('invalid');
    expect(validateAnniversary('2027-01-01', new Date(2026, 7, 15))).toBe('future');
  });
});
