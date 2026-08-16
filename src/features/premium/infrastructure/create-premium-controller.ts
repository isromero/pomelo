import {
  PremiumController,
  type PremiumGateway,
} from '@/features/premium/application/premium-controller';
import { RevenueCatPremiumGateway } from '@/features/premium/infrastructure/revenuecat-premium-gateway';

export function createPremiumRuntime() {
  const gateway: PremiumGateway = new RevenueCatPremiumGateway();
  return {
    controller: new PremiumController(gateway),
  };
}
