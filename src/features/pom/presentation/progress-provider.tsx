import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

import {
  PomProgressController,
  PomProgressError,
  type PomProgressRepository,
} from '@/features/pom/application/progress-controller';
import { SupabasePomProgressRepository } from '@/features/pom/infrastructure/supabase-progress-repository';
import type { PomeloSupabaseClient } from '@/lib/supabase';

const unavailableRepository: PomProgressRepository = {
  getProgress: async () => {
    throw new PomProgressError('configuration');
  },
  setAccessory: async () => {
    throw new PomProgressError('configuration');
  },
  subscribe: () => () => {},
};

const PomProgressContext = createContext<PomProgressController | null>(null);

export function PomProgressProvider({
  active,
  children,
  client,
}: PropsWithChildren<{ active: boolean; client: PomeloSupabaseClient | null }>) {
  const repository = useMemo(
    () => (client ? new SupabasePomProgressRepository(client) : unavailableRepository),
    [client],
  );
  const controller = useMemo(() => new PomProgressController(repository), [repository]);

  useEffect(() => {
    if (active) {
      void controller.start();
      return () => controller.stop();
    }
    controller.stop();
    return undefined;
  }, [active, controller]);

  return <PomProgressContext.Provider value={controller}>{children}</PomProgressContext.Provider>;
}

export function usePomProgress() {
  const controller = useContext(PomProgressContext);
  if (!controller) {
    throw new Error('usePomProgress must be used within PomProgressProvider');
  }
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  return { controller, ...snapshot };
}
