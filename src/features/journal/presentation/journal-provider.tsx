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
  JournalController,
  JournalError,
  type JournalRepository,
} from '@/features/journal/application/journal-controller';
import type { JournalEntry, JournalMedia } from '@/features/journal/domain/journal';
import {
  SupabaseJournalRepository,
  type JournalPhotoDraft,
} from '@/features/journal/infrastructure/supabase-journal-repository';
import { ThreadController, ThreadError, type ThreadRepository } from '@/features/moment/application/thread-controller';
import { useMoment } from '@/features/moment/moment-api';
import { usePair } from '@/features/pair/presentation/pair-provider';
import type { PomeloSupabaseClient } from '@/lib/supabase';
import { useLocale } from '@/localization/locale-provider';

type JournalMediaRepository = {
  addPhoto(entry: JournalEntry, draft: JournalPhotoDraft, position: number, clientMediaId: string): Promise<void>;
  createMediaUrl(path: string): Promise<string>;
  removePhoto(media: JournalMedia): Promise<void>;
};

const unavailableRepository: JournalRepository & ThreadRepository & JournalMediaRepository = {
  addPhoto: async () => { throw new JournalError('configuration'); },
  createMediaUrl: async () => { throw new JournalError('configuration'); },
  getEntries: async () => { throw new JournalError('configuration'); },
  getThread: async () => { throw new ThreadError('configuration'); },
  removePhoto: async () => { throw new JournalError('configuration'); },
  sendThreadMessage: async () => { throw new ThreadError('configuration'); },
  subscribe: () => () => {},
  subscribeToThread: () => () => {},
};

type JournalContextValue = {
  controller: JournalController;
  media: JournalMediaRepository;
  threadController: ThreadController;
};

const JournalContext = createContext<JournalContextValue | null>(null);

function localDate(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit', month: '2-digit', timeZone, year: 'numeric',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function JournalProvider({
  active,
  children,
  client,
}: PropsWithChildren<{ active: boolean; client: PomeloSupabaseClient | null }>) {
  const moment = useMoment();
  const pair = usePair();
  const { locale } = useLocale();
  const repository = useMemo(
    () => client ? new SupabaseJournalRepository(client) : unavailableRepository,
    [client],
  );
  const controller = useMemo(() => new JournalController(repository), [repository]);
  const threadController = useMemo(() => new ThreadController(repository), [repository]);

  useEffect(() => {
    const state = pair.state;
    if (!state) return;
    controller.setSources({
      memories: moment.history,
      milestones: [
        {
          date: state.anniversary,
          id: `anniversary-${state.id}`,
          kind: 'anniversary',
          name: locale === 'es' ? 'Aniversario' : 'Anniversary',
        },
        ...state.members.flatMap((member) => member.birthDate ? [{
          date: member.birthDate,
          id: `birthday-${member.userId}`,
          kind: 'birthday' as const,
          name: locale === 'es' ? `Cumpleaños de ${member.displayName}` : `${member.displayName}'s birthday`,
        }] : []),
      ],
      today: localDate(state.timeZone),
    });
  }, [controller, locale, moment.history, pair.state]);

  useEffect(() => {
    if (!active) {
      controller.stop();
      threadController.close();
      return undefined;
    }
    void controller.start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void controller.refresh();
    });
    return () => {
      subscription.remove();
      controller.stop();
      threadController.close();
    };
  }, [active, controller, threadController]);

  return (
    <JournalContext.Provider value={{ controller, media: repository, threadController }}>
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  const context = useContext(JournalContext);
  if (!context) throw new Error('useJournal must be used within JournalProvider');
  const snapshot = useSyncExternalStore(
    context.controller.subscribe,
    context.controller.getSnapshot,
    context.controller.getSnapshot,
  );
  return { ...context, ...snapshot };
}
