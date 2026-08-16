import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { AppState } from 'react-native';

import {
  MomentController,
  MomentError,
  type MomentRepository,
} from '@/features/moment/application/moment-controller';
import { SupabaseMomentRepository } from '@/features/moment/infrastructure/supabase-moment-repository';
import type { PomeloSupabaseClient } from '@/lib/supabase';

const unavailableRepository: MomentRepository = {
  getDailyMoment: async () => {
    throw new MomentError('configuration');
  },
  getHistory: async () => {
    throw new MomentError('configuration');
  },
  revealMoment: async () => {
    throw new MomentError('configuration');
  },
  submitQuestion: async () => {
    throw new MomentError('configuration');
  },
  subscribe: () => () => {},
};

const MomentContext = createContext<MomentController | null>(null);

export function MomentProvider({
  active,
  children,
  client,
}: PropsWithChildren<{ active: boolean; client: PomeloSupabaseClient | null }>) {
  const controller = useMemo(
    () =>
      new MomentController(
        client ? new SupabaseMomentRepository(client) : unavailableRepository,
      ),
    [client],
  );

  useEffect(() => {
    if (active) {
      void controller.start();
      const appStateSubscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          void controller.refresh();
        }
      });
      return () => {
        appStateSubscription.remove();
        controller.stop();
      };
    }
    controller.stop();
    return undefined;
  }, [active, controller]);

  return <MomentContext.Provider value={controller}>{children}</MomentContext.Provider>;
}

export function useMoment() {
  const controller = useContext(MomentContext);
  if (!controller) {
    throw new Error('useMoment must be used within MomentProvider');
  }
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  return { controller, ...snapshot };
}
