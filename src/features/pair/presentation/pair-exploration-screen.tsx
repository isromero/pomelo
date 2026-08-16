import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import {
  advancePairExploration,
  pairExplorationProgress,
  pairExplorationSteps,
  type PairExplorationStep,
} from '@/features/pair/presentation/pair-exploration';
import type { TranslationKey } from '@/localization/catalogs';
import { useLocale } from '@/localization/locale-provider';

const pomCelebrating = require('@/assets/images/pom/pom-calm.png');

const stepCopy: Record<
  PairExplorationStep,
  { body: TranslationKey; eyebrow: TranslationKey; title: TranslationKey }
> = {
  moment: {
    body: 'pair.explore.moment.body',
    eyebrow: 'pair.explore.moment.eyebrow',
    title: 'pair.explore.moment.title',
  },
  privacy: {
    body: 'pair.explore.privacy.body',
    eyebrow: 'pair.explore.privacy.eyebrow',
    title: 'pair.explore.privacy.title',
  },
  reveal: {
    body: 'pair.explore.reveal.body',
    eyebrow: 'pair.explore.reveal.eyebrow',
    title: 'pair.explore.reveal.title',
  },
  memory: {
    body: 'pair.explore.memory.body',
    eyebrow: 'pair.explore.memory.eyebrow',
    title: 'pair.explore.memory.title',
  },
};

const nextCopy: Record<Exclude<PairExplorationStep, 'memory'>, TranslationKey> = {
  moment: 'pair.explore.nextMoment',
  privacy: 'pair.explore.nextPrivacy',
  reveal: 'pair.explore.nextReveal',
};

export function PairExplorationScreen() {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const [step, setStep] = useState<PairExplorationStep>('moment');
  const copy = stepCopy[step];
  const progress = pairExplorationProgress(step);

  const leave = () => router.replace('/pair');

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel={t('pair.explore.finish')}
            accessibilityRole="button"
            onPress={leave}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons color={colors.inkSecondary} name="arrow-back" size={20} />
          </Pressable>
          <Text style={styles.wordmark}>pomelo.</Text>
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>DEMO</Text>
          </View>
        </View>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.notice}>
            <Ionicons color={colors.actionDeep} name="sparkles-outline" size={18} />
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>{t('pair.explore.badge')}</Text>
              <Text style={styles.noticeBody}>{t('pair.explore.notice')}</Text>
            </View>
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>{t(copy.eyebrow)}</Text>
            <Text style={styles.title}>{t(copy.title)}</Text>
            <Text style={styles.body}>{t(copy.body)}</Text>
          </View>

          <ExplorationScene step={step} />

          <View style={styles.controls}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                {t('pair.explore.progress')} {progress.current}/{progress.total}
              </Text>
              <View style={styles.dots}>
                {pairExplorationSteps.map((item, index) => (
                  <View
                    key={item}
                    style={[
                      styles.dot,
                      index <= progress.current - 1 && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            {step === 'memory' ? (
              <>
                <PrimaryButton
                  icon="arrow-back"
                  label={t('pair.explore.finish')}
                  onPress={leave}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setStep('moment')}
                  style={({ pressed }) => [styles.restartButton, pressed && styles.pressed]}>
                  <Ionicons color={colors.actionDeep} name="refresh" size={17} />
                  <Text style={styles.restartText}>{t('pair.explore.restart')}</Text>
                </Pressable>
              </>
            ) : (
              <PrimaryButton
                label={t(nextCopy[step])}
                onPress={() => setStep(advancePairExploration(step))}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ExplorationScene({ step }: { step: PairExplorationStep }) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);

  return (
    <View style={styles.scene}>
      <View style={styles.sceneMeta}>
        <View style={styles.kindChip}>
          <Text style={styles.kindText}>
            {t(step === 'memory' ? 'moment.kind.revealed' : 'moment.kind.question')}
          </Text>
        </View>
        <Text style={styles.sceneDate}>{t('moment.today')}</Text>
      </View>

      {step === 'moment' && (
        <>
          <QuestionCard />
          <View style={styles.privacyNote}>
            <Ionicons color={colors.inkSecondary} name="lock-closed-outline" size={18} />
            <Text style={styles.privacyText}>{t('moment.privacy')}</Text>
          </View>
          <View style={styles.partnerPending}>
            <View style={styles.pendingAvatar}>
              <Ionicons color={colors.actionDeep} name="heart-outline" size={20} />
            </View>
            <Text style={styles.pendingText}>{t('moment.partnerPending')}</Text>
          </View>
        </>
      )}

      {step === 'privacy' && (
        <>
          <QuestionCard compact />
          <AnswerBubble own text={t('moment.ownAnswer')} />
          <View style={styles.partnerPending}>
            <View style={styles.pendingAvatar}>
              <Ionicons color={colors.actionDeep} name="heart-outline" size={20} />
            </View>
            <Text style={styles.pendingText}>{t('moment.partnerPending')}</Text>
          </View>
          <View style={styles.lockLine}>
            <Ionicons color={colors.actionDeep} name="lock-closed" size={15} />
            <Text style={styles.lockLineText}>{t('moment.saved')}</Text>
          </View>
        </>
      )}

      {step === 'reveal' && (
        <>
          <View style={styles.revealHeader}>
            <Image
              accessibilityLabel={t('pair.explore.pomAlt')}
              resizeMode="contain"
              source={pomCelebrating}
              style={styles.pom}
            />
            <View style={styles.revealSparkles}>
              <Ionicons color={colors.reward} name="sparkles" size={28} />
            </View>
          </View>
          <AnswerBubble own text={t('moment.ownAnswer')} />
          <AnswerBubble locked text={t('moment.partnerLocked')} />
        </>
      )}

      {step === 'memory' && (
        <View style={styles.memoryCard}>
          <View style={styles.memoryHeader}>
            <View style={styles.memoryIcon}>
              <Ionicons color={colors.actionDeep} name="book-outline" size={22} />
            </View>
            <View style={styles.memoryHeading}>
              <Text style={styles.memorySaved}>{t('pair.explore.memory.saved')}</Text>
              <Text style={styles.memoryDate}>{t('home.date')}</Text>
            </View>
          </View>
          <Text style={styles.memoryQuestion}>{t('moment.prompt')}</Text>
          <View style={styles.memoryAnswers}>
            <View style={[styles.memoryAnswer, styles.memoryAnswerOwn]}>
              <Text style={styles.memoryPerson}>{t('moment.you')}</Text>
              <Text numberOfLines={2} style={styles.memoryAnswerText}>
                {t('moment.ownAnswer')}
              </Text>
            </View>
            <View style={[styles.memoryAnswer, styles.memoryAnswerPartner]}>
              <Text style={styles.memoryPerson}>{t('moment.partner')}</Text>
              <Text numberOfLines={2} style={styles.memoryAnswerText}>
                {t('moment.partnerAnswer')}
              </Text>
            </View>
          </View>
          <View style={styles.historyLine}>
            <View style={styles.historyDot} />
            <View style={styles.historyRule} />
            <Ionicons color={colors.positive} name="checkmark-circle" size={22} />
          </View>
        </View>
      )}
    </View>
  );
}

function QuestionCard({ compact = false }: { compact?: boolean }) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  return (
    <View style={[styles.questionCard, compact && styles.questionCardCompact]}>
      <Text style={styles.questionLabel}>{t('moment.promptLabel')}</Text>
      <Text style={styles.question}>{t('moment.prompt')}</Text>
    </View>
  );
}

function AnswerBubble({
  locked = false,
  own = false,
  text,
}: {
  locked?: boolean;
  own?: boolean;
  text: string;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  return (
    <View style={[styles.answerRow, own && styles.answerRowOwn]}>
      <View
        style={[
          styles.answerBubble,
          own ? styles.answerOwn : styles.answerPartner,
          locked && styles.answerLocked,
        ]}>
        <View style={styles.answerMeta}>
          <Text style={styles.answerPerson}>{t(own ? 'moment.you' : 'moment.partner')}</Text>
          {locked && <Ionicons color={colors.muted} name="lock-closed" size={12} />}
        </View>
        <Text numberOfLines={2} style={styles.answerText}>{text}</Text>
      </View>
    </View>
  );
}

function PrimaryButton({
  icon = 'arrow-forward',
  label,
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress(): void;
}) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
      <Ionicons color={colors.white} name={icon} size={19} />
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    shell: { alignSelf: 'center', flex: 1, maxWidth: 430, paddingHorizontal: 22, width: '100%' },
    header: { alignItems: 'center', flexDirection: 'row', height: 58, justifyContent: 'space-between' },
    backButton: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 58 },
    wordmark: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 25, letterSpacing: -1 },
    demoBadge: { alignItems: 'center', backgroundColor: colors.reward, borderRadius: radii.full, height: 28, justifyContent: 'center', width: 58 },
    demoBadgeText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.8 },
    scrollContent: { gap: 18, paddingBottom: 30 },
    notice: { alignItems: 'flex-start', backgroundColor: colors.actionSoft, borderColor: colors.action, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: 11, padding: 14 },
    noticeCopy: { flex: 1, gap: 3 },
    noticeTitle: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.55 },
    noticeBody: { color: colors.inkSecondary, fontFamily: fonts.bodyMedium, fontSize: 10, lineHeight: 15 },
    intro: { gap: 7 },
    eyebrow: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8 },
    title: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 30, letterSpacing: -0.9, lineHeight: 34 },
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
    scene: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 28, borderWidth: 1, gap: 11, minHeight: 365, overflow: 'hidden', padding: 18, shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 18 },
    sceneMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    kindChip: { alignItems: 'center', backgroundColor: colors.rewardSoft, borderRadius: radii.full, height: 26, justifyContent: 'center', paddingHorizontal: 13 },
    kindText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.45 },
    sceneDate: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 9 },
    questionCard: { backgroundColor: colors.rewardSoft, borderRadius: 20, gap: 7, minHeight: 132, padding: 17 },
    questionCardCompact: { minHeight: 92, paddingVertical: 12 },
    questionLabel: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.4 },
    question: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 18, letterSpacing: -0.3, lineHeight: 22 },
    privacyNote: { alignItems: 'center', borderColor: colors.borderSoft, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: 9, padding: 14 },
    privacyText: { color: colors.inkSecondary, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 10, lineHeight: 15 },
    partnerPending: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center', paddingTop: 7 },
    pendingAvatar: { alignItems: 'center', backgroundColor: colors.actionSoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
    pendingText: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 10 },
    answerRow: { alignItems: 'flex-start', width: '100%' },
    answerRowOwn: { alignItems: 'flex-end' },
    answerBubble: { borderRadius: 18, gap: 4, minHeight: 65, paddingHorizontal: 14, paddingVertical: 10, width: '86%' },
    answerOwn: { backgroundColor: colors.actionSoft, borderBottomRightRadius: 5 },
    answerPartner: { backgroundColor: colors.rewardSoft, borderBottomLeftRadius: 5 },
    answerLocked: { backgroundColor: colors.backgroundRaised, borderColor: colors.borderSoft, borderWidth: 1 },
    answerMeta: { alignItems: 'center', flexDirection: 'row', gap: 5 },
    answerPerson: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 9 },
    answerText: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 16 },
    lockLine: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center', paddingTop: 2 },
    lockLineText: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 9 },
    revealHeader: { alignItems: 'center', backgroundColor: colors.informativeSoft, borderRadius: 20, height: 122, justifyContent: 'center', overflow: 'hidden' },
    pom: { height: 105, width: 142 },
    revealSparkles: { position: 'absolute', right: 34, top: 19 },
    memoryCard: { backgroundColor: colors.backgroundRaised, borderRadius: 22, flex: 1, gap: 14, padding: 17 },
    memoryHeader: { alignItems: 'center', flexDirection: 'row', gap: 11 },
    memoryIcon: { alignItems: 'center', backgroundColor: colors.actionSoft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
    memoryHeading: { flex: 1, gap: 3 },
    memorySaved: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.5 },
    memoryDate: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 9 },
    memoryQuestion: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 17, letterSpacing: -0.2, lineHeight: 21 },
    memoryAnswers: { gap: 8 },
    memoryAnswer: { borderRadius: radii.md, gap: 3, padding: 11 },
    memoryAnswerOwn: { backgroundColor: colors.actionSoft },
    memoryAnswerPartner: { backgroundColor: colors.rewardSoft },
    memoryPerson: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 8 },
    memoryAnswerText: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 10, lineHeight: 14 },
    historyLine: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: 4 },
    historyDot: { backgroundColor: colors.action, borderRadius: 5, height: 10, width: 10 },
    historyRule: { backgroundColor: colors.border, flex: 1, height: 2 },
    controls: { gap: 11 },
    progressRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    progressLabel: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.55 },
    dots: { flexDirection: 'row', gap: 6 },
    dot: { backgroundColor: colors.border, borderRadius: 4, height: 7, width: 22 },
    dotActive: { backgroundColor: colors.action },
    primaryButton: { alignItems: 'center', backgroundColor: colors.action, borderRadius: radii.full, flexDirection: 'row', gap: 9, height: 56, justifyContent: 'center' },
    primaryButtonText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
    restartButton: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 42 },
    restartText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 11 },
    pressed: { opacity: 0.68 },
  });
