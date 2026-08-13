import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import { Database } from './database.types';
import { Environment } from './env';

export type PomeloSupabaseClient = SupabaseClient<Database>;

export type SupabaseRuntime = {
  client: PomeloSupabaseClient;
  dispose(): void;
};

export function createSupabaseRuntime(environment: Environment): SupabaseRuntime {
  const client = createClient<Database>(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      auth: {
        ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: processLock,
        persistSession: true,
      },
    }
  );

  if (Platform.OS === 'web') {
    return { client, dispose() {} };
  }

  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      client.auth.startAutoRefresh();
    } else {
      client.auth.stopAutoRefresh();
    }
  });

  return {
    client,
    dispose() {
      subscription.remove();
      client.auth.stopAutoRefresh();
    },
  };
}
