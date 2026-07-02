/**
 * The service tier used for processing a request.
 *
 * This is a superset of the values accepted by the supported providers; each
 * provider maps the values it understands and ignores the rest:
 * - OpenAI (incl. DeepSeek/Grok/custom-llm, which reuse it): `"scale" | "default" | "flex" | "priority"`
 * - Gemini: `"flex" | "standard" | "priority"` (`"standard"` is Gemini-only)
 * - Anthropic: mapped to its opt-in/opt-out semantics — `"priority"` -> `"auto"`,
 *   `"standard"` -> `"standard_only"`; other values are ignored
 *
 * On the response, `service_tier` reflects the tier the provider actually applied
 * (which may differ from the requested one, e.g. a downgrade to `"standard"`).
 */
export type ServiceTier = "scale" | "default" | "flex" | "standard" | "priority";
