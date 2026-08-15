import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';

import type { AccountController } from '@/features/account/application/account-controller';
import { createAccountRuntime } from '@/features/account/infrastructure/create-account-controller';
import type { PomeloSupabaseClient } from '@/lib/supabase';

type AccountContextValue = {
  client: PomeloSupabaseClient | null;
  controller: AccountController;
};

const AccountContext = createContext<AccountContextValue | null>(null);

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

  return (
    <AccountContext.Provider value={{ client: runtime.client, controller }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) {
    throw new Error('useAccount must be used within AccountProvider');
  }
  const { controller } = value;

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return { controller, ...snapshot };
}

export function useAccountClient() {
  const value = useContext(AccountContext);
  if (!value) {
    throw new Error('useAccountClient must be used within AccountProvider');
  }
  return value.client;
}
