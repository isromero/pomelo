import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { AppHeader } from '@/components/pomelo/app-header';
import { BottomNavigation } from '@/components/pomelo/bottom-navigation';
import { EmptyAppSectionScreen } from '@/components/pomelo/empty-app-section-screen';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import { useAccount } from '@/features/account/presentation/account-provider';
import { useMoment } from '@/features/moment/moment-api';
import { canBrowsePairApp, type PairStatus } from '@/features/pair/application/pair-controller';
import { usePair } from '@/features/pair/presentation/pair-provider';
import { PremiumLockedSurface } from '@/features/premium/presentation/premium-locked-surface';
import { PremiumPaywall } from '@/features/premium/presentation/premium-paywall';
import { usePremium } from '@/features/premium/presentation/premium-provider';
import { useLocale } from '@/localization/locale-provider';

function formatMapDate(value: string, locale: 'en' | 'es') {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12));
}

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
  const { history, map, moment } = useMoment();
  const premium = usePremium();
  const premiumActive = premium.access === 'premium';
  const { locale, t } = useLocale();
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

  return <MapMemoryContent entries={map} locale={locale} pairStatus={pairStatus} />;
}

function MapMemoryContent({
  entries,
  locale,
  pairStatus,
}: {
  entries: ReturnType<typeof useMoment>['map'];
  locale: 'en' | 'es';
  pairStatus: Extract<PairStatus, 'active' | 'archived'>;
}) {
  const { colors } = useAppearance();
  const { profile } = useAccount();
  const { moment } = useMoment();
  const { t } = useLocale();
  const styles = createStyles(colors);

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
            <Text style={styles.body}>{t('section.map.activeBody')}</Text>
          </View>
          <View style={styles.readOnlyPill}>
            <Ionicons color={colors.inkSecondary} name="eye-outline" size={15} />
            <Text style={styles.readOnlyText}>{t('map.readOnly')}</Text>
          </View>
          {entries.length === 0 ? (
            <View style={[styles.emptyCard, styles.centered]}>
              <View style={styles.iconCircle}>
                <Ionicons color={colors.actionDeep} name="map-outline" size={38} />
              </View>
              <Text style={styles.emptyTitle}>{t('map.emptyTitle')}</Text>
              <Text style={styles.emptyBody}>{t('map.emptyBody')}</Text>
              {pairStatus === 'active' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/history')}
                  style={styles.historyButton}>
                  <Text style={styles.historyButtonText}>{t('map.backToHistory')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              <View accessibilityLabel={t('map.readOnly')} style={styles.mapBoard}>
                <View style={styles.mapGrid} />
                {entries.map((entry, index) => (
                  <View
                    key={entry.memoryId}
                    style={[
                      styles.mapPin,
                      {
                        left: `${14 + ((index * 31) % 72)}%`,
                        top: `${18 + ((index * 43) % 57)}%`,
                      },
                    ]}>
                    <View style={styles.mapPinDot}>
                      <Ionicons color={colors.white} name="location" size={14} />
                    </View>
                    <Text numberOfLines={1} style={styles.mapPinLabel}>{entry.city}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.memoryCount}>{t('map.memoryCount').replace('{count}', String(entries.length))}</Text>
              <View style={styles.memoryList}>
                {entries.map((entry) => (
                  <Pressable
                    accessibilityLabel={`${t('map.openMemory')}: ${entry.city}`}
                    accessibilityRole="button"
                    key={entry.memoryId}
                    onPress={() =>
                      router.push({
                        pathname: '/history',
                        params: { memoryId: entry.memoryId },
                      })
                    }
                    style={({ pressed }) => [styles.memoryRow, pressed && styles.pressed]}>
                    <View style={styles.memoryLocationIcon}>
                      <Ionicons color={colors.actionDeep} name="location-outline" size={18} />
                    </View>
                    <View style={styles.memoryRowCopy}>
                      <Text style={styles.memoryCity}>{entry.city}</Text>
                      <Text style={styles.memoryDate}>{formatMapDate(entry.localDate, locale)}</Text>
                    </View>
                    <Ionicons color={colors.actionDeep} name="arrow-forward" size={17} />
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>
        <BottomNavigation activeTab="map" />
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
    content: { gap: 13, paddingBottom: 18, paddingTop: 18 },
    copy: { gap: 8 },
    eyebrow: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8 },
    title: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 34, letterSpacing: -1.1, lineHeight: 38 },
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
    readOnlyPill: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.backgroundRaised, borderRadius: radii.full, flexDirection: 'row', gap: 7, paddingHorizontal: 11, paddingVertical: 8 },
    readOnlyText: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.35 },
    mapBoard: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: 26, borderWidth: 1, height: 208, marginTop: 7, overflow: 'hidden', position: 'relative' },
    mapGrid: { backgroundColor: colors.actionSoft, borderRadius: 120, height: 320, left: -70, opacity: 0.55, position: 'absolute', top: -56, transform: [{ rotate: '-12deg' }], width: 520 },
    mapPin: { alignItems: 'center', maxWidth: 112, position: 'absolute' },
    mapPinDot: { alignItems: 'center', backgroundColor: colors.action, borderColor: colors.surface, borderRadius: 16, borderWidth: 2, height: 30, justifyContent: 'center', shadowColor: colors.ink, shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.16, shadowRadius: 4, width: 30 },
    mapPinLabel: { backgroundColor: colors.surface, borderRadius: 8, color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 9, marginTop: 3, maxWidth: 112, paddingHorizontal: 6, paddingVertical: 3 },
    memoryCount: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.35, marginTop: 2, textTransform: 'uppercase' },
    memoryList: { gap: 9 },
    memoryRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 11, minHeight: 66, paddingHorizontal: 12, paddingVertical: 9 },
    memoryLocationIcon: { alignItems: 'center', backgroundColor: colors.actionSoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
    memoryRowCopy: { flex: 1, gap: 3 },
    memoryCity: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 },
    memoryDate: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 10 },
    emptyCard: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: 26, borderWidth: 1, gap: 14, marginTop: 7, minHeight: 280, padding: 24 },
    centered: { alignItems: 'center', justifyContent: 'center' },
    iconCircle: { alignItems: 'center', backgroundColor: colors.rewardSoft, borderRadius: 52, height: 96, justifyContent: 'center', width: 96 },
    emptyTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 25, textAlign: 'center' },
    emptyBody: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 19, maxWidth: 290, textAlign: 'center' },
    historyButton: { alignItems: 'center', backgroundColor: colors.actionSoft, borderRadius: radii.full, minHeight: 44, justifyContent: 'center', paddingHorizontal: 18 },
    historyButtonText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 11 },
    pressed: { opacity: 0.7 },
  });
