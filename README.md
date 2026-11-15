# Schreibstube: a German writing app

A personal place to learn German by writing. You start with single words, move to tiny sentences, and grow into little stories. Claude reads each entry and responds like a patient tutor: what went well, up to three corrections with plain-English reasons, one thing to try next time, and a few new words. Everything is saved, and a Progress page tracks your stage, your vocabulary, Claude's plan for you, and how much you've spent.

## How the app is put together

```
Browser (your phone or laptop)
   │  pages: Write, My writing, Progress
   ▼
Vercel (runs the Next.js app)
   ├── proxy.ts            checks your login cookie on every request
   ├── app/api/*           small server functions the pages call
   │      └── lib/claude.ts   talks to Claude  ──►  Anthropic API
   └── lib/db.ts           saves and reads data ──►  Neon Postgres
```

The key idea: **the browser never talks to Claude.** It talks to our own `/api/...` routes, which run on Vercel's servers where the API key is stored. If the key were in browser code, anyone could open the page source and copy it.

### A tour of the files

| File | What it does |
|---|---|
| `lib/stages.ts` | The syllabus: nine stages from "Single words" to "Little stories", each with a goal, an example, and starter prompts. Edit freely. |
| `lib/claude.ts` | The tutor's instructions (the system prompt), the shape of the feedback Claude must return, the model choice, and cost tracking. |
| `lib/db.ts` | Every database query, as plain SQL. Tables are created automatically on first run. |
| `lib/auth.ts`, `proxy.ts`, `app/login/` | The one-passphrase lock. |
| `app/page.tsx` + `components/Writer.tsx` | The writing page. The first runs on the server and looks up your stage; the second runs in the browser and handles typing and the ä ö ü ß buttons. |
| `components/FeedbackView.tsx` | How feedback is displayed (used on the Write and My writing pages). |
| `app/history/page.tsx` | Everything you've written, newest first. |
| `app/progress/page.tsx` + `components/ProgressActions.tsx` | Learning path, Claude's plan, your words, and spending. |
| `app/api/feedback/route.ts` | Receives your text, asks Claude, saves the entry and vocabulary. |
| `app/api/plan/route.ts` | Sends Claude your recent entries and saves the plan it writes. |
| `app/api/stage/route.ts` | Moves you up or down a stage. |

### How Claude is used, and why it stays cheap

- **Model:** Claude Opus 5.5 at `effort: "low"` (set at the top of `lib/claude.ts`). Low effort means less behind-the-scenes thinking, which keeps each answer fast and around 2 to 4 cents.
- **Structured output:** Claude must answer in a fixed JSON shape (verdict, corrections, tip, new words...). That's what lets the app save vocabulary and display feedback neatly instead of parsing free text. The shape is the `FeedbackSchema` in `lib/claude.ts`.
- **Prompt caching:** the tutor instructions are identical on every request, so they're marked for caching. Within a few minutes of a previous request, Claude re-reads them at about 5% of the normal price.
- **A monthly cap:** before every call, the app adds up this month's spending from the `api_calls` table. Once it reaches `MONTHLY_BUDGET_USD`, it stops calling Claude and tells you why.
- **Fallbacks:** if Claude's safety filters ever decline a request (unlikely for German homework), the API automatically retries on another model rather than failing.

## Deploying it (one time, about 15 minutes)

You need three accounts: GitHub (you have it), Anthropic Console, and Vercel.

1. **Get an API key.** At [console.anthropic.com](https://console.anthropic.com), go to **API Keys → Create Key**. Copy it somewhere safe for a minute. While you're there, set a monthly spend limit under **Settings → Limits** as a backstop.
2. **Import the project into Vercel.** At [vercel.com](https://vercel.com), choose **Add New → Project**, pick `german-writing-app` from your GitHub, and click **Deploy**. The first deploy will build fine but the site won't work yet, because it has no database or keys.
3. **Add the database.** In your Vercel project, open **Storage → Create Database → Neon**, accept the free plan, and connect it to this project. Vercel adds `DATABASE_URL` for you.
4. **Add your secrets.** In **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY`: the key from step 1
   - `APP_PASSWORD`: a passphrase you'll type to get in
   - `MONTHLY_BUDGET_USD`: for example `30`
5. **Redeploy.** In **Deployments**, open the menu on the latest one and choose **Redeploy**. Environment variables only take effect on a new deploy.
6. Open your `....vercel.app` URL on any device, enter your passphrase, and write your first word.

From then on, every change merged into `main` on GitHub deploys automatically.

## Running it on your own computer (optional)

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # opens at http://localhost:3000
```

You can reuse the same Neon `DATABASE_URL` locally (copy it from Vercel's Environment Variables page), though then your local experiments and your real writing share one database.

## Ideas for later

- Listen to your sentences read aloud, or record yourself speaking them.
- A flashcard review of "Words to try".
- Let Claude adapt the stage list itself as you go.
- Export your writing as a little book at the end of each month.
