import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type JsonObject = Record<string, unknown>;
type MomentFormat = 'question' | 'photo' | 'doodle';

const momentFormats = new Set<MomentFormat>(['question', 'photo', 'doodle']);

function objectValue(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function response(body: JsonObject, status = 200) {
  return Response.json(body, { status });
}

function pairLocalDate(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      timeZone,
      year: 'numeric',
    }).formatToParts(new Date());
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    );
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}

function addDay(localDate: string) {
  const date = new Date(`${localDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function stableScore(value: string) {
  let score = 2166136261;
  for (const character of value) {
    score ^= character.charCodeAt(0);
    score = Math.imul(score, 16777619);
  }
  return score >>> 0;
}

async function advanceDay(client: ReturnType<typeof createClient>, userId: string) {
  const { data: membership, error: membershipError } = await client
    .from('pair_memberships')
    .select('pair_id')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle();
  if (membershipError) {
    return response({ error: 'unexpected' }, 500);
  }
  if (!membership?.pair_id) {
    return response({ error: 'pair_not_active' }, 409);
  }

  const { data: pair, error: pairError } = await client
    .from('pairs')
    .select('id,status,time_zone')
    .eq('id', membership.pair_id)
    .eq('status', 'active')
    .maybeSingle();
  if (pairError) {
    return response({ error: 'unexpected' }, 500);
  }
  if (!pair) {
    return response({ error: 'pair_not_active' }, 409);
  }

  const { data: members, error: membersError } = await client
    .from('pair_memberships')
    .select('user_id')
    .eq('pair_id', pair.id)
    .is('ended_at', null);
  if (membersError || !members || members.length !== 2) {
    return response({ error: 'pair_not_ready' }, 409);
  }

  const { count: memoryCount, error: memoryError } = await client
    .from('memories')
    .select('id', { count: 'exact', head: true })
    .eq('pair_id', pair.id);
  if (memoryError) {
    return response({ error: 'unexpected' }, 500);
  }
  if (!memoryCount) {
    return response({ error: 'first_moment_required' }, 409);
  }

  const { data: activeMoment, error: activeMomentError } = await client
    .from('moments')
    .select('local_date,format,status,prompt_concept_key')
    .eq('pair_id', pair.id)
    .in('status', ['open', 'partially_submitted', 'ready'])
    .order('local_date', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (activeMomentError) {
    return response({ error: 'unexpected' }, 500);
  }
  if (activeMoment) {
    return response({
      error: 'moment_in_progress',
      format: activeMoment.format,
      localDate: activeMoment.local_date,
      promptKey: activeMoment.prompt_concept_key,
      status: activeMoment.status,
    }, 409);
  }

  const { data: latestMoment, error: latestMomentError } = await client
    .from('moments')
    .select('local_date')
    .eq('pair_id', pair.id)
    .order('local_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestMomentError) {
    return response({ error: 'unexpected' }, 500);
  }

  const today = pairLocalDate(stringValue(pair.time_zone) ?? 'UTC');
  const nextLocalDate = latestMoment?.local_date && latestMoment.local_date > today
    ? addDay(latestMoment.local_date)
    : addDay(today);
  const { data: prompts, error: promptsError } = await client
    .from('prompt_concepts')
    .select('concept_key,format')
    .eq('active', true);
  if (promptsError || !prompts?.length) {
    return response({ error: 'prompt_unavailable' }, 409);
  }

  const { data: usedMoments, error: usedMomentsError } = await client
    .from('moments')
    .select('prompt_concept_key')
    .eq('pair_id', pair.id);
  if (usedMomentsError) {
    return response({ error: 'unexpected' }, 500);
  }
  const usedPromptKeys = new Set((usedMoments ?? []).map((moment) => moment.prompt_concept_key));
  const selectedPrompt = [...prompts]
    .filter((prompt) => momentFormats.has(prompt.format as MomentFormat))
    .sort((left, right) => {
      const leftUnused = usedPromptKeys.has(left.concept_key) ? 1 : 0;
      const rightUnused = usedPromptKeys.has(right.concept_key) ? 1 : 0;
      if (leftUnused !== rightUnused) {
        return leftUnused - rightUnused;
      }
      return stableScore(`${left.concept_key}${pair.id}${nextLocalDate}`)
        - stableScore(`${right.concept_key}${pair.id}${nextLocalDate}`);
    })[0];

  if (!selectedPrompt) {
    return response({ error: 'prompt_unavailable' }, 409);
  }

  const { data: moment, error: insertError } = await client
    .from('moments')
    .insert({
      format: selectedPrompt.format,
      is_free: false,
      local_date: nextLocalDate,
      pair_id: pair.id,
      prompt_concept_key: selectedPrompt.concept_key,
    })
    .select('format,local_date,prompt_concept_key')
    .single();
  if (insertError || !moment) {
    return response({ error: 'unexpected' }, 500);
  }

  const channel = client.channel('moment-state');
  try {
    await channel.httpSend('moment-updated', {});
  } catch {
  } finally {
    await client.removeChannel(channel);
  }

  return response({
    format: moment.format,
    localDate: moment.local_date,
    promptKey: moment.prompt_concept_key,
    status: 'advanced',
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  if (Deno.env.get('POMELO_DEV_TOOLS_ENABLED') !== 'true') {
    return new Response('Not found', { status: 404 });
  }

  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!accessToken || !supabaseUrl || !serviceRoleKey) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: JsonObject | null = null;
  try {
    payload = objectValue(await request.json());
  } catch {
    return response({ error: 'invalid_request' }, 400);
  }
  if (stringValue(payload?.action) !== 'advance-day') {
    return response({ error: 'invalid_request' }, 400);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await client.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  return advanceDay(client, authData.user.id);
});
