import type { ZodType } from "zod";
import type { ChatOptionsBase } from "./chatOptionsBase.js";

export interface JSONSchema<T = unknown> extends ChatOptionsBase {
  /**
   * The response format
   */
  responseFormat: "json_schema";
  /**
   * The Zod schema to use for the response
   */
  zodSchema: ZodType<T>;
}
