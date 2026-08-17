import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { notifyPremiumPair } from '../_shared/premium-notify.ts';

type JsonObject = Record<string, unknown>;

const premiumEntitlementIds = ['premium', 'Pomelo Premium'];

function objectValue(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function timestampMs(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string' || !value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function revenueCatApiKey() {
  return (
    Deno.env.get('REVENUECAT_API_KEY') ??
    Deno.env.get('EXPO_PUBLIC_REVENUECAT_TEST_STORE_API_KEY') ??
    Deno.env.get('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY') ??
    Deno.env.get('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY')
  );
}

function syncEvent(appUserId: string, subscriber: JsonObject) {
  const now = Date.now();
  const entitlements = objectValue(subscriber.entitlements);
  const subscriptions = objectValue(subscriber.subscriptions);
  let fallbackEvent: JsonObject | null = null;

  for (const entitlementId of premiumEntitlementIds) {
    const entitlement = objectValue(entitlements?.[entitlementId]);
    if (!entitlement) {
      continue;
    }

    const productId = stringValue(entitlement.product_identifier);
    const expiresAtMs = timestampMs(entitlement.expires_date);
    const gracePeriodExpiresAtMs = timestampMs(entitlement.grace_period_expires_date);
    const subscription = productId ? objectValue(subscriptions?.[productId]) : null;
    const store = stringValue(subscription?.store) ?? 'unknown';
    const active = expiresAtMs === null || expiresAtMs > now;
    const inGracePeriod = !active && gracePeriodExpiresAtMs !== null && gracePeriodExpiresAtMs > now;
    const cancelled = timestampMs(subscription?.unsubscribe_detected_at) !== null;
    const type = inGracePeriod
      ? 'BILLING_ISSUE'
      : !active
        ? 'EXPIRATION'
        : cancelled
          ? 'CANCELLATION'
          : 'INITIAL_PURCHASE';
    const eventId = [
      'sync',
      appUserId,
      type,
      productId ?? 'unknown',
      expiresAtMs ?? 'none',
      gracePeriodExpiresAtMs ?? 'none',
    ].join(':');

    const event = {
      id: eventId,
      type,
      app_user_id: appUserId,
      product_id: productId,
      store,
      event_timestamp_ms: now,
      expiration_at_ms: expiresAtMs,
      grace_period_expiration_at_ms: gracePeriodExpiresAtMs,
    };
    if (active) {
      return { event };
    }
    fallbackEvent = event;
  }

  if (fallbackEvent) {
    return { event: fallbackEvent };
  }

  return {
    event: {
      id: `sync:${appUserId}:EXPIRATION`,
      type: 'EXPIRATION',
      app_user_id: appUserId,
      event_timestamp_ms: now,
    },
  };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const apiKey = revenueCatApiKey();

  if (!accessToken || !supabaseUrl || !serviceRoleKey) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!apiKey) {
    return new Response('RevenueCat server configuration is incomplete', { status: 500 });
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await client.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(authData.user.id)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (response.status === 404) {
    return Response.json({ status: 'pending' }, { status: 202 });
  }
  if (!response.ok) {
    return new Response('RevenueCat synchronization failed', { status: 502 });
  }

  const payload = await response.json();
  const subscriber = objectValue(payload?.subscriber);
  if (!subscriber) {
    return new Response('RevenueCat response was invalid', { status: 502 });
  }

  const { data, error } = await client.rpc('process_revenuecat_webhook', {
    target_payload: syncEvent(authData.user.id, subscriber),
  });
  if (error) {
    return Response.json({ error: 'Premium synchronization failed' }, { status: 500 });
  }
  if (data?.status === 'rejected') {
    return Response.json(data, { status: 400 });
  }
  try {
    await notifyPremiumPair(client, authData.user.id);
  } catch {
  }
  return Response.json(data, { status: 200 });
});
