import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
} from 'react-native-nitro-google-signin';

export type GoogleCredentialResult =
  | { cancelled: true; idToken: null }
  | { cancelled: false; idToken: string };

export async function requestGoogleCredential(
  webClientId: string,
  hashedNonce: string,
): Promise<GoogleCredentialResult> {
  GoogleOneTapSignIn.configure({
    autoSelectOnSignIn: false,
    nonce: hashedNonce,
    webClientId,
  });

  try {
    await GoogleOneTapSignIn.checkPlayServices(true);
    let response = await GoogleOneTapSignIn.signIn();

    if (isNoSavedCredentialFoundResponse(response)) {
      response = await GoogleOneTapSignIn.createAccount();
    }
    if (isNoSavedCredentialFoundResponse(response)) {
      response = await GoogleOneTapSignIn.presentExplicitSignIn();
    }
    if (isCancelledResponse(response)) {
      return { cancelled: true, idToken: null };
    }
    if (!isSuccessResponse(response)) {
      throw new Error('Google Sign-In returned no credential');
    }

    return { cancelled: false, idToken: response.data.idToken };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { cancelled: true, idToken: null };
    }
    throw error;
  }
}
