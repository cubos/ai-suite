import type { ApiError } from "@google/genai";

/**
 * Detects a quota/budget exhaustion (as opposed to a plain rate limit) from a Gemini 429 ApiError.
 * Gemini reports this with `error.status === "RESOURCE_EXHAUSTED"` in the JSON body, for both
 * free-tier and billed accounts that ran out of quota/budget.
 */
export function isQuotaExceeded(error: ApiError): boolean {
  try {
    const body = JSON.parse(error.message) as { error?: { status?: string } };
    return body.error?.status === "RESOURCE_EXHAUSTED";
  } catch {
    return false;
  }
}
