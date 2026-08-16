import { useLocalSearchParams } from 'expo-router';

import { useAccount } from '@/features/account/presentation/account-provider';
import {
  ProfileRecoveryScreen,
  ProfileScreen,
} from '@/features/account/presentation/profile-screen';
import { WelcomeScreen } from '@/features/account/presentation/welcome-screen';
import { InvitationScreen } from '@/features/pair/presentation/invitation-screen';

export default function InvitationRoute() {
  const { credential: parameter } = useLocalSearchParams<{
    credential?: string | string[];
  }>();
  const credential = Array.isArray(parameter) ? parameter[0] ?? '' : parameter ?? '';
  const { status } = useAccount();

  if (status === 'booting') {
    return null;
  }
  if (status === 'signedOut') {
    return <WelcomeScreen />;
  }
  if (status === 'profileRequired') {
    return <ProfileScreen />;
  }
  if (status === 'profileUnavailable') {
    return <ProfileRecoveryScreen />;
  }
  return <InvitationScreen credential={credential} />;
}
