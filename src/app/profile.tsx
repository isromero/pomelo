import { Redirect } from 'expo-router';

import { useAccount } from '@/features/account/presentation/account-provider';
import {
  ProfileRecoveryScreen,
  ProfileScreen,
} from '@/features/account/presentation/profile-screen';

export default function ProfileRoute() {
  const { status } = useAccount();

  if (status === 'signedOut') {
    return <Redirect href="/" />;
  }
  if (status === 'ready') {
    return <Redirect href="/home" />;
  }
  if (status === 'booting') {
    return null;
  }
  if (status === 'profileUnavailable') {
    return <ProfileRecoveryScreen />;
  }
  return <ProfileScreen />;
}
