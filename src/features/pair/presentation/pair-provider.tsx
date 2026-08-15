import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

import type { PomeloSupabaseClient } from '@/lib/supabase';
import {
  PairController,
  PairError,
  type PairRepository,
} from '@/features/pair/application/pair-controller';
import { SupabasePairRepository } from '@/features/pair/infrastructure/supabase-pair-repository';

const unavailableRepository: PairRepository = {
  acceptInvitation: async () => {
    throw new PairError('configuration');
  },
  cancelInvitation: async () => {
    throw new PairError('configuration');
  },
  createInvitation: async () => {
    throw new PairError('configuration');
  },
  createPair: async () => {
    throw new PairError('configuration');
  },
  dissolvePair: async () => {
    throw new PairError('configuration');
  },
  getState: async () => {
    throw new PairError('configuration');
  },
  previewInvitation: async () => {
    throw new PairError('configuration');
  },
  subscribe: () => () => {},
};

const PairContext = createContext<PairController | null>(null);

export function PairProvider({
  active,
  children,
  client,
}: PropsWithChildren<{ active: boolean; client: PomeloSupabaseClient | null }>) {
  const controller = useMemo(
    () => new PairController(client ? new SupabasePairRepository(client) : unavailableRepository),
    [client],
  );

  useEffect(() => {
    if (active) {
      void controller.start();
      return () => controller.stop();
    }
    controller.stop();
    return undefined;
  }, [active, controller]);

  return <PairContext.Provider value={controller}>{children}</PairContext.Provider>;
}

export function usePair() {
  const controller = useContext(PairContext);
  if (!controller) {
    throw new Error('usePair must be used within PairProvider');
  }
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  return { controller, ...snapshot };
}
