import { logger } from "@/lib/http";
import { getGeminiApiKey } from "@/lib/config";
import type { AnalysisMetrics, AnalysisResult, Suggestion } from "@/lib/types";
import { buildHeuristicSummary, computeMetrics, heuristicSuggestions } from "./heuristics";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { parseModelResponse } from "./schema";

// Hardcoded model names are a known fragility: Google periodically retires older
// Gemini models (gemini-2.0-flash was shut down mid-2026, which is exactly what
// broke this — see the fallback-reason logging below), and there's no way to detect
// that ahead of time short of watching Google's release notes. This is the real-world
// case the heuristic fallback exists for: a bad/stale model name degrades the app to
// rule-based suggestions instead of failing every analysis request outright.
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 12_000;
const MIN_SUGGESTIONS = 3;
const MAX_SUGGESTIONS = 6;

class GeminiCallError extends Error {
  constructor(
    message: string,
    readonly reason: "timeout" | "rate-limited" | "http-error" | "network-error",
  ) {
    super(message);
    this.name = "GeminiCallError";
  }
}

interface GeminiCandidatePart {
  text?: string;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiCandidatePart[] } }[];
}

async function callGemini(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new GeminiCallError("Gemini request timed out.", "timeout");
    }
    throw new GeminiCallError(
      `Gemini request failed: ${error instanceof Error ? error.message : String(error)}`,
      "network-error",
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429) {
    throw new GeminiCallError("Gemini rate limit hit.", "rate-limited");
  }
  if (!res.ok) {
    // Google's error body (e.g. "API key not valid", "models/x is not found",
    // "quota exceeded") is the actual diagnosable detail — the status code alone
    // can't distinguish an auth problem from a bad model name from a quota issue.
    const bodyText = await res.text().catch(() => "");
    throw new GeminiCallError(`Gemini returned HTTP ${res.status}: ${bodyText.slice(0, 500)}`, "http-error");
  }

  const body = (await res.json()) as GeminiResponse;
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiCallError("Gemini response had no text content.", "http-error");
  }
  return text;
}

/** error.message already carries the full diagnosable detail (HTTP status + Gemini's
 * error body, or the underlying fetch/timeout error) — error.reason alone is too
 * terse to tell an auth failure from a bad model name from a quota error in logs. */
function describeGeminiFailure(error: unknown): string {
  if (error instanceof GeminiCallError) return `${error.reason}: ${error.message}`;
  return `unknown-error: ${error instanceof Error ? error.message : String(error)}`;
}

function fallbackResult(text: string, metrics: AnalysisMetrics, reason: string): AnalysisResult {
  logger.error(`analyze: falling back to heuristics — ${reason}`);
  const suggestions = heuristicSuggestions(text, metrics);
  return {
    summary: buildHeuristicSummary(metrics, suggestions),
    metrics,
    suggestions,
    model: "heuristic-fallback",
  };
}

function mergeSuggestions(llmSuggestions: Suggestion[], text: string, metrics: AnalysisMetrics): Suggestion[] {
  if (llmSuggestions.length >= MIN_SUGGESTIONS) {
    return llmSuggestions.slice(0, MAX_SUGGESTIONS);
  }

  const merged = [...llmSuggestions];
  const seenTitles = new Set(merged.map((s) => s.title.toLowerCase()));
  for (const fallback of heuristicSuggestions(text, metrics)) {
    if (merged.length >= MIN_SUGGESTIONS) break;
    if (seenTitles.has(fallback.title.toLowerCase())) continue;
    merged.push(fallback);
    seenTitles.add(fallback.title.toLowerCase());
  }

  return merged.slice(0, MAX_SUGGESTIONS);
}

export async function analyze(text: string): Promise<AnalysisResult> {
  const metrics = computeMetrics(text);

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return fallbackResult(text, metrics, "GEMINI_API_KEY is not set");
  }

  const systemPrompt = buildSystemPrompt();

  let rawText: string;
  try {
    rawText = await callGemini(systemPrompt, buildUserPrompt(text, metrics), apiKey);
  } catch (error) {
    return fallbackResult(text, metrics, describeGeminiFailure(error));
  }

  let parsed = parseModelResponse(rawText);

  if (!parsed.ok) {
    logger.warn(`analyze: Gemini response failed to parse, retrying once (${parsed.reason})`);
    try {
      rawText = await callGemini(systemPrompt, buildUserPrompt(text, metrics, { terse: true }), apiKey);
    } catch (error) {
      return fallbackResult(text, metrics, `retry call failed: ${describeGeminiFailure(error)}`);
    }
    parsed = parseModelResponse(rawText);
  }

  if (!parsed.ok) {
    return fallbackResult(text, metrics, `malformed JSON twice: ${parsed.reason}`);
  }

  return {
    summary: parsed.summary,
    metrics,
    suggestions: mergeSuggestions(parsed.suggestions, text, metrics),
    model: GEMINI_MODEL,
  };
}
