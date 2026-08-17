export type JournalEntryState = 'lived' | 'ongoing' | 'upcoming';
export type JournalRecurrence = 'once' | 'yearly';

export type JournalLocation = {
  city: string | null;
  countryCode: string | null;
  label: string;
  latitude: number;
  longitude: number;
};

export type JournalMedia = {
  createdBy: string;
  height: number;
  id: string;
  mimeType: 'image/jpeg';
  path: string;
  position: number;
  width: number;
};

export type JournalPhotoDraft = {
  height: number;
  uri: string;
  width: number;
};

export type JournalEntry = {
  body: string | null;
  createdAt: string;
  createdBy: string;
  endDate: string | null;
  id: string;
  location: JournalLocation | null;
  media: JournalMedia[];
  pairId: string;
  recurrence: JournalRecurrence;
  startDate: string;
  startTime: string | null;
  timeZone: string;
  title: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  widgetHidden: boolean;
};

export type JournalEntryInput = {
  body: string;
  endDate: string | null;
  location: JournalLocation | null;
  mediaCount: number;
  recurrence: JournalRecurrence;
  startDate: string;
  startTime: string | null;
  timeZone: string;
  title: string;
  widgetHidden: boolean;
};

export type JournalEntryValidationError =
  | 'body'
  | 'date'
  | 'dateRange'
  | 'location'
  | 'mediaLimit'
  | 'time'
  | 'timeZone'
  | 'title';

export type JournalOccurrence = {
  endDate: string;
  startDate: string;
};

export type JournalMilestone = {
  date: string;
  id: string;
  kind: 'anniversary' | 'birthday';
  name: string;
};

export type JournalHistoryItem = {
  date: string;
  id: string;
  kind: 'entry' | 'memory';
};

export type UpcomingOccurrence = {
  endDate: string;
  id: string;
  kind: 'entry' | 'milestone';
  name: string;
  startDate: string;
  startTime: string | null;
  timeZone: string | null;
};

export type JournalCalendarOccurrence = {
  endDate: string;
  id: string;
  kind: 'manualEntry' | 'milestone' | 'momentMemory';
  name: string;
  startDate: string;
};

export type JournalMapEntry = {
  endDate: string;
  id: string;
  location: JournalLocation;
  startDate: string;
  state: JournalEntryState;
  title: string;
};

export type JournalProjection = {
  calendar: (JournalHistoryItem | UpcomingOccurrence)[];
  history: JournalHistoryItem[];
  map: JournalMapEntry[];
  upcoming: UpcomingOccurrence[];
};

export function nextWidgetOccurrence(
  entries: JournalEntry[],
  upcoming: UpcomingOccurrence[],
  now = new Date(),
) {
  const hiddenEntryIds = new Set(entries.filter((entry) => entry.widgetHidden).map((entry) => entry.id));
  return upcoming
    .filter((item) => item.kind === 'milestone' || !hiddenEntryIds.has(item.id))
    .map((item) => ({ item, window: occurrenceWindow(item) }))
    .filter(({ window }) => window.end >= now.getTime())
    .sort((left, right) => left.window.start - right.window.start || left.item.id.localeCompare(right.item.id))[0]?.item ?? null;
}

function zonedDateTime(value: string, time: string, timeZone: string) {
  const [year, month, day] = value.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit', hour: '2-digit', hourCycle: 'h23', minute: '2-digit',
      month: '2-digit', timeZone, year: 'numeric',
    }).formatToParts(new Date(instant));
    const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(fields.year), Number(fields.month) - 1, Number(fields.day), Number(fields.hour), Number(fields.minute));
    instant = target - (represented - instant);
  }
  return instant;
}

function occurrenceWindow(item: UpcomingOccurrence) {
  const timeZone = item.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const start = zonedDateTime(item.startDate, item.startTime ?? '00:00', timeZone);
    const end = item.startTime && item.endDate === item.startDate
      ? start
      : zonedDateTime(item.endDate, '23:59', timeZone);
    return { end, start };
  } catch {
    const start = Date.parse(`${item.startDate}T${item.startTime ?? '00:00'}:00Z`);
    const end = item.startTime && item.endDate === item.startDate
      ? start
      : Date.parse(`${item.endDate}T23:59:00Z`);
    return { end, start };
  }
}

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

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

function formatDateOnly(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function isLeapYear(year: number) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

function dateInYear(value: string, year: number) {
  const date = parseDateOnly(value);
  if (!date) {
    return null;
  }
  const month = date.getUTCMonth();
  const originalDay = date.getUTCDate();
  const day = month === 1 && originalDay === 29 && !isLeapYear(year) ? 28 : originalDay;
  return new Date(Date.UTC(year, month, day));
}

function nextMilestoneOccurrence(milestone: JournalMilestone, today: string) {
  const todayDate = parseDateOnly(today);
  if (!todayDate) {
    return null;
  }
  let occurrence = dateInYear(milestone.date, todayDate.getUTCFullYear());
  if (!occurrence) {
    return null;
  }
  if (formatDateOnly(occurrence) < today) {
    occurrence = dateInYear(milestone.date, todayDate.getUTCFullYear() + 1);
  }
  return occurrence ? formatDateOnly(occurrence) : null;
}

export function nextJournalOccurrence(
  entry: JournalEntry,
  today: string,
): JournalOccurrence | null {
  const originalStart = parseDateOnly(entry.startDate);
  const originalEnd = parseDateOnly(entry.endDate ?? entry.startDate);
  const todayDate = parseDateOnly(today);
  if (!originalStart || !originalEnd || !todayDate || originalEnd < originalStart) {
    return null;
  }
  if (entry.recurrence === 'once') {
    return (entry.endDate ?? entry.startDate) < today
      ? null
      : { endDate: entry.endDate ?? entry.startDate, startDate: entry.startDate };
  }

  const durationDays = Math.round((originalEnd.getTime() - originalStart.getTime()) / 86_400_000);
  let occurrenceStart = dateInYear(entry.startDate, todayDate.getUTCFullYear());
  if (!occurrenceStart) {
    return null;
  }
  let occurrenceEnd = new Date(occurrenceStart);
  occurrenceEnd.setUTCDate(occurrenceEnd.getUTCDate() + durationDays);
  if (formatDateOnly(occurrenceEnd) < today) {
    occurrenceStart = dateInYear(entry.startDate, todayDate.getUTCFullYear() + 1);
    if (!occurrenceStart) {
      return null;
    }
    occurrenceEnd = new Date(occurrenceStart);
    occurrenceEnd.setUTCDate(occurrenceEnd.getUTCDate() + durationDays);
  }
  return {
    endDate: formatDateOnly(occurrenceEnd),
    startDate: formatDateOnly(occurrenceStart),
  };
}

export function projectJournal({
  entries,
  memories,
  milestones,
  today,
}: {
  entries: JournalEntry[];
  memories: { id: string; localDate: string; revealedAt: string }[];
  milestones: JournalMilestone[];
  today: string;
}): JournalProjection {
  const history: JournalHistoryItem[] = [
    ...memories.map((memory) => ({
      date: memory.localDate,
      id: memory.id,
      kind: 'memory' as const,
    })),
    ...entries
      .filter((entry) => journalEntryState(entry, today) !== 'upcoming')
      .map((entry) => ({ date: entry.startDate, id: entry.id, kind: 'entry' as const })),
  ].sort((left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id));

  const upcomingEntries = entries.flatMap((entry) => {
    const occurrence = nextJournalOccurrence(entry, today);
    if (!occurrence) {
      return [];
    }
    return [{
      ...occurrence,
      id: entry.id,
      kind: 'entry' as const,
      name: entry.title,
      startTime: entry.startTime,
      timeZone: entry.timeZone,
    }];
  });
  const upcomingMilestones = milestones.flatMap((milestone) => {
    const date = nextMilestoneOccurrence(milestone, today);
    return date
      ? [{
        endDate: date,
        id: milestone.id,
        kind: 'milestone' as const,
        name: milestone.name,
        startDate: date,
        startTime: null,
        timeZone: null,
      }]
      : [];
  });
  const upcoming = [...upcomingEntries, ...upcomingMilestones]
    .sort((left, right) => left.startDate.localeCompare(right.startDate)
      || (left.startTime ?? '24:00').localeCompare(right.startTime ?? '24:00')
      || left.id.localeCompare(right.id));

  const map = entries
    .filter((entry): entry is JournalEntry & { location: JournalLocation } => entry.location !== null)
    .flatMap((entry) => {
      const occurrence = entry.recurrence === 'yearly'
        ? nextJournalOccurrence(entry, today)
        : { endDate: entry.endDate ?? entry.startDate, startDate: entry.startDate };
      if (!occurrence) return [];
      const state = today < occurrence.startDate
        ? 'upcoming' as const
        : today <= occurrence.endDate ? 'ongoing' as const : 'lived' as const;
      return [{
        ...occurrence,
        id: entry.id,
        location: entry.location,
        state,
        title: entry.title,
      }];
    })
    .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.id.localeCompare(right.id));

  return {
    calendar: [...history, ...upcoming],
    history,
    map,
    upcoming,
  };
}

export function journalEntryState(entry: JournalEntry, today: string): JournalEntryState {
  if (today < entry.startDate) {
    return 'upcoming';
  }
  if (today <= (entry.endDate ?? entry.startDate)) {
    return 'ongoing';
  }
  return 'lived';
}

export function validateJournalEntryInput(
  input: JournalEntryInput,
): JournalEntryValidationError | null {
  const title = input.title.trim();
  if (!title || title.length > 120) {
    return 'title';
  }
  if (input.body.trim().length > 5000) {
    return 'body';
  }
  if (!parseDateOnly(input.startDate) || (input.endDate && !parseDateOnly(input.endDate))) {
    return 'date';
  }
  if (input.endDate && input.endDate < input.startDate) {
    return 'dateRange';
  }
  if (input.startTime && !timePattern.test(input.startTime)) {
    return 'time';
  }
  if (!input.timeZone.trim() || input.timeZone.length > 100) {
    return 'timeZone';
  }
  if (!Number.isInteger(input.mediaCount) || input.mediaCount < 0 || input.mediaCount > 10) {
    return 'mediaLimit';
  }
  const location = input.location;
  if (location && (
    !location.label.trim()
    || location.label.length > 240
    || !Number.isFinite(location.latitude)
    || !Number.isFinite(location.longitude)
    || location.latitude < -90
    || location.latitude > 90
    || location.longitude < -180
    || location.longitude > 180
  )) {
    return 'location';
  }
  return null;
}
