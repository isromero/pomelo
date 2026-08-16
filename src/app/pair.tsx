import { Redirect } from 'expo-router';

import { useAccount } from '@/features/account/presentation/account-provider';
import { PairScreen } from '@/features/pair/presentation/pair-screen';

export default function PairRoute() {
  const { controller, status } = useAccount();

  if (status !== 'ready') {
    return <Redirect href="/" />;
  }
  return <PairScreen onSignOut={() => void controller.signOut()} />;
}
