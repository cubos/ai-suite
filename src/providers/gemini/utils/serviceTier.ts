import { ServiceTier as GeminiServiceTier, TrafficType } from "@google/genai";
import type { ServiceTier } from "../../../types/serviceTier.js";

/** Shared service tiers the SDK accepts, mapped to the tiers Gemini supports on the request. */
const requestTierMap: Partial<Record<ServiceTier, GeminiServiceTier>> = {
  flex: GeminiServiceTier.FLEX,
  standard: GeminiServiceTier.STANDARD,
  priority: GeminiServiceTier.PRIORITY,
};

/** Traffic types Gemini reports back, mapped to the shared service tier actually applied. */
const trafficTypeMap: Partial<Record<TrafficType, ServiceTier>> = {
  [TrafficType.ON_DEMAND]: "standard",
  [TrafficType.ON_DEMAND_FLEX]: "flex",
  [TrafficType.ON_DEMAND_PRIORITY]: "priority",
};

/**
 * Maps a requested service tier to the Gemini SDK enum.
 * Returns undefined when the tier is absent or not supported by Gemini (e.g. OpenAI's "scale"/"default").
 */
export function toGeminiServiceTier(tier?: ServiceTier): GeminiServiceTier | undefined {
  return tier ? requestTierMap[tier] : undefined;
}

/**
 * Maps the tier the API actually applied (response.usageMetadata.trafficType) back to a shared
 * service tier, so the response reflects reality (including downgrades). Returns undefined when the
 * API does not report a traffic type, since the applied tier is then unknown.
 */
export function fromGeminiTrafficType(trafficType?: TrafficType): ServiceTier | undefined {
  return trafficType ? trafficTypeMap[trafficType] : undefined;
}
