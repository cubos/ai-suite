/**
 * The JSON schema to use for the response and tool parameters
 */
export type IJsonSchema = {
  type: "object";
  properties: Record<
    string,
    {
      type: "string" | "number" | "boolean" | "object" | "array";
      description?: string;
    }
  >;
  additionalProperties: boolean;
  required: string[];
};