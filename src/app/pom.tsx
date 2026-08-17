import { Redirect } from 'expo-router';

import { useAccount } from '@/features/account/presentation/account-provider';
import { PomWardrobeScreen } from '@/features/pom/presentation/pom-wardrobe-screen';
import { canBrowsePairApp } from '@/features/pair/application/pair-controller';
import { usePair } from '@/features/pair/presentation/pair-provider';

export default function PomRoute() {
  const { status } = useAccount();
  const pair = usePair();

  if (status !== 'ready') {
    return <Redirect href="/" />;
  }
  if (pair.status === 'idle' || pair.status === 'loading') {
    return null;
  }
  if (!canBrowsePairApp(pair.state)) {
    return <Redirect href="/pair" />;
  }
  if (pair.state.status === 'active' || pair.state.status === 'archived') {
    return <PomWardrobeScreen pairStatus={pair.state.status} />;
  }
  return <Redirect href="/pair" />;
}
