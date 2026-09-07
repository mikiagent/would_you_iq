// In-app account deletion (App Review Guideline 5.1.1(v)).
//
// Verifies the caller's JWT, then deletes their auth user with the
// service-role key. Every user table references auth.users with
// `on delete cascade`, so profile, app_state, tasks, budget, and
// ai_usage rows are removed with the auth user.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { importPKCS8, SignJWT } from 'npm:jose@5.10.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function requiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function hasAppleIdentity(user: {
  app_metadata?: Record<string, unknown>;
  identities?: { provider?: string }[];
}) {
  const providers = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers
    : [];
  return (
    user.identities?.some((identity) => identity.provider === 'apple') ||
    providers.includes('apple')
  );
}

async function createAppleClientSecret() {
  const teamId = requiredSecret('APPLE_TEAM_ID');
  const keyId = requiredSecret('APPLE_KEY_ID');
  const clientId = requiredSecret('APPLE_CLIENT_ID');
  const privateKey = requiredSecret('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n');
  const signingKey = await importPKCS8(privateKey, 'ES256');

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(signingKey);
}

async function revokeAppleAuthorization(authorizationCode: string) {
  const clientId = requiredSecret('APPLE_CLIENT_ID');
  const clientSecret = await createAppleClientSecret();
  const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }),
  });
  const tokenPayload = await tokenResponse.json().catch(() => null);
  const refreshToken = tokenPayload?.refresh_token;
  if (!tokenResponse.ok || typeof refreshToken !== 'string') {
    console.error('Apple token exchange failed', tokenResponse.status);
    throw new Error('Apple token exchange failed');
  }

  const revokeResponse = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }),
  });
  if (!revokeResponse.ok) {
    console.error('Apple token revocation failed', revokeResponse.status);
    throw new Error('Apple token revocation failed');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authedClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const {
    data: { user },
    error: authError,
  } = await authedClient.auth.getUser();
  if (authError || !user) {
    return json({ error: 'Not signed in.' }, 401);
  }

  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // Storage objects do not cascade with auth.users. Delete only this account's
  // syllabus files before deleting the account so a failed cleanup is retryable.
  try {
    const bucket = admin.storage.from('syllabi');
    const folders = await bucket.list(user.id, { limit: 1000 });
    if (folders.error && !folders.error.message.toLowerCase().includes('not found')) throw folders.error;
    for (const folder of folders.data ?? []) {
      const prefix = `${user.id}/${folder.name}`;
      const files = await bucket.list(prefix, { limit: 1000 });
      if (files.error) throw files.error;
      const paths = (files.data ?? []).map((file) => `${prefix}/${file.name}`);
      if (paths.length) {
        const removed = await bucket.remove(paths);
        if (removed.error) throw removed.error;
      }
    }
  } catch {
    console.error('Syllabus cleanup failed', user.id);
    return json({ error: 'Could not remove stored syllabi. Please retry account deletion.' }, 500);
  }

  if (hasAppleIdentity(user) && !user.app_metadata?.apple_authorization_revoked_at) {
    const body = await req.json().catch(() => ({}));
    const authorizationCode = body?.appleAuthorizationCode;
    if (typeof authorizationCode !== 'string' || !authorizationCode.trim()) {
      return json({ error: 'Confirm with Apple in the latest app before deleting this account.' }, 409);
    }

    try {
      await revokeAppleAuthorization(authorizationCode);
      const { error: markerError } = await admin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          ...user.app_metadata,
          apple_authorization_revoked_at: new Date().toISOString(),
        },
      });
      if (markerError) console.error('Could not mark Apple authorization revoked', user.id);
    } catch {
      console.error('Apple authorization cleanup failed', user.id);
      return json({ error: 'Apple authorization could not be revoked. Please try again.' }, 502);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('deleteUser failed', user.id, error.message);
    return json({ error: 'Account deletion failed. Try again or contact support.' }, 500);
  }

  return json({ ok: true });
});
