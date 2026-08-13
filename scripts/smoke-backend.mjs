import { execFileSync } from 'node:child_process';

function localEnvironment() {
  const output = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8' });
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]])
  );
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Backend smoke request failed (${response.status})`);
  }
  return text ? JSON.parse(text) : null;
}

const environment = localEnvironment();
const apiUrl = environment.API_URL;
const publishableKey = environment.PUBLISHABLE_KEY ?? environment.ANON_KEY;
const serverKey = environment.SECRET_KEY ?? environment.SERVICE_ROLE_KEY;

if (!apiUrl || !publishableKey || !serverKey) {
  throw new Error('Local Supabase did not report the API, publishable, and server keys.');
}

const adminHeaders = {
  apikey: serverKey,
  Authorization: `Bearer ${serverKey}`,
  'Content-Type': 'application/json',
};
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = `Pomelo-${suffix}-pass`;
const userIds = [];

try {
  for (const displayName of ['Alex', 'Sam']) {
    const user = await request(`${apiUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        email: `smoke-${displayName.toLowerCase()}-${suffix}@example.test`,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      }),
    });
    userIds.push(user.id);
  }

  const session = await request(`${apiUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `smoke-alex-${suffix}@example.test`,
      password,
    }),
  });

  const anonProfiles = await request(`${apiUrl}/rest/v1/profiles?select=id`, {
    headers: { apikey: publishableKey },
  });
  if (anonProfiles.length !== 0) {
    throw new Error('Anonymous Profile access was not denied by RLS.');
  }

  const userHeaders = {
    apikey: publishableKey,
    Authorization: `Bearer ${session.access_token}`,
  };
  const ownProfiles = await request(
    `${apiUrl}/rest/v1/profiles?select=id,display_name,locale,appearance`,
    { headers: userHeaders }
  );
  if (ownProfiles.length !== 1 || ownProfiles[0].id !== userIds[0]) {
    throw new Error('The authenticated session could not read its authorized Profile.');
  }

  const crossedProfiles = await request(
    `${apiUrl}/rest/v1/profiles?id=eq.${userIds[1]}&select=id`,
    { headers: userHeaders }
  );
  if (crossedProfiles.length !== 0) {
    throw new Error('Cross-User Profile access was not denied by RLS.');
  }

  console.log('Backend smoke passed: connectivity, Auth session, authorized read, and RLS denial.');
} finally {
  await Promise.all(
    userIds.map((userId) =>
      fetch(`${apiUrl}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: adminHeaders,
      })
    )
  );
}
