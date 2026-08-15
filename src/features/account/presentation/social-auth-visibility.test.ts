import { socialAuthVisibility } from '@/features/account/presentation/social-auth-visibility';

describe('Social auth visibility', () => {
  it('hides providers unless they are explicitly enabled', () => {
    expect(socialAuthVisibility({})).toEqual({
      apple: false,
      google: false,
    });
  });

  it('shows Apple only when its rollout flag is enabled', () => {
    expect(
      socialAuthVisibility({
        appleEnabled: 'true',
      }),
    ).toEqual({
      apple: true,
      google: false,
    });
  });

  it('requires both the Google flag and a valid Web client ID', () => {
    expect(
      socialAuthVisibility({
        googleEnabled: 'true',
        googleWebClientId: 'invalid',
      }),
    ).toEqual({
      apple: false,
      google: false,
    });

    expect(
      socialAuthVisibility({
        googleEnabled: 'true',
        googleWebClientId: 'client.apps.googleusercontent.com',
      }),
    ).toEqual({
      apple: false,
      google: true,
    });
  });
});
