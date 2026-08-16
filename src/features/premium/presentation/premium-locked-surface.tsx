import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import { useLocale } from '@/localization/locale-provider';

export function PremiumLockedSurface({
  kind,
  onUnlock,
}: {
  kind: 'map' | 'widget';
  onUnlock(): void;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const map = kind === 'map';

  return (
    <View style={styles.card}>
      <View style={styles.featureStage}>
        <View style={styles.featureShape}>
          <Ionicons
            color={colors.actionDeep}
            name={map ? 'map-outline' : 'phone-portrait-outline'}
            size={46}
          />
        </View>
        <View style={styles.lockBadge}>
          <Ionicons color={colors.white} name="lock-closed" size={14} />
        </View>
      </View>
      <View style={styles.statusPill}>
        <Ionicons color={colors.actionDeep} name="sparkles-outline" size={14} />
        <Text style={styles.statusText}>{t('premium.locked.eyebrow')}</Text>
      </View>
      <Text style={styles.title}>{t(map ? 'premium.map.title' : 'premium.widget.title')}</Text>
      <Text style={styles.body}>{t(map ? 'premium.map.body' : 'premium.widget.body')}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onUnlock}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>{t('premium.unlock')}</Text>
        <Ionicons color={colors.white} name="arrow-forward" size={18} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    card: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: 27,
      borderWidth: 1,
      gap: 13,
      padding: 22,
    },
    featureStage: {
      alignItems: 'center',
      backgroundColor: colors.backgroundRaised,
      borderColor: colors.borderSoft,
      borderRadius: 24,
      borderStyle: 'dashed',
      borderWidth: 1,
      height: 160,
      justifyContent: 'center',
      position: 'relative',
      width: '100%',
    },
    featureShape: {
      alignItems: 'center',
      backgroundColor: colors.rewardSoft,
      borderRadius: 52,
      height: 104,
      justifyContent: 'center',
      width: 104,
    },
    lockBadge: {
      alignItems: 'center',
      backgroundColor: colors.actionDeep,
      borderColor: colors.surface,
      borderRadius: 18,
      borderWidth: 3,
      bottom: 23,
      height: 36,
      justifyContent: 'center',
      position: 'absolute',
      right: '28%',
      width: 36,
    },
    statusPill: {
      alignItems: 'center',
      backgroundColor: colors.actionSoft,
      borderRadius: radii.full,
      flexDirection: 'row',
      gap: 6,
      minHeight: 30,
      paddingHorizontal: 12,
    },
    statusText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.35 },
    title: {
      color: colors.ink,
      fontFamily: fonts.displayBold,
      fontSize: 22,
      lineHeight: 27,
      textAlign: 'center',
    },
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 19, maxWidth: 310, textAlign: 'center' },
    button: {
      alignItems: 'center',
      backgroundColor: colors.action,
      borderRadius: radii.full,
      flexDirection: 'row',
      gap: 8,
      height: 51,
      justifyContent: 'center',
      marginTop: 3,
      width: '100%',
    },
    buttonText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 11 },
    pressed: { opacity: 0.7 },
  });
