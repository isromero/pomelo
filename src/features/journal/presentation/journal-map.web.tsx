import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts } from '@/constants/pomelo-theme';
import type { JournalMapEntry } from '@/features/journal/domain/journal';
import { useLocale } from '@/localization/locale-provider';

export function JournalMap({ entries, onOpen }: { entries: JournalMapEntry[]; onOpen(id: string): void }) {
  const { colors } = useAppearance();
  const { locale } = useLocale();
  return (
    <View style={styles.shell}>
      <View style={[styles.notice, { backgroundColor: colors.informativeSoft }]}>
        <Ionicons color={colors.inkSecondary} name="map-outline" size={20} />
        <Text style={[styles.noticeText, { color: colors.inkSecondary }]}>{locale === 'es' ? 'El mapa interactivo está disponible en iOS y Android.' : 'The interactive map is available on iOS and Android.'}</Text>
      </View>
      {entries.map((entry) => (
        <Pressable key={entry.id} onPress={() => onOpen(entry.id)} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
          <View style={[styles.dot, { backgroundColor: entry.state === 'upcoming' ? colors.action : colors.positive }]} />
          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.ink }]}>{entry.title}</Text>
            <Text style={[styles.place, { color: colors.inkSecondary }]}>{entry.location.label}</Text>
          </View>
          <Text style={[styles.date, { color: colors.actionDeep }]}>{entry.startDate}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1 }, date: { fontFamily: fonts.bodyBold, fontSize: 10 }, dot: { borderRadius: 7, height: 12, width: 12 },
  notice: { alignItems: 'center', borderRadius: 18, flexDirection: 'row', gap: 10, padding: 14 }, noticeText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12 },
  place: { fontFamily: fonts.body, fontSize: 11 }, row: { alignItems: 'center', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 11, padding: 14 },
  shell: { gap: 10 }, title: { fontFamily: fonts.displayBold, fontSize: 16 },
});
