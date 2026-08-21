# CLAUDE.md

Commit this to the repository root **in Session 0**. Claude Code reads it automatically at the start of every session, so the per-session prompts can stay short.

---

## Project

**Social Media Content Analyzer** — a web app that accepts a PDF or an image of a social media post, extracts the text (PDF parsing or OCR), and suggests engagement improvements.

This is a timeboxed technical assessment. Total budget across all sessions is **8 hours**. Graded on: problem-solving approach, code quality, working functionality, documentation. Optimise for a small, obviously well-engineered app. Do not add features nobody asked for.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind CSS · react-dropzone · pdf-parse (server) · Tesseract.js (browser) · Gemini free tier (LLM) · Vitest · Vercel.

## Architecture

- **PDF → server.** `POST /api/extract`, Node runtime, `pdf-parse`.
- **Images → browser.** Tesseract.js in a Web Worker. Never on the server — the worker payload is ~10 MB and will blow the serverless function's timeout and size limits.
- **Analysis is a separate endpoint.** `POST /api/analyze` takes text, not a file. Extraction must keep working when the LLM key is missing or the provider is down.
- Both extraction paths return the same `ExtractedDoc` shape, so the UI has one code path.

## Non-negotiable rules

1. **Stay in your lane.** Your prompt lists the files you own. If you need to change a file outside that list, **stop and report it** instead of editing — other sessions are working in this repo at the same time.
2. **`src/lib/types.ts` is frozen.** It is the contract between sessions. Never edit it. If it's genuinely wrong, stop and report.
3. **No `any` in exported signatures.** No `@ts-ignore`. No `console.log` in committed code — use the logger in `src/lib/http.ts`.
4. **Every failure path returns `ApiError`.** No raw exceptions or stack traces reach the client. Log the detail server-side, return a message a non-technical user can act on. Every route returns `ApiResponse<T>` built with `ok()` / `fail()` from `src/lib/http.ts` — never a raw `NextResponse.json`.
5. **Every async operation has a loading state.** The UI must never look frozen. Long operations (OCR) report real progress, not a fake spinner.
6. **Secrets are server-side only.** `GEMINI_API_KEY` is never referenced in a client component. Every new env var goes into `.env.example` with a comment.
7. **Verify against a production build.** `npm run build` before you claim done. Several of the gotchas below only appear in the production build.
8. **Ask before adding a dependency** that isn't in the stack list above.

## Known gotchas — read before writing code

- **`pdf-parse` breaks the Next.js build.** Its index file reads a bundled test PDF at import time. Import the implementation directly: `import pdf from 'pdf-parse/lib/pdf-parse.js'`. Add `export const runtime = 'nodejs'` to any route that touches it — it will not run on the Edge runtime.
- **Tesseract.js paths.** Pin `workerPath`, `corePath` and `langPath` explicitly to a CDN. Default resolution 404s once deployed. Terminate the worker in a `finally` block or it leaks across uploads.
- **Vercel Hobby caps request bodies at 4.5 MB.** We enforce 4 MB client-side, before the request is made, with a clear message.
- **Vercel Hobby caps function duration at 10 s.** Server-side extraction must comfortably finish inside that.
- **File type sniffing.** Never trust `file.type` or the extension alone — check the magic bytes (`%PDF`, PNG/JPEG signatures) server-side.
- **LLMs return prose around JSON.** Always strip code fences, parse with Zod, retry once, then fall back to heuristics. Never let a malformed response crash a request.

## Escalation — ask, don't guess

There is an **architect** on this project: a separate Claude chat holding the full execution plan, the contracts, and the state of all six sessions. You cannot talk to it directly. The human relays messages between you.

This exists because six developers working in parallel from one frozen contract will produce ambiguities, and a session that quietly guesses creates a conflict nobody discovers until integration. Asking costs two minutes. Guessing wrong costs an hour of Session 4's budget.

### Decide it yourself (and note it in your final summary)

Anything reversible and entirely inside the files you own: internal function structure, variable and helper naming, how you organise your tests, error message wording, which of two equivalent implementations to use, minor styling within the design system.

### Emit a question block

- The contract in `src/lib/types.ts` looks wrong, incomplete, or ambiguous for your use case
- You need to change a file outside your ownership list
- You want to add a dependency that isn't in the stack list
- The assignment brief is ambiguous and the answer changes what you build
- Another session's merged code contradicts what you were told to expect
- A gotcha in this file turns out to be wrong or insufficient
- You're about to do something that takes more than ~20 minutes and you're not certain it's wanted
- You're about to cut scope to stay inside your time budget

### Question block format — use exactly this

```
=== QUESTION [S1-Q1] ===
SESSION:    S1 Extraction
BLOCKING:   yes | no
FILE:       src/lib/extract/pdf.ts
CONTEXT:    Two or three lines. What you were doing, what you hit.
QUESTION:   One sentence, answerable.
OPTIONS:
  A) ... — trade-off in one line
  B) ... — trade-off in one line
RECOMMEND:  A, because ...
MEANWHILE:  What you'll do while you wait. If BLOCKING is no, say which option you're
            proceeding with so the answer can confirm or reverse it.
=== END QUESTION ===
```

Number questions sequentially within your session: `S1-Q1`, `S1-Q2`. Always include OPTIONS and RECOMMEND — an open-ended "what should I do?" wastes a relay round trip. Always include MEANWHILE — you must never sit idle waiting for an answer.

### Rules

1. **Blocking questions:** emit immediately, then continue with any unblocked part of your task.
2. **Non-blocking questions:** proceed with your recommended option, mark the code `// TODO(architect): S1-Q2`, and batch the question into your end-of-session summary.
3. **Never end a session with an unasked question.** If something felt uncertain and you resolved it by guessing, it goes in the summary as a question.
4. **Never widen your file scope to work around a blocker.** Ask instead.
5. The answer arrives pasted back to you as a `=== DECISION [S1-Q1] ===` block. Apply it as written. If you disagree, say so once, with reasoning, and then follow it.

## Commands


```bash
npm install --legacy-peer-deps   # plain npm install crashes on npm@10.9.2 in this repo
npm run dev
npm run build        # must pass before you finish
npm run typecheck
npm run lint
npm test
```

## Definition of done for any session

Typecheck, lint, tests and production build all pass · commits are small and use Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`) · branch pushed · you have printed a summary of what you changed, what you deliberately left out, and anything the next session needs to know. **Do not merge to `main`** — the human reviews and merges.
