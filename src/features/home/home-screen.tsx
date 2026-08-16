import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { AppHeader } from '@/components/pomelo/app-header';
import { BottomNavigation } from '@/components/pomelo/bottom-navigation';
import { fonts, radii, SemanticColors } from '@/constants/pomelo-theme';
import { useAccount } from '@/features/account/presentation/account-provider';
import type { MomentErrorCode } from '@/features/moment/application/moment-controller';
import type { DailyMoment, Memory } from '@/features/moment/domain/moment';
import { DailyMomentCard } from '@/features/moment/presentation/daily-moment-card';
import { useMoment } from '@/features/moment/presentation/moment-provider';
import type { PairStatus } from '@/features/pair/application/pair-controller';
import { PremiumArchiveCard, PremiumPreviewPanel } from '@/features/premium/presentation/premium-preview-panel';
import { PremiumPaywall } from '@/features/premium/presentation/premium-paywall';
import { usePremium } from '@/features/premium/presentation/premium-provider';
import { TranslationKey } from '@/localization/catalogs';
import { useLocale } from '@/localization/locale-provider';

const pomHomeReady = require('@/assets/images/pom/pom-calm.png');

type MomentState = 'answer' | 'complete' | 'ready' | 'waiting';

const heroCopy: Record<
  MomentState,
  {
    background: keyof SemanticColors;
    eyebrow: TranslationKey;
    title: TranslationKey;
  }
> = {
  answer: {
    background: 'rewardSoft',
    eyebrow: 'home.hero.answer.eyebrow',
    title: 'home.hero.answer.title',
  },
  waiting: {
    background: 'backgroundRaised',
    eyebrow: 'home.hero.waiting.eyebrow',
    title: 'home.hero.waiting.title',
  },
  ready: {
    background: 'actionSoft',
    eyebrow: 'home.hero.ready.eyebrow',
    title: 'home.hero.ready.title',
  },
  complete: {
    background: 'rewardSoft',
    eyebrow: 'home.hero.complete.eyebrow',
    title: 'home.hero.complete.title',
  },
};

const waitingHeroCopy = {
  background: 'informativeSoft' as const,
  eyebrow: 'home.waiting.eyebrow' as const,
  title: 'home.waiting.title' as const,
};

function momentState(moment: DailyMoment | null): MomentState {
  if (!moment || moment.status === 'open' || moment.status === 'partially_submitted') {
    return moment?.ownContribution ? 'waiting' : 'answer';
  }
  if (moment.status === 'ready') {
    return 'ready';
  }
  return 'complete';
}

function formatMomentDate(value: string, locale: 'en' | 'es') {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date(year, month - 1, day, 12));
}

function momentErrorKey(error: MomentErrorCode | null): TranslationKey {
  switch (error) {
    case 'invalidResponse':
      return 'moment.error.invalidResponse';
    case 'momentClosed':
      return 'moment.error.momentClosed';
    case 'momentNotReady':
      return 'moment.error.momentNotReady';
    case 'network':
      return 'moment.error.network';
    default:
      return 'moment.error.unexpected';
  }
}

export function HomeScreen({
  pairStatus,
}: {
  pairStatus: Extract<PairStatus, 'active' | 'archived' | 'waiting'>;
}) {
  const { colors } = useAppearance();
  const { controller, profile } = useAccount();
  const { locale, t } = useLocale();
  const momentRuntime = useMoment();
  const premium = usePremium();
  const styles = createStyles(colors);
  const waitingForPartner = pairStatus === 'waiting';
  const archiveFromServer =
    pairStatus === 'archived' ||
    momentRuntime.error === 'premiumRequired' ||
    momentRuntime.error === 'pairNotActive';
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [dismissedMemoryId, setDismissedMemoryId] = useState<string | null>(null);
  const promptedMemoryIdRef = useRef<string | null>(null);
  const currentMemoryId = momentRuntime.moment?.memoryId ?? momentRuntime.history[0]?.id ?? null;

  useEffect(() => {
    if (premium.access === 'premium') {
      promptedMemoryIdRef.current = null;
      return undefined;
    }
    if (
      momentRuntime.status !== 'ready' ||
      premium.status === 'idle' ||
      premium.status === 'loading' ||
      !currentMemoryId ||
      promptedMemoryIdRef.current === currentMemoryId
    ) {
      return undefined;
    }

    promptedMemoryIdRef.current = currentMemoryId;
    const timer = setTimeout(() => setPaywallVisible(true), 450);
    return () => clearTimeout(timer);
  }, [currentMemoryId, momentRuntime.status, premium.access, premium.status]);

  const archiveMode =
    premium.access !== 'premium' &&
    (archiveFromServer ||
      premium.access === 'archive' ||
      (dismissedMemoryId !== null && dismissedMemoryId === currentMemoryId));
  const currentMomentState = archiveMode ? 'complete' : momentState(momentRuntime.moment);
  const copy = waitingForPartner ? waitingHeroCopy : heroCopy[currentMomentState];
  const memoryCount = momentRuntime.history.length;
  const progressText = useMemo(
    () =>
      t(memoryCount === 1 ? 'home.progress.one' : 'home.progress.many').replace(
        '{count}',
        String(memoryCount),
      ),
    [memoryCount, t],
  );
  const date = waitingForPartner
    ? t('home.waiting.date')
    : archiveMode
      ? t('premium.archive.eyebrow')
    : momentRuntime.moment
      ? formatMomentDate(momentRuntime.moment.localDate, locale)
      : t('home.date');

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.shell}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <AppHeader
            avatarKey={profile?.avatarKey ?? 'calm'}
            onAvatarPress={() => void controller.signOut()}
            showStreak={!waitingForPartner}
          />

          <View style={styles.homeContent}>
            <Text style={styles.date}>
              {date}
            </Text>

            <View style={[styles.pomHero, { backgroundColor: colors[copy.background] }]}>
              <Image
                resizeMode="contain"
                source={pomHomeReady}
                style={styles.pomImage}
              />

              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>{t(copy.eyebrow)}</Text>
                <Text style={styles.heroTitle}>{t(copy.title)}</Text>
                <View style={styles.progressPill}>
                  <Text style={styles.progressText}>
                    {waitingForPartner ? t('home.waiting.progress') : progressText}
                  </Text>
                </View>
              </View>
            </View>

            {waitingForPartner ? (
              <WaitingMomentCard />
            ) : archiveFromServer && !momentRuntime.moment ? (
              <ArchiveModeContent
                hasMemory={momentRuntime.history.length > 0}
                memory={momentRuntime.history[0] ?? null}
                onUnlock={() => setPaywallVisible(true)}
              />
            ) : momentRuntime.status === 'loading' || momentRuntime.status === 'idle' ? (
              <MomentLoadingCard />
            ) : momentRuntime.status === 'error' || !momentRuntime.moment ? (
              <MomentFailureCard
                error={momentRuntime.error}
                onRetry={() => void momentRuntime.controller.refresh()}
              />
            ) : (
              <DailyMomentCard
                busy={momentRuntime.busy}
                error={momentRuntime.error}
                key={momentRuntime.moment.id}
                moment={momentRuntime.moment}
                onReveal={() => void momentRuntime.controller.revealMoment()}
                onSubmit={(response) => void momentRuntime.controller.submitQuestion(response)}
              />
            )}

            {!waitingForPartner && premium.access !== 'premium' && momentRuntime.history.length > 0 && (
              <>
                {archiveMode && (
                  <PremiumArchiveCard onUnlock={() => setPaywallVisible(true)} />
                )}
                <PremiumPreviewPanel
                  onMapPress={() => router.push('/map')}
                  onUnlock={() => setPaywallVisible(true)}
                  onWidgetPress={() => router.push('/widget-preview')}
                />
              </>
            )}
          </View>
        </ScrollView>

        <BottomNavigation />
      </View>
      <PremiumPaywall
        onClose={() => {
          setPaywallVisible(false);
          if (currentMemoryId) {
            setDismissedMemoryId(currentMemoryId);
          }
        }}
        visible={premium.access !== 'premium' && paywallVisible}
      />
    </SafeAreaView>
  );
}

function ArchiveModeContent({
  hasMemory,
  memory,
  onUnlock,
}: {
  hasMemory: boolean;
  memory: Memory | null;
  onUnlock(): void;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  return (
    <View style={[styles.statusCard, styles.archiveStatusCard]}>
      <Ionicons color={colors.actionDeep} name="archive-outline" size={40} />
      <Text style={styles.archiveStatusTitle}>{t('premium.archive.title')}</Text>
      <Text style={styles.statusText}>
        {hasMemory ? t('premium.archive.body') : t('premium.map.body')}
      </Text>
      {memory && <ArchiveMemoryHighlight memory={memory} />}
      <Pressable
        accessibilityRole="button"
        onPress={onUnlock}
        style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
        <Text style={styles.retryButtonText}>{t('premium.archive.unlock')}</Text>
      </Pressable>
    </View>
  );
}

function ArchiveMemoryHighlight({ memory }: { memory: Memory }) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const partnerText = memory.partner.contribution
    ? memory.partner.contribution.responseText ?? memory.partner.contribution.responseChoice ?? ''
    : t('history.missingContribution');
  const ownText = memory.ownContribution.responseText ?? memory.ownContribution.responseChoice ?? '';
  return (
    <View style={styles.memoryHighlight}>
      <Text style={styles.memoryPrompt}>{memory.prompt.text}</Text>
      <View style={styles.memoryBubblePartner}>
        <Text style={styles.memorySender}>{memory.partner.displayName}</Text>
        <Text style={styles.memoryText}>{partnerText}</Text>
      </View>
      <View style={styles.memoryBubbleOwn}>
        <Text style={styles.memorySender}>{t('moment.you')}</Text>
        <Text style={styles.memoryText}>{ownText}</Text>
      </View>
    </View>
  );
}

function WaitingMomentCard() {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);

  return (
    <View style={styles.waitingCard}>
      <View style={styles.waitingMeta}>
        <View style={styles.waitingChip}>
          <Text style={styles.waitingChipText}>{t('home.waiting.kind')}</Text>
        </View>
        <Ionicons color={colors.muted} name="lock-closed-outline" size={18} />
      </View>
      <View style={styles.waitingIllustration}>
        <View style={styles.waitingOrbitOuter}>
          <View style={styles.waitingOrbitInner}>
            <Ionicons color={colors.action} name="heart" size={34} />
          </View>
        </View>
        <View style={[styles.waitingPerson, styles.waitingPersonLeft]}>
          <Ionicons color={colors.actionDeep} name="person" size={18} />
        </View>
        <View style={[styles.waitingPerson, styles.waitingPersonRight]}>
          <Ionicons color={colors.muted} name="person-outline" size={18} />
        </View>
      </View>
      <View style={styles.waitingCopy}>
        <Text style={styles.waitingTitle}>{t('home.waiting.cardTitle')}</Text>
        <Text style={styles.waitingBody}>{t('home.waiting.cardBody')}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/pair')}
        style={({ pressed }) => [styles.waitingAction, pressed && styles.pressed]}>
        <Text style={styles.waitingActionText}>{t('home.waiting.cardAction')}</Text>
        <Ionicons color={colors.white} name="arrow-forward" size={18} />
      </Pressable>
    </View>
  );
}

function MomentLoadingCard() {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  return (
    <View style={[styles.statusCard, styles.statusCardCentered]}>
      <ActivityIndicator color={colors.action} size="large" />
      <Text style={styles.statusText}>{t('runtime.loading')}</Text>
    </View>
  );
}

function MomentFailureCard({
  error,
  onRetry,
}: {
  error: MomentErrorCode | null;
  onRetry(): void;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  return (
    <View style={[styles.statusCard, styles.statusCardCentered]}>
      <Ionicons color={colors.actionDeep} name="cloud-offline-outline" size={38} />
      <Text style={styles.statusText}>{t(error ? momentErrorKey(error) : 'moment.loadFailure')}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
        <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: SemanticColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  shell: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 390,
    paddingBottom: 16,
    paddingHorizontal: 20,
    width: '100%',
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 12,
  },
  homeContent: {
    gap: 14,
    width: '100%',
  },
  date: {
    color: colors.inkSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    height: 18,
    letterSpacing: 0.55,
    lineHeight: 18,
  },
  pomHero: {
    alignItems: 'center',
    backgroundColor: colors.rewardSoft,
    borderRadius: 28,
    flexDirection: 'row',
    gap: 12,
    height: 174,
    overflow: 'hidden',
    padding: 18,
    width: '100%',
  },
  pomImage: {
    height: 98,
    width: 126,
  },
  heroCopy: {
    gap: 7,
    height: 122,
    justifyContent: 'center',
    width: 176,
  },
  heroEyebrow: {
    color: colors.inkSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: colors.ink,
    fontFamily: fonts.displayBold,
    fontSize: 21,
    height: 50,
    letterSpacing: -0.25,
    lineHeight: 25,
    width: 176,
  },
  progressPill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 132,
  },
  progressText: {
    color: colors.action,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  waitingCard: {
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 15,
    minHeight: 418,
    padding: 18,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    minHeight: 240,
    padding: 22,
  },
  statusCardCentered: { alignItems: 'center', gap: 16, justifyContent: 'center' },
  archiveStatusCard: { alignItems: 'center', gap: 12, justifyContent: 'center', paddingVertical: 28 },
  archiveStatusTitle: {
    color: colors.ink,
    fontFamily: fonts.displayBold,
    fontSize: 21,
    lineHeight: 26,
    textAlign: 'center',
  },
  memoryHighlight: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: 19,
    borderWidth: 1,
    gap: 8,
    padding: 13,
  },
  memoryPrompt: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 20 },
  memoryBubblePartner: {
    alignSelf: 'flex-start',
    backgroundColor: colors.backgroundRaised,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    gap: 3,
    maxWidth: '90%',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  memoryBubbleOwn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.actionSoft,
    borderRadius: 14,
    borderBottomRightRadius: 4,
    gap: 3,
    maxWidth: '90%',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  memorySender: {
    color: colors.inkSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  memoryText: { color: colors.ink, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
  statusText: {
    color: colors.inkSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
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
  retryButtonText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 12 },
  waitingMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  waitingChip: {
    alignItems: 'center',
    backgroundColor: colors.actionSoft,
    borderRadius: radii.full,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  waitingChipText: {
    color: colors.actionDeep,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 0.45,
  },
  waitingIllustration: {
    alignItems: 'center',
    height: 125,
    justifyContent: 'center',
  },
  waitingOrbitOuter: {
    alignItems: 'center',
    borderColor: colors.borderSoft,
    borderRadius: 58,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 116,
    justifyContent: 'center',
    width: 116,
  },
  waitingOrbitInner: {
    alignItems: 'center',
    backgroundColor: colors.rewardSoft,
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  waitingPerson: {
    alignItems: 'center',
    backgroundColor: colors.actionSoft,
    borderColor: colors.surface,
    borderRadius: 20,
    borderWidth: 3,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    top: 43,
    width: 40,
  },
  waitingPersonLeft: { left: 56 },
  waitingPersonRight: { backgroundColor: colors.backgroundRaised, right: 56 },
  waitingCopy: { alignItems: 'center', gap: 7 },
  waitingTitle: {
    color: colors.ink,
    fontFamily: fonts.displayExtraBold,
    fontSize: 21,
    letterSpacing: -0.35,
    lineHeight: 25,
    textAlign: 'center',
  },
  waitingBody: {
    color: colors.inkSecondary,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 17,
    maxWidth: 290,
    textAlign: 'center',
  },
  waitingAction: {
    alignItems: 'center',
    backgroundColor: colors.action,
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 'auto',
  },
  waitingActionText: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  pressed: { opacity: 0.7 },
});
