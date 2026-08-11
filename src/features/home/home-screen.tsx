import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/pomelo/bottom-navigation';
import { DailyMomentCard, MomentState } from '@/components/pomelo/daily-moment-card';
import { fonts, palette, radii } from '@/constants/pomelo-theme';

const pomHomeReady = require('@/assets/images/pom/pom-calm.png');

const stateOrder: MomentState[] = ['answer', 'waiting', 'ready', 'complete'];

const heroCopy: Record<
  MomentState,
  { background: string; eyebrow: string; title: string; progress: string }
> = {
  answer: {
    background: palette.rewardSoft,
    eyebrow: 'POM ESTÁ LISTO',
    title: 'Hoy os toca\ncrear algo juntos.',
    progress: '6 momentos juntos',
  },
  waiting: {
    background: palette.background,
    eyebrow: 'TU PARTE ESTÁ LISTA',
    title: 'Esperando a\nLucía.',
    progress: '6 momentos juntos',
  },
  ready: {
    background: palette.actionSoft,
    eyebrow: 'POM ESTÁ EMOCIONADO',
    title: 'Ya podéis\ndescubrirlo.',
    progress: '6 momentos juntos',
  },
  complete: {
    background: palette.rewardSoft,
    eyebrow: 'NUEVO RECUERDO',
    title: 'Ya está en\nvuestra historia.',
    progress: '7 momentos juntos',
  },
};

function AppHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.wordmark}>pomelo.</Text>

      <View style={styles.headerActions}>
        <View style={styles.streak}>
          <Ionicons color={palette.action} name="flame" size={18} />
          <Text style={styles.streakText}>6 días</Text>
        </View>

        <Pressable accessibilityLabel="Abrir perfil" style={styles.avatar}>
          <Text style={styles.avatarText}>I</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function HomeScreen() {
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
          <AppHeader />

          <View style={styles.homeContent}>
            <Text style={styles.date}>MARTES, 11 DE AGOSTO</Text>

            <View style={[styles.pomHero, { backgroundColor: copy.background }]}>
              <Image
                resizeMode="contain"
                source={pomHomeReady}
                style={styles.pomImage}
              />

              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>{copy.eyebrow}</Text>
                <Text style={styles.heroTitle}>{copy.title}</Text>
                <View style={styles.progressPill}>
                  <Text style={styles.progressText}>{copy.progress}</Text>
                </View>
              </View>
            </View>

            <DailyMomentCard onAction={advanceMoment} state={momentState} />
          </View>
        </ScrollView>

        <BottomNavigation />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: palette.background,
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
    color: palette.ink,
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
    backgroundColor: palette.actionSoft,
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 6,
    height: 40,
    justifyContent: 'center',
    width: 94,
  },
  streakText: {
    color: palette.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarText: {
    color: palette.inkSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  homeContent: {
    gap: 14,
    width: '100%',
  },
  date: {
    color: palette.inkSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    height: 18,
    letterSpacing: 0.55,
    lineHeight: 18,
  },
  pomHero: {
    alignItems: 'center',
    backgroundColor: palette.rewardSoft,
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
    color: palette.inkSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: palette.ink,
    fontFamily: fonts.displayBold,
    fontSize: 21,
    height: 50,
    letterSpacing: -0.25,
    lineHeight: 25,
    width: 176,
  },
  progressPill: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 132,
  },
  progressText: {
    color: palette.action,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
});
