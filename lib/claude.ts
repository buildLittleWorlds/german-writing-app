// All conversations with Claude happen here, on the server.
// The browser never sees ANTHROPIC_API_KEY: it only talks to our own /api routes.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { STAGES, getStage } from "./stages";
import { recordApiCall, spendThisMonth } from "./db";

// ---------- Model and cost settings ----------

export const MODEL = "claude-opus-5-5";

// "low" effort keeps answers quick and cheap. Try "medium" if feedback feels thin.
const EFFORT = "low" as const;

// Dollars per million tokens for Claude Opus 5.5. Used only to track spending.
const PRICE = {
  input: 4.0,
  output: 20.0,
  cacheWrite: 5.0, // writing the tutor instructions into the cache (1.25x input)
  cacheRead: 0.2, // reusing them from the cache (0.05x input)
};

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

export class BudgetExceededError extends Error {}

async function checkBudget() {
  const budget = Number(process.env.MONTHLY_BUDGET_USD ?? "30");
  const { usd } = await spendThisMonth();
  if (usd >= budget) {
    throw new BudgetExceededError(
      `This month's Claude spending ($${usd.toFixed(2)}) has reached your limit of $${budget}. ` +
        `Raise MONTHLY_BUDGET_USD in Vercel if you want to keep going.`,
    );
  }
}

type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

async function logUsage(kind: string, usage: Usage) {
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cost =
    (usage.input_tokens * PRICE.input +
      usage.output_tokens * PRICE.output +
      cacheRead * PRICE.cacheRead +
      cacheWrite * PRICE.cacheWrite) /
    1_000_000;
  await recordApiCall({
    kind,
    model: MODEL,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
    costUsd: cost,
  });
  return cost;
}

// ---------- The tutor's standing instructions ----------
// This text never changes between requests, which is what lets it be cached:
// after the first call, Claude re-reads it at a small fraction of the price.
// Anything that changes (your text, your stage, your words) goes in the user message.

const SYLLABUS = STAGES.map(
  (s) => `Stage ${s.id}: ${s.name}. Goal: ${s.goal} Example: ${s.example}`,
).join("\n");

const TUTOR_SYSTEM = `You are a warm, patient German writing tutor for an adult English speaker who started with no German at all. The learner is a university professor of English and creative writing who enjoys knowing *why* language works the way it does, but is a complete beginner in German. The learner writes short pieces in German, and you respond with feedback that helps them write a little better next time.

The learning path has these stages:
${SYLLABUS}

How to give feedback:
- Judge the writing against the learner's CURRENT stage, not against fluent German. A correct three-word sentence at stage 2 is a full success.
- Always begin with something specific they did well (the praise field).
- Correct real mistakes, but at most three per entry. Pick the ones that matter most for their current stage, and let small things go unless they change the meaning.
- Each explanation is one or two plain-English sentences a beginner can follow. Name the rule ("the verb goes second") rather than using heavy grammar terms; if you use a term like "accusative", say what it means in a few words.
- If they wrote English words or left a gap for a word they didn't know, give them the German word in a correction.
- "corrected" is their whole text rewritten as correct German, staying as close to their words and ideas as possible. Do not make it fancier than their stage.
- "tip" is ONE short idea to try next time that nudges them slightly beyond what they wrote, within or just past their stage.
- "new_words" are 2 to 4 useful words that fit what they were writing about, at their level. Write nouns with their article (der Tisch), and verbs in the infinitive (schreiben).
- "words_used" lists the meaningful German words they actually used (in their dictionary form, nouns with article), with English meanings. Skip names and numbers.
- "next_prompt" is a short, concrete writing prompt in English for their next entry, building on this one.
- "ready_for_next_stage" is true only if this entry shows they are comfortably doing the current stage's goal with few or no mistakes.
- Write all explanations in English. Keep German examples short.
- If the text is not German at all, gently encourage them to try, give them two or three German words to start with, and set verdict to "needs_work".`;

const PLAN_SYSTEM = `You are a German writing coach for an adult English speaker who started with no German. You look over the learner's recent writing and plan their next small steps. Be encouraging and concrete. Base everything on the evidence in their entries. Keep each field short.

The learning path has these stages:
${SYLLABUS}`;

// ---------- Feedback on one piece of writing ----------

const FeedbackSchema = z.object({
  verdict: z.enum(["perfect", "almost", "needs_work"]),
  praise: z.string(),
  corrected: z.string(),
  corrections: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      explanation: z.string(),
    }),
  ),
  tip: z.string(),
  new_words: z.array(z.object({ german: z.string(), english: z.string(), example: z.string() })),
  words_used: z.array(z.object({ german: z.string(), english: z.string() })),
  next_prompt: z.string(),
  ready_for_next_stage: z.boolean(),
});

export type Feedback = z.infer<typeof FeedbackSchema>;

export async function getFeedback(input: {
  text: string;
  stageId: number;
  prompt: string | null;
  knownWords: string[];
}): Promise<{ feedback: Feedback; costUsd: number }> {
  await checkBudget();
  const stage = getStage(input.stageId);

  const userMessage = [
    `Current stage: ${stage.id} (${stage.name}). Goal: ${stage.goal}`,
    input.prompt ? `The learner was responding to this prompt: ${input.prompt}` : "The learner chose their own topic.",
    input.knownWords.length
      ? `Words the learner has already used before: ${input.knownWords.join(", ")}`
      : "This is one of their first entries.",
    "",
    "The learner's writing:",
    input.text,
  ].join("\n");

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // If Claude ever declines a request, the API retries it on a fallback model for us.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: EFFORT, format: betaZodOutputFormat(FeedbackSchema) },
    system: [{ type: "text", text: TUTOR_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMessage }],
  });

  const costUsd = await logUsage("feedback", response.usage);

  if (response.stop_reason === "refusal") {
    throw new Error("Claude could not respond to this entry. Try rewording it.");
  }
  if (!response.parsed_output) {
    throw new Error("Claude's answer did not come back in the expected shape. Please try again.");
  }
  return { feedback: response.parsed_output, costUsd };
}

// ---------- A progress plan from recent writing ----------

const PlanSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  focus: z.array(z.string()),
  weekly_goal: z.string(),
  practice_prompts: z.array(z.string()),
  ready_for_next_stage: z.boolean(),
  stage_advice: z.string(),
});

export type Plan = z.infer<typeof PlanSchema>;

export async function getPlan(input: {
  stageId: number;
  entries: { text: string; verdict: string; tip: string; created_at: string }[];
  wordsUsed: number;
}): Promise<{ plan: Plan; costUsd: number }> {
  await checkBudget();
  const stage = getStage(input.stageId);

  const entriesText = input.entries.length
    ? input.entries
        .map((e, i) => `Entry ${i + 1} (${e.created_at.slice(0, 10)}, ${e.verdict}):\n${e.text}\nTip given: ${e.tip}`)
        .join("\n\n")
    : "No entries yet.";

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: EFFORT, format: betaZodOutputFormat(PlanSchema) },
    system: [{ type: "text", text: PLAN_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          `Current stage: ${stage.id} (${stage.name}). Goal: ${stage.goal}`,
          `Distinct German words used so far: ${input.wordsUsed}`,
          "",
          "Recent entries, newest first:",
          entriesText,
          "",
          "Write a short plan: a two-sentence summary of where the learner is, 2-3 strengths, 2-3 things to focus on, one goal for the coming week, three practice prompts in English for their current stage, whether they are ready for the next stage, and one sentence of advice about the stage.",
        ].join("\n"),
      },
    ],
  });

  const costUsd = await logUsage("plan", response.usage);

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("Claude could not make a plan this time. Please try again.");
  }
  return { plan: response.parsed_output, costUsd };
}
