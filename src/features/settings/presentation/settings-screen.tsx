import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import {
  type DevelopmentMoment,
  DevelopmentToolsError,
  type DevelopmentToolsErrorCode,
} from '@/features/development/application/development-tools';
import { createDevelopmentTools } from '@/features/development/infrastructure/create-development-tools';
import { useAccount, useAccountClient } from '@/features/account/presentation/account-provider';
import { useMoment } from '@/features/moment/moment-api';
import type { TranslationKey } from '@/localization/catalogs';
import { useLocale } from '@/localization/locale-provider';

function formatKey(format: DevelopmentMoment['format']): TranslationKey {
  switch (format) {
    case 'photo':
      return 'moment.kind.photo';
    case 'doodle':
      return 'moment.kind.doodle';
    default:
      return 'moment.kind.question';
  }
}

function errorKey(error: DevelopmentToolsErrorCode): TranslationKey {
  switch (error) {
    case 'firstMomentRequired':
      return 'settings.develop.error.firstMoment';
    case 'momentInProgress':
      return 'settings.develop.error.momentInProgress';
    case 'notAllowed':
      return 'settings.develop.error.notAllowed';
    case 'promptUnavailable':
      return 'settings.develop.error.promptUnavailable';
    case 'network':
      return 'settings.develop.error.network';
    default:
      return 'settings.develop.error.generic';
  }
}

export function SettingsScreen() {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const { controller: accountController, profile, user } = useAccount();
  const client = useAccountClient();
  const moment = useMoment();
  const styles = createStyles(colors);
  const tools = useMemo(() => createDevelopmentTools(client), [client]);
  const [advanceBusy, setAdvanceBusy] = useState(false);
  const [advanceError, setAdvanceError] = useState<DevelopmentToolsErrorCode | null>(null);
  const [advancedMoment, setAdvancedMoment] = useState<DevelopmentMoment | null>(null);

  const advanceDay = async () => {
    if (!tools || advanceBusy) {
      return;
    }
    setAdvanceBusy(true);
    setAdvanceError(null);
    setAdvancedMoment(null);
    try {
      const nextMoment = await tools.advanceDay();
      setAdvancedMoment(nextMoment);
      await moment.controller.refresh();
    } catch (error) {
      const errorCode = error instanceof DevelopmentToolsError ? error.code : 'unexpected';
      if (errorCode === 'momentInProgress') {
        await moment.controller.refresh();
      }
      setAdvanceError(errorCode);
    } finally {
      setAdvanceBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons color={colors.ink} name="arrow-back" size={23} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t('settings.title')}</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>{t('settings.eyebrow')}</Text>
          <Text style={styles.title}>{t('settings.title')}</Text>
          <Text style={styles.body}>{t('settings.body')}</Text>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.accountIcon}>
            <Ionicons color={colors.ink} name="person-outline" size={22} />
          </View>
          <View style={styles.accountCopy}>
            <Text style={styles.accountName}>{profile?.displayName ?? user?.displayNameHint ?? ''}</Text>
            <Text style={styles.accountEmail}>{user?.email ?? t('settings.account.noEmail')}</Text>
          </View>
        </View>

        {__DEV__ && (
          <View style={styles.developCard}>
            <View style={styles.developEyebrowRow}>
              <Ionicons color={colors.action} name="flask-outline" size={17} />
              <Text style={styles.developEyebrow}>{t('settings.develop.eyebrow')}</Text>
            </View>
            <Text style={styles.developTitle}>{t('settings.develop.title')}</Text>
            <Text style={styles.developBody}>{t('settings.develop.body')}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={advanceBusy}
              onPress={() => void advanceDay()}
              style={({ pressed }) => [
                styles.developButton,
                advanceBusy && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {advanceBusy ? (
                <>
                  <ActivityIndicator color={colors.ink} />
                  <Text style={styles.developButtonText}>{t('settings.develop.advancing')}</Text>
                </>
              ) : (
                <>
                  <Ionicons color={colors.ink} name="sunny-outline" size={19} />
                  <Text style={styles.developButtonText}>{t('settings.develop.advance')}</Text>
                </>
              )}
            </Pressable>
            {advancedMoment && (
              <View style={styles.resultBox}>
                <Ionicons color={colors.positive} name="checkmark-circle" size={18} />
                <Text style={styles.resultText}>
                  {t('settings.develop.result')
                    .replace('{date}', advancedMoment.localDate)
                    .replace('{format}', t(formatKey(advancedMoment.format)))}
                </Text>
              </View>
            )}
            {advanceError && <Text style={styles.errorText}>{t(errorKey(advanceError))}</Text>}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => void accountController.signOut()}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}>
          <Ionicons color={colors.actionDeep} name="log-out-outline" size={19} />
          <Text style={styles.signOutText}>{t('settings.signOut')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: {
    alignSelf: 'center',
    gap: 18,
    maxWidth: 430,
    paddingBottom: 32,
    paddingHorizontal: 22,
    width: '100%',
  },
  topBar: { alignItems: 'center', flexDirection: 'row', height: 52, justifyContent: 'space-between' },
  backButton: { alignItems: 'center', borderRadius: radii.full, height: 42, justifyContent: 'center', width: 42 },
  topBarTitle: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14 },
  topBarSpacer: { height: 42, width: 42 },
  intro: { gap: 7 },
  eyebrow: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.7 },
  title: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 36, letterSpacing: -1.2 },
  body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, maxWidth: 340 },
  accountCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    padding: 17,
  },
  accountIcon: {
    alignItems: 'center',
    backgroundColor: colors.actionSoft,
    borderRadius: radii.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  accountCopy: { flex: 1, gap: 3 },
  accountName: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14 },
  accountEmail: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 11 },
  developCard: {
    backgroundColor: colors.ink,
    borderRadius: radii.xl,
    gap: 12,
    padding: 20,
  },
  developEyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  developEyebrow: { color: colors.action, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.65 },
  developTitle: { color: colors.background, fontFamily: fonts.displayBold, fontSize: 25, letterSpacing: -0.45 },
  developBody: { color: colors.borderSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  developButton: {
    alignItems: 'center',
    backgroundColor: colors.action,
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 3,
  },
  developButtonText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 },
  resultBox: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  resultText: { color: colors.positive, flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 17 },
  errorText: { color: colors.action, fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 17 },
  signOutButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  signOutText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 12 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
});
