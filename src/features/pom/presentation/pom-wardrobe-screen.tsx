import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { AppHeader } from '@/components/pomelo/app-header';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import { useAccount } from '@/features/account/account-api';
import type { PairStatus } from '@/features/pair/pair-api';
import { ACCESSORY_MILESTONES, type AccessoryId } from '@/features/pom/domain/progress';
import { PomDisplay } from '@/features/pom/presentation/pom-display';
import { usePomProgress } from '@/features/pom/presentation/progress-provider';
import { useLocale } from '@/localization/locale-provider';

const accessoryNames: Record<AccessoryId, 'pom.accessory.crown' | 'pom.accessory.ribbon' | 'pom.accessory.scarf' | 'pom.accessory.sunhat'> = {
  crown: 'pom.accessory.crown',
  ribbon: 'pom.accessory.ribbon',
  scarf: 'pom.accessory.scarf',
  sunhat: 'pom.accessory.sunhat',
};

export function PomWardrobeScreen({
  pairStatus,
}: {
  pairStatus: Extract<PairStatus, 'active' | 'archived'>;
}) {
  const { colors, resolved } = useAppearance();
  const { profile } = useAccount();
  const { t } = useLocale();
  const { controller, error, progress, busy, status } = usePomProgress();
  const [reaction, setReaction] = useState<'idle' | 'accessoryUnlock'>('idle');
  const styles = createStyles(colors);

  useEffect(() => {
    if (!reaction || reaction === 'idle') {
      return undefined;
    }
    const timer = setTimeout(() => setReaction('idle'), 750);
    return () => clearTimeout(timer);
  }, [reaction]);

  const select = (accessory: AccessoryId | null) => {
    if (!progress || busy) {
      return;
    }
    setReaction('accessoryUnlock');
    void controller.setAccessory(accessory);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.shell}>
        <AppHeader
          avatarKey={profile?.avatarKey ?? 'calm'}
          showStreak={false}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons color={colors.actionDeep} name="arrow-back" size={18} />
            <Text style={styles.backText}>{t('common.back')}</Text>
          </Pressable>
          <Text style={styles.eyebrow}>{t('pom.wardrobe.eyebrow')}</Text>
          <Text style={styles.title}>{t('pom.wardrobe.title')}</Text>
          <Text style={styles.body}>{t('pom.wardrobe.body')}</Text>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>{t('pom.wardrobe.preview')}</Text>
            {status === 'loading' || status === 'idle' ? (
              <ActivityIndicator color={colors.action} size="large" />
            ) : !progress ? (
              <Pressable accessibilityRole="button" onPress={() => void controller.refresh()} style={styles.retryButton}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </Pressable>
            ) : (
              <PomDisplay
                accessibilityLabel={t('pom.wardrobe.preview')}
                accessory={progress.equippedAccessory}
                dark={resolved === 'dark'}
                expression={progress.expression}
                reaction={reaction}
                size={190}
              />
            )}
            <Text style={styles.progressText}>
              {progress?.introduced ? t('pom.wardrobe.introduced') : t('pom.wardrobe.notIntroduced')}
            </Text>
          </View>

          {error ? <Text style={styles.errorText}>{t('pom.wardrobe.error')}</Text> : null}

          <View style={styles.options}>
            <AccessoryOption
              colors={colors}
              disabled={!progress || busy}
              equipped={progress?.equippedAccessory === null}
              icon="remove-circle-outline"
              label={t('pom.wardrobe.none')}
              onPress={() => select(null)}
              styles={styles}
            />
            {ACCESSORY_MILESTONES.map(({ accessory, milestone }) => {
              const unlocked = progress?.unlockedAccessories.includes(accessory) === true;
              return (
                <AccessoryOption
                  colors={colors}
                  disabled={!unlocked || busy}
                  equipped={progress?.equippedAccessory === accessory}
                  icon={unlocked ? 'sparkles-outline' : 'lock-closed-outline'}
                  key={accessory}
                  label={t(accessoryNames[accessory])}
                  lockedLabel={!unlocked ? t('pom.wardrobe.locked').replace('{count}', String(milestone)) : undefined}
                  onPress={() => select(accessory)}
                  styles={styles}
                />
              );
            })}
          </View>
          {pairStatus === 'archived' ? <Text style={styles.archiveText}>{t('pair.archive.body')}</Text> : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function AccessoryOption({
  colors,
  disabled,
  equipped,
  icon,
  label,
  lockedLabel,
  onPress,
  styles,
}: {
  colors: SemanticColors;
  disabled: boolean;
  equipped: boolean;
  icon: 'lock-closed-outline' | 'remove-circle-outline' | 'sparkles-outline';
  label: string;
  lockedLabel?: string;
  onPress(): void;
  styles: ReturnType<typeof createStyles>;
}) {
  const { t } = useLocale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: equipped }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.option, equipped && styles.optionSelected, pressed && styles.pressed]}
    >
      <View style={[styles.optionIcon, equipped && styles.optionIconSelected]}>
        <Ionicons color={equipped ? colors.white : colors.actionDeep} name={icon} size={20} />
      </View>
      <View style={styles.optionCopy}>
        <Text style={[styles.optionTitle, disabled && styles.optionDisabled]}>{label}</Text>
        {lockedLabel ? <Text style={styles.optionMeta}>{lockedLabel}</Text> : null}
        {equipped ? <Text style={styles.optionMeta}>{t('pom.wardrobe.equipped')}</Text> : null}
      </View>
      {!disabled && !equipped ? <Text style={styles.equipText}>{t('pom.wardrobe.equip')}</Text> : null}
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    shell: { alignSelf: 'center', flex: 1, maxWidth: 390, paddingHorizontal: 20, width: '100%' },
    content: { gap: 10, paddingBottom: 28, paddingTop: 10 },
    backButton: { alignItems: 'center', flexDirection: 'row', gap: 7, paddingVertical: 5 },
    backText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 12 },
    eyebrow: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, marginTop: 8 },
    title: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 34, letterSpacing: -1.1, lineHeight: 38 },
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
    previewCard: { alignItems: 'center', backgroundColor: colors.rewardSoft, borderRadius: 28, gap: 8, minHeight: 290, padding: 18 },
    previewLabel: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.7 },
    progressText: { color: colors.inkSecondary, fontFamily: fonts.bodyMedium, fontSize: 11, textAlign: 'center' },
    errorText: { color: colors.actionDeep, fontFamily: fonts.bodyMedium, fontSize: 11 },
    retryButton: { alignItems: 'center', backgroundColor: colors.actionSoft, borderRadius: radii.full, justifyContent: 'center', minHeight: 42, paddingHorizontal: 18 },
    retryText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 11 },
    options: { gap: 9, marginTop: 4 },
    option: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 68, paddingHorizontal: 12 },
    optionSelected: { backgroundColor: colors.action, borderColor: colors.action },
    optionIcon: { alignItems: 'center', backgroundColor: colors.actionSoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
    optionIconSelected: { backgroundColor: colors.actionOverlay },
    optionCopy: { flex: 1, gap: 3 },
    optionTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 },
    optionDisabled: { color: colors.muted },
    optionMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
    equipText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10 },
    archiveText: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
    pressed: { opacity: 0.72 },
  });
