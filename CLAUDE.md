# Notes for Claude

- The owner is learning to build and deploy apps with this project. Explain changes and the reasons behind them in plain language, not just the diff.
- Stack: Next.js 16 App Router (TypeScript), hosted on Vercel, Neon Postgres via `@neondatabase/serverless` with plain SQL in `lib/db.ts`, Anthropic SDK in `lib/claude.ts`. Next 16 uses `proxy.ts` (formerly `middleware.ts`).
- All Claude calls stay server-side in `lib/claude.ts`. Keep the system prompts byte-stable so prompt caching works; put anything that varies in the user message.
- Every Claude call must go through `checkBudget()` and `logUsage()` so the monthly cap and spending page stay accurate.
- Schema changes: add `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements to `ensureSchema()`; there is no migration tool.
- Check work with `npm run typecheck` and `npm run build`.
