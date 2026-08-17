import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { AppState } from 'react-native';

import { useAccount, useAccountClient } from '@/features/account/presentation/account-provider';
import { createPremiumRuntime } from '@/features/premium/infrastructure/create-premium-controller';

export type { PremiumErrorCode } from '@/features/premium/application/premium-controller';

const PremiumContext = createContext<ReturnType<typeof createPremiumRuntime> | null>(null);

export function PremiumProvider({ children }: PropsWithChildren) {
  const client = useAccountClient();
  const runtime = useMemo(() => createPremiumRuntime(client), [client]);
  const { user } = useAccount();

  useEffect(() => {
    if (user?.id) {
      void runtime.controller.start(user.id);
    } else {
      void runtime.controller.stop();
    }
  }, [runtime, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void runtime.controller.refresh();
      }
    });
    const refreshInterval = setInterval(() => {
      void runtime.controller.refresh();
    }, 15_000);
    return () => {
      appStateSubscription.remove();
      clearInterval(refreshInterval);
    };
  }, [runtime, user?.id]);

  useEffect(() => {
    if (!client || !user?.id) {
      return undefined;
    }
    const channel = client
      .channel(`premium-user:${user.id}`)
      .on('broadcast', { event: 'premium-updated' }, () => {
        void runtime.controller.refresh();
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [client, runtime, user?.id]);

  useEffect(() => () => {
    void runtime.controller.stop();
  }, [runtime]);

  return <PremiumContext.Provider value={runtime}>{children}</PremiumContext.Provider>;
}

export function usePremium() {
  const runtime = useContext(PremiumContext);
  if (!runtime) {
    throw new Error('usePremium must be used within PremiumProvider');
  }

  const snapshot = useSyncExternalStore(
    runtime.controller.subscribe,
    runtime.controller.getSnapshot,
    runtime.controller.getSnapshot,
  );

  return { controller: runtime.controller, ...snapshot };
}
