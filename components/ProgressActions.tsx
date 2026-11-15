"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProgressActions({ current, lastStage }: { current: number; lastStage: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(label: string, url: string, body?: unknown) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.refresh(); // re-run the server page so it shows the new data
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="row">
      <button disabled={!!busy} onClick={() => call("plan", "/api/plan")}>
        {busy === "plan" ? "Claude is reviewing…" : "Ask Claude for my next steps"}
      </button>
      {current < lastStage && (
        <button className="ghost" disabled={!!busy} onClick={() => call("up", "/api/stage", { stage: current + 1 })}>
          Move up a stage
        </button>
      )}
      {current > 1 && (
        <button className="ghost" disabled={!!busy} onClick={() => call("down", "/api/stage", { stage: current - 1 })}>
          Go back a stage
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
