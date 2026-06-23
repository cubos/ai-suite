import { ServiceTier as GeminiServiceTier } from "@google/genai";
import type { ServiceTier } from "../../../types/serviceTier.js";

/**
 * Maps the SDK's shared service tiers to the tiers Gemini supports.
 * Values not present here (e.g. OpenAI's "scale"/"default") are ignored by Gemini.
 */
export const geminiServiceTierMap: Partial<Record<ServiceTier, GeminiServiceTier>> = {
  flex: GeminiServiceTier.FLEX,
  standard: GeminiServiceTier.STANDARD,
  priority: GeminiServiceTier.PRIORITY,
};
