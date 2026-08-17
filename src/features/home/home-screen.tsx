import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { AppHeader } from '@/components/pomelo/app-header';
import { BottomNavigation } from '@/components/pomelo/bottom-navigation';
import { fonts, radii, SemanticColors } from '@/constants/pomelo-theme';
import { useAccount } from '@/features/account/presentation/account-provider';
import {
  createDevelopmentPhotoDraft,
  DailyMomentCard,
  initialStreakState,
  type DailyMoment,
  type Memory,
  type MomentErrorCode,
  useDoodleMoment,
  useMoment,
} from '@/features/moment/moment-api';
import { type PairStatus } from '@/features/pair/pair-api';
import { PomDisplay, usePomProgress } from '@/features/pom/pom-api';
import { PremiumPaywall } from '@/features/premium/presentation/premium-paywall';
import { usePremium } from '@/features/premium/presentation/premium-provider';
import { TranslationKey } from '@/localization/catalogs';
import { useLocale } from '@/localization/locale-provider';

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
    return moment?.ownContribution || (moment?.format === 'doodle' && moment.doodle?.ownCompleted)
      ? 'waiting'
      : 'answer';
  }
  if (moment.status === 'ready') {
    return 'ready';
  }
  return 'complete';
}

function dailyMomentFromMemory(memory: Memory): DailyMoment {
  return {
    format: memory.format ?? 'question',
    id: memory.momentId,
    isFree: true,
    lifecycle: {
      normalExpiresAt: memory.revealedAt,
      recoveryExpiresAt: memory.revealedAt,
      window: 'complete',
    },
    localDate: memory.localDate,
    memoryId: memory.id,
    ownContribution: memory.ownContribution,
    pairId: memory.pairId,
    partner: memory.partner,
    pomState: memory.pomState,
    prompt: memory.prompt,
    doodle: memory.doodleDocument
      ? {
          document: memory.doodleDocument,
          ownCompleted: true,
          partnerCompleted: true,
        }
      : null,
    streak: initialStreakState,
    status: 'revealed',
  };
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
  const { colors, resolved } = useAppearance();
  const { profile } = useAccount();
  const { locale, t } = useLocale();
  const momentRuntime = useMoment();
  const createPrivateMediaUrl = useCallback(
    (path: string) => momentRuntime.controller.createPrivateMediaUrl(path),
    [momentRuntime.controller],
  );
  const { controller: doodleController, snapshot: doodle } = useDoodleMoment();
  const pom = usePomProgress();
  const premium = usePremium();
  const styles = createStyles(colors);
  const waitingForPartner = pairStatus === 'waiting';
  const firstMemory = momentRuntime.history[momentRuntime.history.length - 1] ?? null;
  const displayMoment = momentRuntime.moment ?? (firstMemory ? dailyMomentFromMemory(firstMemory) : null);
  const displayError =
    momentRuntime.error === 'premiumRequired' || momentRuntime.error === 'pairNotActive'
      ? null
      : momentRuntime.error;
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [pomReaction, setPomReaction] = useState<'idle' | 'reveal'>('idle');
  const [paywallPending, setPaywallPending] = useState(false);
  const paywallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (
      !paywallPending ||
      premium.access === 'premium' ||
      premium.status === 'idle' ||
      premium.status === 'loading'
    ) {
      return undefined;
    }

    paywallTimerRef.current = setTimeout(() => {
      paywallTimerRef.current = null;
      setPaywallPending(false);
      setPaywallVisible(true);
    }, 450);
    return () => {
      if (paywallTimerRef.current) {
        clearTimeout(paywallTimerRef.current);
        paywallTimerRef.current = null;
      }
    };
  }, [paywallPending, premium.access, premium.status]);

  useEffect(() => () => {
    if (paywallTimerRef.current) {
      clearTimeout(paywallTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (pomReaction === 'idle') {
      return undefined;
    }
    const timer = setTimeout(() => setPomReaction('idle'), 750);
    return () => clearTimeout(timer);
  }, [pomReaction]);

  useEffect(() => {
    if (premium.access === 'premium' && momentRuntime.error === 'premiumRequired') {
      void momentRuntime.controller.refresh();
    }
  }, [momentRuntime.controller, momentRuntime.error, premium.access]);

  const revealMoment = async () => {
    setPomReaction('reveal');
    await momentRuntime.controller.revealMoment();
    const revealedMoment = momentRuntime.controller.getSnapshot().moment;
    if (
      premium.access !== 'premium' &&
      revealedMoment?.status === 'revealed' &&
      revealedMoment.memoryId
    ) {
      setPaywallPending(true);
    }
  };

  const currentMomentState = momentState(displayMoment);
  const copy = waitingForPartner ? waitingHeroCopy : heroCopy[currentMomentState];
  const memoryCount = pom.progress?.memoryCount ?? momentRuntime.history.length;
  const progressText = useMemo(
    () =>
      t(memoryCount === 1 ? 'home.progress.one' : 'home.progress.many').replace(
        '{count}',
        String(memoryCount),
      ),
    [memoryCount, t],
  );
  const showPremiumPrompt =
    pairStatus === 'active' &&
    momentRuntime.status === 'ready' &&
    memoryCount > 0 &&
    premium.access !== 'premium';
  const date = waitingForPartner
    ? t('home.waiting.date')
    : displayMoment
      ? formatMomentDate(displayMoment.localDate, locale)
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
            streakCount={momentRuntime.moment?.streak.current ?? 0}
            showStreak={!waitingForPartner}
          />

          <View style={styles.homeContent}>
            <Text style={styles.date}>
              {date}
            </Text>

            <Pressable
              accessibilityLabel={t('pom.wardrobe.title')}
              accessibilityRole="button"
              disabled={waitingForPartner}
              onPress={() => router.push('/pom')}
              style={({ pressed }) => [
                styles.pomHero,
                { backgroundColor: colors[copy.background] },
                pressed && styles.pressed,
              ]}
            >
              <PomDisplay
                accessory={pom.progress?.equippedAccessory}
                dark={resolved === 'dark'}
                expression={pom.progress?.expression ?? 'calm'}
                reaction={pomReaction}
                size={126}
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
            </Pressable>

            {waitingForPartner ? (
              <WaitingMomentCard />
            ) : momentRuntime.status === 'loading' || momentRuntime.status === 'idle' ? (
              <MomentLoadingCard />
            ) : momentRuntime.status === 'error' || !displayMoment ? (
              <MomentFailureCard
                error={momentRuntime.error}
                onRetry={() => void momentRuntime.controller.refresh()}
              />
            ) : (
              <DailyMomentCard
                busy={momentRuntime.busy}
                createPrivateMediaUrl={createPrivateMediaUrl}
                draft={momentRuntime.draft}
                error={displayError}
                key={displayMoment.id}
                moment={displayMoment}
                onPhotoDraftChange={(draft) => void momentRuntime.controller.savePhotoDraft(draft)}
                onUseTestPhotos={async () => {
                  const draft = await createDevelopmentPhotoDraft(displayMoment.id);
                  await momentRuntime.controller.savePhotoDraft(draft);
                }}
                onPhotoSubmit={() => void momentRuntime.controller.submitPhoto()}
                onReveal={() => void revealMoment()}
                onDraftChange={(draft) => void momentRuntime.controller.saveDraft(draft)}
                onSubmit={(response) => void momentRuntime.controller.submitQuestion(response)}
                doodle={doodle}
                doodleController={doodleController}
                photoDraft={momentRuntime.photoDraft}
                syncPending={momentRuntime.syncPending}
              />
            )}
            {showPremiumPrompt ? (
              <PremiumNextStep
                onPress={() => setPaywallVisible(true)}
                syncing={premium.storeEntitled}
              />
            ) : null}
          </View>
        </ScrollView>

        <BottomNavigation />
      </View>
      <PremiumPaywall
        onClose={() => {
          setPaywallVisible(false);
        }}
        visible={premium.access !== 'premium' && paywallVisible}
      />
    </SafeAreaView>
  );
}

function PremiumNextStep({ onPress, syncing }: { onPress(): void; syncing: boolean }) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityLabel={t('premium.next.cta')}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.premiumPrompt, pressed && styles.pressed]}>
      <View style={styles.premiumPromptHeader}>
        <View style={styles.premiumPromptIcon}>
          <Ionicons color={colors.ink} name="lock-open-outline" size={21} />
        </View>
        <View style={styles.premiumPromptCopy}>
          <Text style={styles.premiumPromptEyebrow}>
            {t(syncing ? 'premium.next.syncEyebrow' : 'premium.next.eyebrow')}
          </Text>
          <Text style={styles.premiumPromptTitle}>
            {t(syncing ? 'premium.next.syncTitle' : 'premium.next.title')}
          </Text>
        </View>
      </View>
      <Text style={styles.premiumPromptBody}>
        {t(syncing ? 'premium.next.syncBody' : 'premium.next.body')}
      </Text>
      <View style={styles.premiumPromptAction}>
        <Text style={styles.premiumPromptActionText}>
          {t(syncing ? 'premium.next.syncCta' : 'premium.next.cta')}
        </Text>
        <Ionicons color={colors.white} name="arrow-forward" size={18} />
      </View>
    </Pressable>
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
  premiumPrompt: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    gap: 15,
    marginTop: 4,
    padding: 18,
  },
  premiumPromptHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  premiumPromptIcon: {
    alignItems: 'center',
    backgroundColor: colors.reward,
    borderRadius: 20,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  premiumPromptCopy: { flex: 1, gap: 3 },
  premiumPromptEyebrow: {
    color: colors.reward,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 0.65,
  },
  premiumPromptTitle: {
    color: colors.background,
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    letterSpacing: -0.25,
    lineHeight: 24,
  },
  premiumPromptBody: {
    color: colors.background,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  premiumPromptAction: {
    alignItems: 'center',
    backgroundColor: colors.action,
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  premiumPromptActionText: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  pressed: { opacity: 0.7 },
});
