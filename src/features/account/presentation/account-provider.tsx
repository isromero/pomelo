import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';

import type { AccountController } from '@/features/account/application/account-controller';
import { createAccountRuntime } from '@/features/account/infrastructure/create-account-controller';

const AccountContext = createContext<AccountController | null>(null);

export function AccountProvider({ children }: PropsWithChildren) {
  const runtime = useMemo(() => createAccountRuntime(), []);
  const { controller } = runtime;

  useEffect(() => {
    const deactivate = runtime.activate();
    void controller.start();
    return () => {
      controller.stop();
      deactivate();
    };
  }, [controller, runtime]);

  return <AccountContext.Provider value={controller}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const controller = useContext(AccountContext);
  if (!controller) {
    throw new Error('useAccount must be used within AccountProvider');
  }

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return { controller, ...snapshot };
}
