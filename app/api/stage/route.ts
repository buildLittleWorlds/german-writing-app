// POST /api/stage: move to a different stage of the learning path.

import { NextResponse } from "next/server";
import { STAGES } from "@/lib/stages";
import { setSetting } from "@/lib/db";

export async function POST(request: Request) {
  const { stage } = (await request.json()) as { stage?: number };
  if (!STAGES.some((s) => s.id === stage)) {
    return NextResponse.json({ error: "Unknown stage." }, { status: 400 });
  }
  await setSetting("stage", String(stage));
  await setSetting("next_prompt", ""); // start the new stage with its own starter prompts
  return NextResponse.json({ ok: true });
}
