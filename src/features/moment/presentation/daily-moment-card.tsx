import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import type { DoodleController, DoodleSnapshot } from '@/features/moment/application/doodle-controller';
import type { MomentErrorCode } from '@/features/moment/application/moment-controller';
import {
  formatMomentRemaining,
  getMomentWindow,
  momentRemainingMs,
  type Contribution,
  type DailyMoment,
  type MomentWindow,
  type PhotoDraft,
  type QuestionPrompt,
  type QuestionResponse,
} from '@/features/moment/domain/moment';
import { DoodleMomentCard } from '@/features/moment/presentation/doodle-moment-card';
import { PhotoMomentCard } from '@/features/moment/presentation/photo-moment-card';
import { useLocale } from '@/localization/locale-provider';

type DailyMomentCardProps = {
  busy: boolean;
  createPrivateMediaUrl(path: string): Promise<string>;
  draft: QuestionResponse | null;
  error: MomentErrorCode | null;
  moment: DailyMoment;
  onDraftChange(response: QuestionResponse): void;
  onPhotoDraftChange(draft: PhotoDraft): void;
  onUseTestPhotos(): Promise<void>;
  onPhotoSubmit(): void;
  onReveal(): void;
  onSubmit(response: QuestionResponse): void;
  doodle: DoodleSnapshot;
  doodleController: DoodleController;
  photoDraft: PhotoDraft | null;
  syncPending: boolean;
};

function errorKey(error: MomentErrorCode) {
  switch (error) {
    case 'draftStorage':
      return 'moment.error.draftStorage' as const;
    case 'invalidResponse':
      return 'moment.error.invalidResponse' as const;
    case 'momentClosed':
      return 'moment.error.momentClosed' as const;
    case 'momentNotReady':
      return 'moment.error.momentNotReady' as const;
    case 'network':
      return 'moment.error.network' as const;
    default:
      return 'moment.error.unexpected' as const;
  }
}

function responseText(contribution: Contribution) {
  return contribution.responseText ?? contribution.responseChoice ?? '';
}

function ContributionBubble({
  contribution,
  label,
  own,
}: {
  contribution: Contribution;
  label: string;
  own: boolean;
}) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  return (
    <View style={[styles.messageRow, own ? styles.messageRowOwn : styles.messageRowPartner]}>
      <View style={[styles.messageBubble, own ? styles.ownBubble : styles.partnerBubble]}>
        <Text style={styles.sender}>{label}</Text>
        <Text style={styles.answerText}>{responseText(contribution)}</Text>
        <View style={[styles.bubbleTail, own ? styles.ownTail : styles.partnerTail]} />
      </View>
    </View>
  );
}

function ActionButton({
  busy,
  label,
  onPress,
}: {
  busy: boolean;
  label: string;
  onPress(): void;
}) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        busy && styles.disabled,
        pressed && styles.actionPressed,
      ]}>
      <Text style={styles.actionText}>{label}</Text>
      {busy ? (
        <Ionicons color={colors.white} name="hourglass-outline" size={18} />
      ) : (
        <Ionicons color={colors.white} name="arrow-forward" size={18} />
      )}
    </Pressable>
  );
}

export function DailyMomentCard(props: DailyMomentCardProps) {
  if (props.moment.format === 'photo') {
    return (
      <PhotoMomentCard
        busy={props.busy}
        createPrivateMediaUrl={props.createPrivateMediaUrl}
        error={props.error}
        moment={props.moment}
        onDraftChange={props.onPhotoDraftChange}
        onReveal={props.onReveal}
        onSubmit={props.onPhotoSubmit}
        onUseTestPhotos={props.onUseTestPhotos}
        photoDraft={props.photoDraft}
        syncPending={props.syncPending}
      />
    );
  }
  if (props.moment.format === 'doodle') {
    return (
      <DoodleMomentCard
        busy={props.busy}
        doodle={props.doodle}
        doodleController={props.doodleController}
        error={props.error}
        moment={props.moment}
        onReveal={props.onReveal}
        syncPending={props.syncPending}
      />
    );
  }
  return <QuestionMomentCard {...props} />;
}

function QuestionMomentCard({
  busy,
  draft,
  error,
  moment,
  onDraftChange,
  onReveal,
  onSubmit,
  syncPending,
}: DailyMomentCardProps) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const [draftText, setDraftText] = useState(() => draft?.text ?? '');
  const [draftChoice, setDraftChoice] = useState<string | null>(() => draft?.choice ?? null);
  const [clock, setClock] = useState(() => Date.now());
  const submitted = moment.ownContribution !== null;
  const revealed = moment.status === 'revealed';
  const prompt = moment.prompt as QuestionPrompt;
  const window = getMomentWindow(moment, new Date(clock));
  const expired = window === 'expired';

  useEffect(() => {
    if (window === 'complete' || window === 'expired') {
      return undefined;
    }
    const timer = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [window]);

  const submit = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSubmit(
      prompt.responseType === 'choice'
        ? { choice: draftChoice ?? undefined }
        : { text: draftText },
    );
  };

  const saveTextDraft = (text: string) => {
    setDraftText(text);
    onDraftChange({ text });
  };

  const saveChoiceDraft = (choice: string) => {
    setDraftChoice(choice);
    onDraftChange({ choice });
  };

  const chip = expired
    ? 'moment.kind.expired'
    : window === 'recovery'
      ? 'moment.kind.recovery'
      : revealed
    ? 'moment.kind.revealed'
    : moment.status === 'ready'
      ? 'moment.kind.ready'
      : submitted
        ? 'moment.kind.answered'
        : 'moment.kind.question';

  return (
    <View style={styles.card}>
      <View style={styles.meta}>
        <View style={styles.kindChip}>
          <Text style={styles.kindText}>{t(chip)}</Text>
        </View>
        <Text style={styles.metaText}>{t('moment.today')}</Text>
      </View>

      <View style={styles.prompt}>
        <Text style={styles.promptLabel}>{t('moment.promptLabel')}</Text>
        <Text style={styles.question}>{prompt.text}</Text>
      </View>

      <LifecycleBanner moment={moment} window={window} now={new Date(clock)} />

      {moment.streak.recoveryAvailable && !revealed && (
        <View style={styles.systemMessage}>
          <Ionicons color={colors.action} name="shield-checkmark-outline" size={17} />
          <Text style={styles.systemText}>{t('moment.streakRecovery')}</Text>
        </View>
      )}

      {error && <Text style={styles.errorText}>{t(errorKey(error))}</Text>}

      {syncPending && !submitted && (
        <View style={styles.syncMessage}>
          <Ionicons color={colors.actionDeep} name="cloud-offline-outline" size={17} />
          <Text style={styles.syncText}>{t('moment.syncPending')}</Text>
        </View>
      )}

      {revealed && moment.ownContribution && (
        <>
          {moment.partner.contribution && (
            <ContributionBubble
              contribution={moment.partner.contribution}
              label={moment.partner.displayName}
              own={false}
            />
          )}
          <ContributionBubble
            contribution={moment.ownContribution}
            label={t('moment.you')}
            own
          />
          <View style={styles.revealedNote}>
            <Ionicons color={colors.actionDeep} name="sparkles-outline" size={17} />
            <Text style={styles.revealedNoteText}>{t('moment.revealedNote')}</Text>
          </View>
        </>
      )}

      {!revealed && !submitted && !expired && (
        <>
          <View style={styles.systemMessage}>
            <Ionicons color={colors.inkSecondary} name="lock-closed-outline" size={17} />
            <Text style={styles.systemText}>{t('moment.privacy')}</Text>
          </View>
          {prompt.responseType === 'choice' ? (
            <View style={styles.options}>
              {prompt.options.map((option) => {
                const selected = draftChoice === option;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={option}
                    onPress={() => saveChoiceDraft(option)}
                    style={[styles.option, selected && styles.optionSelected]}>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <TextInput
              accessibilityLabel={t('moment.answerLabel')}
              editable={!busy}
              maxLength={1000}
              multiline
              onChangeText={saveTextDraft}
              placeholder={t('moment.answerPlaceholder')}
              placeholderTextColor={colors.muted}
              style={styles.input}
              textAlignVertical="top"
              value={draftText}
            />
          )}
          <ActionButton
            busy={busy}
            label={t('moment.answerSubmit')}
            onPress={submit}
          />
        </>
      )}

      {!revealed && submitted && moment.ownContribution && (
        <>
          <ContributionBubble
            contribution={moment.ownContribution}
            label={t('moment.you')}
            own
          />
          <View style={styles.systemMessage}>
            <Ionicons color={colors.inkSecondary} name="lock-closed-outline" size={17} />
            <Text style={styles.systemText}>
              {expired
                ? t('moment.expired')
                : moment.partner.submitted
                ? t('moment.partnerReady')
                : t('moment.saved')}
            </Text>
          </View>
          {moment.status === 'ready' && (
            <ActionButton
              busy={busy}
              label={t('moment.action.reveal')}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onReveal();
              }}
            />
          )}
        </>
      )}

      {!revealed && !submitted && !expired && moment.partner.submitted && (
        <View style={styles.systemMessage}>
          <Ionicons color={colors.inkSecondary} name="lock-closed-outline" size={17} />
          <Text style={styles.systemText}>{t('moment.partnerReady')}</Text>
        </View>
      )}
    </View>
  );
}

function LifecycleBanner({
  moment,
  now,
  window,
}: {
  moment: DailyMoment;
  now: Date;
  window: MomentWindow;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const time = formatMomentRemaining(momentRemainingMs(moment, now));
  const key = window === 'normal'
    ? 'moment.window.normal'
    : window === 'recovery'
      ? 'moment.window.recovery'
      : window === 'expired'
        ? 'moment.window.expired'
        : 'moment.window.complete';
  return (
    <View style={[styles.lifecycle, window === 'recovery' && styles.lifecycleRecovery]}>
      <Ionicons
        color={window === 'expired' ? colors.muted : colors.actionDeep}
        name={window === 'expired' ? 'lock-closed-outline' : 'timer-outline'}
        size={17}
      />
      <Text style={styles.lifecycleText}>{t(key).replace('{time}', time)}</Text>
    </View>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    card: {
      alignItems: 'stretch',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 12,
      padding: 18,
      shadowColor: colors.ink,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
    },
    meta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    kindChip: {
      alignItems: 'center',
      backgroundColor: colors.actionSoft,
      borderRadius: radii.full,
      height: 28,
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    kindText: {
      color: colors.actionDeep,
      fontFamily: fonts.bodyBold,
      fontSize: 9,
      letterSpacing: 0.45,
    },
    metaText: {
      color: colors.muted,
      fontFamily: fonts.bodyBold,
      fontSize: 9,
      letterSpacing: 0.35,
    },
    prompt: {
      backgroundColor: colors.backgroundRaised,
      borderRadius: 20,
      gap: 8,
      padding: 16,
    },
    promptLabel: {
      color: colors.actionDeep,
      fontFamily: fonts.bodyBold,
      fontSize: 9,
      letterSpacing: 0.6,
    },
    question: {
      color: colors.ink,
      fontFamily: fonts.displayBold,
      fontSize: 21,
      letterSpacing: -0.35,
      lineHeight: 26,
    },
    systemMessage: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 2,
    },
    systemText: {
      color: colors.inkSecondary,
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 17,
    },
    syncMessage: {
      alignItems: 'center',
      backgroundColor: colors.actionSoft,
      borderRadius: 14,
      flexDirection: 'row',
      gap: 8,
      padding: 11,
    },
    syncText: {
      color: colors.actionDeep,
      flex: 1,
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      lineHeight: 17,
    },
    lifecycle: {
      alignItems: 'center',
      backgroundColor: colors.backgroundRaised,
      borderRadius: 14,
      flexDirection: 'row',
      gap: 8,
      padding: 11,
    },
    lifecycleRecovery: { backgroundColor: colors.rewardSoft },
    lifecycleText: {
      color: colors.inkSecondary,
      flex: 1,
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      lineHeight: 17,
    },
    input: {
      backgroundColor: colors.surfaceStrong,
      borderColor: colors.borderSoft,
      borderRadius: 18,
      borderWidth: 1,
      color: colors.ink,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 21,
      minHeight: 110,
      padding: 15,
    },
    options: { gap: 8 },
    option: {
      alignItems: 'center',
      backgroundColor: colors.surfaceStrong,
      borderColor: colors.borderSoft,
      borderRadius: 16,
      borderWidth: 1,
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    optionSelected: { backgroundColor: colors.actionSoft, borderColor: colors.action },
    optionText: { color: colors.inkSecondary, fontFamily: fonts.bodySemiBold, fontSize: 13 },
    optionTextSelected: { color: colors.actionDeep },
    action: {
      alignItems: 'center',
      backgroundColor: colors.action,
      borderRadius: radii.full,
      flexDirection: 'row',
      gap: 8,
      height: 52,
      justifyContent: 'center',
    },
    actionText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 12 },
    actionPressed: { opacity: 0.7 },
    disabled: { opacity: 0.55 },
    messageRow: { flexDirection: 'row' },
    messageRowOwn: { justifyContent: 'flex-end' },
    messageRowPartner: { justifyContent: 'flex-start' },
    messageBubble: {
      borderRadius: 18,
      gap: 6,
      maxWidth: '88%',
      paddingHorizontal: 15,
      paddingVertical: 12,
      position: 'relative',
    },
    ownBubble: { backgroundColor: colors.actionSoft, borderBottomRightRadius: 6 },
    partnerBubble: { backgroundColor: colors.backgroundRaised, borderBottomLeftRadius: 6 },
    sender: {
      color: colors.inkSecondary,
      fontFamily: fonts.bodyBold,
      fontSize: 9,
      letterSpacing: 0.45,
      textTransform: 'uppercase',
    },
    answerText: {
      color: colors.ink,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 20,
    },
    lockedText: {
      color: colors.muted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    errorText: {
      color: colors.actionDeep,
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      lineHeight: 17,
    },
    bubbleTail: { bottom: 0, height: 10, position: 'absolute', width: 10 },
    ownTail: { backgroundColor: colors.actionSoft, right: -4, transform: [{ skewX: '-25deg' }] },
    partnerTail: {
      backgroundColor: colors.backgroundRaised,
      left: -4,
      transform: [{ skewX: '25deg' }],
    },
    revealedNote: {
      alignItems: 'center',
      backgroundColor: colors.rewardSoft,
      borderRadius: radii.full,
      flexDirection: 'row',
      gap: 7,
      justifyContent: 'center',
      minHeight: 34,
      paddingHorizontal: 14,
    },
    revealedNoteText: {
      color: colors.actionDeep,
      fontFamily: fonts.bodyBold,
      fontSize: 10,
    },
  });
