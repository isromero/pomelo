import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function notifyPremiumPair(client: SupabaseClient, userId: string) {
  const { data: membership } = await client
    .from('pair_memberships')
    .select('pair_id')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle();
  if (!membership?.pair_id) {
    return;
  }

  const { data: members } = await client
    .from('pair_memberships')
    .select('user_id')
    .eq('pair_id', membership.pair_id)
    .is('ended_at', null);
  await Promise.all(
    (members ?? []).map(async (member) => {
      const channel = client.channel(`premium-user:${member.user_id}`);
      try {
        await channel.httpSend('premium-updated', {});
      } finally {
        await client.removeChannel(channel);
      }
    }),
  );
}
