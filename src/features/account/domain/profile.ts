export const localeValues = ['es', 'en'] as const;
export const appearanceValues = ['system', 'light', 'dark'] as const;
export const avatarKeys = ['calm', 'affectionate', 'surprised'] as const;

export type Locale = (typeof localeValues)[number];
export type Appearance = (typeof appearanceValues)[number];
export type AvatarKey = (typeof avatarKeys)[number];

export type ProfileInput = {
  appearance: Appearance;
  avatarKey: string;
  birthDate: string;
  displayName: string;
  locale: Locale;
};

export type Profile = ProfileInput & {
  userId: string;
};

export type ProfileValidationErrors = Partial<
  Record<keyof ProfileInput, 'future' | 'invalid' | 'required'>
>;

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDateOnly(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value: string) {
  const match = dateOnlyPattern.exec(value);
  if (!match) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day, 12);

  if (
    year < 1900 ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function validateProfileInput(
  input: ProfileInput,
  today = new Date(),
): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};
  const birthDate = parseDateOnly(input.birthDate);

  if (!input.displayName.trim()) {
    errors.displayName = 'required';
  }
  if (!avatarKeys.includes(input.avatarKey as AvatarKey)) {
    errors.avatarKey = input.avatarKey ? 'invalid' : 'required';
  }
  if (!birthDate) {
    errors.birthDate = 'invalid';
  } else if (formatDateOnly(birthDate) > formatDateOnly(today)) {
    errors.birthDate = 'future';
  }
  if (!localeValues.includes(input.locale)) {
    errors.locale = 'invalid';
  }
  if (!appearanceValues.includes(input.appearance)) {
    errors.appearance = 'invalid';
  }

  return errors;
}

export function hasProfileValidationErrors(errors: ProfileValidationErrors) {
  return Object.keys(errors).length > 0;
}
