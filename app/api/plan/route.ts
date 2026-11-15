// POST /api/plan: asks Claude to read your recent entries and suggest next steps.

import { NextResponse } from "next/server";
import { BudgetExceededError, getPlan, type Feedback } from "@/lib/claude";
import { getCurrentStage, listEntries, listVocab, setSetting } from "@/lib/db";

export async function POST() {
  try {
    const stageId = await getCurrentStage();
    const entries = (await listEntries(12)).map((e) => {
      const f = e.feedback as Feedback | null;
      return {
        text: e.text,
        verdict: f?.verdict ?? "unknown",
        tip: f?.tip ?? "",
        created_at: new Date(e.created_at).toISOString(),
      };
    });
    const wordsUsed = (await listVocab()).filter((v) => v.status === "used").length;

    const { plan, costUsd } = await getPlan({ stageId, entries, wordsUsed });
    await setSetting("plan", JSON.stringify({ ...plan, made_at: new Date().toISOString(), stage: stageId }));
    return NextResponse.json({ plan, costUsd });
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    console.error(err);
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
