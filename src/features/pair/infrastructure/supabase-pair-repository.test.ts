import { SupabasePairRepository } from '@/features/pair/infrastructure/supabase-pair-repository';
import type { PomeloSupabaseClient } from '@/lib/supabase';

describe('SupabasePairRepository', () => {
  it('refreshes state whenever the realtime channel subscribes or reconnects', () => {
    let onStatus: ((status: string) => void) | undefined;
    const channel: { on: jest.Mock; subscribe: jest.Mock } = {
      on: jest.fn(),
      subscribe: jest.fn(),
    };
    channel.on.mockReturnValue(channel);
    channel.subscribe.mockImplementation((listener: (status: string) => void) => {
      onStatus = listener;
      return channel;
    });
    const client = {
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
    } as unknown as PomeloSupabaseClient;
    const repository = new SupabasePairRepository(client);
    const listener = jest.fn();

    repository.subscribe(listener);
    onStatus?.('SUBSCRIBED');
    onStatus?.('SUBSCRIBED');

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
