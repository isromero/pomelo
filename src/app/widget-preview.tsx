import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { AppHeader } from '@/components/pomelo/app-header';
import { BottomNavigation } from '@/components/pomelo/bottom-navigation';
import { fonts, type SemanticColors } from '@/constants/pomelo-theme';
import { useAccount } from '@/features/account/presentation/account-provider';
import { useMoment } from '@/features/moment/moment-api';
import { usePair } from '@/features/pair/presentation/pair-provider';
import { PremiumLockedSurface } from '@/features/premium/presentation/premium-locked-surface';
import { PremiumPaywall } from '@/features/premium/presentation/premium-paywall';
import { usePremium } from '@/features/premium/presentation/premium-provider';
import { canBrowsePairApp } from '@/features/pair/application/pair-controller';
import { useLocale } from '@/localization/locale-provider';

export default function WidgetPreviewRoute() {
  const { colors } = useAppearance();
  const { status, profile } = useAccount();
  const pair = usePair();
  const { history, moment } = useMoment();
  const premium = usePremium();
  const { t } = useLocale();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const styles = createStyles(colors);

  if (status !== 'ready') {
    return <Redirect href="/" />;
  }
  if (pair.status === 'idle' || pair.status === 'loading') {
    return null;
  }
  if (!canBrowsePairApp(pair.state)) {
    return <Redirect href="/pair" />;
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.shell}>
        <AppHeader
          avatarKey={profile?.avatarKey ?? 'calm'}
          streakCount={moment?.streak.current ?? 0}
          showStreak={pair.state.status !== 'waiting'}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>{t('premium.locked.eyebrow')}</Text>
          <Text style={styles.title}>{t('premium.widget.title')}</Text>
          <Text style={styles.body}>{t('premium.locked.body')}</Text>
          {pair.state.status === 'waiting' || history.length === 0 ? (
            <Text style={styles.body}>{t('section.history.waitingBody')}</Text>
          ) : premium.access === 'premium' ? (
            <Text style={styles.body}>{t('premium.widget.body')}</Text>
          ) : (
            <PremiumLockedSurface kind="widget" onUnlock={() => setPaywallVisible(true)} />
          )}
        </ScrollView>
        <BottomNavigation />
      </View>
      <PremiumPaywall
        onClose={() => setPaywallVisible(false)}
        visible={paywallVisible && premium.access !== 'premium'}
      />
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
    eyebrow: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8 },
    title: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 34, letterSpacing: -1.1, lineHeight: 38 },
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
  });
