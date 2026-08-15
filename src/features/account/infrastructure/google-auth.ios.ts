export type GoogleCredentialResult =
  | { cancelled: true; idToken: null }
  | { cancelled: false; idToken: string };

export async function requestGoogleCredential(): Promise<GoogleCredentialResult> {
  throw new Error('Native Google Sign-In is unavailable on iOS');
}
