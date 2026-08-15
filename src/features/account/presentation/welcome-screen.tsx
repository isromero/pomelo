import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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
import { useAccount } from '@/features/account/presentation/account-provider';
import {
  accountCopy,
  deviceLocale,
  errorCopy,
  noticeCopy,
} from '@/features/account/presentation/account-copy';
import { GoogleAuthButton } from '@/features/account/presentation/google-auth-button';
import { configuredSocialAuthVisibility } from '@/features/account/presentation/social-auth-visibility';

const pom = require('@/assets/images/pom/pom-affectionate.png');

type AuthMode = 'login' | 'signUp';

export function WelcomeScreen() {
  const { busy, controller, error, notice } = useAccount();
  const copy = useMemo(() => accountCopy(deviceLocale()), []);
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios' && configuredSocialAuthVisibility.apple) {
      void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const chooseMode = (nextMode: AuthMode) => {
    controller.clearMessages();
    setMode(nextMode);
  };

  const submit = () => {
    if (mode === 'signUp') {
      void controller.signUpWithEmail(email.trim(), password);
    } else {
      void controller.signInWithEmail(email.trim(), password);
    }
  };

  if (!mode) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
        <View style={styles.welcomeShell}>
          <Text style={styles.wordmark}>pomelo.</Text>

          <View style={styles.hero}>
            <View style={styles.orbitLarge} />
            <View style={styles.orbitSmall} />
            <View style={styles.sun} />
            <Image resizeMode="contain" source={pom} style={styles.pom} />
            <View style={styles.memoryTag}>
              <Ionicons color={palette.action} name="heart" size={15} />
              <Text style={styles.memoryText}>+1 Memory</Text>
            </View>
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{copy.heroEyebrow}</Text>
            <Text style={styles.heroTitle}>{copy.heroTitle}</Text>
            <Text style={styles.heroBody}>{copy.heroBody}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => chooseMode('signUp')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>{copy.start}</Text>
              <Ionicons color={palette.white} name="arrow-forward" size={19} />
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>{copy.welcomeLoginPrompt}</Text>
              <Pressable accessibilityRole="button" onPress={() => chooseMode('login')}>
                <Text style={styles.loginLink}>{copy.welcomeLogin}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const message = errorCopy(copy, error) ?? noticeCopy(copy, notice);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.authShell}
          keyboardShouldPersistTaps="handled">
          <View style={styles.authHeader}>
            <Pressable
              accessibilityLabel={copy.authBack}
              hitSlop={12}
              onPress={() => {
                controller.clearMessages();
                setMode(null);
              }}
              style={styles.backButton}>
              <Ionicons color={palette.ink} name="arrow-back" size={22} />
            </Pressable>
            <Text style={styles.authWordmark}>pomelo.</Text>
            <View style={styles.backSpacer} />
          </View>

          <View style={styles.authPomFrame}>
            <Image resizeMode="contain" source={pom} style={styles.authPom} />
          </View>

          <View style={styles.authCopy}>
            <Text style={styles.authTitle}>
              {mode === 'signUp' ? copy.authCreateTitle : copy.authLoginTitle}
            </Text>
            {mode === 'login' && <Text style={styles.authBody}>{copy.authExisting}</Text>}
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{copy.authEmail}</Text>
              <TextInput
                accessibilityLabel={copy.authEmail}
                autoCapitalize="none"
                autoComplete="email"
                editable={!busy}
                keyboardType="email-address"
                onChangeText={setEmail}
                returnKeyType="next"
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{copy.authPassword}</Text>
              <TextInput
                accessibilityLabel={copy.authPassword}
                autoCapitalize="none"
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                editable={!busy}
                onChangeText={setPassword}
                onSubmitEditing={submit}
                placeholder={mode === 'signUp' ? copy.authPasswordHint : undefined}
                placeholderTextColor={palette.muted}
                returnKeyType="done"
                secureTextEntry
                style={styles.input}
                textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
                value={password}
              />
            </View>

            {message && (
              <View style={[styles.message, notice && styles.notice]}>
                <Ionicons
                  color={notice ? palette.positive : palette.actionDeep}
                  name={notice ? 'mail' : 'alert-circle'}
                  size={18}
                />
                <Text style={styles.messageText}>{message}</Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={busy || !email.trim() || password.length < 8}
              onPress={submit}
              style={({ pressed }) => [
                styles.primaryButton,
                (busy || !email.trim() || password.length < 8) && styles.disabled,
                pressed && styles.pressed,
              ]}>
              {busy ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'signUp' ? copy.authCreate : copy.authLogin}
                </Text>
              )}
            </Pressable>

            <GoogleAuthButton
              busy={busy}
              label={copy.google}
              onPress={() => void controller.signInWithGoogle()}
            />

            {appleAvailable && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                cornerRadius={radii.full}
                onPress={() => void controller.signInWithApple()}
                style={styles.appleButton}
              />
            )}

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => chooseMode(mode === 'signUp' ? 'login' : 'signUp')}>
              <Text style={styles.switchLink}>
                {mode === 'signUp' ? copy.authSwitchLogin : copy.authSwitchSignUp}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.terms}>{copy.authTerms}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { backgroundColor: palette.background, flex: 1 },
  welcomeShell: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 430,
    paddingBottom: 22,
    paddingHorizontal: 24,
    width: '100%',
  },
  wordmark: {
    color: palette.ink,
    fontFamily: fonts.displayExtraBold,
    fontSize: 27,
    letterSpacing: -1.2,
    lineHeight: 48,
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 278,
    overflow: 'hidden',
  },
  orbitLarge: {
    borderColor: palette.borderSoft,
    borderRadius: 140,
    borderWidth: 1,
    height: 280,
    position: 'absolute',
    width: 280,
  },
  orbitSmall: {
    borderColor: palette.reward,
    borderRadius: 92,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 184,
    opacity: 0.75,
    position: 'absolute',
    width: 184,
  },
  sun: {
    backgroundColor: palette.rewardSoft,
    borderRadius: 94,
    height: 188,
    position: 'absolute',
    width: 188,
  },
  pom: { height: 178, marginTop: 15, width: 216 },
  memoryTag: {
    alignItems: 'center',
    backgroundColor: palette.surfaceStrong,
    borderRadius: radii.full,
    bottom: 28,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    position: 'absolute',
    right: 8,
  },
  memoryText: { color: palette.ink, fontFamily: fonts.bodyBold, fontSize: 11 },
  heroCopy: { gap: 11, paddingBottom: 26 },
  eyebrow: {
    color: palette.actionDeep,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: palette.ink,
    fontFamily: fonts.displayExtraBold,
    fontSize: 38,
    letterSpacing: -1.5,
    lineHeight: 40,
  },
  heroBody: {
    color: palette.inkSecondary,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 350,
  },
  actions: { gap: 17 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.action,
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 10,
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  primaryButtonText: { color: palette.white, fontFamily: fonts.bodyBold, fontSize: 15 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  loginRow: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center' },
  loginPrompt: { color: palette.muted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  loginLink: { color: palette.actionDeep, fontFamily: fonts.bodyBold, fontSize: 13 },
  authShell: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: 430,
    paddingBottom: 24,
    paddingHorizontal: 24,
    width: '100%',
  },
  authHeader: { alignItems: 'center', flexDirection: 'row', height: 52, justifyContent: 'space-between' },
  backButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  backSpacer: { width: 40 },
  authWordmark: { color: palette.ink, fontFamily: fonts.displayExtraBold, fontSize: 23, letterSpacing: -1 },
  authPomFrame: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: palette.rewardSoft,
    borderRadius: 54,
    height: 108,
    justifyContent: 'center',
    marginTop: 18,
    transform: [{ rotate: '-3deg' }],
    width: 108,
  },
  authPom: { height: 92, transform: [{ rotate: '3deg' }], width: 92 },
  authCopy: { alignItems: 'center', gap: 7, marginBottom: 26, marginTop: 18 },
  authTitle: { color: palette.ink, fontFamily: fonts.displayBold, fontSize: 29, letterSpacing: -0.8, textAlign: 'center' },
  authBody: { color: palette.inkSecondary, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  form: { gap: 15 },
  fieldGroup: { gap: 7 },
  label: { color: palette.inkSecondary, fontFamily: fonts.bodyBold, fontSize: 12 },
  input: {
    backgroundColor: palette.surfaceStrong,
    borderColor: palette.borderSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    color: palette.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    height: 54,
    paddingHorizontal: 16,
  },
  message: {
    alignItems: 'flex-start',
    backgroundColor: palette.actionSoft,
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 9,
    padding: 13,
  },
  notice: { backgroundColor: palette.positiveSoft },
  messageText: { color: palette.inkSecondary, flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 18 },
  appleButton: { height: 54, width: '100%' },
  switchLink: { color: palette.actionDeep, fontFamily: fonts.bodyBold, fontSize: 13, paddingVertical: 5, textAlign: 'center' },
  terms: { color: palette.muted, fontFamily: fonts.body, fontSize: 10, lineHeight: 15, marginTop: 'auto', paddingTop: 25, textAlign: 'center' },
});
