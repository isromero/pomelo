import { Redirect } from 'expo-router';

import { EmptyAppSectionScreen } from '@/components/pomelo/empty-app-section-screen';
import { useAccount } from '@/features/account/presentation/account-provider';
import { canBrowsePairApp } from '@/features/pair/application/pair-controller';
import { usePair } from '@/features/pair/presentation/pair-provider';

export default function MapRoute() {
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
  const waitingForPartner = pair.state.status === 'waiting';
  return (
    <EmptyAppSectionScreen
      activeTab="map"
      body={
        waitingForPartner
          ? 'section.map.waitingBody'
          : 'section.map.activeBody'
      }
      eyebrow="section.map.eyebrow"
      icon="map-outline"
      title="section.map.title"
      waitingForPartner={waitingForPartner}
    />
  );
}
