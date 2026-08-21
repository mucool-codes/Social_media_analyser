import type { AnalysisMetrics, Suggestion } from "@/lib/types";

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;
const MENTION_RE = /@[\p{L}\p{N}_]+/gu;
const LINK_RE = /\b(?:https?:\/\/|www\.)\S+/gi;

/**
 * A naive /\p{Extended_Pictographic}/gu counts each code point, so a ZWJ family
 * emoji (multiple people joined by U+200D) or a flag (two regional-indicator code
 * points) inflates the count. Segmenting into grapheme clusters first counts each
 * rendered emoji once, matching what a user perceives as "one emoji".
 */
function countEmoji(text: string): number {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  let count = 0;
  for (const { segment } of segmenter.segment(text)) {
    // Extended_Pictographic covers most emoji, but flags are pairs of
    // Regional_Indicator code points, a separate Unicode property.
    if (/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(segment)) count++;
  }
  return count;
}

function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned.length === 0) return 0;
  const groups = cleaned.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 1;
  if (cleaned.endsWith("e") && !cleaned.endsWith("le") && count > 1) count--;
  return Math.max(1, count);
}

function fleschReadingEase(words: string[]): number {
  if (words.length === 0) return 0;
  const text = words.join(" ");
  const sentenceMatches = text.match(/[^.!?]+[.!?]*/g);
  const sentenceCount = Math.max(1, sentenceMatches ? sentenceMatches.filter((s) => s.trim()).length : 1);
  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const score =
    206.835 - 1.015 * (words.length / sentenceCount) - 84.6 * (syllableCount / words.length);

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function computeMetrics(text: string): AnalysisMetrics {
  const words = text.trim().length === 0 ? [] : text.trim().split(/\s+/);

  return {
    wordCount: words.length,
    charCount: text.length,
    hashtagCount: text.match(HASHTAG_RE)?.length ?? 0,
    mentionCount: text.match(MENTION_RE)?.length ?? 0,
    emojiCount: countEmoji(text),
    linkCount: text.match(LINK_RE)?.length ?? 0,
    readingEase: fleschReadingEase(words),
  };
}

// ---------------------------------------------------------------------------
// Rule-based suggestions
// ---------------------------------------------------------------------------

const CTA_PHRASES = [
  "comment",
  "share",
  "click",
  "link in bio",
  "let us know",
  "let me know",
  "tag someone",
  "tag a friend",
  "follow",
  "subscribe",
  "dm us",
  "dm me",
  "swipe up",
  "sign up",
  "join",
  "learn more",
  "check out",
  "shop now",
  "download",
  "register",
  "rsvp",
  "vote",
  "reply",
  "save this",
  "drop a",
  "double tap",
];

function hasCallToAction(text: string): boolean {
  const lower = text.toLowerCase();
  if (CTA_PHRASES.some((phrase) => lower.includes(phrase))) return true;
  return /\?\s*$/.test(text.trim());
}

function firstLine(text: string): string {
  const line = text.split("\n")[0]?.trim() ?? "";
  return line.length > 0 ? line : text.trim();
}

function isWeakHook(line: string): boolean {
  if (line.length === 0) return false;
  if (line.length > 90) return true;
  const hasEnergy = /[?!]|\d|\p{Extended_Pictographic}/u.test(line);
  const wordCount = line.split(/\s+/).length;
  return !hasEnergy && wordCount > 12;
}

function isShouting(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 12) return false;
  const upper = letters.filter((ch) => ch === ch.toUpperCase() && ch !== ch.toLowerCase());
  return upper.length / letters.length > 0.6;
}

function linkLacksContext(text: string): boolean {
  const match = text.match(LINK_RE);
  if (!match) return false;
  const index = text.indexOf(match[0]);
  const before = text.slice(0, index).trim();
  const wordsBefore = before.length === 0 ? 0 : before.split(/\s+/).length;
  return wordsBefore < 3;
}

const MAX_CHARS = 280;
const LONG_POST_NO_BREAKS = 200;
const MAX_USEFUL_HASHTAGS = 5;

export function heuristicSuggestions(text: string, metrics: AnalysisMetrics): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const trimmed = text.trim();

  if (!hasCallToAction(trimmed)) {
    suggestions.push({
      id: "h-cta",
      category: "cta",
      severity: "high",
      title: "Add a clear call-to-action",
      detail:
        "There's nothing telling readers what to do next. Posts that ask explicitly for a comment, share, or click get more replies. Try ending with a direct question or an instruction like \"Drop your take below.\"",
      example: `${trimmed.split("\n")[0] ?? trimmed} What's your experience with this? Tell us below.`,
    });
  }

  if (metrics.hashtagCount === 0) {
    suggestions.push({
      id: "h-hashtags-missing",
      category: "hashtags",
      severity: "medium",
      title: "Add a few relevant hashtags",
      detail:
        "This post has no hashtags, so it's only discoverable to people who already follow you. Add 2-5 hashtags that describe the topic or niche to reach new readers browsing those tags.",
    });
  } else if (metrics.hashtagCount > MAX_USEFUL_HASHTAGS) {
    suggestions.push({
      id: "h-hashtags-excess",
      category: "hashtags",
      severity: "medium",
      title: "Trim the hashtag list",
      detail: `You're using ${metrics.hashtagCount} hashtags. Beyond about ${MAX_USEFUL_HASHTAGS}, most platforms' algorithms treat it as spammy and readers tune it out. Keep the 3-5 most specific ones and drop generic ones like #love or #instagood.`,
    });
  }

  const hook = firstLine(trimmed);
  if (isWeakHook(hook)) {
    suggestions.push({
      id: "h-weak-hook",
      category: "hook",
      severity: "high",
      title: "Punch up your opening line",
      detail:
        "Your first line doesn't create curiosity or urgency before readers decide to keep scrolling. Lead with a bold claim, a number, or a question instead of easing in.",
      example: "Most people get this wrong — here's what actually works.",
    });
  }

  if (metrics.charCount > MAX_CHARS) {
    suggestions.push({
      id: "h-too-long",
      category: "length",
      severity: "medium",
      title: "Shorten the post or split it into a thread",
      detail: `At ${metrics.charCount} characters this runs past the ${MAX_CHARS}-character sweet spot for quick reads. Cut it to one idea, or break the rest into a reply thread so each post stays skimmable.`,
    });
  }

  if (isShouting(trimmed)) {
    suggestions.push({
      id: "h-all-caps",
      category: "tone",
      severity: "medium",
      title: "Drop the all-caps",
      detail:
        "Long stretches of capital letters read as shouting and can feel aggressive or spammy. Reserve caps for a single word you want to emphasize, and use bold or punctuation for the rest.",
    });
  }

  if (metrics.charCount > LONG_POST_NO_BREAKS && !trimmed.includes("\n")) {
    suggestions.push({
      id: "h-no-line-breaks",
      category: "clarity",
      severity: "low",
      title: "Break the text into short paragraphs",
      detail:
        "This is a long post with no line breaks, which reads as a wall of text on mobile. Split it into 1-2 sentence chunks with blank lines between them so people actually read past the first line.",
    });
  }

  if (linkLacksContext(trimmed)) {
    suggestions.push({
      id: "h-link-no-context",
      category: "clarity",
      severity: "medium",
      title: "Explain what the link leads to",
      detail:
        "The link appears with little or no lead-in, so readers don't know why to click it. Add a sentence before the link saying what they'll get — an article, a product, a video — before they tap.",
    });
  }

  return fillToRange(suggestions);
}

const POLISH_SUGGESTIONS: Suggestion[] = [
  {
    id: "h-polish-timing",
    category: "clarity",
    severity: "low",
    title: "Test different posting times",
    detail:
      "The copy itself looks solid. Engagement is often driven as much by when you post as what you post — try publishing at a couple of different times and compare results.",
  },
  {
    id: "h-polish-question",
    category: "cta",
    severity: "low",
    title: "Invite a specific reply, not just any comment",
    detail:
      "Generic engagement asks get generic replies. Ask a pointed question tied to the post's topic so comments become a real conversation instead of one-word replies.",
  },
  {
    id: "h-polish-visual",
    category: "clarity",
    severity: "low",
    title: "Pair the text with a strong visual",
    detail:
      "Text-only posts get less reach on most platforms. If you haven't already, attach an image, carousel, or short video — posts with visuals are shared noticeably more.",
  },
];

const MIN_SUGGESTIONS = 3;
const MAX_SUGGESTIONS = 6;
const SEVERITY_RANK: Record<Suggestion["severity"], number> = { high: 0, medium: 1, low: 2 };

function fillToRange(suggestions: Suggestion[]): Suggestion[] {
  const ranked = [...suggestions].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  const withPadding = [...ranked];
  for (const filler of POLISH_SUGGESTIONS) {
    if (withPadding.length >= MIN_SUGGESTIONS) break;
    withPadding.push(filler);
  }

  return withPadding.slice(0, MAX_SUGGESTIONS);
}

export function buildHeuristicSummary(metrics: AnalysisMetrics, suggestions: Suggestion[]): string {
  const highCount = suggestions.filter((s) => s.severity === "high").length;
  const readingLabel =
    metrics.readingEase >= 70 ? "easy to read" : metrics.readingEase >= 50 ? "moderately readable" : "dense";

  return `This ${metrics.wordCount}-word post is ${readingLabel} (reading ease ${metrics.readingEase}/100). ` +
    `Found ${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"}` +
    (highCount > 0 ? `, ${highCount} of them high-priority.` : ".");
}
