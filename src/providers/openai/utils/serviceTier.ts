import type { ServiceTier } from "../../../types/serviceTier.js";

/** OpenAI's `service_tier` values, as accepted by the SDK on the request. */
type OpenAIServiceTier = "auto" | "default" | "flex" | "scale" | "priority";

/** Shared service tiers the SDK accepts, mapped to the tiers OpenAI supports on the request. */
const requestTierMap: Partial<Record<ServiceTier, OpenAIServiceTier>> = {
  default: "default",
  flex: "flex",
  scale: "scale",
  priority: "priority",
};

/** Tiers OpenAI reports back on the response, mapped to the shared service tier actually applied. */
const responseTierMap: Partial<Record<OpenAIServiceTier, ServiceTier>> = {
  default: "default",
  flex: "flex",
  scale: "scale",
  priority: "priority",
};

/**
 * Maps a requested service tier to the OpenAI value sent on the request.
 * Returns undefined when the tier is absent or not supported by OpenAI (e.g. Gemini's "standard").
 */
export function toOpenAIServiceTier(tier?: ServiceTier): OpenAIServiceTier | undefined {
  return tier ? requestTierMap[tier] : undefined;
}

/**
 * Maps the tier OpenAI actually applied (response `service_tier`) back to a shared service tier,
 * so the response reflects reality. Returns undefined when the API does not report a usable tier
 * (absent, null, or "auto", which is a request-only value).
 */
export function fromOpenAIServiceTier(tier?: string | null): ServiceTier | undefined {
  return tier ? responseTierMap[tier as OpenAIServiceTier] : undefined;
}
