import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { AppHeader } from '@/components/pomelo/app-header';
import { BottomNavigation } from '@/components/pomelo/bottom-navigation';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import type { MomentErrorCode } from '@/features/moment/application/moment-controller';
import type { Contribution, Memory } from '@/features/moment/domain/moment';
import { useMoment } from '@/features/moment/presentation/moment-provider';
import { useAccount } from '@/features/account/presentation/account-provider';
import type { TranslationKey } from '@/localization/catalogs';
import { useLocale } from '@/localization/locale-provider';

function formatMemoryDate(value: string, locale: 'en' | 'es') {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12));
}

function contributionText(contribution: Contribution) {
  return contribution.responseText ?? contribution.responseChoice ?? '';
}

function errorKey(error: MomentErrorCode | null): TranslationKey {
  return error === 'network' ? 'moment.error.network' : 'moment.error.unexpected';
}

function MemoryCard({ memory }: { memory: Memory }) {
  const { colors } = useAppearance();
  const { locale, t } = useLocale();
  const styles = createStyles(colors);
  return (
    <View style={styles.memoryCard}>
      <View style={styles.memoryMeta}>
        <Text style={styles.memoryDate}>{formatMemoryDate(memory.localDate, locale)}</Text>
        <View style={styles.pomPill}>
          <Ionicons color={colors.actionDeep} name="sparkles-outline" size={14} />
          <Text style={styles.pomText}>{t('history.pom')}</Text>
        </View>
      </View>
      <Text style={styles.prompt}>{memory.prompt.text}</Text>
      <View style={styles.conversation}>
        <View style={styles.bubbleRow}>
          <View style={[styles.conversationBubble, styles.partnerBubble]}>
            <Text style={styles.sender}>{memory.partner.displayName}</Text>
            <Text style={styles.conversationText}>
              {memory.partner.contribution
                ? contributionText(memory.partner.contribution)
                : t('history.missingContribution')}
            </Text>
          </View>
        </View>
        <View style={[styles.bubbleRow, styles.ownRow]}>
          <View style={[styles.conversationBubble, styles.ownBubble]}>
            <Text style={styles.sender}>{t('moment.you')}</Text>
            <Text style={styles.conversationText}>
              {contributionText(memory.ownContribution)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function HistoryScreen() {
  const { colors } = useAppearance();
  const { controller: accountController, profile } = useAccount();
  const { error, history, status, controller } = useMoment();
  const { t } = useLocale();
  const styles = createStyles(colors);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.shell}>
        <AppHeader
          avatarKey={profile?.avatarKey ?? 'calm'}
          onAvatarPress={() => void accountController.signOut()}
          showStreak
        />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>{t('section.history.eyebrow')}</Text>
          <Text style={styles.title}>{t('history.title')}</Text>
          <Text style={styles.body}>{t('history.body')}</Text>

          {status === 'loading' || status === 'idle' ? (
            <View style={[styles.emptyCard, styles.centered]}>
              <ActivityIndicator color={colors.action} size="large" />
              <Text style={styles.emptyBody}>{t('runtime.loading')}</Text>
            </View>
          ) : status === 'error' ? (
            <View style={[styles.emptyCard, styles.centered]}>
              <Ionicons color={colors.actionDeep} name="cloud-offline-outline" size={38} />
              <Text style={styles.emptyBody}>{t(errorKey(error))}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void controller.refresh()}
                style={styles.retryButton}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : history.length === 0 ? (
            <View style={[styles.emptyCard, styles.centered]}>
              <View style={styles.iconCircle}>
                <Ionicons color={colors.actionDeep} name="journal-outline" size={42} />
              </View>
              <Text style={styles.emptyTitle}>{t('history.emptyTitle')}</Text>
              <Text style={styles.emptyBody}>{t('history.emptyBody')}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/home')}
                style={styles.homeButton}>
                <Text style={styles.homeButtonText}>{t('history.homeAction')}</Text>
              </Pressable>
            </View>
          ) : (
            history.map((memory) => <MemoryCard key={memory.id} memory={memory} />)
          )}
        </ScrollView>
        <BottomNavigation activeTab="history" />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    shell: {
      alignSelf: 'center',
      flex: 1,
      maxWidth: 390,
      paddingBottom: 16,
      paddingHorizontal: 20,
      width: '100%',
    },
    content: { gap: 10, paddingBottom: 18, paddingTop: 18 },
    eyebrow: {
      color: colors.actionDeep,
      fontFamily: fonts.bodyBold,
      fontSize: 10,
      letterSpacing: 0.8,
    },
    title: {
      color: colors.ink,
      fontFamily: fonts.displayExtraBold,
      fontSize: 34,
      letterSpacing: -1.1,
      lineHeight: 38,
    },
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
    memoryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: 26,
      borderWidth: 1,
      gap: 14,
      marginTop: 12,
      padding: 17,
    },
    memoryMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    memoryDate: {
      color: colors.inkSecondary,
      fontFamily: fonts.bodyBold,
      fontSize: 10,
      letterSpacing: 0.35,
    },
    pomPill: {
      alignItems: 'center',
      backgroundColor: colors.rewardSoft,
      borderRadius: radii.full,
      flexDirection: 'row',
      gap: 5,
      minHeight: 28,
      paddingHorizontal: 10,
    },
    pomText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 9 },
    prompt: {
      color: colors.ink,
      fontFamily: fonts.displayBold,
      fontSize: 18,
      lineHeight: 24,
    },
    conversation: { gap: 8 },
    bubbleRow: { flexDirection: 'row' },
    ownRow: { justifyContent: 'flex-end' },
    conversationBubble: {
      borderRadius: 17,
      gap: 5,
      maxWidth: '88%',
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    partnerBubble: { backgroundColor: colors.backgroundRaised, borderBottomLeftRadius: 5 },
    ownBubble: { backgroundColor: colors.actionSoft, borderBottomRightRadius: 5 },
    sender: {
      color: colors.inkSecondary,
      fontFamily: fonts.bodyBold,
      fontSize: 9,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    conversationText: { color: colors.ink, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
    emptyCard: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: 26,
      borderWidth: 1,
      gap: 14,
      marginTop: 20,
      minHeight: 320,
      padding: 24,
    },
    centered: { alignItems: 'center', justifyContent: 'center' },
    iconCircle: {
      alignItems: 'center',
      backgroundColor: colors.rewardSoft,
      borderRadius: 52,
      height: 104,
      justifyContent: 'center',
      width: 104,
    },
    emptyTitle: {
      color: colors.ink,
      fontFamily: fonts.displayBold,
      fontSize: 20,
      lineHeight: 25,
      textAlign: 'center',
    },
    emptyBody: {
      color: colors.inkSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 19,
      maxWidth: 290,
      textAlign: 'center',
    },
    retryButton: {
      alignItems: 'center',
      backgroundColor: colors.actionSoft,
      borderRadius: radii.full,
      height: 46,
      justifyContent: 'center',
      paddingHorizontal: 22,
    },
    retryText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 12 },
    homeButton: {
      alignItems: 'center',
      backgroundColor: colors.action,
      borderRadius: radii.full,
      height: 48,
      justifyContent: 'center',
      paddingHorizontal: 22,
    },
    homeButtonText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
  });
