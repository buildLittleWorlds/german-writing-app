// A deliberately simple lock for a one-person app.
// When you log in with APP_PASSWORD, the browser gets a cookie holding a
// fingerprint (SHA-256 hash) of the password. Every request checks that cookie.
// Changing APP_PASSWORD in Vercel logs out every device.

export const SESSION_COOKIE = "gwa_session";

export async function sessionToken(): Promise<string> {
  const password = process.env.APP_PASSWORD;
  if (!password) throw new Error("APP_PASSWORD is not set. See .env.example.");
  const data = new TextEncoder().encode(`german-writing-app:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
