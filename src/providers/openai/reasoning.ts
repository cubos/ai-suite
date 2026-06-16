import type { ChatOptions } from "../types/index.js";

/**
 * Picks between reasoning_effort and temperature for an OpenAI-compatible request. We trust the
 * explicit `reasoning` opt-in instead of keeping a model allow/deny list: the provider API is the
 * source of truth and rejects reasoning_effort on models that don't support it. When reasoning is
 * set, temperature is left out because reasoning models reject a custom temperature.
 */
export function reasoningOrTemperature(options: ChatOptions) {
  if (options.reasoning) {
    return { reasoning_effort: options.reasoning.effort };
  }
  return { temperature: options.temperature };
}
