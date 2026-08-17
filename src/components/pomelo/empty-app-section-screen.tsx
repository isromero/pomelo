import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { AppHeader } from '@/components/pomelo/app-header';
import {
  BottomNavigation,
  type TabKey,
} from '@/components/pomelo/bottom-navigation';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import { useAccount } from '@/features/account/presentation/account-provider';
import { useMoment } from '@/features/moment/moment-api';
import type { TranslationKey } from '@/localization/catalogs';
import { useLocale } from '@/localization/locale-provider';

export function EmptyAppSectionScreen({
  activeTab,
  body,
  eyebrow,
  icon,
  title,
  waitingForPartner,
}: {
  activeTab: Extract<TabKey, 'history' | 'map'>;
  body: TranslationKey;
  eyebrow: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: TranslationKey;
  waitingForPartner: boolean;
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
          showStreak={!waitingForPartner}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>{t(eyebrow)}</Text>
          <Text style={styles.title}>{t(title)}</Text>
          <Text style={styles.body}>{t(body)}</Text>

          <View style={styles.emptyCard}>
            <View style={styles.orbit}>
              <View style={styles.iconCircle}>
                <Ionicons color={colors.actionDeep} name={icon} size={42} />
              </View>
              <View style={styles.sparkle}>
                <Ionicons color={colors.reward} name="sparkles" size={22} />
              </View>
            </View>
            <View style={styles.statusPill}>
              <Ionicons
                color={colors.inkSecondary}
                name={waitingForPartner ? 'lock-closed-outline' : 'leaf-outline'}
                size={15}
              />
              <Text style={styles.statusText}>
                {t(
                  waitingForPartner
                    ? 'section.waitingStatus'
                    : 'section.emptyStatus',
                )}
              </Text>
            </View>
            {waitingForPartner && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/pair')}
                style={({ pressed }) => [
                  styles.invitationButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.invitationButtonText}>
                  {t('section.manageInvitation')}
                </Text>
                <Ionicons color={colors.actionDeep} name="arrow-forward" size={18} />
              </Pressable>
            )}
          </View>
        </ScrollView>
        <BottomNavigation activeTab={activeTab} />
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
    content: { flexGrow: 1, gap: 8, paddingBottom: 18, paddingTop: 18 },
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
    body: {
      color: colors.inkSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 19,
      maxWidth: 335,
    },
    emptyCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: 28,
      borderWidth: 1,
      gap: 22,
      justifyContent: 'center',
      marginTop: 22,
      minHeight: 340,
      padding: 24,
    },
    orbit: {
      alignItems: 'center',
      borderColor: colors.borderSoft,
      borderRadius: 74,
      borderStyle: 'dashed',
      borderWidth: 1,
      height: 148,
      justifyContent: 'center',
      width: 148,
    },
    iconCircle: {
      alignItems: 'center',
      backgroundColor: colors.rewardSoft,
      borderRadius: 52,
      height: 104,
      justifyContent: 'center',
      width: 104,
    },
    sparkle: { position: 'absolute', right: -2, top: 16 },
    statusPill: {
      alignItems: 'center',
      backgroundColor: colors.backgroundRaised,
      borderRadius: radii.full,
      flexDirection: 'row',
      gap: 7,
      minHeight: 34,
      paddingHorizontal: 14,
    },
    statusText: {
      color: colors.inkSecondary,
      fontFamily: fonts.bodyBold,
      fontSize: 9,
      letterSpacing: 0.45,
    },
    invitationButton: {
      alignItems: 'center',
      backgroundColor: colors.actionSoft,
      borderRadius: radii.full,
      flexDirection: 'row',
      gap: 8,
      height: 50,
      justifyContent: 'center',
      width: '100%',
    },
    invitationButtonText: {
      color: colors.actionDeep,
      fontFamily: fonts.bodyBold,
      fontSize: 11,
    },
    pressed: { opacity: 0.7 },
  });
