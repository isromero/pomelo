import { Redirect } from 'expo-router';

import { useAccount } from '@/features/account/presentation/account-provider';
import { SettingsScreen } from '@/features/settings/presentation/settings-screen';

export default function SettingsRoute() {
  const { status } = useAccount();

  if (status === 'signedOut') {
    return <Redirect href="/" />;
  }
  if (status !== 'ready') {
    return null;
  }
  return <SettingsScreen />;
}
