# Sample data

Fixtures for manually exercising `/api/extract` (PDFs) and the client-side OCR path
(images). The PDFs here are generated, not scanned from real documents — there's no
PDF-authoring tool available in this environment, so they're built directly as valid
PDF byte streams (see the generator notes below). They're good enough to exercise real
parsing, page structure, and text layout edge cases; they are not meant to look like a
polished real-world post.

## PDFs (present in this folder)

- **clean-text-post.pdf** — a single-column, single-page PDF with normal paragraphs.
  The baseline "this should just work" case: extraction should return clean, readable
  text with nothing to work around.

- **multi-column-newsletter.pdf** — a single page with two side-by-side columns
  (drawn as two separate text blocks in the same content stream). This deliberately
  demonstrates a real, honest limitation: `pdf-parse` (and pdf.js underneath it) is not
  layout-aware — it extracts text in content-stream order, not visual left-to-right
  reading order. Opening this file shows the left column's text in full, then the right
  column's, rather than an interleaved reading order. If true column-aware reordering is
  ever wanted, it needs to be a deliberate follow-up (analyzing per-item x/y positions
  from pdf-parse's lower-level output), not something the current `extractFromPdf`
  attempts.

- **bulleted-list-checklist.pdf** — a single-page PDF mixing a dash-bulleted list and a
  numbered list. Exercises `normalizeText`'s list-marker-preservation rule end-to-end
  against a real extracted PDF, not just a hand-written string in a unit test.

None of the three above are encrypted, and none exceed `MAX_PDF_PAGES`
([src/lib/config.ts](../src/lib/config.ts)) — those two rejection paths are covered in
[tests/extract/pdf.test.ts](../tests/extract/pdf.test.ts) against fixtures built at test
time (a generated over-the-limit PDF, and a mocked `PasswordException` for the encrypted
case — a real encrypted PDF requires the actual PDF encryption key-derivation algorithm,
which isn't reproducible without a PDF-writing library).

## Images (need to be sourced manually)

Not included — synthesizing a convincing scanned/photographed image from scratch would
need real font rasterization (a canvas/image library), which isn't installed here and is
outside this session's approved dependencies (pdf-parse, tesseract.js only). Two files
are needed to exercise `extractFromImage` end-to-end:

- **scanned-post.png** (or .jpg) — a clear, well-lit photo or scan of a printed page or
  social post (a screenshot of real printed/handwritten text works too). Used to verify
  the OCR happy path: reasonable confidence, no low-confidence warning.
- **blurry-scan.jpg** — the same kind of source, shot slightly out of focus or at an
  angle, or a low-resolution phone photo. Used to verify the low-confidence path:
  `meta.meanConfidence` below 60 and the "Low-confidence scan" warning actually firing.

Any phone photo of a printed page works for either — the only real requirement is that
the second one is visibly lower quality than the first.
