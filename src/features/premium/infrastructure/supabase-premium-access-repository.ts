import {
  PremiumError,
  type PremiumAccessRepository,
  type PremiumAccessState,
  type PremiumEntitlement,
  type PremiumEntitlementStatus,
} from '@/features/premium/application/premium-controller';
import type { PomeloSupabaseClient } from '@/lib/supabase';

type JsonObject = Record<string, unknown>;

const accessValues = new Set(['archive', 'free', 'premium']);
const entitlementStatuses = new Set([
  'active',
  'cancelled',
  'expired',
  'gracePeriod',
  'none',
]);

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function booleanValue(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function parseEntitlement(value: unknown): PremiumEntitlement | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isObject(value)) {
    throw new PremiumError('unexpected');
  }

  const status = stringValue(value.status);
  const willRenew = booleanValue(value.willRenew);
  if (!status || !entitlementStatuses.has(status) || willRenew === null) {
    throw new PremiumError('unexpected');
  }

  return {
    expiresAt: stringValue(value.expiresAt),
    productId: stringValue(value.productId),
    status: status as PremiumEntitlementStatus,
    subscriberId: stringValue(value.subscriberId),
    willRenew,
  };
}

function parseState(value: unknown): PremiumAccessState {
  if (!isObject(value)) {
    throw new PremiumError('unexpected');
  }
  const access = stringValue(value.access);
  if (!access || !accessValues.has(access)) {
    throw new PremiumError('unexpected');
  }
  return {
    access: access as PremiumAccessState['access'],
    entitlement: parseEntitlement(value.entitlement),
  };
}

export class SupabasePremiumAccessRepository implements PremiumAccessRepository {
  constructor(private readonly client: PomeloSupabaseClient) {}

  async sync() {
    const { error } = await this.client.functions.invoke('revenuecat-sync', {
      body: {},
    });
    if (error) {
      throw new PremiumError('network');
    }
  }

  async getState() {
    const { data, error } = await this.client.rpc('get_premium_state');
    if (error) {
      const message = error.message?.toLowerCase() ?? '';
      throw new PremiumError(
        message.includes('fetch') || message.includes('network')
          ? 'network'
          : 'unexpected',
      );
    }
    return parseState(data);
  }
}
