import NativeDateTimePicker from '@expo/ui/community/datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fonts, palette, radii } from '@/constants/pomelo-theme';
import {
  appearanceValues,
  avatarKeys,
  formatDateOnly,
  hasProfileValidationErrors,
  parseDateOnly,
  type Appearance,
  type AvatarKey,
  type Locale,
  validateProfileInput,
} from '@/features/account/domain/profile';
import { useAccount } from '@/features/account/presentation/account-provider';
import {
  accountCopy,
  deviceLocale,
  errorCopy,
} from '@/features/account/presentation/account-copy';
import { Avatar } from '@/features/account/presentation/avatar';

const minimumBirthDate = new Date(1900, 0, 1, 12);
const defaultBirthDate = new Date(2000, 0, 1, 12);

function initialAvatar(userId: string): AvatarKey {
  const value = Array.from(userId).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  return avatarKeys[value % avatarKeys.length];
}

export function ProfileScreen() {
  const { busy, controller, error, user } = useAccount();
  const [editedDisplayName, setEditedDisplayName] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(
    initialAvatar(user?.id ?? 'pomelo'),
  );
  const [birthDate, setBirthDate] = useState('');
  const [locale, setLocale] = useState<Locale>(deviceLocale());
  const [appearance, setAppearance] = useState<Appearance>('system');
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [draftBirthDate, setDraftBirthDate] = useState(defaultBirthDate);
  const [submitted, setSubmitted] = useState(false);
  const copy = useMemo(() => accountCopy(locale), [locale]);
  const displayName = editedDisplayName ?? user?.displayNameHint ?? '';
  const input = { appearance, avatarKey, birthDate, displayName, locale };
  const validation = validateProfileInput(input);
  const selectedDate = parseDateOnly(birthDate) ?? defaultBirthDate;
  const today = new Date();

  const rerollAvatar = () => {
    const next = (avatarKeys.indexOf(avatarKey) + 1) % avatarKeys.length;
    setAvatarKey(avatarKeys[next]);
  };

  const save = () => {
    setSubmitted(true);
    if (!hasProfileValidationErrors(validation)) {
      void controller.saveProfile(input);
    }
  };

  const birthDateError =
    submitted && validation.birthDate
      ? validation.birthDate === 'future'
        ? copy.birthDateFuture
        : copy.birthDateInvalid
      : null;
  const birthDateLabel = birthDate
    ? new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(selectedDate)
    : copy.birthDateSelect;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.shell}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.wordmark}>pomelo.</Text>
            <Text style={styles.progress}>{copy.profileProgress}</Text>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>{copy.profileTitle}</Text>
            <Text style={styles.intro}>{copy.profileIntro}</Text>
          </View>

          <View style={styles.avatarSection}>
            <View style={styles.avatarHalo}>
              <Avatar avatarKey={avatarKey} size={128} />
            </View>
            <Text style={styles.avatarLabel}>{copy.profileAvatar}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={rerollAvatar}
              style={({ pressed }) => [styles.rerollButton, pressed && styles.pressed]}>
              <Ionicons color={palette.actionDeep} name="shuffle" size={17} />
              <Text style={styles.rerollText}>{copy.profileAvatarReroll}</Text>
            </Pressable>
          </View>

          <View style={styles.formCard}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{copy.name}</Text>
              <TextInput
                accessibilityLabel={copy.name}
                autoCapitalize="words"
                autoComplete="name"
                editable={!busy}
                maxLength={60}
                onChangeText={setEditedDisplayName}
                placeholder={copy.namePlaceholder}
                placeholderTextColor={palette.muted}
                style={[
                  styles.input,
                  submitted && validation.displayName && styles.inputError,
                ]}
                textContentType="name"
                value={displayName}
              />
              {submitted && validation.displayName && (
                <Text style={styles.errorText}>{copy.nameRequired}</Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{copy.birthDate}</Text>
              {Platform.OS === 'ios' && (
                <Pressable
                  accessibilityLabel={copy.birthDate}
                  accessibilityRole="button"
                  onPress={() => {
                    setDraftBirthDate(selectedDate);
                    setShowIosPicker(true);
                  }}
                  style={[styles.dateRow, birthDateError && styles.inputError]}>
                  <Ionicons color={palette.inkSecondary} name="calendar-outline" size={20} />
                  <Text style={[styles.dateText, !birthDate && styles.datePlaceholder]}>
                    {birthDateLabel}
                  </Text>
                  <Ionicons color={palette.muted} name="chevron-down" size={17} />
                </Pressable>
              )}
              {Platform.OS === 'android' && (
                <>
                  <Pressable
                    accessibilityLabel={copy.birthDate}
                    accessibilityRole="button"
                    onPress={() => setShowAndroidPicker(true)}
                    style={[styles.dateRow, birthDateError && styles.inputError]}>
                    <Ionicons color={palette.inkSecondary} name="calendar-outline" size={20} />
                    <Text style={[styles.dateText, !birthDate && styles.datePlaceholder]}>
                      {birthDateLabel}
                    </Text>
                    <Ionicons color={palette.muted} name="chevron-down" size={17} />
                  </Pressable>
                  {showAndroidPicker && (
                    <NativeDateTimePicker
                      accentColor={palette.action}
                      maximumDate={today}
                      minimumDate={minimumBirthDate}
                      mode="date"
                      negativeButton={{ label: copy.logoutCancel }}
                      onDismiss={() => setShowAndroidPicker(false)}
                      onValueChange={(_event, date) => {
                        setBirthDate(formatDateOnly(date));
                        setShowAndroidPicker(false);
                      }}
                      positiveButton={{ label: copy.birthDateDone }}
                      presentation="dialog"
                      value={selectedDate}
                    />
                  )}
                </>
              )}
              {Platform.OS === 'web' && (
                <TextInput
                  accessibilityLabel={copy.birthDate}
                  keyboardType="numbers-and-punctuation"
                  onChangeText={setBirthDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={palette.muted}
                  style={[styles.input, birthDateError && styles.inputError]}
                  value={birthDate}
                />
              )}
              {birthDateError && <Text style={styles.errorText}>{birthDateError}</Text>}
            </View>
          </View>

          <Modal
            animationType="slide"
            onRequestClose={() => setShowIosPicker(false)}
            transparent
            visible={showIosPicker}>
            <Pressable
              accessibilityLabel={copy.logoutCancel}
              onPress={() => setShowIosPicker(false)}
              style={styles.modalBackdrop}>
              <Pressable onPress={() => {}} style={styles.dateSheet}>
                <View style={styles.dateSheetHeader}>
                  <Pressable onPress={() => setShowIosPicker(false)}>
                    <Text style={styles.dateSheetCancel}>{copy.logoutCancel}</Text>
                  </Pressable>
                  <Text style={styles.dateSheetTitle}>{copy.birthDate}</Text>
                  <Pressable
                    onPress={() => {
                      setBirthDate(formatDateOnly(draftBirthDate));
                      setShowIosPicker(false);
                    }}>
                    <Text style={styles.dateSheetDone}>{copy.birthDateDone}</Text>
                  </Pressable>
                </View>
                <NativeDateTimePicker
                  accentColor={palette.action}
                  display="spinner"
                  locale={locale === 'es' ? 'es_ES' : 'en_US'}
                  maximumDate={today}
                  minimumDate={minimumBirthDate}
                  mode="date"
                  onValueChange={(_event, date) => setDraftBirthDate(date)}
                  style={styles.iosDatePicker}
                  value={draftBirthDate}
                />
              </Pressable>
            </Pressable>
          </Modal>

          <View style={styles.preferencesCard}>
            <ChoiceRow
              label={copy.locale}
              onSelect={(value) => setLocale(value as Locale)}
              options={[
                { label: copy.localeSpanish, value: 'es' },
                { label: copy.localeEnglish, value: 'en' },
              ]}
              selected={locale}
            />
            <View style={styles.divider} />
            <ChoiceRow
              label={copy.appearance}
              onSelect={(value) => setAppearance(value as Appearance)}
              options={appearanceValues.map((value) => ({
                label:
                  value === 'system'
                    ? copy.appearanceSystem
                    : value === 'light'
                      ? copy.appearanceLight
                      : copy.appearanceDark,
                value,
              }))}
              selected={appearance}
            />
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons color={palette.actionDeep} name="alert-circle" size={18} />
              <Text style={styles.errorBannerText}>{errorCopy(copy, error)}</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={save}
            style={({ pressed }) => [
              styles.primaryButton,
              busy && styles.disabled,
              pressed && styles.pressed,
            ]}>
            {busy ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>{copy.profileContinue}</Text>
                <Ionicons color={palette.white} name="arrow-forward" size={19} />
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ProfileRecoveryScreen() {
  const { busy, controller } = useAccount();
  const copy = useMemo(() => accountCopy(deviceLocale()), []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.recoveryShell}>
        <Text style={styles.wordmark}>pomelo.</Text>
        <View style={styles.recoveryCard}>
          <Ionicons color={palette.actionDeep} name="cloud-offline-outline" size={32} />
          <Text style={styles.recoveryTitle}>{copy.profileRecoveryTitle}</Text>
          <Text style={styles.recoveryBody}>{copy.profileRecoveryBody}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void controller.retryProfile()}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.recoveryRetry,
              busy && styles.disabled,
              pressed && styles.pressed,
            ]}>
            {busy ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={styles.primaryButtonText}>{copy.profileRetry}</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void controller.signOut()}>
            <Text style={styles.recoveryLogout}>{copy.logout}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ChoiceRow({
  label,
  onSelect,
  options,
  selected,
}: {
  label: string;
  onSelect: (value: string) => void;
  options: { label: string; value: string }[];
  selected: string;
}) {
  return (
    <View style={styles.choiceRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceOptions}>
        {options.map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[
              styles.choice,
              option.value === selected && styles.choiceSelected,
            ]}>
            <Text
              style={[
                styles.choiceText,
                option.value === selected && styles.choiceTextSelected,
              ]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { backgroundColor: palette.background, flex: 1 },
  shell: {
    alignSelf: 'center',
    gap: 18,
    maxWidth: 430,
    paddingBottom: 28,
    paddingHorizontal: 22,
    width: '100%',
  },
  header: { alignItems: 'center', flexDirection: 'row', height: 52, justifyContent: 'space-between' },
  wordmark: { color: palette.ink, fontFamily: fonts.displayExtraBold, fontSize: 25, letterSpacing: -1.1 },
  progress: { color: palette.actionDeep, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.65 },
  titleBlock: { gap: 7 },
  title: { color: palette.ink, fontFamily: fonts.displayExtraBold, fontSize: 35, letterSpacing: -1.2 },
  intro: { color: palette.inkSecondary, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, maxWidth: 330 },
  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 4 },
  avatarHalo: {
    alignItems: 'center',
    backgroundColor: palette.backgroundRaised,
    borderRadius: 76,
    height: 152,
    justifyContent: 'center',
    width: 152,
  },
  avatarLabel: { color: palette.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.35 },
  rerollButton: {
    alignItems: 'center',
    backgroundColor: palette.actionSoft,
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  rerollText: { color: palette.actionDeep, fontFamily: fonts.bodyBold, fontSize: 11 },
  formCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 17,
    padding: 17,
  },
  fieldGroup: { gap: 7 },
  label: { color: palette.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 11 },
  input: {
    backgroundColor: palette.surfaceStrong,
    borderColor: palette.borderSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    color: palette.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    height: 52,
    paddingHorizontal: 14,
  },
  inputError: { borderColor: palette.actionDeep },
  divider: { backgroundColor: palette.borderSoft, height: StyleSheet.hairlineWidth },
  dateRow: {
    alignItems: 'center',
    backgroundColor: palette.surfaceStrong,
    borderColor: palette.borderSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    height: 52,
    paddingHorizontal: 14,
  },
  iosDatePicker: { height: 220, width: '100%' },
  dateText: { color: palette.ink, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, marginLeft: 11 },
  datePlaceholder: { color: palette.muted },
  errorText: { color: palette.actionDeep, fontFamily: fonts.bodySemiBold, fontSize: 10, lineHeight: 15 },
  modalBackdrop: {
    backgroundColor: 'rgba(16, 36, 27, 0.32)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  dateSheet: {
    backgroundColor: palette.surfaceStrong,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: 22,
    paddingHorizontal: 18,
  },
  dateSheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 54,
    justifyContent: 'space-between',
  },
  dateSheetCancel: { color: palette.muted, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  dateSheetTitle: { color: palette.ink, fontFamily: fonts.bodyBold, fontSize: 13 },
  dateSheetDone: { color: palette.actionDeep, fontFamily: fonts.bodyBold, fontSize: 13 },
  preferencesCard: {
    backgroundColor: palette.surface,
    borderColor: palette.borderSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  choiceRow: { gap: 9 },
  choiceOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { backgroundColor: palette.backgroundRaised, borderRadius: radii.full, paddingHorizontal: 12, paddingVertical: 8 },
  choiceSelected: { backgroundColor: palette.ink },
  choiceText: { color: palette.inkSecondary, fontFamily: fonts.bodySemiBold, fontSize: 10 },
  choiceTextSelected: { color: palette.surfaceStrong },
  errorBanner: {
    alignItems: 'flex-start',
    backgroundColor: palette.actionSoft,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 9,
    padding: 13,
  },
  errorBannerText: { color: palette.inkSecondary, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 17 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.action,
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 9,
    height: 56,
    justifyContent: 'center',
  },
  primaryButtonText: { color: palette.white, fontFamily: fonts.bodyBold, fontSize: 14 },
  recoveryShell: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 430,
    paddingHorizontal: 22,
    width: '100%',
  },
  recoveryCard: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.borderSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 16,
    marginBottom: 'auto',
    marginTop: 'auto',
    padding: 24,
  },
  recoveryTitle: {
    color: palette.ink,
    fontFamily: fonts.displayBold,
    fontSize: 25,
    textAlign: 'center',
  },
  recoveryBody: {
    color: palette.inkSecondary,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  recoveryLogout: {
    color: palette.actionDeep,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    paddingVertical: 6,
  },
  recoveryRetry: { width: '100%' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
});
