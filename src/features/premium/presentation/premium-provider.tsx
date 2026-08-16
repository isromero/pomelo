import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

import { useAccount } from '@/features/account/presentation/account-provider';
import { createPremiumRuntime } from '@/features/premium/infrastructure/create-premium-controller';

const PremiumContext = createContext<ReturnType<typeof createPremiumRuntime> | null>(null);

export function PremiumProvider({ children }: PropsWithChildren) {
  const runtime = useMemo(() => createPremiumRuntime(), []);
  const { user } = useAccount();

  useEffect(() => {
    if (user?.id) {
      void runtime.controller.start(user.id);
    } else {
      void runtime.controller.stop();
    }
  }, [runtime, user?.id]);

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
