import type { ExpenseDraft, TaskDraft } from '@/domain/models';

type SourceMode = 'bank' | 'tasks' | 'mixed';

type OpenRouterMessageContent =
  | string
  | Array<
      | { type: 'text'; text?: string }
      | { type: 'output_text'; text?: string }
      | { type: string; [key: string]: unknown }
    >;

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: OpenRouterMessageContent;
    };
  }>;
  error?: {
    message?: string;
  };
};

type TaskSuggestion = {
  title?: string;
  detail?: string;
  emoji?: string;
  duration?: string;
  essential?: boolean;
};

type ExpenseSuggestion = {
  name?: string;
  amount?: number | string;
  emoji?: string;
  type?: 'ess' | 'flex' | string;
  essential?: boolean;
};

type AiMagicPayload = {
  tasks?: TaskSuggestion[];
  expenses?: ExpenseSuggestion[];
};

export type AiMagicSuggestions = {
  tasks: TaskDraft[];
  expenses: ExpenseDraft[];
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-3.5-haiku';
const DEFAULT_VISION_MODEL = 'anthropic/claude-haiku-4.5';

function normalizeModelAlias(model: string) {
  const value = model.trim();

  if (/^anthropic\/claude-4\.5-haiku$/i.test(value)) {
    return 'anthropic/claude-haiku-4.5';
  }

  if (/^anthropic\/claude-4\.5-sonnet$/i.test(value)) {
    return 'anthropic/claude-sonnet-4.5';
  }

  return value;
}

function extractTextContent(content: OpenRouterMessageContent | undefined) {
  if (!content) return '';
  if (typeof content === 'string') return content;

  return content
    .map((item) => {
      if (item.type === 'text' || item.type === 'output_text') {
        return item.text ?? '';
      }

      return '';
    })
    .join('\n');
}

function extractJson(raw: string) {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? raw;
  const objectStart = fenced.indexOf('{');
  const objectEnd = fenced.lastIndexOf('}');

  if (objectStart >= 0 && objectEnd > objectStart) {
    return JSON.parse(fenced.slice(objectStart, objectEnd + 1)) as AiMagicPayload;
  }

  const arrayStart = fenced.indexOf('[');
  const arrayEnd = fenced.lastIndexOf(']');

  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return {
      tasks: JSON.parse(fenced.slice(arrayStart, arrayEnd + 1)) as TaskSuggestion[],
      expenses: [],
    } satisfies AiMagicPayload;
  }

  throw new Error('The AI response did not include valid tasks or budget items.');
}

function normalizeTaskSuggestion(task: TaskSuggestion): TaskDraft | null {
  const title = task.title?.trim();
  if (!title) return null;

  return {
    e: task.emoji?.trim() || '✨',
    n: title,
    t: task.duration?.trim() || '20 min',
    dl: null,
    ess: !!task.essential,
    detail: task.detail?.trim() || undefined,
  };
}

function normalizeExpenseSuggestion(expense: ExpenseSuggestion): ExpenseDraft | null {
  const name = expense.name?.trim();
  if (!name) return null;

  const rawAmount =
    typeof expense.amount === 'number'
      ? expense.amount
      : Number(String(expense.amount ?? '').replace(/[^0-9.]/g, ''));

  return {
    e: expense.emoji?.trim() || '💳',
    n: name,
    amt: Number.isFinite(rawAmount) ? Math.round(rawAmount) : 0,
    type: expense.type === 'ess' ? 'ess' : 'flex',
    ess: !!expense.essential,
  };
}

function modelSupportsImages(model: string) {
  if (/claude-haiku-4\.5/i.test(model)) {
    return true;
  }

  if (/claude-3\.5-haiku/i.test(model)) {
    return false;
  }

  return true;
}

export async function generateTasksWithOpenRouter({
  source,
  imageUri,
  text,
}: {
  source: SourceMode;
  imageUri: string | null;
  text: string;
}): Promise<AiMagicSuggestions> {
  const apiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  const configuredModel = normalizeModelAlias(process.env.EXPO_PUBLIC_OPENROUTER_MODEL || DEFAULT_MODEL);
  const visionModel = normalizeModelAlias(
    process.env.EXPO_PUBLIC_OPENROUTER_VISION_MODEL || DEFAULT_VISION_MODEL,
  );
  const usingImage = !!imageUri;
  const model = usingImage && !modelSupportsImages(configuredModel) ? visionModel : configuredModel;

  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_OPENROUTER_API_KEY.');
  }

  if (!imageUri && !text.trim()) {
    throw new Error('Add an image or OCR text before generating items.');
  }

  const prompt = [
    'You are an OCR + planning assistant.',
    `Source type: ${source}.`,
    source === 'tasks'
      ? 'Read the provided image and/or text and extract only actionable follow-up tasks a person could add to a productivity app.'
      : 'Read the provided image and/or text and extract monthly budget items plus any actionable follow-up tasks a person should handle.',
    'Examples of tasks: review a charge, cancel a subscription, call the bank, file a reimbursement, add a deadline, follow up on a note, schedule an appointment.',
    source === 'tasks'
      ? 'Avoid generic summaries. Convert findings into concise tasks.'
      : 'For budget items, infer recurring monthly expenses when they look like subscriptions, bills, rent, groceries, utilities, insurance, memberships, or other ongoing spending. Exclude obvious one-off purchases unless the text strongly implies they recur.',
    'Return only JSON.',
    'Return this exact shape:',
    '{"expenses":[{"name":"string","amount":25,"emoji":"single emoji","type":"ess or flex","essential":false}],"tasks":[{"title":"string","detail":"string","emoji":"single emoji","duration":"e.g. 20 min","essential":false}]}',
    source === 'tasks'
      ? 'Leave expenses empty when the source is a task list.'
      : 'For tasks generated from bank or budget content, set essential to true.',
  ].join('\n');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'X-Title': 'WouldYouIQ AI Magic',
  };

  if (typeof window !== 'undefined' && window.location?.origin) {
    headers['HTTP-Referer'] = window.location.origin;
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...(text.trim() ? [{ type: 'text', text: `OCR text:\n${text.trim()}` }] : []),
            ...(imageUri ? [{ type: 'image_url', image_url: { url: imageUri } }] : []),
          ],
        },
      ],
    }),
  });

  const payload = (await response.json()) as OpenRouterResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || 'OpenRouter provider returned an error.');
  }

  const raw = extractTextContent(payload.choices?.[0]?.message?.content);
  const parsed = extractJson(raw);
  const tasks = (parsed.tasks ?? [])
    .map(normalizeTaskSuggestion)
    .filter((task): task is TaskDraft => !!task)
    .map((task) => ({
      ...task,
      ess: source === 'bank' || source === 'mixed' ? true : task.ess,
    }));
  const expenses = (parsed.expenses ?? [])
    .map(normalizeExpenseSuggestion)
    .filter((expense): expense is ExpenseDraft => !!expense);

  if (tasks.length === 0 && expenses.length === 0) {
    throw new Error('No actionable tasks or budget items were found in the imported content.');
  }

  return {
    tasks,
    expenses,
  };
}
