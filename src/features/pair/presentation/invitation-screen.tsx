import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import type {
  InvitationPreviewStatus,
  PairErrorCode,
} from '@/features/pair/application/pair-controller';
import { usePair } from '@/features/pair/presentation/pair-provider';
import type { TranslationKey } from '@/localization/catalogs';
import { useLocale } from '@/localization/locale-provider';

const errorKeys: Record<PairErrorCode, TranslationKey> = {
  alreadyPaired: 'pair.error.alreadyPaired',
  configuration: 'pair.error.configuration',
  invitationCancelled: 'pair.error.invitationCancelled',
  invitationExpired: 'pair.error.invitationExpired',
  invitationInvalid: 'pair.error.invitationInvalid',
  invitationUsed: 'pair.error.invitationUsed',
  invalidAnniversary: 'pair.error.invalidAnniversary',
  network: 'pair.error.network',
  notAllowed: 'pair.error.notAllowed',
  pairFull: 'pair.error.pairFull',
  profileIncomplete: 'pair.error.profileIncomplete',
  unexpected: 'pair.error.unexpected',
};

const statusCopy: Record<
  Exclude<InvitationPreviewStatus, 'valid'>,
  { body: TranslationKey; icon: keyof typeof Ionicons.glyphMap; title: TranslationKey }
> = {
  cancelled: {
    body: 'invite.cancelled.body',
    icon: 'close-circle-outline',
    title: 'invite.cancelled.title',
  },
  expired: {
    body: 'invite.expired.body',
    icon: 'time-outline',
    title: 'invite.expired.title',
  },
  invalid: {
    body: 'invite.invalid.body',
    icon: 'help-circle-outline',
    title: 'invite.invalid.title',
  },
  pairFull: {
    body: 'invite.pairFull.body',
    icon: 'people-outline',
    title: 'invite.pairFull.title',
  },
  used: {
    body: 'invite.used.body',
    icon: 'checkmark-circle-outline',
    title: 'invite.used.title',
  },
};

function formatDate(value: string, locale: 'en' | 'es') {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12));
}

export function InvitationScreen({ credential }: { credential: string }) {
  const { colors } = useAppearance();
  const { busy, controller, error, preview, state, status } = usePair();
  const { locale, t } = useLocale();
  const styles = createStyles(colors);
  const [acceptedPairId, setAcceptedPairId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'ready') {
      return;
    }
    controller.clearMessages();
    void controller.previewInvitation(credential);
  }, [controller, credential, status]);

  if (acceptedPairId && state?.id === acceptedPairId && state.status === 'active') {
    return (
      <InvitationShell>
        <View style={styles.successIcon}>
          <Ionicons color={colors.positive} name="heart-circle" size={72} />
        </View>
        <Text style={styles.eyebrow}>{t('invite.success.eyebrow')}</Text>
        <Text style={styles.title}>{t('invite.success.title')}</Text>
        <Text style={styles.body}>{t('invite.success.body')}</Text>
        <PrimaryButton
          busy={false}
          label={t('invite.success.continue')}
          onPress={() => router.replace('/home')}
        />
      </InvitationShell>
    );
  }

  if (!preview && !error) {
    return (
      <InvitationShell>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.action} size="large" />
          <Text style={styles.body}>{t('invite.loading')}</Text>
        </View>
      </InvitationShell>
    );
  }

  if (preview && preview.status !== 'valid') {
    const copy = statusCopy[preview.status];
    return (
      <InvitationShell>
        <View style={styles.statusIcon}>
          <Ionicons color={colors.actionDeep} name={copy.icon} size={45} />
        </View>
        <Text style={styles.title}>{t(copy.title)}</Text>
        <Text style={styles.body}>{t(copy.body)}</Text>
        <SecondaryButton
          label={t('invite.tryCode')}
          onPress={() => router.replace('/pair')}
        />
      </InvitationShell>
    );
  }

  return (
    <InvitationShell>
      {preview?.status === 'valid' && (
        <>
          <Text style={styles.eyebrow}>{t('invite.valid.eyebrow')}</Text>
          <Text style={styles.title}>{t('invite.valid.title')}</Text>
          <Text style={styles.body}>{t('invite.valid.body')}</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detail}>
              <Ionicons color={colors.action} name="person-circle-outline" size={27} />
              <View style={styles.detailCopy}>
                <Text style={styles.detailLabel}>{t('invite.valid.creator')}</Text>
                <Text style={styles.detailValue}>{preview.creatorName}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.detail}>
              <Ionicons color={colors.action} name="calendar-outline" size={25} />
              <View style={styles.detailCopy}>
                <Text style={styles.detailLabel}>{t('invite.valid.anniversary')}</Text>
                <Text style={styles.detailValue}>
                  {preview.anniversary
                    ? formatDate(preview.anniversary, locale)
                    : null}
                </Text>
              </View>
            </View>
          </View>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons color={colors.actionDeep} name="alert-circle" size={19} />
              <Text style={styles.errorText}>{t(errorKeys[error])}</Text>
            </View>
          )}
          <PrimaryButton
            busy={busy}
            label={t('invite.valid.accept')}
            onPress={() => {
              void controller.acceptInvitation(credential).then((accepted) => {
                if (accepted?.status === 'active') {
                  setAcceptedPairId(accepted.id);
                }
              });
            }}
          />
          <SecondaryButton
            label={t('common.cancel')}
            onPress={() => router.replace('/pair')}
          />
        </>
      )}
      {!preview && error && (
        <>
          <View style={styles.errorBanner}>
            <Ionicons color={colors.actionDeep} name="alert-circle" size={19} />
            <Text style={styles.errorText}>{t(errorKeys[error])}</Text>
          </View>
          <PrimaryButton
            busy={busy}
            label={t('common.retry')}
            onPress={() => void controller.refresh()}
          />
          <SecondaryButton
            label={t('invite.tryCode')}
            onPress={() => router.replace('/pair')}
          />
        </>
      )}
    </InvitationShell>
  );
}

function InvitationShell({ children }: { children: React.ReactNode }) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.shell} showsVerticalScrollIndicator={false}>
        <Text style={styles.wordmark}>pomelo.</Text>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PrimaryButton({ busy, label, onPress }: { busy: boolean; label: string; onPress(): void }) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={[styles.primaryButton, busy && styles.disabled]}>
      {busy ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          <Text style={styles.primaryButtonText}>{label}</Text>
          <Ionicons color={colors.white} name="arrow-forward" size={19} />
        </>
      )}
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress(): void }) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryButton}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    shell: { alignSelf: 'center', minHeight: '100%', padding: 22, width: '100%', maxWidth: 430 },
    wordmark: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 26, letterSpacing: -1.1 },
    content: { flex: 1, gap: 18, justifyContent: 'center', paddingBottom: 40, paddingTop: 30 },
    loading: { alignItems: 'center', gap: 14 },
    eyebrow: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.9 },
    title: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 34, letterSpacing: -1.2, lineHeight: 39 },
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 13, lineHeight: 21 },
    detailsCard: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: radii.lg, borderWidth: 1, gap: 15, padding: 18 },
    detail: { alignItems: 'center', flexDirection: 'row', gap: 12 },
    detailCopy: { flex: 1, gap: 3 },
    detailLabel: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 0.7 },
    detailValue: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 18 },
    divider: { backgroundColor: colors.borderSoft, height: StyleSheet.hairlineWidth },
    statusIcon: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.actionSoft, borderRadius: 42, height: 84, justifyContent: 'center', width: 84 },
    successIcon: { alignItems: 'center' },
    primaryButton: { alignItems: 'center', backgroundColor: colors.action, borderRadius: radii.full, flexDirection: 'row', gap: 9, height: 56, justifyContent: 'center' },
    primaryButtonText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 13 },
    secondaryButton: { alignItems: 'center', backgroundColor: colors.backgroundRaised, borderRadius: radii.full, height: 52, justifyContent: 'center' },
    secondaryButtonText: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 12 },
    errorBanner: { alignItems: 'flex-start', backgroundColor: colors.actionSoft, borderRadius: radii.md, flexDirection: 'row', gap: 9, padding: 14 },
    errorText: { color: colors.inkSecondary, flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 17 },
    disabled: { opacity: 0.55 },
  });
