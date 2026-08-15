import { Redirect } from 'expo-router';

import { useAccount } from '@/features/account/presentation/account-provider';
import { HomeScreen } from '@/features/home/home-screen';

export default function HomeRoute() {
  const { status } = useAccount();

  if (status !== 'ready') {
    return <Redirect href="/" />;
  }
  return <HomeScreen />;
}
