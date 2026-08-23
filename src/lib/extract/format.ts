const LIGATURES: Record<string, string> = {
  "ﬀ": "ff",
  "ﬁ": "fi",
  "ﬂ": "fl",
  "ﬃ": "ffi",
  "ﬄ": "ffl",
};

const SMART_QUOTES: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
};

const CHAR_REPLACEMENTS: Record<string, string> = { ...LIGATURES, ...SMART_QUOTES };
const CHAR_REPLACEMENT_RE = new RegExp(`[${Object.keys(CHAR_REPLACEMENTS).join("")}]`, "g");

/** Page boundary sentinel. Callers (pdf.ts, ocr.ts) join per-page raw text with this
 * character before calling normalizeText so rule 6 (header/footer stripping) can see
 * page boundaries; a single-page input (no sentinel present) is treated as one page. */
const PAGE_BREAK = "\f";

/**
 * normalizeText(raw) — pure string transform, applied to both the pdf-parse and OCR
 * extraction paths so their output is shaped identically. Rules, applied in this order:
 *
 * 1. Line endings are normalized to "\n" (CRLF/CR -> LF) before anything else runs.
 * 2. Ligatures (ﬁ, ﬂ, ﬀ, ﬃ, ﬄ) and smart quotes (‘’“”) are replaced with their plain
 *    ASCII equivalents.
 * 3. De-hyphenation: a line ending "<lowercase>-" immediately followed by a line
 *    starting with a lowercase letter is joined into one word ("engage-\nment" ->
 *    "engagement"). Deliberately narrow (lowercase on both sides only) so real
 *    hyphenated compounds and line-end punctuation aren't merged by mistake.
 * 4. Header/footer stripping: input is split on the PAGE_BREAK sentinel into "pages".
 *    For each page, the first and last non-blank lines are candidate header/footer
 *    lines. Any exact line (after trim) that recurs as a page's first line in 3+
 *    pages is dropped from every page where it appears; same independently for last
 *    lines. Heuristic, not layout-aware — see caveat below.
 * 5. Runs of 3+ spaces *within* a line are collapsed to one space; leading indentation
 *    (spaces before the first non-space character) is left untouched, which is also
 *    what keeps list markers (•, -, *, "1.", "1)") at the start of a line intact.
 * 6. Trailing whitespace is trimmed from every line.
 * 7. Blank-line runs of 3+ are collapsed to exactly 2 (i.e. never more than one blank
 *    line's worth of visual gap beyond a normal paragraph break).
 *
 * Caveat: rule 4 has no notion of page layout (font size, position) — it only sees
 * concatenated per-page text, so it treats "first/last non-blank line" as a proxy for
 * "header/footer". A one-line page whose sole line matches both a recurring header and
 * a recurring footer is de-duplicated once, not twice.
 */
export function normalizeText(raw: string): string {
  const unified = raw.replace(/\r\n?/g, "\n");
  const withReplacements = unified.replace(CHAR_REPLACEMENT_RE, (ch) => CHAR_REPLACEMENTS[ch] ?? ch);
  const dehyphenated = withReplacements.replace(/([a-z])-\n([a-z])/g, "$1$2");

  const pages = dehyphenated.split(PAGE_BREAK);
  const strippedPages = stripRepeatedHeadersAndFooters(pages);

  // Pad the sentinel onto its own line: callers may join raw pages with a bare "\f"
  // (no surrounding newline), which would otherwise fuse one page's last line with the
  // next page's first line for the line-based rules below.
  const rejoined = strippedPages.join(`\n${PAGE_BREAK}\n`);
  const spaceCollapsed = collapseMidLineSpaceRuns(rejoined);
  const trimmedLines = spaceCollapsed
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n");

  return trimmedLines.replace(/\n{3,}/g, "\n\n\n").replace(new RegExp(`\n{0,2}${PAGE_BREAK}\n{0,2}`, "g"), "\n\n");
}

function stripRepeatedHeadersAndFooters(pages: string[]): string[] {
  if (pages.length < 3) return pages;

  const pageLines = pages.map((page) => page.split("\n"));

  const firstLineIndex = pageLines.map((lines) => lines.findIndex((l) => l.trim().length > 0));
  const lastLineIndex = pageLines.map((lines) => {
    for (let i = lines.length - 1; i >= 0; i--) {
      if ((lines[i] ?? "").trim().length > 0) return i;
    }
    return -1;
  });

  const headerCounts = new Map<string, number>();
  const footerCounts = new Map<string, number>();

  pageLines.forEach((lines, pageIdx) => {
    const fi = firstLineIndex[pageIdx] ?? -1;
    const li = lastLineIndex[pageIdx] ?? -1;
    if (fi >= 0) {
      const key = (lines[fi] ?? "").trim();
      headerCounts.set(key, (headerCounts.get(key) ?? 0) + 1);
    }
    if (li >= 0 && li !== fi) {
      const key = (lines[li] ?? "").trim();
      footerCounts.set(key, (footerCounts.get(key) ?? 0) + 1);
    }
  });

  return pageLines.map((lines, pageIdx) => {
    const fi = firstLineIndex[pageIdx] ?? -1;
    const li = lastLineIndex[pageIdx] ?? -1;
    const out = [...lines];

    if (li >= 0) {
      const key = (out[li] ?? "").trim();
      if ((footerCounts.get(key) ?? 0) >= 3) out[li] = "";
    }
    if (fi >= 0 && fi !== li) {
      const key = (out[fi] ?? "").trim();
      if ((headerCounts.get(key) ?? 0) >= 3) out[fi] = "";
    }

    return out.join("\n");
  });
}

function collapseMidLineSpaceRuns(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const match = line.match(/^(\s*)(\S?.*)$/s);
      if (!match) return line;
      const [, indent, rest] = match;
      return `${indent}${(rest ?? "").replace(/ {3,}/g, " ")}`;
    })
    .join("\n");
}
