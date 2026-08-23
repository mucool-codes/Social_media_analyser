# Approach

**Split by runtime.** PDF parsing runs server-side (`pdf-parse` needs Node's fs/WASM)
behind `POST /api/extract`. OCR runs client-side in a Tesseract.js Web Worker: its
~10 MB payload and recognition time can exceed Vercel Hobby's 10s function limit, so it
never touches the server. Both paths return the same `ExtractedDoc` shape, giving the UI
one rendering path regardless of source.

**Formatting is preserved, not reconstructed.** A shared `normalizeText` pass fixes line
endings, ligatures, smart quotes, and de-hyphenation, strips headers/footers repeating
across 3+ pages, and collapses excess whitespace — without reflowing paragraphs or
inferring structure the source didn't have. Deliberately not layout-aware: a
multi-column PDF extracts in content-stream order, one column after another, since
`pdf-parse` has no notion of visual reading order.

**Extraction and analysis are separate endpoints** so the required feature never depends
on the LLM. `POST /api/analyze` takes text, not a file, and degrades on its own: a
missing key, a timeout, a rate limit, or malformed JSON (retried once) all fall back to
rule-based heuristics — reading ease, CTA/hashtag/hook checks — rather than failing.

**With more time:** layout-aware PDF extraction using per-item x/y positions, so
multi-column documents read in visual order instead of stream order.

---
Word count: 197
