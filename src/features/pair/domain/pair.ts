export type AnniversaryValidationError = 'future' | 'invalid';

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const compactCodePattern = /^[a-z0-9]{8}$/i;

export function normalizeInvitationCredential(value: string) {
  const trimmed = value.trim();
  const compact = trimmed.replace(/[\s-]/g, '');

  return compactCodePattern.test(compact) ? compact.toUpperCase() : trimmed;
}

export function formatInvitationCode(value: string) {
  const compact = value.replace(/[\s-]/g, '').toUpperCase();
  return compact.length === 8 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : value;
}

export function invitationExpiryDelay(value: string, now = Date.now()) {
  const expiresAt = Date.parse(value);
  return Number.isFinite(expiresAt) ? Math.max(0, expiresAt - now) : 0;
}

export function validateAnniversary(
  value: string,
  today = new Date(),
): AnniversaryValidationError | null {
  const match = dateOnlyPattern.exec(value);
  if (!match) {
    return 'invalid';
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const anniversary = new Date(year, month - 1, day, 12);
  if (
    year < 1900 ||
    anniversary.getFullYear() !== year ||
    anniversary.getMonth() !== month - 1 ||
    anniversary.getDate() !== day
  ) {
    return 'invalid';
  }

  const currentDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12,
  );
  return anniversary > currentDate ? 'future' : null;
}
