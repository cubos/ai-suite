import type { ServiceTier } from "../../../types/serviceTier.js";

/** Anthropic's `service_tier` request values (opt-in/opt-out of Priority Tier). */
type AnthropicServiceTier = "auto" | "standard_only";

/** Anthropic's `usage.service_tier` response values, i.e. the tier actually applied. */
type AnthropicAppliedTier = "standard" | "priority" | "batch";

/**
 * Shared service tiers mapped to Anthropic's request semantics. Anthropic doesn't select a named
 * tier; it opts in (`auto` — use Priority Tier when available) or out (`standard_only`).
 */
const requestTierMap: Partial<Record<ServiceTier, AnthropicServiceTier>> = {
  priority: "auto",
  standard: "standard_only",
};

/** Anthropic's applied-tier response values, mapped to the shared service tier. */
const responseTierMap: Partial<Record<AnthropicAppliedTier, ServiceTier>> = {
  standard: "standard",
  priority: "priority",
};

/**
 * Maps a requested service tier to Anthropic's `service_tier` request value.
 * `priority` -> `auto` (use Priority Tier when available), `standard` -> `standard_only`.
 * Returns undefined for tiers with no Anthropic equivalent (e.g. `scale`, `default`) or when absent.
 */
export function toAnthropicServiceTier(tier?: ServiceTier): AnthropicServiceTier | undefined {
  return tier ? requestTierMap[tier] : undefined;
}

/**
 * Maps the tier Anthropic actually applied (`response.usage.service_tier`) back to a shared service
 * tier. Returns undefined when the API doesn't report a mappable tier (absent, null, or `batch`,
 * which has no shared-union equivalent) — matching the OpenAI and Gemini mappers so the response
 * shape is uniform across providers.
 */
export function fromAnthropicServiceTier(tier?: string | null): ServiceTier | undefined {
  return tier ? responseTierMap[tier as AnthropicAppliedTier] : undefined;
}
