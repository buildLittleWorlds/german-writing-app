// The writing page. This part runs on the server: it looks up your stage and
// a prompt, then hands them to the <Writer> component, which runs in the browser.

import Writer from "@/components/Writer";
import { getCurrentStage, getSetting } from "@/lib/db";
import { getStage } from "@/lib/stages";

export const dynamic = "force-dynamic"; // always read fresh data from the database

export default async function WritePage() {
  const stage = getStage(await getCurrentStage());
  const nextPrompt = (await getSetting("next_prompt")) || null;
  return <Writer stage={stage} suggestedPrompt={nextPrompt} />;
}
