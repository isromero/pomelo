import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { notifyPremiumPair } from '../_shared/premium-notify.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const expectedToken = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!expectedToken || request.headers.get('authorization') !== `Bearer ${expectedToken}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Server configuration is incomplete', { status: 500 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.rpc('process_revenuecat_webhook', {
    target_payload: payload,
  });

  if (error) {
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
  if (data?.status === 'rejected') {
    return Response.json(data, { status: 400 });
  }
  if (data?.status === 'processed') {
    try {
      await notifyPremiumPair(client, payload?.event?.app_user_id ?? payload?.app_user_id);
    } catch {
    }
  }
  return Response.json(data, { status: 200 });
});
