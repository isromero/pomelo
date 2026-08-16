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
  DoodleController,
  type DoodleRepository,
} from '@/features/moment/application/doodle-controller';
import {
  MomentController,
  MomentError,
  type MomentDraftStore,
  type PhotoDraftStore,
  type MomentRepository,
} from '@/features/moment/application/moment-controller';
import { ThreadController, type ThreadRepository } from '@/features/moment/application/thread-controller';
import { LocalPhotoDraftStore } from '@/features/moment/infrastructure/local-photo-draft-store';
import { LocalMomentDraftStore } from '@/features/moment/infrastructure/local-moment-draft-store';
import { SupabaseDoodleRepository } from '@/features/moment/infrastructure/supabase-doodle-repository';
import { SupabaseMomentRepository } from '@/features/moment/infrastructure/supabase-moment-repository';
import type { PomeloSupabaseClient } from '@/lib/supabase';

const unavailableRepository: MomentRepository & ThreadRepository = {
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
  getThread: async () => {
    throw new MomentError('configuration');
  },
  sendThreadMessage: async () => {
    throw new MomentError('configuration');
  },
  subscribeToThread: () => () => {},
};

const unavailableDoodleRepository: DoodleRepository = {
  completeDoodle: async () => {
    throw new MomentError('configuration');
  },
  getDoodleSession: async () => {
    throw new MomentError('configuration');
  },
  saveDoodleSnapshot: async () => {
    throw new MomentError('configuration');
  },
  subscribeToDoodle: () => () => {},
};

const unavailableDraftStore: MomentDraftStore = {
  get: async () => null,
  remove: async () => {},
  save: async () => {},
};

const MomentContext = createContext<MomentController | null>(null);

export function MomentProvider({
  active,
  children,
  client,
}: PropsWithChildren<{ active: boolean; client: PomeloSupabaseClient | null }>) {
  const repository = useMemo<MomentRepository & ThreadRepository>(
    () => (client ? new SupabaseMomentRepository(client) : unavailableRepository),
    [client],
  );
  const controller = useMemo(
    () =>
      new MomentController(
        repository,
        client ? new LocalMomentDraftStore() : unavailableDraftStore,
        client ? new LocalPhotoDraftStore() : unavailablePhotoDraftStore,
      ),
    [client, repository],
  );
  const doodleController = useMemo(
    () =>
      new DoodleController(
        client
          ? new SupabaseDoodleRepository(client, () => repository.getDailyMoment())
          : unavailableDoodleRepository,
        (moment) => controller.acceptExternalMoment(moment),
      ),
    [client, controller, repository],
  );
  const threadController = useMemo(
    () => new ThreadController(repository),
    [repository],
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
        doodleController.stop();
        threadController.close();
      };
    }
    controller.stop();
    doodleController.stop();
    threadController.close();
    return undefined;
  }, [active, controller, doodleController, threadController]);

  const doodle = useSyncExternalStore(
    doodleController.subscribe,
    doodleController.getSnapshot,
    doodleController.getSnapshot,
  );

  return (
    <MomentContext.Provider value={controller}>
      <MomentDoodleContext.Provider value={{ controller: doodleController, snapshot: doodle }}>
        <MomentThreadContext.Provider value={threadController}>{children}</MomentThreadContext.Provider>
      </MomentDoodleContext.Provider>
    </MomentContext.Provider>
  );
}

const unavailablePhotoDraftStore: PhotoDraftStore = {
  get: async () => null,
  remove: async () => {},
  save: async (_momentId, draft) => draft,
};

const MomentDoodleContext = createContext<{
  controller: DoodleController;
  snapshot: ReturnType<DoodleController['getSnapshot']>;
} | null>(null);
const MomentThreadContext = createContext<ThreadController | null>(null);

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

export function useDoodleMoment() {
  const context = useContext(MomentDoodleContext);
  if (!context) {
    throw new Error('useDoodleMoment must be used within MomentProvider');
  }
  return context;
}

export function useThreadController() {
  const controller = useContext(MomentThreadContext);
  if (!controller) {
    throw new Error('useThreadController must be used within MomentProvider');
  }
  return controller;
}
