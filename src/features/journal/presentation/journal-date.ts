import type { AppLocale } from '@/localization/locale-provider';

function dateParts(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day || 1, 12);
}

export function formatJournalDate(value: string, locale: AppLocale, monthOnly = false) {
  return new Intl.DateTimeFormat(locale, monthOnly
    ? { month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
    .format(dateParts(value));
}

export function formatJournalDateRange(
  startDate: string,
  endDate: string | null,
  startTime: string | null,
  locale: AppLocale,
) {
  const date = endDate && endDate !== startDate
    ? `${formatJournalDate(startDate, locale)} - ${formatJournalDate(endDate, locale)}`
    : formatJournalDate(startDate, locale);
  if (!startTime) {
    return date;
  }
  const [hour, minute] = startTime.split(':').map(Number);
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })
    .format(new Date(2000, 0, 1, hour, minute));
  return `${date} - ${time}`;
}
