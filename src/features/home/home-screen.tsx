import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { AppHeader } from '@/components/pomelo/app-header';
import { BottomNavigation } from '@/components/pomelo/bottom-navigation';
import { DailyMomentCard, MomentState } from '@/components/pomelo/daily-moment-card';
import { fonts, radii, SemanticColors } from '@/constants/pomelo-theme';
import { useAccount } from '@/features/account/presentation/account-provider';
import type { PairStatus } from '@/features/pair/application/pair-controller';
import { TranslationKey } from '@/localization/catalogs';
import { useLocale } from '@/localization/locale-provider';

const pomHomeReady = require('@/assets/images/pom/pom-calm.png');

const stateOrder: MomentState[] = ['answer', 'waiting', 'ready', 'complete'];

const heroCopy: Record<
  MomentState,
  {
    background: keyof SemanticColors;
    eyebrow: TranslationKey;
    title: TranslationKey;
    progress: TranslationKey;
  }
> = {
  answer: {
    background: 'rewardSoft',
    eyebrow: 'home.hero.answer.eyebrow',
    title: 'home.hero.answer.title',
    progress: 'home.hero.answer.progress',
  },
  waiting: {
    background: 'backgroundRaised',
    eyebrow: 'home.hero.waiting.eyebrow',
    title: 'home.hero.waiting.title',
    progress: 'home.hero.waiting.progress',
  },
  ready: {
    background: 'actionSoft',
    eyebrow: 'home.hero.ready.eyebrow',
    title: 'home.hero.ready.title',
    progress: 'home.hero.ready.progress',
  },
  complete: {
    background: 'rewardSoft',
    eyebrow: 'home.hero.complete.eyebrow',
    title: 'home.hero.complete.title',
    progress: 'home.hero.complete.progress',
  },
};

const waitingHeroCopy = {
  background: 'informativeSoft' as const,
  eyebrow: 'home.waiting.eyebrow' as const,
  progress: 'home.waiting.progress' as const,
  title: 'home.waiting.title' as const,
};

export function HomeScreen({
  pairStatus,
}: {
  pairStatus: Extract<PairStatus, 'active' | 'waiting'>;
}) {
  const { colors } = useAppearance();
  const { controller, profile } = useAccount();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const [momentState, setMomentState] = useState<MomentState>('answer');
  const waitingForPartner = pairStatus === 'waiting';
  const copy = waitingForPartner ? waitingHeroCopy : heroCopy[momentState];

  const advanceMoment = () => {
    const currentIndex = stateOrder.indexOf(momentState);
    setMomentState(stateOrder[(currentIndex + 1) % stateOrder.length]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.shell}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <AppHeader
            avatarKey={profile?.avatarKey ?? 'calm'}
            onAvatarPress={() => void controller.signOut()}
            showStreak={!waitingForPartner}
          />

          <View style={styles.homeContent}>
            <Text style={styles.date}>
              {t(waitingForPartner ? 'home.waiting.date' : 'home.date')}
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
                  <Text style={styles.progressText}>{t(copy.progress)}</Text>
                </View>
              </View>
            </View>

            {waitingForPartner ? (
              <WaitingMomentCard />
            ) : (
              <DailyMomentCard onAction={advanceMoment} state={momentState} />
            )}
          </View>
        </ScrollView>

        <BottomNavigation />
      </View>
    </SafeAreaView>
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
