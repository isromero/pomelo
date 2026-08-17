import { Redirect, useLocalSearchParams } from 'expo-router';

import { EmptyAppSectionScreen } from '@/components/pomelo/empty-app-section-screen';
import { useAccount } from '@/features/account/presentation/account-provider';
import { HistoryScreen } from '@/features/moment/presentation/history-screen';
import { canBrowsePairApp } from '@/features/pair/application/pair-controller';
import { usePair } from '@/features/pair/presentation/pair-provider';

export default function HistoryRoute() {
  const { memoryId } = useLocalSearchParams<{ memoryId?: string }>();
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
    return memoryId
      ? <HistoryScreen />
      : <Redirect href="/diary?view=history" />;
  }
  const waitingForPartner = pair.state.status === 'waiting';
  return <EmptyAppSectionScreen
    activeTab="diary"
    body="section.history.waitingBody"
    eyebrow="section.history.eyebrow"
    icon="journal-outline"
    title="section.history.title"
    waitingForPartner={waitingForPartner}
  />;
}
