import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { Avatar } from '@/components/pomelo/avatar';
import { BottomNavigation } from '@/components/pomelo/bottom-navigation';
import { fonts, radii, type SemanticColors } from '@/constants/pomelo-theme';
import type {
  PairErrorCode,
  PairState,
} from '@/features/pair/application/pair-controller';
import {
  getPairLocalDate,
  getNextImportantDate,
  validateImportantDate,
  type ImportantDateInput,
  type ImportantDateKind,
} from '@/features/pair/domain/important-date';
import {
  invitationExpiryDelay,
  normalizeInvitationCredential,
  validateAnniversary,
} from '@/features/pair/domain/pair';
import { usePair } from '@/features/pair/presentation/pair-provider';
import type { TranslationKey } from '@/localization/catalogs';
import { useLocale } from '@/localization/locale-provider';

type SetupMode = 'choice' | 'create' | 'join';

const errorKeys: Record<PairErrorCode, TranslationKey> = {
  alreadyPaired: 'pair.error.alreadyPaired',
  configuration: 'pair.error.configuration',
  invitationCancelled: 'pair.error.invitationCancelled',
  invitationExpired: 'pair.error.invitationExpired',
  invitationInvalid: 'pair.error.invitationInvalid',
  invitationUsed: 'pair.error.invitationUsed',
  invalidImportantDate: 'pair.error.invalidImportantDate',
  invalidAnniversary: 'pair.error.invalidAnniversary',
  importantDateNotFound: 'pair.error.importantDateNotFound',
  network: 'pair.error.network',
  notAllowed: 'pair.error.notAllowed',
  pairFull: 'pair.error.pairFull',
  profileIncomplete: 'pair.error.profileIncomplete',
  unexpected: 'pair.error.unexpected',
};

function formatDate(value: string, locale: 'en' | 'es') {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12));
}

function formatTimestampDate(value: string, locale: 'en' | 'es') {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function PairScreen({ onSignOut }: { onSignOut(): void }) {
  const { colors } = useAppearance();
  const { controller, error, state, status } = usePair();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const [replacingArchivedPairId, setReplacingArchivedPairId] = useState<
    string | null
  >(null);

  if (status === 'idle' || status === 'loading') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.action} size="large" />
          <Text style={styles.body}>{t('pair.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loading}>
          <Ionicons color={colors.actionDeep} name="cloud-offline-outline" size={42} />
          <Text style={styles.title}>{t('pair.loadFailure.title')}</Text>
          <Text style={[styles.body, styles.centeredText]}>
            {t('pair.loadFailure.body')}
          </Text>
          <ErrorBanner error={error} />
          <PrimaryButton
            icon="refresh"
            label={t('common.retry')}
            onPress={() => void controller.refresh()}
          />
          <TextButton
            disabled={false}
            label={t('common.signOut')}
            onPress={onSignOut}
          />
        </View>
      </SafeAreaView>
    );
  }

  const replacingArchivedPair =
    state?.status === 'archived' && state.id === replacingArchivedPairId;
  const showSetup = !state || replacingArchivedPair;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>pomelo.</Text>
          <Pressable
            accessibilityLabel={t('common.signOut')}
            accessibilityRole="button"
            onPress={onSignOut}
            style={styles.headerButton}>
            <Ionicons color={colors.inkSecondary} name="log-out-outline" size={21} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {showSetup && (
            <PairSetup
              error={error}
              onCancel={state?.status === 'archived'
                ? () => setReplacingArchivedPairId(null)
                : undefined}
            />
          )}
          {state?.status === 'waiting' && <WaitingPair error={error} state={state} />}
          {state?.status === 'active' && <ActivePair error={error} state={state} />}
          {state?.status === 'archived' && !replacingArchivedPair && (
            <ArchivedPair
              onCreatePair={() => setReplacingArchivedPairId(state.id)}
              state={state}
            />
          )}
        </ScrollView>
        {(state?.status === 'waiting' || state?.status === 'active') && (
          <BottomNavigation activeTab="couple" />
        )}
      </View>
    </SafeAreaView>
  );
}

function PairSetup({
  error,
  onCancel,
}: {
  error: PairErrorCode | null;
  onCancel?: () => void;
}) {
  const { colors } = useAppearance();
  const { controller, busy } = usePair();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const [mode, setMode] = useState<SetupMode>('choice');
  const [anniversary, setAnniversary] = useState('');
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const anniversaryError = submitted ? validateAnniversary(anniversary) : null;

  if (mode === 'choice') {
    return (
      <View style={styles.content}>
        {onCancel && <BackButton onPress={onCancel} />}
        <TitleBlock
          body={t('pair.setup.body')}
          eyebrow={t('pair.setup.eyebrow')}
          title={t('pair.setup.title')}
        />
        <View style={styles.illustration}>
          <View style={styles.heartCircle}>
            <Ionicons color={colors.action} name="heart" size={50} />
          </View>
          <View style={styles.twoBadge}>
            <Text style={styles.twoBadgeText}>2</Text>
          </View>
        </View>
        <PrimaryButton
          icon="add"
          label={t('pair.setup.create')}
          onPress={() => {
            controller.clearMessages();
            setMode('create');
          }}
        />
        <SecondaryButton
          icon="key-outline"
          label={t('pair.setup.join')}
          onPress={() => {
            controller.clearMessages();
            setMode('join');
          }}
        />
        <ErrorBanner error={error} />
      </View>
    );
  }

  if (mode === 'create') {
    return (
      <View style={styles.content}>
        <BackButton onPress={() => setMode('choice')} />
        <TitleBlock
          body={t('pair.create.body')}
          eyebrow={t('pair.create.eyebrow')}
          title={t('pair.create.title')}
        />
        <View style={styles.card}>
          <Text style={styles.label}>{t('pair.create.anniversary')}</Text>
          <TextInput
            accessibilityLabel={t('pair.create.anniversary')}
            editable={!busy}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            onChangeText={setAnniversary}
            placeholder={t('pair.create.placeholder')}
            placeholderTextColor={colors.muted}
            style={[styles.input, anniversaryError && styles.inputError]}
            value={anniversary}
          />
          {anniversaryError && (
            <Text style={styles.validationError}>
              {t(
                anniversaryError === 'future'
                  ? 'pair.create.future'
                  : 'pair.create.invalid',
              )}
            </Text>
          )}
        </View>
        <PrimaryButton
          busy={busy}
          icon="heart"
          label={t('pair.create.submit')}
          onPress={() => {
            setSubmitted(true);
            if (!validateAnniversary(anniversary)) {
              void controller.createPair(anniversary);
            }
          }}
        />
        <ErrorBanner error={error} />
      </View>
    );
  }

  const normalizedCode = normalizeInvitationCredential(code);
  return (
    <View style={styles.content}>
      <BackButton onPress={() => setMode('choice')} />
      <TitleBlock
        body={t('pair.join.body')}
        eyebrow={t('pair.join.eyebrow')}
        title={t('pair.join.title')}
      />
      <View style={styles.card}>
        <Text style={styles.label}>{t('pair.join.code')}</Text>
        <TextInput
          accessibilityLabel={t('pair.join.code')}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          onChangeText={setCode}
          placeholder={t('pair.join.placeholder')}
          placeholderTextColor={colors.muted}
          style={[styles.input, submitted && !normalizedCode && styles.inputError]}
          value={code}
        />
      </View>
      <PrimaryButton
        icon="arrow-forward"
        label={t('pair.join.submit')}
        onPress={() => {
          setSubmitted(true);
          if (normalizedCode) {
            router.push({
              pathname: '/invite',
              params: { credential: normalizedCode },
            });
          }
        }}
      />
      <ErrorBanner error={error} />
    </View>
  );
}

function WaitingPair({ error, state }: { error: PairErrorCode | null; state: PairState }) {
  const { colors } = useAppearance();
  const { busy, controller } = usePair();
  const { locale, t } = useLocale();
  const styles = createStyles(colors);
  const invitation = state.invitation;
  const isPending = invitation?.status === 'pending';

  useEffect(() => {
    if (!isPending || !invitation) {
      return undefined;
    }
    const timeout = setTimeout(
      () => void controller.refresh(),
      invitationExpiryDelay(invitation.expiresAt) + 50,
    );
    return () => clearTimeout(timeout);
  }, [controller, invitation, isPending]);

  const share = () => {
    if (!invitation) {
      return;
    }
    void Share.share({
      message: `${t('pair.waiting.shareIntro')}\n${invitation.link}\n${t('pair.waiting.shareCode')}: ${invitation.code}`,
    });
  };

  const cancel = () => {
    if (!invitation) {
      return;
    }
    Alert.alert(t('pair.waiting.cancelTitle'), t('pair.waiting.cancelBody'), [
      { style: 'cancel', text: t('common.cancel') },
      {
        onPress: () => void controller.cancelInvitation(invitation.id),
        style: 'destructive',
        text: t('pair.waiting.cancelConfirm'),
      },
    ]);
  };

  const unlink = () => {
    Alert.alert(t('pair.waiting.unlinkTitle'), t('pair.waiting.unlinkBody'), [
      { style: 'cancel', text: t('common.cancel') },
      {
        onPress: () => void controller.dissolvePair(),
        style: 'destructive',
        text: t('pair.waiting.unlinkConfirm'),
      },
    ]);
  };

  return (
    <View style={styles.content}>
      <TitleBlock
        body={t('pair.waiting.body')}
        eyebrow={t('pair.waiting.eyebrow')}
        title={t('pair.waiting.title')}
      />
      <View style={styles.invitationCard}>
        <Ionicons color={colors.action} name="mail-open-outline" size={42} />
        {isPending && invitation ? (
          <>
            <Text style={styles.codeLabel}>{t('pair.waiting.code')}</Text>
            <Text selectable style={styles.code}>{invitation.code}</Text>
            <Text style={styles.meta}>
              {t('pair.waiting.expires')}{' '}
              {formatTimestampDate(invitation.expiresAt, locale)}
            </Text>
          </>
        ) : (
          <Text style={styles.stateMessage}>
            {t(
              invitation?.status === 'expired'
                ? 'pair.waiting.expired'
                : 'pair.waiting.cancelled',
            )}
          </Text>
        )}
      </View>
      {isPending ? (
        <>
          <PrimaryButton
            busy={busy}
            icon="share-outline"
            label={t('pair.waiting.share')}
            onPress={share}
          />
          <TextButton
            disabled={busy}
            label={t('pair.waiting.cancel')}
            onPress={cancel}
          />
        </>
      ) : (
        <PrimaryButton
          busy={busy}
          icon="refresh"
          label={t('pair.waiting.renew')}
          onPress={() => void controller.createInvitation()}
        />
      )}
      <TextButton
        disabled={busy}
        label={t('pair.waiting.unlink')}
        onPress={unlink}
      />
      <ErrorBanner error={error} />
    </View>
  );
}

function ActivePair({ error, state }: { error: PairErrorCode | null; state: PairState }) {
  const { colors } = useAppearance();
  const { busy, controller } = usePair();
  const { locale, t } = useLocale();
  const styles = createStyles(colors);

  const unlink = () => {
    Alert.alert(t('pair.unlink.title'), t('pair.unlink.body'), [
      { style: 'cancel', text: t('common.cancel') },
      {
        onPress: () => void controller.dissolvePair(),
        style: 'destructive',
        text: t('pair.unlink.confirm'),
      },
    ]);
  };

  return (
    <View style={styles.content}>
      <TitleBlock
        body={t('pair.active.body')}
        eyebrow={t('pair.active.eyebrow')}
        title={t('pair.active.title')}
      />
      <View style={styles.card}>
        <Text style={styles.codeLabel}>{t('pair.active.members')}</Text>
        <View style={styles.memberList}>
          {state.members.map((member) => (
            <View key={member.userId} style={styles.member}>
              <Avatar avatarKey={member.avatarKey} size={52} />
              <Text style={styles.memberName}>{member.displayName}</Text>
              <Ionicons color={colors.positive} name="checkmark-circle" size={20} />
            </View>
          ))}
        </View>
        <View style={styles.divider} />
        <Text style={styles.codeLabel}>{t('pair.active.anniversary')}</Text>
        <Text style={styles.anniversary}>{formatDate(state.anniversary, locale)}</Text>
      </View>
      <ImportantDatesPanel state={state} />
      <PrimaryButton
        icon="sparkles-outline"
        label={t('pair.active.openHome')}
        onPress={() => router.replace('/home')}
      />
      <TextButton disabled={busy} label={t('pair.active.unlink')} onPress={unlink} />
      <ErrorBanner error={error} />
    </View>
  );
}

function ImportantDatesPanel({ state }: { state: PairState }) {
  const { colors } = useAppearance();
  const { busy, controller, error } = usePair();
  const { locale, t } = useLocale();
  const styles = createStyles(colors);
  const [clock, setClock] = useState(() => Date.now());
  const now = new Date(clock);
  const today = getPairLocalDate(now, state.timeZone);
  const nextImportantDate = getNextImportantDate({
    anniversary: state.anniversary,
    dates: state.importantDates,
    members: state.members,
    now,
    pairId: state.id,
    timeZone: state.timeZone,
  });
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<ImportantDateKind>('trip');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [formError, setFormError] = useState<PairErrorCode | null>(null);
  const [yearly, setYearly] = useState(false);

  const editingStillExists =
    !editingId || state.importantDates.some((importantDate) => importantDate.id === editingId);
  const showForm = formVisible && editingStillExists;

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormVisible(false);
    setKind('trip');
    setName('');
    setDate('');
    setFormError(null);
    setYearly(false);
  };

  const submit = () => {
    const input: ImportantDateInput = {
      date,
      kind,
      name,
      recurrence: yearly ? 'yearly' : 'once',
    };
    if (validateImportantDate(input, today)) {
      setFormError('invalidImportantDate');
      return;
    }
    setFormError(null);
    if (editingId) {
      void controller.updateImportantDate(editingId, input);
    } else {
      void controller.createImportantDate(input);
    }
    resetForm();
  };

  const edit = (importantDate: ImportantDateInput & { id: string }) => {
    setFormError(null);
    setEditingId(importantDate.id);
    setFormVisible(true);
    setKind(importantDate.kind);
    setName(importantDate.name);
    setDate(importantDate.date);
    setYearly(importantDate.recurrence === 'yearly');
  };

  return (
    <View style={styles.spaceSection}>
      <View style={styles.spaceHeading}>
        <View style={styles.spaceHeadingCopy}>
          <Text style={styles.codeLabel}>{t('pair.space.eyebrow')}</Text>
          <Text style={styles.spaceTitle}>{t('pair.space.title')}</Text>
          <Text style={styles.body}>{t('pair.space.body')}</Text>
        </View>
        <Ionicons color={colors.action} name="calendar-outline" size={28} />
      </View>

      <View style={styles.card}>
        <Text style={styles.codeLabel}>{t('pair.space.members')}</Text>
        {state.members.map((member) => (
          <View key={member.userId} style={styles.dateMember}>
            <Text style={styles.memberName}>{member.displayName}</Text>
            <Text style={styles.meta}>
              {member.birthDate
                ? t('pair.space.birthDateValue')
                    .replace('{name}', member.displayName)
                    .replace('{date}', formatDate(member.birthDate, locale))
                : t('pair.space.none')}
            </Text>
          </View>
        ))}
        <View style={styles.divider} />
        <Text style={styles.codeLabel}>{t('pair.space.anniversary')}</Text>
        <Text style={styles.anniversary}>{formatDate(state.anniversary, locale)}</Text>
      </View>

      <View style={styles.nextDateCard}>
        <Text style={styles.codeLabel}>{t('pair.space.next')}</Text>
        {nextImportantDate ? (
          <>
            <Text style={styles.nextDateName}>
              {nextImportantDate.kind === 'anniversary'
                ? t('pair.space.anniversary')
                : nextImportantDate.kind === 'birthday'
                  ? t('pair.space.nextBirthday').replace('{name}', nextImportantDate.name)
                  : nextImportantDate.name}
            </Text>
            <Text style={styles.nextDateMeta}>
              {(nextImportantDate.daysRemaining === 0
                ? t('pair.space.nextDateToday')
                : t('pair.space.nextDateIn').replace(
                    '{count}',
                    String(nextImportantDate.daysRemaining),
                  )).replace('{date}', formatDate(nextImportantDate.date, locale))}
            </Text>
          </>
        ) : (
          <Text style={styles.meta}>{t('pair.space.none')}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.codeLabel}>{t('pair.space.importantDates')}</Text>
        {state.importantDates.length === 0 && (
          <Text style={styles.meta}>{t('pair.space.none')}</Text>
        )}
        {state.importantDates.map((importantDate) => (
          <View key={importantDate.id} style={styles.importantDateRow}>
            <View style={styles.importantDateCopy}>
              <Text style={styles.dateName}>{importantDate.name}</Text>
              <Text style={styles.meta}>
                {(importantDate.recurrence === 'yearly'
                  ? t('pair.space.dateYearly')
                  : importantDate.date < today
                    ? t('pair.space.datePast')
                    : t('pair.space.dateOnce')
                ).replace('{date}', formatDate(importantDate.date, locale))}
              </Text>
            </View>
            <View style={styles.dateActions}>
              <TextButton
                disabled={busy}
                label={t('pair.space.edit')}
                onPress={() => edit(importantDate)}
              />
              <TextButton
                disabled={busy}
                label={t('pair.space.delete')}
                onPress={() =>
                  Alert.alert(t('pair.space.deleteTitle'), t('pair.space.deleteBody'), [
                    { style: 'cancel', text: t('common.cancel') },
                    {
                      onPress: () => void controller.deleteImportantDate(importantDate.id),
                      style: 'destructive',
                      text: t('pair.space.delete'),
                    },
                  ])
                }
              />
            </View>
          </View>
        ))}
        {(!formVisible || !editingStillExists) && (
          <SecondaryButton
            icon="add"
            label={t('pair.space.add')}
            onPress={() => {
              setEditingId(null);
              setFormError(null);
              setFormVisible(true);
            }}
          />
        )}
        {showForm && (
          <View style={styles.dateForm}>
            <Text style={styles.label}>{t('pair.space.name')}</Text>
            <TextInput
              editable={!busy}
              onChangeText={setName}
              placeholder={t('pair.space.name')}
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={name}
            />
            <Text style={styles.label}>{t('pair.space.kind')}</Text>
            <View style={styles.kindRow}>
              {(['trip', 'custom'] as const).map((option) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: kind === option }}
                  key={option}
                  onPress={() => setKind(option)}
                  style={[styles.kindOption, kind === option && styles.kindOptionSelected]}>
                  <Text style={styles.kindOptionText}>
                    {t(option === 'trip' ? 'pair.space.trip' : 'pair.space.custom')}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{t('pair.space.date')}</Text>
            <TextInput
              editable={!busy}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              onChangeText={setDate}
              placeholder={t('pair.space.placeholder')}
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={date}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: yearly }}
              onPress={() => setYearly((current) => !current)}
              style={styles.repeatToggle}>
              <Ionicons
                color={yearly ? colors.action : colors.muted}
                name={yearly ? 'checkbox' : 'square-outline'}
                size={20}
              />
              <Text style={styles.systemText}>{t('pair.space.repeat')}</Text>
            </Pressable>
            <PrimaryButton
              busy={busy}
              icon="checkmark"
              label={t('pair.space.save')}
              onPress={submit}
            />
            <TextButton disabled={busy} label={t('pair.space.cancel')} onPress={resetForm} />
          </View>
        )}
      </View>
      <ErrorBanner error={formError ?? error} />
    </View>
  );
}

function ArchivedPair({
  onCreatePair,
  state,
}: {
  onCreatePair(): void;
  state: PairState;
}) {
  const { colors } = useAppearance();
  const { locale, t } = useLocale();
  const styles = createStyles(colors);

  return (
    <View style={styles.content}>
      <TitleBlock
        body={t('pair.archive.body')}
        eyebrow={t('pair.archive.eyebrow')}
        title={t('pair.archive.title')}
      />
      <View style={styles.archiveCard}>
        <Ionicons color={colors.inkSecondary} name="archive-outline" size={42} />
        <Text style={styles.anniversary}>{formatDate(state.anniversary, locale)}</Text>
        <View style={styles.archiveMembers}>
          {state.members.map((member) => (
            <Avatar avatarKey={member.avatarKey} key={member.userId} size={48} />
          ))}
        </View>
      </View>
      <PrimaryButton
        icon="heart-outline"
        label={t('pair.archive.newPair')}
        onPress={onCreatePair}
      />
    </View>
  );
}

function TitleBlock({ body, eyebrow, title }: { body: string; eyebrow: string; title: string }) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

function ErrorBanner({ error }: { error: PairErrorCode | null }) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  if (!error) {
    return null;
  }
  return (
    <View style={styles.errorBanner}>
      <Ionicons color={colors.actionDeep} name="alert-circle" size={19} />
      <Text style={styles.errorText}>{t(errorKeys[error])}</Text>
    </View>
  );
}

function BackButton({ onPress }: { onPress(): void }) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.backButton}>
      <Ionicons color={colors.inkSecondary} name="arrow-back" size={19} />
      <Text style={styles.backText}>{t('common.back')}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  busy = false,
  icon,
  label,
  onPress,
}: {
  busy?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
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
        styles.primaryButton,
        busy && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {busy ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          <Text style={styles.primaryButtonText}>{label}</Text>
          <Ionicons color={colors.white} name={icon} size={19} />
        </>
      )}
    </Pressable>
  );
}

function SecondaryButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress(): void;
}) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryButton}>
      <Ionicons color={colors.actionDeep} name={icon} size={19} />
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function TextButton({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress(): void;
}) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
      <Text style={styles.textButton}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    shell: { alignSelf: 'center', flex: 1, maxWidth: 430, paddingHorizontal: 22, width: '100%' },
    header: { alignItems: 'center', flexDirection: 'row', height: 58, justifyContent: 'space-between' },
    wordmark: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 26, letterSpacing: -1.1 },
    headerButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
    scrollContent: { paddingBottom: 34 },
    loading: { alignItems: 'center', flex: 1, gap: 14, justifyContent: 'center', padding: 30 },
    centeredText: { textAlign: 'center' },
    content: { gap: 18, paddingTop: 16 },
    titleBlock: { gap: 8 },
    eyebrow: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.9 },
    title: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 34, letterSpacing: -1.2, lineHeight: 38 },
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 13, lineHeight: 21 },
    illustration: { alignItems: 'center', height: 180, justifyContent: 'center' },
    heartCircle: { alignItems: 'center', backgroundColor: colors.actionSoft, borderRadius: 72, height: 144, justifyContent: 'center', width: 144 },
    twoBadge: { alignItems: 'center', backgroundColor: colors.reward, borderColor: colors.background, borderRadius: 20, borderWidth: 4, bottom: 18, height: 40, justifyContent: 'center', position: 'absolute', right: 96, width: 40 },
    twoBadgeText: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 17 },
    card: { backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: radii.lg, borderWidth: 1, gap: 12, padding: 18 },
    label: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 11 },
    input: { backgroundColor: colors.surfaceStrong, borderColor: colors.borderSoft, borderRadius: radii.md, borderWidth: 1, color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 16, height: 54, letterSpacing: 0.6, paddingHorizontal: 15 },
    inputError: { borderColor: colors.actionDeep },
    validationError: { color: colors.actionDeep, fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 16 },
    primaryButton: { alignItems: 'center', backgroundColor: colors.action, borderRadius: radii.full, flexDirection: 'row', gap: 9, height: 56, justifyContent: 'center' },
    primaryButtonText: { color: colors.white, fontFamily: fonts.bodyBold, fontSize: 13 },
    secondaryButton: { alignItems: 'center', backgroundColor: colors.actionSoft, borderRadius: radii.full, flexDirection: 'row', gap: 9, height: 54, justifyContent: 'center' },
    secondaryButtonText: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 13 },
    textButton: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 12, padding: 10, textAlign: 'center' },
    backButton: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 7, paddingVertical: 6 },
    backText: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 12 },
    invitationCard: { alignItems: 'center', backgroundColor: colors.rewardSoft, borderRadius: radii.lg, gap: 9, padding: 24 },
    codeLabel: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.7 },
    code: { color: colors.ink, fontFamily: fonts.displayExtraBold, fontSize: 32, letterSpacing: 2 },
    meta: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 10, textAlign: 'center' },
    stateMessage: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 20, textAlign: 'center' },
    errorBanner: { alignItems: 'flex-start', backgroundColor: colors.actionSoft, borderRadius: radii.md, flexDirection: 'row', gap: 9, padding: 14 },
    errorText: { color: colors.inkSecondary, flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 17 },
    memberList: { gap: 10 },
    member: { alignItems: 'center', flexDirection: 'row', gap: 12 },
    memberName: { color: colors.ink, flex: 1, fontFamily: fonts.bodyBold, fontSize: 14 },
    divider: { backgroundColor: colors.borderSoft, height: StyleSheet.hairlineWidth },
    anniversary: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 20 },
    spaceSection: { gap: 12 },
    spaceHeading: {
      alignItems: 'flex-start',
      backgroundColor: colors.rewardSoft,
      borderRadius: radii.lg,
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
      padding: 18,
    },
    spaceHeadingCopy: { flex: 1, gap: 7 },
    spaceTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 27 },
    dateMember: { gap: 3 },
    nextDateCard: { backgroundColor: colors.actionSoft, borderRadius: radii.lg, gap: 8, padding: 18 },
    nextDateName: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 25 },
    nextDateMeta: { color: colors.actionDeep, fontFamily: fonts.bodySemiBold, fontSize: 12 },
    importantDateRow: { alignItems: 'center', borderTopColor: colors.borderSoft, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 8, paddingTop: 11 },
    importantDateCopy: { flex: 1, gap: 3 },
    dateName: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 13 },
    dateActions: { alignItems: 'flex-end', gap: 0 },
    dateForm: { borderTopColor: colors.borderSoft, borderTopWidth: StyleSheet.hairlineWidth, gap: 10, paddingTop: 14 },
    kindRow: { flexDirection: 'row', gap: 8 },
    kindOption: { alignItems: 'center', backgroundColor: colors.surfaceStrong, borderColor: colors.borderSoft, borderRadius: radii.full, borderWidth: 1, flex: 1, height: 42, justifyContent: 'center' },
    kindOptionSelected: { backgroundColor: colors.actionSoft, borderColor: colors.action },
    kindOptionText: { color: colors.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 11 },
    repeatToggle: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingVertical: 4 },
    systemText: { color: colors.inkSecondary, flex: 1, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
    archiveCard: { alignItems: 'center', backgroundColor: colors.backgroundRaised, borderRadius: radii.lg, gap: 15, padding: 28 },
    archiveMembers: { flexDirection: 'row', gap: 8 },
    disabled: { opacity: 0.55 },
    pressed: { opacity: 0.72 },
  });
