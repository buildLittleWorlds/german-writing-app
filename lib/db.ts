// Everything that touches the database lives here, as plain SQL.
// Neon is a hosted Postgres database; the `neon()` helper sends each query
// over HTTPS, which works well on Vercel's short-lived serverless functions.

import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
  return neon(url);
}

// The tables are created automatically the first time the app runs,
// so there is no separate "migration" step to remember.
let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql();
      await sql`CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        stage INT NOT NULL,
        prompt TEXT,
        text TEXT NOT NULL,
        feedback JSONB
      )`;
      await sql`CREATE TABLE IF NOT EXISTS vocab (
        german TEXT PRIMARY KEY,
        english TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'suggested',
        times_used INT NOT NULL DEFAULT 0,
        first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_used TIMESTAMPTZ
      )`;
      await sql`CREATE TABLE IF NOT EXISTS api_calls (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        kind TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INT NOT NULL,
        output_tokens INT NOT NULL,
        cache_read_tokens INT NOT NULL,
        cache_write_tokens INT NOT NULL,
        cost_usd NUMERIC(10, 5) NOT NULL
      )`;
      await sql`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`;
    })().catch((err) => {
      schemaReady = null; // try again on the next request
      throw err;
    });
  }
  return schemaReady;
}

async function db() {
  await ensureSchema();
  return getSql();
}

// ---------- Settings (current stage, latest plan) ----------

export async function getSetting(key: string): Promise<string | null> {
  const sql = await db();
  const rows = await sql`SELECT value FROM settings WHERE key = ${key}`;
  return rows.length ? (rows[0].value as string) : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const sql = await db();
  await sql`INSERT INTO settings (key, value) VALUES (${key}, ${value})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

export async function getCurrentStage(): Promise<number> {
  const v = await getSetting("stage");
  return v ? Number(v) : 1;
}

// ---------- Entries ----------

export type EntryRow = {
  id: number;
  created_at: string;
  stage: number;
  prompt: string | null;
  text: string;
  feedback: unknown;
};

export async function saveEntry(e: {
  stage: number;
  prompt: string | null;
  text: string;
  feedback: unknown;
}): Promise<number> {
  const sql = await db();
  const rows = await sql`INSERT INTO entries (stage, prompt, text, feedback)
    VALUES (${e.stage}, ${e.prompt}, ${e.text}, ${JSON.stringify(e.feedback)})
    RETURNING id`;
  return rows[0].id as number;
}

export async function listEntries(limit = 100): Promise<EntryRow[]> {
  const sql = await db();
  return (await sql`SELECT * FROM entries ORDER BY created_at DESC LIMIT ${limit}`) as EntryRow[];
}

export async function countEntriesByStage(): Promise<Record<number, number>> {
  const sql = await db();
  const rows = await sql`SELECT stage, COUNT(*)::int AS n FROM entries GROUP BY stage`;
  return Object.fromEntries(rows.map((r) => [r.stage as number, r.n as number]));
}

// ---------- Vocabulary ----------

export type VocabRow = {
  german: string;
  english: string;
  status: "suggested" | "used";
  times_used: number;
};

export async function markWordsUsed(words: { german: string; english: string }[]) {
  const sql = await db();
  for (const w of words) {
    const german = w.german.trim();
    if (!german) continue;
    await sql`INSERT INTO vocab (german, english, status, times_used, last_used)
      VALUES (${german}, ${w.english.trim()}, 'used', 1, now())
      ON CONFLICT (german) DO UPDATE SET
        status = 'used',
        times_used = vocab.times_used + 1,
        last_used = now()`;
  }
}

export async function addSuggestedWords(words: { german: string; english: string }[]) {
  const sql = await db();
  for (const w of words) {
    const german = w.german.trim();
    if (!german) continue;
    await sql`INSERT INTO vocab (german, english) VALUES (${german}, ${w.english.trim()})
      ON CONFLICT (german) DO NOTHING`;
  }
}

export async function listVocab(): Promise<VocabRow[]> {
  const sql = await db();
  return (await sql`SELECT german, english, status, times_used FROM vocab
    ORDER BY status DESC, times_used DESC, german`) as VocabRow[];
}

// ---------- Spending ----------

export async function recordApiCall(c: {
  kind: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
}) {
  const sql = await db();
  await sql`INSERT INTO api_calls
    (kind, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd)
    VALUES (${c.kind}, ${c.model}, ${c.inputTokens}, ${c.outputTokens},
            ${c.cacheReadTokens}, ${c.cacheWriteTokens}, ${c.costUsd})`;
}

export async function spendThisMonth(): Promise<{ usd: number; calls: number }> {
  const sql = await db();
  const rows = await sql`SELECT COALESCE(SUM(cost_usd), 0)::float AS usd, COUNT(*)::int AS calls
    FROM api_calls WHERE created_at >= date_trunc('month', now())`;
  return { usd: rows[0].usd as number, calls: rows[0].calls as number };
}
