import { ImageManipulator } from 'expo-image-manipulator';

import type { JournalEntry, JournalMedia } from '@/features/journal/domain/journal';
import {
  JOURNAL_MEDIA_BUCKET,
  SupabaseJournalRepository,
} from '@/features/journal/infrastructure/supabase-journal-repository';
import type { PomeloSupabaseClient } from '@/lib/supabase';

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: jest.fn(() => ({
      renderAsync: jest.fn(async () => ({
        saveAsync: jest.fn(async () => ({ height: 100, uri: 'file:///saved.jpg', width: 100 })),
      })),
      resize: jest.fn(),
    })),
  },
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('@/features/moment/moment-api', () => ({
  ThreadError: Error,
}));

const entry: JournalEntry = {
  body: null,
  createdAt: '2026-08-17T10:00:00.000Z',
  createdBy: 'user-1',
  endDate: null,
  id: 'entry-1',
  location: null,
  media: [],
  pairId: 'pair-1',
  recurrence: 'once',
  startDate: '2026-08-17',
  startTime: null,
  timeZone: 'Europe/Madrid',
  title: 'Entry',
  updatedAt: '2026-08-17T10:00:00.000Z',
  updatedBy: 'user-1',
  version: 2,
  widgetHidden: false,
};

const media: JournalMedia = {
  createdBy: 'user-1',
  height: 100,
  id: 'media-1',
  mimeType: 'image/jpeg',
  path: 'pair-1/entry-1/user-1/media-1.jpg',
  position: 0,
  width: 100,
};

function createRuntime(results: { data: unknown; error: { message?: string } | null }[]) {
  const remove = jest.fn(async () => ({ data: null, error: null }));
  const upload = jest.fn(async () => ({ data: { path: media.path }, error: null }));
  const rpc = jest.fn(async () => results.shift() ?? { data: null, error: null });
  const client = {
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) },
    rpc,
    storage: {
      from: jest.fn((bucket: string) => {
        expect(bucket).toBe(JOURNAL_MEDIA_BUCKET);
        return { remove, upload };
      }),
    },
  } as unknown as PomeloSupabaseClient;
  return { remove, repository: new SupabaseJournalRepository(client), rpc, upload };
}

describe('SupabaseJournalRepository media consistency', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ blob: async () => new Blob() } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.mocked(ImageManipulator.manipulate).mockClear();
  });

  it('retries metadata registration with the same media id after an uncertain response', async () => {
    const path = 'pair-1/entry-1/user-1/client-media.jpg';
    const runtime = createRuntime([
      { data: null, error: { message: 'Failed to fetch' } },
      { data: { id: 'media-1', path }, error: null },
    ]);

    await runtime.repository.addPhoto(entry, { height: 100, uri: 'file:///draft.jpg', width: 100 }, 0, 'client-media');

    expect(runtime.rpc).toHaveBeenCalledTimes(2);
    expect(runtime.rpc.mock.calls[0]).toEqual(runtime.rpc.mock.calls[1]);
    expect(runtime.remove).not.toHaveBeenCalled();
  });

  it('does not delete an uploaded object while a committed metadata row is uncertain', async () => {
    const runtime = createRuntime([
      { data: null, error: { message: 'Network request failed' } },
      { data: null, error: { message: 'Network request failed' } },
    ]);

    await expect(runtime.repository.addPhoto(
      entry,
      { height: 100, uri: 'file:///draft.jpg', width: 100 },
      0,
      'client-media',
    )).rejects.toMatchObject({ code: 'network' });
    expect(runtime.remove).not.toHaveBeenCalled();
  });

  it('removes only an object whose metadata insertion was explicitly rejected', async () => {
    const runtime = createRuntime([{ data: { error: 'invalid_media' }, error: null }]);

    await expect(runtime.repository.addPhoto(
      entry,
      { height: 100, uri: 'file:///draft.jpg', width: 100 },
      0,
      'client-media',
    )).rejects.toMatchObject({ code: 'unexpected' });
    expect(runtime.remove).toHaveBeenCalledWith(['pair-1/entry-1/user-1/client-media.jpg']);
  });

  it('commits photo removal before cleaning up its object', async () => {
    const runtime = createRuntime([{ data: { path: media.path, removed: true }, error: null }]);

    await runtime.repository.removePhoto(media);

    expect(runtime.rpc.mock.invocationCallOrder[0]).toBeLessThan(runtime.remove.mock.invocationCallOrder[0]);
  });

  it('commits a versioned entry deletion before cleaning up its objects', async () => {
    const runtime = createRuntime([{ data: { deleted: true, paths: [media.path] }, error: null }]);

    await runtime.repository.deleteEntry(entry.id, entry.version);

    expect(runtime.rpc).toHaveBeenCalledWith('delete_journal_entry', {
      expected_version: entry.version,
      target_entry_id: entry.id,
    });
    expect(runtime.rpc.mock.invocationCallOrder[0]).toBeLessThan(runtime.remove.mock.invocationCallOrder[0]);
  });
});
