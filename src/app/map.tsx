import { Redirect } from 'expo-router';

import { EmptyAppSectionScreen } from '@/components/pomelo/empty-app-section-screen';
import { useAccount } from '@/features/account/presentation/account-provider';
import { useMoment } from '@/features/moment/moment-api';
import { PremiumLockedSurface } from '@/features/premium/presentation/premium-locked-surface';
import { PremiumPaywall } from '@/features/premium/presentation/premium-paywall';
import { usePremium } from '@/features/premium/presentation/premium-provider';
import { canBrowsePairApp } from '@/features/pair/application/pair-controller';
import { usePair } from '@/features/pair/presentation/pair-provider';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/pomelo/app-header';
import { BottomNavigation } from '@/components/pomelo/bottom-navigation';
import { useAppearance } from '@/appearance/appearance-provider';
import { useLocale } from '@/localization/locale-provider';
import { fonts, type SemanticColors } from '@/constants/pomelo-theme';
import type { PairStatus } from '@/features/pair/application/pair-controller';

export default function MapRoute() {
  const { status } = useAccount();
  const pair = usePair();

  if (status !== 'ready') {
    return <Redirect href="/" />;
  }
  if (pair.status === 'idle' || pair.status === 'loading') {
    return null;
  }
  if (!canBrowsePairApp(pair.state)) {
    return <Redirect href="/pair" />;
  }
  const pairStatus = pair.state.status;
  const waitingForPartner = pairStatus === 'waiting';
  if (waitingForPartner) {
    return (
      <EmptyAppSectionScreen
        activeTab="map"
        body="section.map.waitingBody"
        eyebrow="section.map.eyebrow"
        icon="map-outline"
        title="section.map.title"
        waitingForPartner
      />
    );
  }
  return <MapContent pairStatus={pairStatus} />;
}

function MapContent({ pairStatus }: { pairStatus: Extract<PairStatus, 'active' | 'archived'> }) {
  const { colors } = useAppearance();
  const { profile } = useAccount();
  const { history, moment } = useMoment();
  const premium = usePremium();
  const premiumActive = premium.access === 'premium';
  const { t } = useLocale();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const styles = createStyles(colors);

  if (!premiumActive && (history.length > 0 || pairStatus === 'archived')) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
        <View style={styles.shell}>
          <AppHeader
            avatarKey={profile?.avatarKey ?? 'calm'}
            streakCount={moment?.streak.current ?? 0}
            showStreak
          />
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.copy}>
              <Text style={styles.eyebrow}>{t('section.map.eyebrow')}</Text>
              <Text style={styles.title}>{t('section.map.title')}</Text>
              <Text style={styles.body}>{t('premium.locked.body')}</Text>
            </View>
            <PremiumLockedSurface kind="map" onUnlock={() => setPaywallVisible(true)} />
          </ScrollView>
          <BottomNavigation activeTab="map" />
        </View>
        <PremiumPaywall
          onClose={() => setPaywallVisible(false)}
          visible={paywallVisible && !premiumActive}
        />
      </SafeAreaView>
    );
  }

  return (
    <EmptyAppSectionScreen
      activeTab="map"
      body={
        pairStatus === 'archived' ? 'premium.map.body' : 'section.map.activeBody'
      }
      eyebrow="section.map.eyebrow"
      icon="map-outline"
      title="section.map.title"
      waitingForPartner={false}
    />
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
    content: { gap: 13, paddingBottom: 18, paddingTop: 18 },
    copy: { gap: 8 },
    eyebrow: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8 },
    title: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 34, letterSpacing: -1.1, lineHeight: 38 },
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
  });
