# Architecture

## Request lifecycle

### PDF path

```
Dropzone (client)
  -> validateFileMeta()                          client-side pre-check: name, size, MIME
  -> POST /api/extract  (multipart/form-data)     Node runtime
       -> validateFileMeta()   again, server can't trust the client
       -> sniffMimeFromBytes() magic-byte check (%PDF-...), not file.type
       -> extractFromPdf()     pdf-parse (PDFParse class) reads page count, text per page
            - rejects >20 pages (MAX_PDF_PAGES) before parsing text
            - rejects password-protected PDFs (PasswordException)
            - rejects near-empty extracted text (< 20 chars) as "probably scanned"
       -> normalizeText()      shared formatting pass, see below
  <- ApiResponse<ExtractedDoc>
useAnalyzer reducer: extracting -> extracted -> analyzing (auto-chained)
  -> POST /api/analyze  (JSON { text })
  <- ApiResponse<AnalysisResult>
useAnalyzer reducer: analyzing -> done
```

### Image path

```
Dropzone (client)
  -> validateFileMeta()
  -> extractFromImage()  runs entirely in the browser, no server round trip
       -> tesseract.js createWorker()  worker/core/lang assets pinned to a CDN
            (see Known gotchas in CLAUDE.md — default resolution 404s once deployed)
       -> worker.recognize(file)       reports progress via onProgress callback,
                                        driving useAnalyzer's EXTRACTION_PROGRESS state
       -> confidence < 60 -> warnings: ["Low-confidence scan..."]
       -> normalizeText()              same shared pass as the PDF path
       -> worker.terminate()           in a finally block, so a failed recognize()
                                        still releases the worker
useAnalyzer reducer: extracting -> extracted -> analyzing (auto-chained)
  -> POST /api/analyze  (JSON { text })   identical to the PDF path from here
```

Both paths converge on the same `ExtractedDoc` shape before analysis, so
`AnalyzerApp`/`useAnalyzer` never branch on extraction method past that point — the
`ExtractionMethod` field on the doc only affects which metadata fields are populated
(`meanConfidence` for OCR) and copy in the UI.

### Analysis (`POST /api/analyze`)

```
body: { text: string }
  -> in-memory per-IP rate limit (10 req / 60s, keyed on x-forwarded-for)
  -> computeMetrics(text)        word/char/hashtag/mention/emoji/link counts, reading ease
  -> getGeminiApiKey()
       absent -> fallbackResult() immediately, model: "heuristic-fallback"
       present -> callGemini()   12s timeout, JSON response mode
            network/timeout/HTTP error -> fallbackResult()
            200 but body doesn't parse as the expected schema (Zod) -> retry once with
              a terser prompt -> still fails -> fallbackResult()
            parses -> mergeSuggestions(): pads under-3 LLM suggestions with
              non-duplicate heuristic ones, caps at 6, model: "gemini-3.6-flash"
  <- ApiResponse<AnalysisResult>
```

The heuristic fallback (`src/lib/analyze/heuristics.ts`) is not a degraded stub — it's a
full rule-based suggestion engine (CTA presence, hashtag count, weak-hook detection,
all-caps, length, missing line breaks, link-without-context) that runs standalone when
Gemini is unset, times out, rate-limits, or returns malformed JSON twice, and also backs
`mergeSuggestions` when the LLM returns too few suggestions. Every request through
`/api/analyze` is guaranteed a usable result regardless of LLM availability.

## Contracts (`src/lib/types.ts`)

Frozen for the duration of the project — the contract every session's route/component
code was written against.

- **`ExtractedDoc`** — `{ meta, text, pages[], method, warnings[] }`. `meta` carries
  `fileName/fileType/sizeBytes/pageCount/durationMs` plus an optional `meanConfidence`
  (OCR only). Each `ExtractedPage` carries an optional per-page `confidence` (OCR only).
  `method` is `"pdf-parse" | "ocr"` — the one field the UI uses to know which metadata to
  show, not to branch extraction logic (that already happened server/client-side).
- **`AnalysisResult`** — `{ summary, metrics, suggestions[], model }`. `model` is a
  free-text label; the UI special-cases exactly the string `"heuristic-fallback"` for
  badge styling, everything else (e.g. `"gemini-3.6-flash"`) prints as-is. `metrics` is
  the same `AnalysisMetrics` shape whether or not the LLM ran, since `computeMetrics` is
  always the local, non-LLM code path.
- **`ApiResponse<T>`** — the discriminated union every route returns:
  `{ ok: true; data: T } | { ok: false; error: ApiError }`. Built exclusively through
  `ok()`/`fail()` in `src/lib/http.ts` — no route constructs a raw `NextResponse.json`.

## Error taxonomy

Every failure, client or server, resolves to one `ApiErrorCode` (`src/lib/types.ts`),
mapped to an HTTP status in `ERROR_STATUS` (`src/lib/http.ts`) and to user-facing copy +
a recovery action in `getErrorPresentation` (`src/lib/client/errorPresentation.ts`):

| Code | HTTP | Recovery action |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Try another file |
| `UNSUPPORTED_FILE_TYPE` | 415 | Try another file |
| `FILE_TOO_LARGE` | 413 | Try another file |
| `TOO_MANY_PAGES` | 413 | Try another file |
| `EMPTY_FILE` | 400 | Try another file |
| `EXTRACTION_FAILED` | 422 | Try another file |
| `PARSE_FAILED` | 422 | Try another file |
| `NO_TEXT_FOUND` | 422 | Try another file |
| `ANALYSIS_FAILED` | 422 | Retry analysis |
| `RATE_LIMITED` | 429 | Retry analysis |
| `NOT_IMPLEMENTED` | 501 | Dismiss |
| `INTERNAL` | 500 | Try another file |

`withErrorHandling` (`src/lib/http.ts`) wraps every route handler so any unhandled throw
becomes `INTERNAL` with a logged request id — no stack trace or raw exception message
ever reaches the client. Server-side extraction/analysis code that wants a *specific*
code throws a typed error (`ExtractionError`, carrying an `ApiErrorCode`) that the route
catches and maps via `fail()`, instead of letting it fall through to the generic
`INTERNAL` handler. `useAnalyzer`'s reducer stores both the `ApiError` and which phase
(`validation | extraction | analysis`) it happened in, since an analysis failure (text
already extracted) recovers differently from an extraction failure (start over).

## Why the file-ownership split existed

Six sessions worked from this one frozen `types.ts` contract in parallel: extraction
(server PDF + client OCR), analysis (LLM + heuristics), frontend/UI, hardening, and
docs. Each session owned a disjoint file list so two sessions could never edit the same
file at the same time without either side knowing. The contract types were frozen so
that a session downstream of another (e.g. frontend, which depends on both `ExtractedDoc`
and `AnalysisResult`) could build against a shape that wouldn't move underneath it. Any
session that needed to touch a file outside its list, or found the contract wrong, was
required to stop and escalate rather than guess — the CLAUDE.md "Escalation" section —
so that ambiguities surfaced as a question before they became a merge conflict or a
silent shape mismatch nobody noticed until integration.
