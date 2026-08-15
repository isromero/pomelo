import { Redirect } from 'expo-router';

import { useAccount } from '@/features/account/presentation/account-provider';
import { HomeScreen } from '@/features/home/home-screen';
import { usePair } from '@/features/pair/presentation/pair-provider';

export default function HomeRoute() {
  const { status } = useAccount();
  const pair = usePair();

  if (status !== 'ready') {
    return <Redirect href="/" />;
  }
  if (pair.status === 'idle' || pair.status === 'loading') {
    return null;
  }
  if (pair.state?.status !== 'active') {
    return <Redirect href="/pair" />;
  }
  return <HomeScreen />;
}
