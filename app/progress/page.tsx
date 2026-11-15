// Where you are on the learning path, Claude's latest plan, your words, and spending.

import ProgressActions from "@/components/ProgressActions";
import type { Plan } from "@/lib/claude";
import { countEntriesByStage, getCurrentStage, getSetting, listVocab, spendThisMonth } from "@/lib/db";
import { STAGES } from "@/lib/stages";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const current = await getCurrentStage();
  const counts = await countEntriesByStage();
  const vocab = await listVocab();
  const used = vocab.filter((v) => v.status === "used");
  const suggested = vocab.filter((v) => v.status === "suggested");
  const planRaw = await getSetting("plan");
  const plan = planRaw ? (JSON.parse(planRaw) as Plan & { made_at: string; stage: number }) : null;
  const spend = await spendThisMonth();
  const budget = Number(process.env.MONTHLY_BUDGET_USD ?? "30");

  return (
    <>
      <h1>Progress</h1>

      <h2>Learning path</h2>
      <ol className="stages">
        {STAGES.map((s) => (
          <li key={s.id} className={s.id === current ? "current" : s.id < current ? "done" : ""}>
            {s.name} <span className="small muted">({counts[s.id] ?? 0} entries)</span>
            {s.id === current && <div className="small" style={{ fontWeight: 400 }}>{s.goal}</div>}
          </li>
        ))}
      </ol>

      <ProgressActions current={current} lastStage={STAGES.length} />

      <h2>My plan</h2>
      {plan ? (
        <div className="card">
          <p className="small muted">
            Made {new Date(plan.made_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at stage {plan.stage}
          </p>
          <p>{plan.summary}</p>
          <p><b>This week:</b> {plan.weekly_goal}</p>
          <p><b>Going well:</b></p>
          <ul>{plan.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <p><b>Focus on:</b></p>
          <ul>{plan.focus.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <p><b>Practice prompts:</b></p>
          <ul>{plan.practice_prompts.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <p className="small">{plan.ready_for_next_stage ? "🌱 " : ""}{plan.stage_advice}</p>
        </div>
      ) : (
        <p className="muted">No plan yet. Write a few entries, then ask Claude for one.</p>
      )}

      <h2>My words ({used.length})</h2>
      {used.length ? (
        <div className="words">
          {used.map((w) => (
            <div className="word" key={w.german}>
              <span className="de" lang="de">{w.german}</span> <span className="small muted">{w.english} · ×{w.times_used}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Words you use will collect here.</p>
      )}

      {suggested.length > 0 && (
        <>
          <h2>Words to try ({suggested.length})</h2>
          <div className="words">
            {suggested.map((w) => (
              <div className="word" key={w.german}>
                <span className="de" lang="de">{w.german}</span> <span className="small muted">{w.english}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Claude spending this month</h2>
      <p className="small">
        ${spend.usd.toFixed(2)} of your ${budget} limit, across {spend.calls} requests.
      </p>
    </>
  );
}
