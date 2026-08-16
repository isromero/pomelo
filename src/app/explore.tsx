import { Redirect } from 'expo-router';

import { useAccount } from '@/features/account/presentation/account-provider';
import { PairExplorationScreen } from '@/features/pair/presentation/pair-exploration-screen';
import { usePair } from '@/features/pair/presentation/pair-provider';

export default function ExploreRoute() {
  const { status } = useAccount();
  const pair = usePair();

  if (status !== 'ready') {
    return <Redirect href="/" />;
  }
  if (pair.status === 'idle' || pair.status === 'loading') {
    return null;
  }
  if (pair.state?.status === 'active') {
    return <Redirect href="/home" />;
  }
  if (pair.state?.status !== 'waiting') {
    return <Redirect href="/pair" />;
  }
  return <PairExplorationScreen />;
}
