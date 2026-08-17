import { Redirect } from 'expo-router';

import { DiaryScreen } from '@/features/journal/presentation/diary-screen';
import { useAccount } from '@/features/account/presentation/account-provider';
import { canBrowsePairApp } from '@/features/pair/application/pair-controller';
import { usePair } from '@/features/pair/presentation/pair-provider';

export default function DiaryRoute() {
  const { status } = useAccount();
  const pair = usePair();
  if (status !== 'ready') return <Redirect href="/" />;
  if (pair.status === 'idle' || pair.status === 'loading') return null;
  if (!canBrowsePairApp(pair.state) || pair.state.status === 'waiting') return <Redirect href="/pair" />;
  return <DiaryScreen />;
}
