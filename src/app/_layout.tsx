import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { type PropsWithChildren, useEffect } from 'react';

import { AppearanceProvider, useAppearance } from '@/appearance/appearance-provider';
import {
  AccountProvider,
  useAccount,
  useAccountClient,
} from '@/features/account/presentation/account-provider';
import { MomentProvider } from '@/features/moment/presentation/moment-provider';
import { PairProvider, usePair } from '@/features/pair/presentation/pair-provider';
import { LocaleProvider, useLocale } from '@/localization/locale-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <LocaleProvider>
      <AppearanceProvider>
        <AccountProvider>
          <LocaleRuntime>
            <PairRuntime>
              <MomentRuntime>
                <RootNavigator />
              </MomentRuntime>
            </PairRuntime>
          </LocaleRuntime>
        </AccountProvider>
      </AppearanceProvider>
    </LocaleProvider>
  );
}

function LocaleRuntime({ children }: PropsWithChildren) {
  const { profile, status } = useAccount();
  const { setLocale } = useLocale();
  const profileLocale = profile?.locale;

  useEffect(() => {
    if (status === 'ready' && profileLocale) {
      void setLocale(profileLocale);
    }
  }, [profileLocale, setLocale, status]);

  return children;
}

function PairRuntime({ children }: PropsWithChildren) {
  const client = useAccountClient();
  const { status } = useAccount();
  return (
    <PairProvider active={status === 'ready'} client={client}>
      {children}
    </PairProvider>
  );
}

function RootNavigator() {
  const { colors, resolved } = useAppearance();

  return (
    <>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}

function MomentRuntime({ children }: PropsWithChildren) {
  const client = useAccountClient();
  const { status } = useAccount();
  const pair = usePair();
  const active =
    status === 'ready' && pair.status === 'ready' && pair.state?.status === 'active';

  return (
    <MomentProvider active={active} client={client}>
      {children}
    </MomentProvider>
  );
}
