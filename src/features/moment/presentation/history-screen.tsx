import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';

import { useAppearance } from '@/appearance/appearance-provider';
import { AppHeader } from '@/components/pomelo/app-header';
import { BottomNavigation } from '@/components/pomelo/bottom-navigation';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import type { MomentErrorCode } from '@/features/moment/application/moment-controller';
import type { Contribution, DoodleDocument, Memory } from '@/features/moment/domain/moment';
import { useMoment, useThreadController } from '@/features/moment/presentation/moment-provider';
import { ThreadPanel } from '@/features/moment/presentation/thread-panel';
import { useAccount } from '@/features/account/account-api';
import type { TranslationKey } from '@/localization/catalogs';
import { useLocale } from '@/localization/locale-provider';

function formatMemoryDate(value: string, locale: 'en' | 'es') {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12));
}

function contributionText(contribution: Contribution) {
  return contribution.responseText ?? contribution.responseChoice ?? '';
}

function errorKey(error: MomentErrorCode | null): TranslationKey {
  if (error === 'network') {
    return 'moment.error.network';
  }
  if (error === 'invalidLocation' || error === 'notAllowed') {
    return 'history.locationError';
  }
  return 'moment.error.unexpected';
}

function formatKey(memory: Memory) {
  if (memory.format === 'photo') {
    return 'moment.kind.photo' as const;
  }
  if (memory.format === 'doodle') {
    return 'moment.kind.doodle' as const;
  }
  return 'moment.kind.question' as const;
}

function DoodleMemoryPreview({
  colors,
  document,
}: {
  colors: SemanticColors;
  document: DoodleDocument;
}) {
  const styles = createStyles(colors);
  return (
    <View style={styles.doodlePreview}>
      <Svg height="100%" viewBox="0 0 320 380" width="100%">
        {document.strokes.map((stroke) => (
          <Polyline
            fill="none"
            key={stroke.id}
            opacity={0.85}
            points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
            stroke={stroke.mode === 'eraser' ? colors.backgroundRaised : stroke.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={stroke.width}
          />
        ))}
      </Svg>
    </View>
  );
}

function PhotoMemoryPreview({
  controller,
  memory,
}: {
  controller: ReturnType<typeof useMoment>['controller'];
  memory: Memory;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const ownDeleted = memory.ownContribution?.available === false;
  const partnerDeleted = memory.partner.contribution?.available === false;
  const ownPhoto = ownDeleted ? null : memory.ownContribution?.photo ?? null;
  const partnerPhoto = partnerDeleted ? null : memory.partner.contribution?.photo ?? null;
  const [urls, setUrls] = useState<{
    ownFront: string | null;
    ownRear: string | null;
    partnerFront: string | null;
    partnerRear: string | null;
  }>({
    ownFront: null,
    ownRear: null,
    partnerFront: null,
    partnerRear: null,
  });

  useEffect(() => {
    let active = true;
    const ownFrontPath = ownPhoto?.front.path ?? null;
    const ownRearPath = ownPhoto?.rear.path ?? null;
    const partnerFrontPath = partnerPhoto?.front.path ?? null;
    const partnerRearPath = partnerPhoto?.rear.path ?? null;
    void Promise.all([
      ownFrontPath ? controller.createPrivateMediaUrl(ownFrontPath) : Promise.resolve(null),
      ownRearPath ? controller.createPrivateMediaUrl(ownRearPath) : Promise.resolve(null),
      partnerFrontPath ? controller.createPrivateMediaUrl(partnerFrontPath) : Promise.resolve(null),
      partnerRearPath ? controller.createPrivateMediaUrl(partnerRearPath) : Promise.resolve(null),
    ]).then(([ownFront, ownRear, partnerFront, partnerRear]) => {
      if (active) {
        setUrls({ ownFront, ownRear, partnerFront, partnerRear });
      }
    }).catch(() => {
      if (active) {
        setUrls({ ownFront: null, ownRear: null, partnerFront: null, partnerRear: null });
      }
    });
    return () => {
      active = false;
    };
  }, [
    controller,
    ownPhoto?.front.path,
    ownPhoto?.rear.path,
    partnerPhoto?.front.path,
    partnerPhoto?.rear.path,
  ]);

  if (!ownPhoto && !partnerPhoto) {
    return (
      <View style={styles.photoPlaceholder}>
        <Ionicons color={colors.muted} name="images-outline" size={24} />
        {ownDeleted || partnerDeleted ? <Text style={styles.photoDeletedText}>{t('history.deletedContribution')}</Text> : null}
      </View>
    );
  }
  return (
    <View style={styles.photoStack}>
      <View style={styles.photoComposition}>
        <View style={styles.photoPrimary}>
          {(urls.partnerRear ?? urls.ownRear) ? (
            <Image
              cachePolicy="none"
              contentFit="cover"
              recyclingKey={urls.partnerRear ?? urls.ownRear ?? ''}
              source={{ uri: urls.partnerRear ?? urls.ownRear ?? '' }}
              style={styles.photoImage}
            />
          ) : null}
          {(urls.partnerFront ?? urls.ownFront) ? (
            <Image
              cachePolicy="none"
              contentFit="cover"
              recyclingKey={urls.partnerFront ?? urls.ownFront ?? ''}
              source={{ uri: urls.partnerFront ?? urls.ownFront ?? '' }}
              style={urls.partnerFront ? styles.photoPartnerFront : styles.photoOwnFront}
            />
          ) : null}
        </View>
        {ownPhoto && partnerPhoto ? (
          <View style={styles.photoThumbnail}>
            {urls.ownRear ? <Image cachePolicy="none" contentFit="cover" recyclingKey={urls.ownRear} source={{ uri: urls.ownRear }} style={styles.photoImage} /> : null}
            {urls.ownFront ? <Image cachePolicy="none" contentFit="cover" recyclingKey={urls.ownFront} source={{ uri: urls.ownFront }} style={styles.photoOwnFront} /> : null}
          </View>
        ) : null}
      </View>
      {ownDeleted || partnerDeleted ? (
        <View style={styles.photoDeletedBadge}>
          <Ionicons color={colors.muted} name="image-outline" size={15} />
          <Text style={styles.photoDeletedText}>{t('history.deletedContribution')}</Text>
        </View>
      ) : null}
    </View>
  );
}

function MemoryCard({
  controller,
  memory,
  ownUserId,
  onToggleThread,
  threadController,
  threadOpen,
}: {
  controller: ReturnType<typeof useMoment>['controller'];
  memory: Memory;
  ownUserId: string;
  onToggleThread(): void;
  threadController: ReturnType<typeof useThreadController>;
  threadOpen: boolean;
}) {
  const { colors } = useAppearance();
  const { locale, t } = useLocale();
  const styles = createStyles(colors);
  const ownContribution = memory.ownContribution;
  const ownContributionAvailable = ownContribution?.available !== false;
  const partnerContribution = memory.partner.contribution;
  const ownContributionText = ownContribution
    ? ownContributionAvailable
      ? contributionText(ownContribution)
      : t('history.deletedContribution')
    : t('history.missingContribution');

  const removeContribution = () => {
    if (!ownContribution) {
      return;
    }
    Alert.alert(t('history.removeContributionTitle'), t('history.removeContributionBody'), [
      { style: 'cancel', text: t('common.cancel') },
      {
        onPress: () => void controller.removeOwnContribution(ownContribution.id),
        style: 'destructive',
        text: t('history.removeConfirm'),
      },
    ]);
  };

  const partnerContributionText = partnerContribution
    ? partnerContribution.available === false
      ? t('history.deletedContribution')
      : contributionText(partnerContribution)
    : t('history.missingContribution');
  return (
    <View style={styles.memoryCard}>
      <View style={styles.memoryMeta}>
        <Text style={styles.memoryDate}>{formatMemoryDate(memory.localDate, locale)}</Text>
        <View style={styles.pomPill}>
          <Ionicons color={colors.actionDeep} name="sparkles-outline" size={14} />
          <Text style={styles.pomText}>{t('history.pom')}</Text>
        </View>
      </View>
      <View style={styles.formatPill}>
        <Text style={styles.formatText}>{t(formatKey(memory))}</Text>
      </View>
      <Text style={styles.prompt}>{memory.prompt.text}</Text>
      {memory.format === 'photo' ? <PhotoMemoryPreview controller={controller} memory={memory} /> : null}
      {memory.format === 'doodle' && memory.doodleDocument ? (
        <DoodleMemoryPreview colors={colors} document={memory.doodleDocument} />
      ) : null}
      {(!memory.format || memory.format === 'question') && memory.ownContribution ? (
        <View style={styles.conversation}>
          <View style={styles.bubbleRow}>
            <View style={[styles.conversationBubble, styles.partnerBubble]}>
              <Text style={styles.sender}>{memory.partner.displayName}</Text>
              <Text style={styles.conversationText}>
                {partnerContributionText}
              </Text>
            </View>
          </View>
          <View style={[styles.bubbleRow, styles.ownRow]}>
            <View style={[styles.conversationBubble, styles.ownBubble]}>
              <Text style={styles.sender}>{t('moment.you')}</Text>
              <Text style={styles.conversationText}>{ownContributionText}</Text>
            </View>
          </View>
        </View>
      ) : null}
      {ownContribution && ownContributionAvailable ? (
        <Pressable
          accessibilityRole="button"
          onPress={removeContribution}
          style={styles.contributionAction}>
          <Ionicons color={colors.actionDeep} name="eye-off-outline" size={16} />
          <Text style={styles.contributionActionText}>{t('history.removeContribution')}</Text>
        </Pressable>
      ) : ownContribution ? (
        <Text style={styles.deletedText}>{t('history.contributionRemoved')}</Text>
      ) : null}
      {memory.format === 'photo' ? (
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: memory.widgetVisualEnabled === true }}
          onPress={() => void controller.setMemoryWidgetVisibility(memory.id, memory.widgetVisualEnabled !== true)}
          style={styles.widgetToggle}>
          <Ionicons color={colors.actionDeep} name={memory.widgetVisualEnabled ? 'eye-outline' : 'eye-off-outline'} size={16} />
          <Text style={styles.widgetToggleText}>
            {memory.widgetVisualEnabled ? t('history.widgetVisible') : t('history.widgetHidden')}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={onToggleThread}
        style={styles.threadButton}>
        <Ionicons color={colors.actionDeep} name="chatbubble-ellipses-outline" size={16} />
        <Text style={styles.threadButtonText}>{threadOpen ? t('thread.close') : t('thread.open')}</Text>
      </Pressable>
      {threadOpen ? <ThreadPanel controller={threadController} ownUserId={ownUserId} targetId={memory.id} /> : null}
    </View>
  );
}

export function HistoryScreen() {
  const { colors } = useAppearance();
  const { profile } = useAccount();
  const { error, history, moment, status, controller } = useMoment();
  const threadController = useThreadController();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const { memoryId: requestedMemoryId } = useLocalSearchParams<{ memoryId?: string }>();
  const selectedMemoryId = typeof requestedMemoryId === 'string' ? requestedMemoryId : null;
  const selectedMemory = selectedMemoryId
    ? history.find((memory) => memory.id === selectedMemoryId) ?? null
    : null;
  const visibleHistory = selectedMemory ? [selectedMemory] : history;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.shell}>
        <AppHeader
          avatarKey={profile?.avatarKey ?? 'calm'}
          streakCount={moment?.streak.current ?? 0}
          showStreak
        />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>{t('section.history.eyebrow')}</Text>
          <Text style={styles.title}>{t('history.title')}</Text>
          <Text style={styles.body}>{t('history.body')}</Text>
          {selectedMemory ? (
            <Pressable accessibilityRole="button" onPress={() => router.replace('/history')} style={styles.backButton}>
              <Ionicons color={colors.actionDeep} name="arrow-back" size={16} />
              <Text style={styles.backButtonText}>{t('map.backToHistory')}</Text>
            </Pressable>
          ) : null}

          {status === 'loading' || status === 'idle' ? (
            <View style={[styles.emptyCard, styles.centered]}>
              <ActivityIndicator color={colors.action} size="large" />
              <Text style={styles.emptyBody}>{t('runtime.loading')}</Text>
            </View>
          ) : status === 'error' ? (
            <View style={[styles.emptyCard, styles.centered]}>
              <Ionicons color={colors.actionDeep} name="cloud-offline-outline" size={38} />
              <Text style={styles.emptyBody}>{t(errorKey(error))}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void controller.refresh()}
                style={styles.retryButton}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : history.length === 0 ? (
            <View style={[styles.emptyCard, styles.centered]}>
              <View style={styles.iconCircle}>
                <Ionicons color={colors.actionDeep} name="journal-outline" size={42} />
              </View>
              <Text style={styles.emptyTitle}>{t('history.emptyTitle')}</Text>
              <Text style={styles.emptyBody}>{t('history.emptyBody')}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/home')}
                style={styles.homeButton}>
                <Text style={styles.homeButtonText}>{t('history.homeAction')}</Text>
              </Pressable>
            </View>
          ) : (
            visibleHistory.map((memory) => (
              <MemoryCard
                controller={controller}
                key={memory.id}
                memory={memory}
                ownUserId={profile?.userId ?? ''}
                onToggleThread={() =>
                  setOpenThreadId((current) => (current === memory.id ? null : memory.id))
                }
                threadController={threadController}
                threadOpen={openThreadId === memory.id}
              />
            ))
          )}
        </ScrollView>
        <BottomNavigation activeTab="diary" />
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
    content: { gap: 10, paddingBottom: 18, paddingTop: 18 },
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
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
    memoryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: 26,
      borderWidth: 1,
      gap: 14,
      marginTop: 12,
      padding: 17,
    },
    memoryMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    memoryDate: {
      color: colors.inkSecondary,
      fontFamily: fonts.bodyBold,
      fontSize: 10,
      letterSpacing: 0.35,
    },
    pomPill: {
      alignItems: 'center',
      backgroundColor: colors.rewardSoft,
      borderRadius: radii.full,
      flexDirection: 'row',
      gap: 5,
      minHeight: 28,
      paddingHorizontal: 10,
    },
    pomText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 9 },
    formatPill: { alignSelf: 'flex-start', backgroundColor: colors.actionSoft, borderRadius: radii.full, paddingHorizontal: 9, paddingVertical: 5 },
    formatText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.3 },
    prompt: {
      color: colors.ink,
      fontFamily: fonts.displayBold,
      fontSize: 18,
      lineHeight: 24,
    },
    conversation: { gap: 8 },
    bubbleRow: { flexDirection: 'row' },
    ownRow: { justifyContent: 'flex-end' },
    conversationBubble: {
      borderRadius: 17,
      gap: 5,
      maxWidth: '88%',
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    partnerBubble: { backgroundColor: colors.backgroundRaised, borderBottomLeftRadius: 5 },
    ownBubble: { backgroundColor: colors.actionSoft, borderBottomRightRadius: 5 },
    sender: {
      color: colors.inkSecondary,
      fontFamily: fonts.bodyBold,
      fontSize: 9,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    conversationText: { color: colors.ink, fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
    deletedText: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, fontStyle: 'italic' },
    photoComposition: { aspectRatio: 1.3, flexDirection: 'row', gap: 8 },
    photoDeletedBadge: { alignItems: 'center', backgroundColor: colors.backgroundRaised, borderRadius: 12, flexDirection: 'row', gap: 7, padding: 10 },
    photoDeletedText: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 10 },
    photoPrimary: { backgroundColor: colors.backgroundRaised, borderRadius: 18, flex: 1, overflow: 'hidden' },
    photoStack: { gap: 8 },
    photoThumbnail: { alignSelf: 'flex-end', backgroundColor: colors.backgroundRaised, borderColor: colors.surface, borderRadius: 13, borderWidth: 3, bottom: 8, height: 72, overflow: 'hidden', position: 'absolute', right: 8, width: 58 },
    photoImage: { height: '100%', width: '100%' },
    photoOwnFront: { borderColor: colors.surface, borderRadius: 5, borderWidth: 1, bottom: 3, height: 30, position: 'absolute', right: 3, width: 24 },
    photoPartnerFront: { borderColor: colors.surface, borderRadius: 9, borderWidth: 2, bottom: 9, height: 82, position: 'absolute', right: 9, width: 64 },
    photoPlaceholder: { alignItems: 'center', aspectRatio: 1.3, backgroundColor: colors.backgroundRaised, borderRadius: 18, justifyContent: 'center' },
    doodlePreview: { aspectRatio: 320 / 380, backgroundColor: colors.backgroundRaised, borderRadius: 18, overflow: 'hidden', padding: 8 },
    contributionAction: { alignItems: 'center', flexDirection: 'row', gap: 7, paddingVertical: 2 },
    contributionActionText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10 },
    locationSection: { borderTopColor: colors.borderSoft, borderTopWidth: 1, paddingTop: 12 },
    locationHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    locationValue: { alignItems: 'center', flexDirection: 'row', gap: 7, flexShrink: 1 },
    locationText: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12 },
    locationButton: { paddingVertical: 3 },
    locationButtonText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10 },
    locationAdd: { alignItems: 'center', flexDirection: 'row', gap: 7, paddingVertical: 2 },
    locationEditor: { gap: 9 },
    locationInput: {
      backgroundColor: colors.backgroundRaised,
      borderColor: colors.borderSoft,
      borderRadius: 12,
      borderWidth: 1,
      color: colors.ink,
      fontFamily: fonts.body,
      fontSize: 12,
      minHeight: 43,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    locationActions: { alignItems: 'center', flexDirection: 'row', gap: 14, justifyContent: 'flex-end' },
    locationAction: { backgroundColor: colors.actionSoft, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 8 },
    locationActionText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10 },
    locationPrivacy: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
    backButton: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 5, paddingVertical: 3 },
    backButtonText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 11 },
    widgetToggle: { alignItems: 'center', flexDirection: 'row', gap: 7 },
    widgetToggleText: { color: colors.actionDeep, fontFamily: fonts.bodySemiBold, fontSize: 10 },
    threadButton: { alignItems: 'center', flexDirection: 'row', gap: 7, paddingVertical: 3 },
    threadButtonText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 11 },
    emptyCard: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: 26,
      borderWidth: 1,
      gap: 14,
      marginTop: 20,
      minHeight: 320,
      padding: 24,
    },
    centered: { alignItems: 'center', justifyContent: 'center' },
    iconCircle: {
      alignItems: 'center',
      backgroundColor: colors.rewardSoft,
      borderRadius: 52,
      height: 104,
      justifyContent: 'center',
      width: 104,
    },
    emptyTitle: {
      color: colors.ink,
      fontFamily: fonts.displayBold,
      fontSize: 20,
      lineHeight: 25,
      textAlign: 'center',
    },
    emptyBody: {
      color: colors.inkSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 19,
      maxWidth: 290,
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
    retryText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 12 },
    homeButton: {
      alignItems: 'center',
      backgroundColor: colors.action,
      borderRadius: radii.full,
      height: 48,
      justifyContent: 'center',
      paddingHorizontal: 22,
    },
    homeButtonText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
  });
