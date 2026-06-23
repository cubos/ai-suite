/**
 * The service tier used for processing a request.
 *
 * This is a superset of the values accepted by the supported providers; each
 * provider maps the values it understands and ignores the rest:
 * - OpenAI: `"scale" | "default"` (request handling not implemented yet in this SDK)
 * - Gemini: `"flex" | "standard" | "priority"` (`"standard"` is Gemini-only)
 *
 * Note: OpenAI's API also supports `"flex"` and `"priority"`, so only `"standard"`
 * is truly Gemini-specific.
 */
export type ServiceTier = "scale" | "default" | "flex" | "standard" | "priority";
