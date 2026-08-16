export const importantDateKinds = ['custom', 'trip'] as const;
export const importantDateRecurrences = ['once', 'yearly'] as const;

export type ImportantDateKind = (typeof importantDateKinds)[number];
export type ImportantDateRecurrence = (typeof importantDateRecurrences)[number];
export type ImportantDateInput = {
  date: string;
  kind: ImportantDateKind;
  name: string;
  recurrence: ImportantDateRecurrence;
};

export type ImportantDate = ImportantDateInput & {
  id: string;
  pairId: string;
};

export type ImportantDateMember = {
  birthDate: string | null;
  displayName: string;
  userId: string;
};

export type NextImportantDateKind = ImportantDateKind | 'anniversary' | 'birthday';

export type NextImportantDate = {
  date: string;
  daysRemaining: number;
  id: string;
  kind: NextImportantDateKind;
  name: string;
  ownerUserId: string | null;
  recurrence: 'yearly' | ImportantDateRecurrence;
};

export type ImportantDateValidationError =
  | 'date'
  | 'future'
  | 'kind'
  | 'name'
  | 'recurrence';

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateOnly(value: string) {
  const match = dateOnlyPattern.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
}

function dateOrdinal(value: string) {
  const date = parseDateOnly(value);
  return date ? date.getTime() / 86_400_000 : null;
}

function formatDateOnly(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isLeapYear(year: number) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

function dateInYear(value: string, year: number) {
  const date = parseDateOnly(value);
  if (!date) {
    return null;
  }
  const month = date.getUTCMonth() + 1;
  const day = month === 2 && date.getUTCDate() === 29 && !isLeapYear(year)
    ? 28
    : date.getUTCDate();
  return formatDateOnly(year, month, day);
}

function nextYearlyDate(value: string, today: string) {
  const todayDate = parseDateOnly(today);
  if (!todayDate) {
    return null;
  }
  const year = todayDate.getUTCFullYear();
  const current = dateInYear(value, year);
  if (!current) {
    return null;
  }
  return current < today ? dateInYear(value, year + 1) : current;
}

export function getPairLocalDate(now: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      timeZone,
      year: 'numeric',
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return getPairLocalDate(now, 'UTC');
  }
}

export function validateImportantDate(
  input: ImportantDateInput,
  today: string,
): ImportantDateValidationError | null {
  if (!input.name.trim() || input.name.trim().length > 80) {
    return 'name';
  }
  if (!importantDateKinds.includes(input.kind)) {
    return 'kind';
  }
  if (!importantDateRecurrences.includes(input.recurrence)) {
    return 'recurrence';
  }
  const date = dateOrdinal(input.date);
  const todayOrdinal = dateOrdinal(today);
  if (date === null || todayOrdinal === null) {
    return 'date';
  }
  return date > todayOrdinal ? null : 'future';
}

export function getNextImportantDate({
  anniversary,
  dates,
  members,
  now,
  pairId,
  timeZone,
}: {
  anniversary: string;
  dates: ImportantDate[];
  members: ImportantDateMember[];
  now: Date;
  pairId: string;
  timeZone: string;
}) {
  const today = getPairLocalDate(now, timeZone);
  const candidates: NextImportantDate[] = [];
  const anniversaryDate = nextYearlyDate(anniversary, today);

  if (anniversaryDate) {
    candidates.push({
      date: anniversaryDate,
      daysRemaining: (dateOrdinal(anniversaryDate) ?? 0) - (dateOrdinal(today) ?? 0),
      id: `anniversary:${pairId}`,
      kind: 'anniversary',
      name: '',
      ownerUserId: null,
      recurrence: 'yearly',
    });
  }

  for (const member of members) {
    if (!member.birthDate) {
      continue;
    }
    const birthday = nextYearlyDate(member.birthDate, today);
    if (birthday) {
      candidates.push({
        date: birthday,
        daysRemaining: (dateOrdinal(birthday) ?? 0) - (dateOrdinal(today) ?? 0),
        id: `birthday:${member.userId}`,
        kind: 'birthday',
        name: member.displayName,
        ownerUserId: member.userId,
        recurrence: 'yearly',
      });
    }
  }

  for (const importantDate of dates) {
    const date = importantDate.recurrence === 'yearly'
      ? nextYearlyDate(importantDate.date, today)
      : dateOrdinal(importantDate.date) !== null && importantDate.date >= today
        ? importantDate.date
        : null;
    if (date) {
      candidates.push({
        date,
        daysRemaining: (dateOrdinal(date) ?? 0) - (dateOrdinal(today) ?? 0),
        id: importantDate.id,
        kind: importantDate.kind,
        name: importantDate.name,
        ownerUserId: null,
        recurrence: importantDate.recurrence,
      });
    }
  }

  candidates.sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
  return candidates[0] ?? null;
}
