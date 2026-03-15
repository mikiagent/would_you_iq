import type { ExpenseDraft, TaskDraft } from '@/domain/models';

type SourceMode = 'bank' | 'tasks' | 'mixed';

type AiMagicSuggestionSet = {
  tasks: TaskDraft[];
  expenses: ExpenseDraft[];
};

const KEYWORD_EMOJIS: Array<{ match: RegExp; emoji: string; duration: string; essential?: boolean }> = [
  { match: /(rent|mortgage)/i, emoji: '🏠', duration: '15 min', essential: true },
  { match: /(electric|internet|phone|insurance|utility|water|gas)/i, emoji: '⚡', duration: '15 min', essential: true },
  { match: /(grocery|groceries|costco|target|walmart)/i, emoji: '🛒', duration: '20 min' },
  { match: /(subscription|spotify|netflix|hulu|apple|amazon|stream|chatgpt|openai|ai service)/i, emoji: '📺', duration: '15 min' },
  { match: /(meeting|call|follow up|email|inbox)/i, emoji: '✉️', duration: '20 min' },
  { match: /(study|exam|school|homework|class)/i, emoji: '📚', duration: '45 min' },
  { match: /(workout|gym|run|walk|exercise)/i, emoji: '🏋️', duration: '30 min' },
  { match: /(budget|bill|statement|charge|payment|refund|bank)/i, emoji: '💰', duration: '25 min' },
  { match: /(build|launch|project|startup|ship)/i, emoji: '💡', duration: '60 min' },
];

function detectDescriptor(text: string) {
  return KEYWORD_EMOJIS.find((entry) => entry.match.test(text)) ?? {
    emoji: '✨',
    duration: '20 min',
    essential: false,
  };
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
}

function cleanLine(line: string) {
  return line
    .replace(/\s{2,}/g, ' ')
    .replace(/[|]/g, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '')
    .replace(/\b(?:debit|credit|pending|posted|transaction)\b/gi, '')
    .trim();
}

function parseAmount(line: string) {
  const matches = line.match(/\$?\d+(?:,\d{3})*(?:\.\d{2})?/g);
  if (!matches?.length) return null;
  const raw = matches[matches.length - 1] ?? '';
  const parsed = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function stripAmount(line: string) {
  return cleanLine(line).replace(/\$?\d+(?:,\d{3})*(?:\.\d{2})?/g, '').trim();
}

function inferExpenseType(text: string): 'ess' | 'flex' {
  return /(rent|mortgage|electric|internet|phone|insurance|utility|water|gas|grocery|groceries)/i.test(text)
    ? 'ess'
    : 'flex';
}

function buildExpenseFromLine(line: string): ExpenseDraft | null {
  const amt = parseAmount(line);
  const name = titleCase(stripAmount(line).split(/\s+/).slice(0, 5).join(' '));
  if (!amt || !name) return null;

  const descriptor = detectDescriptor(name);
  const type = inferExpenseType(name);

  return {
    e: descriptor.emoji,
    n: name,
    amt,
    type,
    ess: type === 'ess' || !!descriptor.essential,
  };
}

function buildTaskFromLine(line: string, source: SourceMode): TaskDraft | null {
  const cleaned = stripAmount(line);
  if (!cleaned || cleaned.length < 3) return null;

  const descriptor = detectDescriptor(cleaned);
  const merchantLike = titleCase(cleaned.split(/\s+/).slice(0, 4).join(' '));

  if (source === 'bank' || /\$/.test(line) || /(statement|charge|payment|merchant|card)/i.test(line)) {
    return {
      e: descriptor.emoji,
      n: `Review ${merchantLike} activity`,
      t: descriptor.duration,
      dl: null,
      ess: true,
      detail: `Auto-generated from statement text: ${cleaned}`,
    };
  }

  return {
    e: descriptor.emoji,
    n: merchantLike,
    t: descriptor.duration,
    dl: null,
    ess: !!descriptor.essential,
    detail: `Auto-generated from imported text: ${cleaned}`,
  };
}

function dedupeByName<T extends { n: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.n.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function generateAiMagicSuggestions(rawInput: string, source: SourceMode): AiMagicSuggestionSet {
  const lines = rawInput
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const expenses =
    source === 'tasks'
      ? []
      : dedupeByName(
          lines
            .map((line) => buildExpenseFromLine(line))
            .filter((entry): entry is ExpenseDraft => !!entry),
        ).slice(0, 12);

  const tasks = dedupeByName(
    lines
      .map((line) => buildTaskFromLine(line, source))
      .filter((entry): entry is TaskDraft => !!entry),
  ).slice(0, 10);

  if (tasks.length > 0 || expenses.length > 0) {
    return { tasks, expenses };
  }

  const fallback = detectDescriptor(rawInput);
  return {
    expenses:
      source === 'tasks'
        ? []
        : [
            {
              e: fallback.emoji,
              n: 'Imported monthly expense',
              amt: 0,
              type: fallback.essential ? 'ess' : 'flex',
              ess: !!fallback.essential,
            },
          ],
    tasks: [
      {
        e: fallback.emoji,
        n: source === 'bank' ? 'Review imported statement' : 'Process imported notes',
        t: fallback.duration,
        dl: null,
        ess: source !== 'tasks' || !!fallback.essential,
        detail: rawInput.trim() || 'Generated from uploaded image context.',
      },
    ],
  };
}
