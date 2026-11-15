"use client";
// "use client" means this component runs in your browser, so it can react to
// typing and clicks. It never talks to Claude directly; it calls /api/feedback.

import { useRef, useState } from "react";
import type { Stage } from "@/lib/stages";
import type { Feedback } from "@/lib/claude";
import FeedbackView from "./FeedbackView";

const SPECIAL_KEYS = ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"];

export default function Writer({ stage, suggestedPrompt }: { stage: Stage; suggestedPrompt: string | null }) {
  const [extraPrompt, setExtraPrompt] = useState(suggestedPrompt);
  const prompts = extraPrompt ? [extraPrompt, ...stage.starterPrompts] : stage.starterPrompts;
  const [promptIndex, setPromptIndex] = useState(0);
  const [usePrompt, setUsePrompt] = useState(true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [lastText, setLastText] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);

  const prompt = usePrompt ? prompts[promptIndex % prompts.length] : null;

  function insert(ch: string) {
    const el = box.current;
    if (!el) return setText((t) => t + ch);
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = text.slice(0, start) + ch + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ch.length, start + ch.length);
    });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setFeedback(data.feedback);
      setLastText(text);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function writeAgain(nextPrompt: string) {
    setFeedback(null);
    setUsePrompt(true);
    setExtraPrompt(nextPrompt);
    setPromptIndex(0);
    box.current?.focus();
  }

  return (
    <>
      <span className="stage-pill">Stage {stage.id}: {stage.name}</span>
      <h1>Schreib etwas!</h1>
      <p className="muted">{stage.goal} <br />For example: <i>{stage.example}</i></p>

      {feedback ? (
        <FeedbackView feedback={feedback} original={lastText} onWriteAgain={writeAgain} />
      ) : (
        <div className="card">
          {usePrompt ? (
            <p>
              <b>Prompt:</b> {prompt}{" "}
              <span className="small">
                <a href="#" onClick={(e) => { e.preventDefault(); setPromptIndex((i) => i + 1); }}>another</a>
                {" · "}
                <a href="#" onClick={(e) => { e.preventDefault(); setUsePrompt(false); }}>my own topic</a>
              </span>
            </p>
          ) : (
            <p className="small">
              Writing on your own topic.{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setUsePrompt(true); }}>Show a prompt</a>
            </p>
          )}

          <textarea
            ref={box}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Der Hund ..."
            lang="de"
            spellCheck={false}
            autoCapitalize="sentences"
          />

          <div className="row keys" style={{ margin: "8px 0 14px" }}>
            {SPECIAL_KEYS.map((k) => (
              <button key={k} type="button" className="ghost" onClick={() => insert(k)}>{k}</button>
            ))}
          </div>

          <div className="row">
            <button onClick={submit} disabled={busy || !text.trim()}>
              {busy ? "Claude is reading…" : "Get feedback"}
            </button>
            <span className="small muted">Your writing and the feedback are saved automatically.</span>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      )}
    </>
  );
}
