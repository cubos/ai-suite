import { z } from "zod";

type GeminiSchema = Record<string, unknown>;

const UNSUPPORTED_FIELDS = new Set(["$schema", "additionalProperties", "$defs", "title"]);

/**
 * Strips unsupported fields and resolves $ref references from a JSON Schema
 * so it is compatible with the Gemini API response_schema format.
 */
function stripJsonSchema(schema: GeminiSchema, defs: Record<string, GeminiSchema> = {}): GeminiSchema {
  const result: GeminiSchema = {};

  for (const [key, value] of Object.entries(schema)) {
    if (UNSUPPORTED_FIELDS.has(key)) continue;

    if (key === "$ref" && typeof value === "string") {
      const refKey = value.replace(/^#\/\$defs\//, "");
      const resolved = defs[refKey];
      if (resolved) {
        return stripJsonSchema(resolved, defs);
      }
      continue;
    }

    if (key === "properties" && typeof value === "object" && value !== null) {
      result[key] = Object.fromEntries(
        Object.entries(value as Record<string, GeminiSchema>).map(([propKey, propVal]) => [
          propKey,
          stripJsonSchema(propVal, defs),
        ]),
      );
      continue;
    }

    if (key === "items" && typeof value === "object" && value !== null) {
      result[key] = stripJsonSchema(value as GeminiSchema, defs);
      continue;
    }

    if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === "object" && item !== null ? stripJsonSchema(item as GeminiSchema, defs) : item,
      );
      continue;
    }

    result[key] = value;
  }

  return result;
}

/**
 * Converts a Zod v4 schema to a Gemini-compatible schema object.
 */
export function zodToGeminiSchema(zodSchema: z.ZodType): GeminiSchema {
  const jsonSchema = z.toJSONSchema(zodSchema) as GeminiSchema;
  const defs = (jsonSchema["$defs"] ?? {}) as Record<string, GeminiSchema>;
  return stripJsonSchema(jsonSchema, defs);
}
