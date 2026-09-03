// Syllabus extraction proxy.
//
// Holds the OpenRouter credential server-side (set via
// `supabase secrets set OPENROUTER_API_KEY=...`), authenticates the caller
// with their Supabase JWT, rate-limits per user per day, and forwards
// syllabus content (PDF, image, or pasted text) to OpenRouter with
// zero-data-retention routing. Returns normalized assignment JSON.

import { createClient } from 'npm:@supabase/supabase-js@2';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-haiku-4.5';
const DAILY_LIMIT = 20;
// Matches the client-side cap (5 MB of raw file ≈ 6.7 MB of base64).
const MAX_DATA_CHARS = 7_500_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

type ExtractRequest = {
  kind?: 'pdf' | 'image' | 'text';
  data?: string;
  filename?: string;
  timezone?: string;
};

type RawAssignment = {
  title?: string;
  detail?: string;
  dueDate?: string | null;
  emoji?: string;
  estimatedDuration?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractTextContent(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) =>
        item && (item.type === 'text' || item.type === 'output_text') ? item.text ?? '' : '',
      )
      .join('\n');
  }
  return '';
}

function extractJson(raw: string): { assignments?: RawAssignment[] } {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? raw;
  const objectStart = fenced.indexOf('{');
  const objectEnd = fenced.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    return JSON.parse(fenced.slice(objectStart, objectEnd + 1));
  }
  const arrayStart = fenced.indexOf('[');
  const arrayEnd = fenced.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return { assignments: JSON.parse(fenced.slice(arrayStart, arrayEnd + 1)) };
  }
  throw new Error('unparseable');
}

function normalizeAssignment(a: RawAssignment) {
  const title = a.title?.trim();
  if (!title) return null;
  const dueDate =
    typeof a.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate.trim())
      ? a.dueDate.trim()
      : null;
  return {
    title,
    detail: a.detail?.trim() || '',
    dueDate,
    emoji: a.emoji?.trim() || '📚',
    estimatedDuration: a.estimatedDuration?.trim() || '30 min',
  };
}

function buildPrompt(timezone: string | undefined) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    'You are an assistant that reads a course syllabus (PDF, photo, or pasted text) and extracts every assignment, homework, project, reading, quiz, exam, or other deliverable a student needs to act on.',
    `Today's date is ${today}${timezone ? ` in timezone ${timezone}` : ''}. Resolve any relative or partial dates (like "Week 3" only if an anchor date is given, or "Fri 9/12") to absolute dates. If a year is missing, choose the nearest upcoming occurrence. If a date cannot be determined, use null.`,
    'Return only JSON in this exact shape:',
    '{"assignments":[{"title":"string","detail":"string","dueDate":"YYYY-MM-DD or null","emoji":"single emoji","estimatedDuration":"e.g. 45 min"}]}',
    'Keep titles short and actionable (e.g. "Problem set 3", "Read chapters 4-5"). Put course name, submission method, or grading weight in detail. Do not invent assignments that are not in the source. If the source is not a syllabus or contains no assignments, return {"assignments":[]}.',
  ].join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method === 'GET') {
    return json({ ok: true });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const authedClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authError,
  } = await authedClient.auth.getUser();
  if (authError || !user) {
    return json({ error: 'Sign in to import a syllabus.' }, 401);
  }

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY secret is not set');
    return json({ error: 'Syllabus import is temporarily unavailable.' }, 503);
  }

  let body: ExtractRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }
  const { kind, data, filename, timezone } = body;
  if (!kind || !['pdf', 'image', 'text'].includes(kind) || !data?.trim()) {
    return json({ error: 'Provide a PDF, image, or pasted text.' }, 400);
  }
  if (data.length > MAX_DATA_CHARS) {
    return json({ error: 'File is too large. Try a smaller file or photograph the relevant page.' }, 413);
  }

  // Rate limit: increment (user, today) and reject over the daily cap.
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const day = new Date().toISOString().slice(0, 10);
  const { data: usageRow } = await admin
    .from('ai_usage')
    .select('count')
    .eq('user_id', user.id)
    .eq('day', day)
    .maybeSingle();
  const used = usageRow?.count ?? 0;
  if (used >= DAILY_LIMIT) {
    return json({ error: 'Daily syllabus import limit reached. Try again tomorrow.' }, 429);
  }
  await admin
    .from('ai_usage')
    .upsert({ user_id: user.id, day, count: used + 1 }, { onConflict: 'user_id,day' });

  const content: unknown[] = [{ type: 'text', text: buildPrompt(timezone) }];
  if (kind === 'text') {
    content.push({ type: 'text', text: `Syllabus text:\n${data.trim()}` });
  } else if (kind === 'image') {
    content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${data}` } });
  } else {
    content.push({
      type: 'file',
      file: {
        filename: filename || 'syllabus.pdf',
        file_data: `data:application/pdf;base64,${data}`,
      },
    });
  }

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'WouldYouIQ Syllabus Import',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        provider: { zdr: true },
        messages: [{ role: 'user', content }],
      }),
    });
  } catch (err) {
    console.error('OpenRouter request failed', err);
    return json({ error: 'The AI service could not be reached. Try again.' }, 502);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    // Log upstream detail server-side only; never echo it to the client.
    console.error('OpenRouter error', response.status, payload?.error?.message);
    return json({ error: 'The AI service returned an error. Try again.' }, 502);
  }

  try {
    const raw = extractTextContent(payload.choices?.[0]?.message?.content);
    const parsed = extractJson(raw);
    const assignments = (parsed.assignments ?? [])
      .map(normalizeAssignment)
      .filter((a): a is NonNullable<ReturnType<typeof normalizeAssignment>> => a !== null);
    return json({ assignments });
  } catch {
    return json({ error: 'The AI response could not be read. Try again.' }, 502);
  }
});
