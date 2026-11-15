"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) window.location.href = "/";
    else setError((await res.json()).error ?? "Could not log in.");
  }

  return (
    <form onSubmit={submit} className="card" style={{ maxWidth: 420 }}>
      <h1>Willkommen!</h1>
      <p className="muted">Enter your passphrase to open your writing room.</p>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      <div style={{ marginTop: 12 }}>
        <button type="submit" disabled={!password}>Open</button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
