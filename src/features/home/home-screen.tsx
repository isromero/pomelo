import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { BottomNavigation } from '@/components/pomelo/bottom-navigation';
import { DailyMomentCard, MomentState } from '@/components/pomelo/daily-moment-card';
import { Avatar } from '@/components/pomelo/avatar';
import { fonts, radii, SemanticColors } from '@/constants/pomelo-theme';
import type { AvatarKey } from '@/features/account/domain/profile';
import { useAccount } from '@/features/account/presentation/account-provider';
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

function AppHeader({ avatarKey, onSignOut }: { avatarKey: AvatarKey; onSignOut(): void }) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  return (
    <View style={styles.header}>
      <Text style={styles.wordmark}>{t('home.wordmark')}</Text>

      <View style={styles.headerActions}>
        <View style={styles.streak}>
          <Ionicons color={colors.action} name="flame" size={18} />
          <Text style={styles.streakText}>{t('home.streak')}</Text>
        </View>

        <Pressable
          accessibilityLabel={t('common.signOut')}
          accessibilityRole="button"
          onPress={onSignOut}
          style={styles.avatar}>
          <Avatar avatarKey={avatarKey} size={40} />
        </Pressable>
      </View>
    </View>
  );
}

export function HomeScreen() {
  const { colors } = useAppearance();
  const { controller, profile } = useAccount();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const [momentState, setMomentState] = useState<MomentState>('answer');
  const copy = heroCopy[momentState];

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
            onSignOut={() => void controller.signOut()}
          />

          <View style={styles.homeContent}>
            <Text style={styles.date}>{t('home.date')}</Text>

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

            <DailyMomentCard onAction={advanceMoment} state={momentState} />
          </View>
        </ScrollView>

        <BottomNavigation
          onSelect={(tab) => {
            if (tab === 'couple') {
              router.push('/pair');
            }
          }}
        />
      </View>
    </SafeAreaView>
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-between',
    overflow: 'hidden',
    width: '100%',
  },
  wordmark: {
    color: colors.ink,
    fontFamily: fonts.displayExtraBold,
    fontSize: 26,
    letterSpacing: -1.1,
    lineHeight: 32,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    height: 44,
    justifyContent: 'flex-end',
    width: 150,
  },
  streak: {
    alignItems: 'center',
    backgroundColor: colors.actionSoft,
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 6,
    height: 40,
    justifyContent: 'center',
    width: 94,
  },
  streakText: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
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
});
