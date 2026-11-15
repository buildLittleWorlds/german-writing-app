import type { Feedback } from "@/lib/claude";

const VERDICT_LABEL = { perfect: "Perfekt!", almost: "Fast!", needs_work: "Keep going" } as const;

export default function FeedbackView({
  feedback,
  original,
  onWriteAgain,
}: {
  feedback: Feedback;
  original?: string;
  onWriteAgain?: (prompt: string) => void;
}) {
  return (
    <div className="card">
      <div className={`verdict ${feedback.verdict}`}>{VERDICT_LABEL[feedback.verdict]}</div>
      <p>{feedback.praise}</p>

      {original && (
        <>
          <p className="small muted" style={{ marginBottom: 4 }}>You wrote</p>
          <p style={{ marginTop: 0 }} lang="de">{original}</p>
        </>
      )}

      {feedback.verdict !== "perfect" && (
        <>
          <p className="small muted" style={{ marginBottom: 4 }}>Corrected</p>
          <p className="corrected" lang="de">{feedback.corrected}</p>
        </>
      )}

      {feedback.corrections.map((c, i) => (
        <div className="fix" key={i}>
          <span lang="de"><s>{c.original}</s> → <b>{c.corrected}</b></span>
          <div className="small">{c.explanation}</div>
        </div>
      ))}

      <h2>Try next time</h2>
      <p>{feedback.tip}</p>

      {feedback.new_words.length > 0 && (
        <>
          <h2>New words</h2>
          <div className="words">
            {feedback.new_words.map((w) => (
              <div className="word" key={w.german}>
                <div className="de" lang="de">{w.german}</div>
                <div className="small muted">{w.english}</div>
                <div className="small" lang="de"><i>{w.example}</i></div>
              </div>
            ))}
          </div>
        </>
      )}

      {feedback.ready_for_next_stage && (
        <p className="small" style={{ marginTop: 18 }}>
          🌱 This looks solid for your stage. When you feel ready, you can move up on the{" "}
          <a href="/progress">Progress</a> page.
        </p>
      )}

      {onWriteAgain && (
        <div className="row" style={{ marginTop: 18 }}>
          <button onClick={() => onWriteAgain(feedback.next_prompt)}>Write again</button>
          <span className="small muted">Next prompt: {feedback.next_prompt}</span>
        </div>
      )}
    </div>
  );
}
