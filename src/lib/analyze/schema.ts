import { z } from "zod";
import type { Suggestion } from "@/lib/types";

const CATEGORIES = ["hook", "length", "hashtags", "cta", "clarity", "tone"] as const;
const SEVERITIES = ["high", "medium", "low"] as const;

const TITLE_MAX = 60;
const DETAIL_MAX = 240;

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3).trimEnd()}...` : value;
}

const suggestionInputSchema = z.object({
  category: z.enum(CATEGORIES),
  severity: z.enum(SEVERITIES),
  title: z
    .string()
    .trim()
    .min(1)
    .transform((v) => truncate(v, TITLE_MAX)),
  detail: z
    .string()
    .trim()
    .min(1)
    .transform((v) => truncate(v, DETAIL_MAX)),
  example: z.string().trim().min(1).optional(),
});

const modelResponseSchema = z.object({
  summary: z.string().trim().min(1),
  suggestions: z.array(suggestionInputSchema),
});

export type ParsedModelResponse =
  | { ok: true; summary: string; suggestions: Suggestion[] }
  | { ok: false; reason: string };

const MAX_SUGGESTIONS = 6;

/**
 * Finds the first top-level `{...}` object in `text`, tracking string/escape state
 * so braces inside quoted strings don't throw off the depth count. Returns null if
 * no `{` is found or the object never closes (e.g. a truncated LLM response) —
 * callers should treat that as a parse failure, not attempt JSON.parse on a
 * partial slice.
 */
function extractOutermostJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escapeNext) escapeNext = false;
      else if (ch === "\\") escapeNext = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ?? trimmed;
}

export function parseModelResponse(raw: string): ParsedModelResponse {
  const withoutFences = stripCodeFences(raw);
  const jsonText = extractOutermostJsonObject(withoutFences);
  if (!jsonText) {
    return { ok: false, reason: "No complete JSON object found in the model response." };
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(jsonText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `Invalid JSON: ${message}` };
  }

  const result = modelResponseSchema.safeParse(candidate);
  if (!result.success) {
    return { ok: false, reason: `Schema validation failed: ${result.error.message}` };
  }

  const suggestions: Suggestion[] = result.data.suggestions.slice(0, MAX_SUGGESTIONS).map((s, i) => ({
    id: `llm-${i}`,
    ...s,
  }));

  return { ok: true, summary: result.data.summary, suggestions };
}
