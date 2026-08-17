import type { DevelopmentToolsRepository } from '@/features/development/application/development-tools';
import { SupabaseDevelopmentToolsRepository } from '@/features/development/infrastructure/supabase-development-tools-repository';
import type { PomeloSupabaseClient } from '@/lib/supabase';

export function createDevelopmentTools(client: PomeloSupabaseClient | null): DevelopmentToolsRepository | null {
  return client ? new SupabaseDevelopmentToolsRepository(client) : null;
}
