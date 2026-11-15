// Everything you've written, newest first, with Claude's feedback tucked underneath.

import FeedbackView from "@/components/FeedbackView";
import type { Feedback } from "@/lib/claude";
import { listEntries } from "@/lib/db";
import { getStage } from "@/lib/stages";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const entries = await listEntries(200);
  return (
    <>
      <h1>My writing</h1>
      <p className="muted">{entries.length} {entries.length === 1 ? "entry" : "entries"} so far.</p>
      {entries.length === 0 && <p>Nothing yet. <a href="/">Write your first words.</a></p>}
      {entries.map((e) => {
        const f = e.feedback as Feedback | null;
        return (
          <div className="card" key={e.id}>
            <div className="small muted">
              {new Date(e.created_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              {" · "}Stage {e.stage}: {getStage(e.stage).name}
              {e.prompt ? <> · <i>{e.prompt}</i></> : null}
            </div>
            <p lang="de" style={{ fontSize: 19 }}>{e.text}</p>
            {f && (
              <details>
                <summary className="small">Feedback ({f.verdict.replace("_", " ")})</summary>
                <FeedbackView feedback={f} />
              </details>
            )}
          </div>
        );
      })}
    </>
  );
}
