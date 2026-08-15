type SocialAuthEnvironment = {
  appleEnabled?: string;
  googleEnabled?: string;
  googleWebClientId?: string;
};

export function socialAuthVisibility(environment: SocialAuthEnvironment) {
  return {
    apple: environment.appleEnabled === 'true',
    google:
      environment.googleEnabled === 'true' &&
      environment.googleWebClientId?.endsWith('.apps.googleusercontent.com') === true,
  };
}

export const configuredSocialAuthVisibility = socialAuthVisibility({
  appleEnabled: process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED,
  googleEnabled: process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED,
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});
