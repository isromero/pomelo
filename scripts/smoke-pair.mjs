import { execFileSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

function localEnvironment() {
  const output = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
    encoding: 'utf8',
  });
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]]),
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function withTimeout(promise, message, milliseconds = 10_000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

const environment = localEnvironment();
const apiUrl = environment.API_URL;
const publishableKey = environment.PUBLISHABLE_KEY ?? environment.ANON_KEY;
const serverKey = environment.SECRET_KEY ?? environment.SERVICE_ROLE_KEY;

if (!apiUrl || !publishableKey || !serverKey) {
  throw new Error('Local Supabase did not report all required keys.');
}

const clientOptions = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(apiUrl, serverKey, clientOptions);
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = `Pomelo-${suffix}-pass`;
const users = [];
const clients = [];
const pairIds = [];

try {
  for (const [index, displayName] of ['Irene', 'Lucia', 'Alex'].entries()) {
    const email = `pair-${index}-${suffix}@example.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: { display_name: displayName },
    });
    if (error || !data.user) {
      throw error ?? new Error('User creation returned no User.');
    }
    users.push({ email, id: data.user.id });

    const client = createClient(apiUrl, publishableKey, clientOptions);
    const { data: signIn, error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError || !signIn.session) {
      throw signInError ?? new Error('Sign-in returned no session.');
    }
    client.realtime.setAuth(signIn.session.access_token);
    const { error: profileError } = await client
      .from('profiles')
      .update({ avatar_key: index === 0 ? 'calm' : 'affectionate', birth_date: '1992-11-07' })
      .eq('id', data.user.id);
    if (profileError) {
      throw profileError;
    }
    clients.push(client);
  }

  const [creator, partner, third] = clients;
  const { data: warmPair, error: warmCreateError } = await creator.rpc(
    'create_pair_with_invitation',
    { pair_anniversary: '2020-01-02' },
  );
  if (warmCreateError) {
    throw warmCreateError;
  }
  assert(warmPair?.status === 'waiting', 'Realtime warm-up Pair was not created.');
  pairIds.push(warmPair.id);

  let resolveWarmEvent;
  const warmEvent = new Promise((resolve) => {
    resolveWarmEvent = resolve;
  });
  let resolveWarmSubscribed;
  const warmSubscribed = new Promise((resolve) => {
    resolveWarmSubscribed = resolve;
  });
  const warmChannel = creator
    .channel(`pair-warmup-${suffix}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        filter: `id=eq.${warmPair.id}`,
        schema: 'public',
        table: 'pairs',
      },
      resolveWarmEvent,
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        resolveWarmSubscribed();
      }
    });
  await withTimeout(warmSubscribed, 'Realtime warm-up channel did not subscribe.');
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  const { data: archivedWarmPair, error: warmDissolveError } = await creator.rpc('dissolve_pair');
  if (warmDissolveError) {
    throw warmDissolveError;
  }
  assert(archivedWarmPair?.status === 'archived', 'Realtime warm-up Pair was not archived.');
  await Promise.race([
    warmEvent,
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  await creator.removeChannel(warmChannel);

  const { data: created, error: createError } = await creator.rpc(
    'create_pair_with_invitation',
    { pair_anniversary: '2021-06-12' },
  );
  if (createError) {
    throw createError;
  }
  assert(created?.status === 'waiting', 'Creator did not receive a waiting Pair.');
  assert(created?.invitation?.code, 'Creator did not receive an Invitation code.');
  pairIds.push(created.id);

  let resolveActive;
  const activeEvent = new Promise((resolve) => {
    resolveActive = resolve;
  });
  let resolveSubscribed;
  const subscribed = new Promise((resolve) => {
    resolveSubscribed = resolve;
  });
  const channel = creator
    .channel(`pair-smoke-${suffix}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        filter: `id=eq.${created.id}`,
        schema: 'public',
        table: 'pairs',
      },
      (payload) => {
        if (payload.new.status === 'active') {
          resolveActive(payload);
        }
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        resolveSubscribed();
      }
    });

  await withTimeout(subscribed, 'Creator did not subscribe to Pair updates.');
  await new Promise((resolve) => setTimeout(resolve, 1_000));

  const { data: preview, error: previewError } = await partner.rpc(
    'preview_pair_invitation',
    { invitation_credential: created.invitation.code },
  );
  if (previewError) {
    throw previewError;
  }
  assert(preview?.status === 'valid', 'Partner could not preview the Invitation.');
  assert(preview?.creatorName === 'Irene', 'Invitation preview did not identify the creator.');

  const { data: accepted, error: acceptError } = await partner.rpc(
    'accept_pair_invitation',
    { invitation_credential: created.invitation.code },
  );
  if (acceptError) {
    throw acceptError;
  }
  assert(accepted?.status === 'active', 'Partner did not activate the Pair.');
  assert(accepted?.members?.length === 2, 'Activated Pair did not have exactly two members.');
  assert(accepted?.anniversary === '2021-06-12', 'Partner saw a different anniversary.');

  await withTimeout(activeEvent, 'Creator did not receive the realtime Pair activation.');
  await creator.removeChannel(channel);

  const { data: reused } = await third.rpc('accept_pair_invitation', {
    invitation_credential: created.invitation.token,
  });
  assert(reused?.error === 'invitation_used', 'Third User did not receive a used Invitation state.');

  const { data: leaked, error: leakError } = await third
    .from('pairs')
    .select('id')
    .eq('id', created.id);
  if (leakError) {
    throw leakError;
  }
  assert(leaked.length === 0, 'Third User could read the private Pair.');

  console.log('Pair smoke passed: create, preview, accept, realtime, shared state, and third-User denial.');
} finally {
  await Promise.all(clients.map((client) => client.removeAllChannels()));
  if (pairIds.length > 0) {
    for (const table of ['pair_invitations', 'pair_memberships', 'pairs']) {
      const column = table === 'pairs' ? 'id' : 'pair_id';
      const { error } = await admin.from(table).delete().in(column, pairIds);
      if (error) {
        throw error;
      }
    }
  }
  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      throw error;
    }
  }
}
