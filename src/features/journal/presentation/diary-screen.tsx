import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { AppHeader } from '@/components/pomelo/app-header';
import { BottomNavigation } from '@/components/pomelo/bottom-navigation';
import { fonts, type SemanticColors } from '@/constants/pomelo-theme';
import { useAccount } from '@/features/account/presentation/account-provider';
import type { JournalCalendarOccurrence, JournalEntry, JournalHistoryItem, JournalProjection, UpcomingOccurrence } from '@/features/journal/domain/journal';
import { JournalEditor } from '@/features/journal/presentation/journal-editor';
import { JournalMap } from '@/features/journal/presentation/journal-map';
import { useJournal } from '@/features/journal/presentation/journal-provider';
import { PrivateJournalImage } from '@/features/journal/presentation/private-journal-image';
import { ThreadPanel, useMoment } from '@/features/moment/moment-api';
import { useLocale } from '@/localization/locale-provider';

type DiaryView = 'history' | 'calendar' | 'map';

function formatDate(value: string, locale: 'es' | 'en', monthOnly = false) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, monthOnly
    ? { month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, day || 1, 12));
}

export function DiaryScreen() {
  const params = useLocalSearchParams<{ entryId?: string; view?: string }>();
  const { colors } = useAppearance();
  const { locale, t } = useLocale();
  const { profile, user } = useAccount();
  const moment = useMoment();
  const journal = useJournal();
  const styles = createStyles(colors);
  const initialView = params.view === 'calendar' || params.view === 'map' ? params.view : 'history';
  const [view, setView] = useState<DiaryView>(initialView);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(params.entryId ?? null);
  const selected = journal.entries.find((candidate) => candidate.id === selectedId) ?? null;
  const editingEntry = editing
    ? journal.entries.find((candidate) => candidate.id === editing.id) ?? editing
    : null;
  const copy = {
    by: t('journal.by'), calendar: t('journal.calendar'), close: t('common.close'), edit: t('journal.edit'),
    empty: t('journal.empty'), history: t('journal.history'), lived: t('journal.lived'), map: t('journal.map'),
    memory: t('journal.memory'), next: t('journal.next'), partner: t('journal.partner'), subtitle: t('journal.subtitle'),
    title: t('journal.title'), upcoming: t('journal.upcoming'), you: t('journal.you'),
  };

  const openEntry = (id: string) => {
    setSelectedId(id);
  };

  const openEditor = (entry: JournalEntry | null) => {
    setEditing(entry);
    setEditorVisible(true);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.shell}>
        <AppHeader avatarKey={profile?.avatarKey ?? 'calm'} showStreak streakCount={moment.moment?.streak.current ?? 0} />
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => openEditor(null)} style={styles.add}>
            <Ionicons color={colors.white} name="add" size={25} />
          </Pressable>
        </View>
        <View style={styles.segmented}>
          {(['history', 'calendar', 'map'] as const).map((item) => (
            <Pressable key={item} onPress={() => setView(item)} style={[styles.segment, view === item && styles.segmentActive]}>
              <Text style={[styles.segmentText, view === item && styles.segmentTextActive]}>{copy[item]}</Text>
            </Pressable>
          ))}
        </View>
        {journal.status === 'loading' ? <ActivityIndicator color={colors.action} style={styles.loader} /> : null}
        {view === 'history' ? (
          <HistoryView copy={copy} entries={journal.entries} items={journal.projection.history} locale={locale} memories={moment.history} onOpenEntry={openEntry} upcoming={journal.projection.upcoming} />
        ) : null}
        {view === 'calendar' ? (
          <CalendarView calendar={journal.projection.calendar} controller={journal.controller} entries={journal.entries} locale={locale} memories={moment.history} onOpenEntry={openEntry} />
        ) : null}
        {view === 'map' ? <ScrollView contentContainerStyle={styles.mapContent}><JournalMap entries={journal.projection.map} onOpen={openEntry} /></ScrollView> : null}
        <BottomNavigation activeTab="diary" />
      </View>
      {editorVisible ? <JournalEditor entry={editingEntry} onClose={() => { setEditorVisible(false); setEditing(null); }} visible /> : null}
      <Modal animationType="slide" onRequestClose={() => setSelectedId(null)} presentationStyle="pageSheet" visible={selected !== null}>
        {selected ? (
          <SafeAreaView style={styles.detailScreen}>
            <View style={styles.detailHeader}>
              <Pressable onPress={() => setSelectedId(null)}><Text style={styles.detailAction}>{copy.close}</Text></Pressable>
              <Pressable onPress={() => { const entry = selected; setSelectedId(null); openEditor(entry); }}><Text style={styles.detailAction}>{copy.edit}</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.detailContent}>
              <Text style={styles.detailDate}>{formatDate(selected.startDate, locale)} · {selected.startDate > new Date().toISOString().slice(0, 10) ? copy.upcoming : copy.lived}</Text>
              <Text style={styles.detailTitle}>{selected.title}</Text>
              {selected.body ? <Text style={styles.detailBody}>{selected.body}</Text> : null}
              {selected.location ? <View style={styles.place}><Ionicons color={colors.actionDeep} name="location" size={18} /><Text style={styles.placeText}>{selected.location.label}</Text></View> : null}
              {selected.media.length ? <ScrollView horizontal contentContainerStyle={styles.detailPhotos}>{selected.media.map((media) => <PrivateJournalImage key={media.id} media={media} style={stylesBase.detailImage} />)}</ScrollView> : null}
              <Text style={styles.author}>{copy.by} {selected.createdBy === user?.id ? copy.you : copy.partner}</Text>
              {user ? <ThreadPanel controller={journal.threadController} ownUserId={user.id} targetId={selected.id} /> : null}
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

function HistoryView({ copy, entries, items, locale, memories, onOpenEntry, upcoming }: {
  copy: Record<string, string>;
  entries: JournalEntry[];
  items: JournalHistoryItem[];
  locale: 'es' | 'en';
  memories: ReturnType<typeof useMoment>['history'];
  onOpenEntry(id: string): void;
  upcoming: UpcomingOccurrence[];
}) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {upcoming.length ? <Text style={styles.sectionLabel}>{copy.next}</Text> : null}
      {upcoming.length ? (
        <ScrollView horizontal contentContainerStyle={styles.upcomingRow} showsHorizontalScrollIndicator={false}>
          {upcoming.map((item) => (
            <Pressable disabled={item.kind === 'milestone'} key={`${item.kind}-${item.id}-${item.startDate}`} onPress={() => onOpenEntry(item.id)} style={styles.upcomingCard}>
              <Text style={styles.upcomingDate}>{formatDate(item.startDate, locale)}</Text>
              <Text numberOfLines={2} style={styles.upcomingName}>{item.name}</Text>
              <Ionicons color={colors.action} name={item.kind === 'milestone' ? 'gift-outline' : 'navigate-outline'} size={18} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.timeline}>
        <View style={styles.line} />
        {items.length === 0 ? <Text style={styles.empty}>{copy.empty}</Text> : items.map((item) => {
          const entry = item.kind === 'entry' ? entries.find((candidate) => candidate.id === item.id) : null;
          const memory = item.kind === 'memory' ? memories.find((candidate) => candidate.id === item.id) : null;
          if (!entry && !memory) return null;
          return (
            <Pressable key={`${item.kind}-${item.id}`} onPress={() => item.kind === 'entry' ? onOpenEntry(item.id) : router.push({ pathname: '/history', params: { memoryId: item.id } })} style={styles.timelineRow}>
              <View style={[styles.timelineDot, item.kind === 'memory' && styles.pomDot]}>{item.kind === 'memory' ? <Text style={styles.pomMark}>P</Text> : null}</View>
              <View style={styles.historyCard}>
                <Text style={styles.historyDate}>{formatDate(item.date, locale)}</Text>
                <Text style={styles.historyTitle}>{entry?.title ?? memory?.prompt.text ?? copy.memory}</Text>
                <Text numberOfLines={2} style={styles.historyBody}>{entry?.body ?? (memory ? copy.memory : '')}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function monthDays(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const firstWeekday = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const count = new Date(year, monthNumber, 0).getDate();
  return [...Array(firstWeekday).fill(null), ...Array.from({ length: count }, (_, index) => `${year}-${String(monthNumber).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`)];
}

function CalendarView({ calendar, controller, entries, locale, memories, onOpenEntry }: {
  calendar: JournalProjection['calendar']; controller: ReturnType<typeof useJournal>['controller']; entries: JournalEntry[]; locale: 'es' | 'en'; memories: ReturnType<typeof useMoment>['history']; onOpenEntry(id: string): void;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const days = monthDays(month);
  const fallbackItems = useMemo(() => {
    const unique = new Map<string, { date: string; id: string; kind: 'entry' | 'memory' | 'milestone'; title: string }>();
    for (const item of calendar) {
      const date = 'date' in item ? item.date : item.startDate;
      const entry = item.kind === 'entry' ? entries.find((candidate) => candidate.id === item.id) : null;
      const memory = item.kind === 'memory' ? memories.find((candidate) => candidate.id === item.id) : null;
      const title = item.kind === 'milestone' ? item.name : entry?.title ?? memory?.prompt.text;
      if (title) unique.set(`${item.kind}:${item.id}:${date}`, { date, id: item.id, kind: item.kind, title });
    }
    return [...unique.values()];
  }, [calendar, entries, memories]);
  const [occurrences, setOccurrences] = useState<JournalCalendarOccurrence[] | null>(null);
  useEffect(() => {
    let active = true;
    const [year, monthNumber] = month.split('-').map(Number);
    const rangeEnd = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`;
    void controller.getCalendar(`${month}-01`, rangeEnd).then((result) => {
      if (active && result) setOccurrences(result);
    });
    return () => { active = false; };
  }, [controller, month]);
  const items = occurrences?.map((item) => ({
    date: item.startDate,
    endDate: item.endDate,
    id: item.id,
    kind: item.kind === 'manualEntry' ? 'entry' as const : item.kind === 'momentMemory' ? 'memory' as const : 'milestone' as const,
    title: item.kind === 'milestone'
      ? item.name === 'anniversary' ? t('journal.milestone.anniversary') : `${t('journal.milestone.birthday')} ${item.name}`
      : item.name,
  })) ?? fallbackItems.map((item) => ({ ...item, endDate: item.date }));
  const selectedItems = selectedDate ? items.filter((item) => item.date <= selectedDate && item.endDate >= selectedDate) : [];
  const move = (offset: number) => {
    const [year, monthNumber] = month.split('-').map(Number);
    const next = new Date(year, monthNumber - 1 + offset, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
    setOccurrences(null);
    setSelectedDate(null);
  };
  const weekday = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
    .format(new Date(2024, 0, index + 1)));
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}><Pressable onPress={() => move(-1)}><Ionicons color={colors.ink} name="chevron-back" size={22} /></Pressable><Text style={styles.calendarMonth}>{formatDate(`${month}-01`, locale, true)}</Text><Pressable onPress={() => move(1)}><Ionicons color={colors.ink} name="chevron-forward" size={22} /></Pressable></View>
        <View style={styles.calendarGrid}>{weekday.map((label, index) => <Text key={`${label}-${index}`} style={styles.weekday}>{label}</Text>)}{days.map((date, index) => date ? (
          <Pressable key={date} onPress={() => setSelectedDate(date)} style={[styles.day, selectedDate === date && styles.daySelected]}>
            <Text style={[styles.dayText, selectedDate === date && styles.dayTextSelected]}>{Number(date.slice(-2))}</Text>
            {items.some((item) => item.date <= date && item.endDate >= date) ? <View style={styles.dayDot} /> : null}
          </Pressable>
        ) : <View key={`blank-${index}`} style={styles.day} />)}</View>
      </View>
      {selectedDate ? <Text style={styles.sectionLabel}>{formatDate(selectedDate, locale)}</Text> : null}
      {selectedItems.map((item) => (
        <Pressable disabled={item.kind === 'milestone'} key={`${item.kind}-${item.id}`} onPress={() => item.kind === 'entry' ? onOpenEntry(item.id) : router.push({ pathname: '/history', params: { memoryId: item.id } })} style={styles.calendarItem}>
          <Ionicons color={colors.actionDeep} name={item.kind === 'milestone' ? 'gift-outline' : item.kind === 'memory' ? 'sparkles-outline' : 'book-outline'} size={20} />
          <Text style={styles.calendarItemText}>{item.title}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const stylesBase = StyleSheet.create({ detailImage: { borderRadius: 18, height: 180, overflow: 'hidden', width: 220 } });

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  add: { alignItems: 'center', backgroundColor: colors.action, borderRadius: 22, height: 46, justifyContent: 'center', width: 46 }, author: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 11 },
  calendarCard: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: 24, borderWidth: 1, padding: 14 }, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 12 }, calendarItem: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 17, flexDirection: 'row', gap: 10, padding: 14 },
  calendarItemText: { color: colors.ink, flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 13 }, calendarMonth: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 19, textTransform: 'capitalize' },
  content: { gap: 12, paddingBottom: 18 }, day: { alignItems: 'center', borderRadius: 15, height: 46, justifyContent: 'center', width: '14.285%' }, dayDot: { backgroundColor: colors.action, borderRadius: 3, bottom: 5, height: 5, position: 'absolute', width: 5 },
  daySelected: { backgroundColor: colors.action }, dayText: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12 }, dayTextSelected: { color: colors.white },
  detailAction: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 13 }, detailBody: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 15, lineHeight: 23 }, detailContent: { gap: 16, padding: 22, paddingBottom: 60 },
  detailDate: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 11, textTransform: 'uppercase' }, detailHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 }, detailPhotos: { gap: 10 }, detailScreen: { backgroundColor: colors.background, flex: 1 },
  detailTitle: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 34, lineHeight: 37 }, empty: { color: colors.inkSecondary, fontFamily: fonts.bodyMedium, marginLeft: 30, padding: 20 },
  headingCopy: { flex: 1, gap: 2 }, headingRow: { alignItems: 'center', flexDirection: 'row', gap: 12 }, historyBody: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 }, historyCard: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: 20, borderWidth: 1, flex: 1, gap: 4, padding: 15 },
  historyDate: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'uppercase' }, historyTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 18 }, line: { backgroundColor: colors.border, bottom: 12, left: 10, position: 'absolute', top: 12, width: 2 },
  loader: { flex: 1 }, mapContent: { paddingBottom: 18 }, place: { alignItems: 'center', backgroundColor: colors.actionSoft, borderRadius: 16, flexDirection: 'row', gap: 7, padding: 12 }, placeText: { color: colors.actionDeep, flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  pomDot: { backgroundColor: colors.reward, borderColor: colors.surface }, pomMark: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 9 }, screen: { backgroundColor: colors.background, flex: 1 },
  sectionLabel: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase' }, segment: { alignItems: 'center', borderRadius: 14, flex: 1, paddingVertical: 9 }, segmentActive: { backgroundColor: colors.surfaceStrong },
  segmented: { backgroundColor: colors.backgroundRaised, borderRadius: 17, flexDirection: 'row', padding: 4 }, segmentText: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 11 }, segmentTextActive: { color: colors.actionDeep },
  shell: { flex: 1, gap: 14, paddingHorizontal: 20 }, subtitle: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12 }, timeline: { gap: 10, position: 'relative' }, timelineDot: { alignItems: 'center', backgroundColor: colors.action, borderColor: colors.background, borderRadius: 11, borderWidth: 3, height: 22, justifyContent: 'center', marginTop: 14, width: 22, zIndex: 1 },
  timelineRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 9 }, title: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 30, letterSpacing: -0.8 }, upcomingCard: { backgroundColor: colors.rewardSoft, borderRadius: 19, gap: 6, minHeight: 118, padding: 14, width: 175 },
  upcomingDate: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, textTransform: 'uppercase' }, upcomingName: { color: colors.ink, flex: 1, fontFamily: fonts.displayBold, fontSize: 17 }, upcomingRow: { gap: 10 }, weekday: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 10, textAlign: 'center', width: '14.285%' },
});
