import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppearancePreference, useAppearance } from '@/appearance/appearance-provider';
import { fonts, SemanticColors } from '@/constants/pomelo-theme';
import { AppLocale, useLocale } from '@/localization/locale-provider';

export function PreferenceControls() {
  const { colors, preference, setPreference } = useAppearance();
  const { locale, setLocale, t } = useLocale();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.group}>
        <Text style={styles.label}>{t('preferences.language')}</Text>
        <View style={styles.options}>
          {(['es', 'en'] as AppLocale[]).map((value) => (
            <Choice
              active={locale === value}
              colors={colors}
              key={value}
              label={value.toUpperCase()}
              onPress={() => void setLocale(value)}
            />
          ))}
        </View>
      </View>
      <View style={styles.group}>
        <Text style={styles.label}>{t('preferences.appearance')}</Text>
        <View style={styles.options}>
          {(['system', 'light', 'dark'] as AppearancePreference[]).map((value) => (
            <Choice
              active={preference === value}
              colors={colors}
              key={value}
              label={t(`preferences.${value}`)}
              onPress={() => void setPreference(value)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function Choice({
  active,
  colors,
  label,
  onPress,
}: {
  active: boolean;
  colors: SemanticColors;
  label: string;
  onPress(): void;
}) {
  const styles = createStyles(colors);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.choice, active && styles.choiceActive]}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    container: { gap: 14, width: '100%' },
    group: { gap: 7 },
    label: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 11 },
    options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: {
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      minHeight: 34,
      justifyContent: 'center',
      paddingHorizontal: 13,
    },
    choiceActive: { backgroundColor: colors.actionSoft, borderColor: colors.action },
    choiceText: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 11 },
    choiceTextActive: { color: colors.actionDeep },
  });
