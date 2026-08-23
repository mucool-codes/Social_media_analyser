import { describe, expect, it } from "vitest";
import { normalizeText } from "@/lib/extract/format";

describe("normalizeText", () => {
  it("normalizes CRLF and lone CR line endings to LF", () => {
    expect(normalizeText("line one\r\nline two\rline three")).toBe("line one\nline two\nline three");
  });

  it("preserves paragraph breaks (blank line) and single newlines within a paragraph", () => {
    const raw = "First line of para one.\nSecond line of para one.\n\nPara two starts here.";
    expect(normalizeText(raw)).toBe(
      "First line of para one.\nSecond line of para one.\n\nPara two starts here.",
    );
  });

  it("collapses runs of 3+ spaces mid-line but keeps leading indentation", () => {
    const raw = "    Indented line   with   extra   spaces";
    expect(normalizeText(raw)).toBe("    Indented line with extra spaces");
  });

  it("keeps list markers at line start: bullet, dash, asterisk, numbered", () => {
    const raw = "• First item\n- Second item\n* Third item\n1. Fourth item\n2) Fifth item";
    expect(normalizeText(raw)).toBe(
      "• First item\n- Second item\n* Third item\n1. Fourth item\n2) Fifth item",
    );
  });

  it("de-hyphenates words split across a line wrap", () => {
    expect(normalizeText("greater engage-\nment with the audience")).toBe(
      "greater engagement with the audience",
    );
  });

  it("does not de-hyphenate a genuine end-of-line compound followed by a capital", () => {
    // Deliberately narrow rule: only lowercase-to-lowercase wraps are joined.
    expect(normalizeText("See the well-\nKnown example")).toBe("See the well-\nKnown example");
  });

  it("normalizes fi/fl/ff ligatures", () => {
    expect(normalizeText("ﬁle ﬂow ﬀ ﬃ ﬄ")).toBe("file flow ff ffi ffl");
  });

  it("normalizes smart quotes to straight quotes", () => {
    expect(normalizeText("“Great post,” she said. It’s ‘amazing’.")).toBe(
      '"Great post," she said. It\'s \'amazing\'.',
    );
  });

  it("drops headers/footers that repeat identically on 3+ pages", () => {
    const pages = [
      "COMPANY CONFIDENTIAL\nPage one body text.\nPage 1",
      "COMPANY CONFIDENTIAL\nPage two body text.\nPage 2",
      "COMPANY CONFIDENTIAL\nPage three body text.\nPage 3",
    ];
    const result = normalizeText(pages.join("\f"));
    expect(result).not.toContain("COMPANY CONFIDENTIAL");
    expect(result).toContain("Page one body text.");
    expect(result).toContain("Page two body text.");
    expect(result).toContain("Page three body text.");
  });

  it("keeps a header/footer-like line when it does not repeat on 3+ pages", () => {
    const pages = ["INTRO\nFirst page body.", "Second page body.\nOUTRO"];
    const result = normalizeText(pages.join("\f"));
    expect(result).toContain("INTRO");
    expect(result).toContain("OUTRO");
  });

  it("trims trailing whitespace per line", () => {
    expect(normalizeText("line with trailing spaces   \nclean line")).toBe(
      "line with trailing spaces\nclean line",
    );
  });

  it("never leaves more than 2 consecutive blank lines", () => {
    const raw = "First paragraph.\n\n\n\n\nSecond paragraph.";
    const result = normalizeText(raw);
    expect(result).toBe("First paragraph.\n\n\nSecond paragraph.");
    expect(result).not.toMatch(/\n{4,}/);
  });

  it("returns single-page input unchanged when no rule applies", () => {
    expect(normalizeText("Just a plain sentence.")).toBe("Just a plain sentence.");
  });
});
