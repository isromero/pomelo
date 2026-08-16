import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import { useLocale } from '@/localization/locale-provider';

type PremiumPreviewPanelProps = {
  onMapPress(): void;
  onUnlock(): void;
  onWidgetPress(): void;
};

export function PremiumPreviewPanel({
  onMapPress,
  onUnlock,
  onWidgetPress,
}: PremiumPreviewPanelProps) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);

  return (
    <View style={styles.panel}>
      <View style={styles.heading}>
        <View style={styles.eyebrowRow}>
          <Ionicons color={colors.actionDeep} name="sparkles-outline" size={15} />
          <Text style={styles.eyebrow}>{t('premium.preview.eyebrow')}</Text>
        </View>
        <Text style={styles.title}>{t('premium.preview.title')}</Text>
        <Text style={styles.body}>{t('premium.preview.body')}</Text>
      </View>

      <PreviewCard
        body={t('premium.preview.map.body')}
        icon="map-outline"
        onPress={onMapPress}
        title={t('premium.preview.map.title')}
        styles={styles}
      />
      <PreviewCard
        body={t('premium.preview.widget.body')}
        icon="phone-portrait-outline"
        onPress={onWidgetPress}
        title={t('premium.preview.widget.title')}
        styles={styles}
      />

      <Pressable
        accessibilityRole="button"
        onPress={onUnlock}
        style={({ pressed }) => [styles.unlockButton, pressed && styles.pressed]}>
        <Text style={styles.unlockButtonText}>{t('premium.archive.unlock')}</Text>
        <Ionicons color={colors.white} name="arrow-forward" size={18} />
      </Pressable>
    </View>
  );
}

function PreviewCard({
  body,
  icon,
  onPress,
  title,
  styles,
}: {
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress(): void;
  title: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.previewCard, pressed && styles.pressed]}>
      <View style={styles.previewIcon}>
        <Ionicons color={colors.actionDeep} name={icon} size={22} />
      </View>
      <View style={styles.previewCopy}>
        <View style={styles.previewTitleRow}>
          <Text style={styles.previewTitle}>{title}</Text>
          <Text style={styles.locked}>{t('premium.preview.locked')}</Text>
        </View>
        <Text style={styles.previewBody}>{body}</Text>
        <Text style={styles.previewAction}>{t('premium.preview.open')}</Text>
      </View>
    </Pressable>
  );
}

export function PremiumArchiveCard({
  onUnlock,
}: {
  onUnlock(): void;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  return (
    <View style={styles.archiveCard}>
      <View style={styles.eyebrowRow}>
        <Ionicons color={colors.actionDeep} name="archive-outline" size={16} />
        <Text style={styles.eyebrow}>{t('premium.archive.eyebrow')}</Text>
      </View>
      <Text style={styles.archiveTitle}>{t('premium.archive.title')}</Text>
      <Text style={styles.archiveBody}>{t('premium.archive.body')}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onUnlock}
        style={({ pressed }) => [styles.archiveButton, pressed && styles.pressed]}>
        <Text style={styles.archiveButtonText}>{t('premium.archive.unlock')}</Text>
        <Ionicons color={colors.actionDeep} name="arrow-forward" size={18} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: 26,
      borderWidth: 1,
      gap: 11,
      padding: 16,
    },
    heading: { gap: 7, paddingBottom: 3 },
    eyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
    eyebrow: {
      color: colors.actionDeep,
      fontFamily: fonts.bodyBold,
      fontSize: 9,
      letterSpacing: 0.55,
    },
    title: {
      color: colors.ink,
      fontFamily: fonts.displayBold,
      fontSize: 21,
      letterSpacing: -0.35,
      lineHeight: 26,
    },
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
    previewCard: {
      alignItems: 'center',
      backgroundColor: colors.backgroundRaised,
      borderColor: colors.borderSoft,
      borderRadius: 19,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      minHeight: 86,
      padding: 12,
    },
    previewIcon: {
      alignItems: 'center',
      backgroundColor: colors.rewardSoft,
      borderRadius: 17,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    previewCopy: { flex: 1, gap: 4 },
    previewTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    previewTitle: { color: colors.ink, flex: 1, fontFamily: fonts.bodyBold, fontSize: 12 },
    locked: {
      color: colors.muted,
      fontFamily: fonts.bodyBold,
      fontSize: 8,
      letterSpacing: 0.35,
    },
    previewBody: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 10, lineHeight: 15 },
    previewAction: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10 },
    unlockButton: {
      alignItems: 'center',
      backgroundColor: colors.action,
      borderRadius: radii.full,
      flexDirection: 'row',
      gap: 8,
      height: 50,
      justifyContent: 'center',
      marginTop: 3,
    },
    unlockButtonText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 11 },
    archiveCard: {
      backgroundColor: colors.backgroundRaised,
      borderColor: colors.border,
      borderRadius: 25,
      borderWidth: 1,
      gap: 9,
      padding: 18,
    },
    archiveTitle: {
      color: colors.ink,
      fontFamily: fonts.displayBold,
      fontSize: 21,
      letterSpacing: -0.35,
      lineHeight: 26,
    },
    archiveBody: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
    archiveButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.actionSoft,
      borderRadius: radii.full,
      flexDirection: 'row',
      gap: 7,
      height: 44,
      justifyContent: 'center',
      marginTop: 4,
      paddingHorizontal: 16,
    },
    archiveButtonText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 11 },
    pressed: { opacity: 0.7 },
  });
