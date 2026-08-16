import {
  PremiumController,
  type PremiumGateway,
} from '@/features/premium/application/premium-controller';
import { RevenueCatPremiumGateway } from '@/features/premium/infrastructure/revenuecat-premium-gateway';
import { SupabasePremiumAccessRepository } from '@/features/premium/infrastructure/supabase-premium-access-repository';
import type { PomeloSupabaseClient } from '@/lib/supabase';

const unavailableAccessRepository = {
  getState: async () => ({ access: 'free' as const, entitlement: null }),
};

export function createPremiumRuntime(client: PomeloSupabaseClient | null) {
  const gateway: PremiumGateway = new RevenueCatPremiumGateway();
  return {
    controller: new PremiumController(
      gateway,
      client ? new SupabasePremiumAccessRepository(client) : unavailableAccessRepository,
    ),
  };
}
