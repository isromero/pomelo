import { GoogleSignInButton } from 'react-native-nitro-google-signin';

import { configuredSocialAuthVisibility } from '@/features/account/presentation/social-auth-visibility';

type GoogleAuthButtonProps = {
  busy: boolean;
  label: string;
  onPress: () => void;
};

export function GoogleAuthButton({ busy, label, onPress }: GoogleAuthButtonProps) {
  if (!configuredSocialAuthVisibility.google) {
    return null;
  }

  return (
    <GoogleSignInButton
      accessibilityLabel={label}
      colorScheme="light"
      disabled={busy}
      loading={busy}
      onPress={onPress}
      signInBehavior="none"
      size="wide"
      style={{ width: '100%' }}
    />
  );
}
