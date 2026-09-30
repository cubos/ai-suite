import { ApiError } from "@google/genai";
import { describe, expect, it } from "vitest";
import { GeminiProvider } from "../../src/providers/gemini/geminiProvider.js";

function newProvider(): GeminiProvider {
  return new GeminiProvider("fake-key", "gemini-2.5-flash", "gemini");
}

const quotaExceededBody = JSON.stringify({
  error: {
    code: 429,
    message: "You exceeded your current quota, please check your plan and billing details.",
    status: "RESOURCE_EXHAUSTED",
    details: [
      {
        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
        violations: [
          {
            quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests",
            quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
          },
        ],
      },
    ],
  },
});

describe("GeminiProvider - handleError (quota/budget exhaustion)", () => {
  it("maps a 429 RESOURCE_EXHAUSTED (out of quota/budget) to QuotaExceeded", () => {
    const provider = newProvider();
    const error = new ApiError({ status: 429, message: quotaExceededBody });

    const result = provider.handleError(error);

    expect(result.tag).toBe("QuotaExceeded");
  });

  it("still maps a plain 429 without RESOURCE_EXHAUSTED to RateLimitExceeded", () => {
    const provider = newProvider();
    const error = new ApiError({ status: 429, message: "Too many requests, please slow down." });

    const result = provider.handleError(error);

    expect(result.tag).toBe("RateLimitExceeded");
  });

  it("does not misclassify a non-JSON 429 message as quota exceeded", () => {
    const provider = newProvider();
    const error = new ApiError({ status: 429, message: "not json at all" });

    const result = provider.handleError(error);

    expect(result.tag).toBe("RateLimitExceeded");
  });
});
