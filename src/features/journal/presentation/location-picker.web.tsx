import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts } from '@/constants/pomelo-theme';
import type { JournalLocation } from '@/features/journal/domain/journal';
import { useLocale } from '@/localization/locale-provider';

export function LocationPicker({ onChange, value }: { onChange(value: JournalLocation | null): void; value: JournalLocation | null }) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  return (
    <View style={[styles.card, { backgroundColor: colors.informativeSoft }]}>
      <Ionicons color={colors.inkSecondary} name="phone-portrait-outline" size={20} />
      <Text style={[styles.text, { color: colors.inkSecondary }]}>
        {value?.label ?? t('journal.location.mobile')}
      </Text>
      {value ? (
        <Pressable accessibilityRole="button" onPress={() => onChange(null)}>
          <Text style={[styles.remove, { color: colors.actionDeep }]}>{t('journal.location.remove')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', borderRadius: 16, flexDirection: 'row', gap: 10, padding: 13 },
  remove: { fontFamily: fonts.bodyBold, fontSize: 11 },
  text: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12 },
});
