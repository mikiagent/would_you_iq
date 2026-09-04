// In-app account deletion (App Review Guideline 5.1.1(v)).
//
// Verifies the caller's JWT, then deletes their auth user with the
// service-role key. Every user table references auth.users with
// `on delete cascade`, so profile, app_state, tasks, budget, and
// ai_usage rows are removed with the auth user.

import { createClient } from 'npm:@supabase/supabase-js@2';

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
  } catch (error) {
    console.error('Syllabus cleanup failed', user.id);
    return json({ error: 'Could not remove stored syllabi. Please retry account deletion.' }, 500);
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('deleteUser failed', user.id, error.message);
    return json({ error: 'Account deletion failed. Try again or contact support.' }, 500);
  }

  return json({ ok: true });
});
