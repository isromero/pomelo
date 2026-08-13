import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppearance } from '@/appearance/appearance-provider';
import { fonts, radii, SemanticColors } from '@/constants/pomelo-theme';
import { HomeScreen } from '@/features/home/home-screen';
import { PreferenceControls } from '@/features/preferences/preference-controls';
import { captureDiagnostic } from '@/lib/diagnostics';
import { EnvironmentError, loadEnvironment } from '@/lib/env';
import { createSupabaseRuntime, SupabaseRuntime } from '@/lib/supabase';
import { useLocale } from '@/localization/locale-provider';
import PomeloStatusWidget from '@/widgets/pomelo-status-widget';

import { SessionRepository, SessionState } from './session-repository';
import { SupabaseSessionRepository } from './supabase-session-repository';

type RuntimeResult =
  | { status: 'ready'; native: SupabaseRuntime; repository: SessionRepository }
  | { status: 'configuration-error'; code: string };

function createRuntime(): RuntimeResult {
  try {
    const native = createSupabaseRuntime(loadEnvironment());
    return {
      status: 'ready',
      native,
      repository: new SupabaseSessionRepository(native.client),
    };
  } catch (error) {
    const code = error instanceof EnvironmentError ? error.code : 'unknown';
    captureDiagnostic({ area: 'configuration', code, recoverable: true });
    return { status: 'configuration-error', code };
  }
}

export function RuntimeScreen() {
  const { t } = useLocale();
  const [attempt, setAttempt] = useState(0);
  const runtime = useMemo(() => {
    void attempt;
    return createRuntime();
  }, [attempt]);

  useEffect(() => {
    if (runtime.status === 'ready') {
      return runtime.native.activate();
    }
  }, [runtime]);

  useEffect(() => {
    try {
      PomeloStatusWidget.updateSnapshot({
        action: t('widget.action'),
        title: t('widget.title'),
      });
    } catch {
      captureDiagnostic({ area: 'widget', code: 'snapshot-failed', recoverable: true });
    }
  }, [t]);

  if (runtime.status === 'configuration-error') {
    return <RecoverableError kind="configuration" onRetry={() => setAttempt((value) => value + 1)} />;
  }

  return <SessionBoundary repository={runtime.repository} />;
}

export function SessionBoundary({ repository }: { repository: SessionRepository }) {
  const [state, setState] = useState<SessionState | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void repository
      .restore()
      .then((nextState) => active && setState(nextState))
      .catch(() => {
        if (active) {
          captureDiagnostic({ area: 'session', code: 'restore-failed', recoverable: true });
          setError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [attempt, repository]);

  if (error) {
    return (
      <RecoverableError
        kind="network"
        onRetry={() => {
          setError(false);
          setState(null);
          setAttempt((value) => value + 1);
        }}
      />
    );
  }
  if (!state) {
    return <LoadingScreen />;
  }
  if (state.status === 'signed-out') {
    return <SignInScreen onAuthenticated={setState} repository={repository} />;
  }

  return (
    <HomeScreen
      profileName={state.profile.displayName}
      onSignOut={() =>
        void repository
          .signOut()
          .then(() => setState({ status: 'signed-out' }))
          .catch(() => {
            captureDiagnostic({ area: 'session', code: 'sign-out-failed', recoverable: true });
            setError(true);
          })
      }
    />
  );
}

function LoadingScreen() {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  return (
    <SafeAreaView style={styles.centered}>
      <ActivityIndicator color={colors.action} size="large" />
      <Text style={styles.body}>{t('runtime.loading')}</Text>
    </SafeAreaView>
  );
}

function RecoverableError({ kind, onRetry }: { kind: 'configuration' | 'network'; onRetry(): void }) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const prefix = kind === 'configuration' ? 'runtime.config' : 'runtime.network';

  return (
    <SafeAreaView style={styles.centered}>
      <View style={styles.panel}>
        <Text style={styles.title}>{t(`${prefix}Title`)}</Text>
        <Text style={styles.body}>{t(`${prefix}Body`)}</Text>
        <PrimaryButton label={t('common.retry')} onPress={onRetry} />
        <PreferenceControls />
      </View>
    </SafeAreaView>
  );
}

function SignInScreen({
  onAuthenticated,
  repository,
}: {
  onAuthenticated(state: SessionState): void;
  repository: SessionRepository;
}) {
  const { colors } = useAppearance();
  const { t } = useLocale();
  const styles = createStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    setFailed(false);
    setSubmitting(true);
    try {
      onAuthenticated(await repository.signIn({ email: email.trim(), password }));
    } catch {
      captureDiagnostic({ area: 'session', code: 'sign-in-failed', recoverable: true });
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.authLayout}>
        <View style={styles.panel}>
          <Text style={styles.wordmark}>{t('home.wordmark')}</Text>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.body}>{t('auth.body')}</Text>
          <TextInput
            accessibilityLabel={t('auth.email')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder={t('auth.email')}
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={email}
          />
          <TextInput
            accessibilityLabel={t('auth.password')}
            autoCapitalize="none"
            autoComplete="current-password"
            onChangeText={setPassword}
            onSubmitEditing={() => void submit()}
            placeholder={t('auth.password')}
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            value={password}
          />
          {failed && <Text style={styles.error}>{t('auth.failed')}</Text>}
          <PrimaryButton disabled={submitting} label={t('auth.submit')} onPress={() => void submit()} />
          <PreferenceControls />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrimaryButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress(): void;
}) {
  const { colors } = useAppearance();
  const styles = createStyles(colors);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.buttonMuted]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: SemanticColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    centered: {
      alignItems: 'center',
      backgroundColor: colors.background,
      flex: 1,
      gap: 18,
      justifyContent: 'center',
      padding: 24,
    },
    authLayout: { flex: 1, justifyContent: 'center', padding: 24 },
    panel: {
      alignSelf: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 14,
      maxWidth: 420,
      padding: 24,
      width: '100%',
    },
    wordmark: {
      color: colors.ink,
      fontFamily: fonts.displayExtraBold,
      fontSize: 28,
      letterSpacing: -1.1,
    },
    title: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 29 },
    body: { color: colors.inkSecondary, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
    input: {
      backgroundColor: colors.backgroundRaised,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      color: colors.ink,
      fontFamily: fonts.body,
      fontSize: 15,
      minHeight: 52,
      paddingHorizontal: 16,
    },
    error: { color: colors.actionDeep, fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 18 },
    button: {
      alignItems: 'center',
      backgroundColor: colors.action,
      borderRadius: radii.md,
      justifyContent: 'center',
      minHeight: 52,
      paddingHorizontal: 20,
    },
    buttonMuted: { opacity: 0.65 },
    buttonText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 14 },
  });
