// POST /api/feedback: the browser sends your German text here.
// This code runs on Vercel's server, asks Claude for feedback, saves everything,
// and sends the feedback back to the page.

import { NextResponse } from "next/server";
import { BudgetExceededError, getFeedback } from "@/lib/claude";
import { addSuggestedWords, getCurrentStage, listVocab, markWordsUsed, saveEntry, setSetting } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json()) as { text?: string; prompt?: string | null };
  const text = (body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Write something first." }, { status: 400 });
  if (text.length > 4000) {
    return NextResponse.json({ error: "That's long! Please keep one entry under 4,000 characters." }, { status: 400 });
  }

  try {
    const stageId = await getCurrentStage();
    const vocab = await listVocab();
    const knownWords = vocab.filter((v) => v.status === "used").slice(0, 80).map((v) => v.german);

    const { feedback, costUsd } = await getFeedback({ text, stageId, prompt: body.prompt ?? null, knownWords });

    const id = await saveEntry({ stage: stageId, prompt: body.prompt ?? null, text, feedback });
    await markWordsUsed(feedback.words_used);
    await addSuggestedWords(feedback.new_words);
    await setSetting("next_prompt", feedback.next_prompt);

    return NextResponse.json({ id, feedback, costUsd });
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error(err);
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
