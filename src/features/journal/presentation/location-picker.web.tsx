import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts } from '@/constants/pomelo-theme';
import type { JournalLocation } from '@/features/journal/domain/journal';
import { useLocale } from '@/localization/locale-provider';

export function LocationPicker({ value }: { onChange(value: JournalLocation | null): void; value: JournalLocation | null }) {
  const { colors } = useAppearance();
  const { locale } = useLocale();
  return (
    <View style={[styles.card, { backgroundColor: colors.informativeSoft }]}>
      <Ionicons color={colors.inkSecondary} name="phone-portrait-outline" size={20} />
      <Text style={[styles.text, { color: colors.inkSecondary }]}>
        {value?.label ?? (locale === 'es' ? 'Añade una ubicación desde la app móvil.' : 'Add a location from the mobile app.')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', borderRadius: 16, flexDirection: 'row', gap: 10, padding: 13 },
  text: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12 },
});
