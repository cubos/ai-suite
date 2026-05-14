import type { Usage } from "./usage.js";

export interface StreamChunk {
  /** Unique identifier for the completion */
  id: string;
  /** Unix timestamp (in seconds) of when the chunk was created */
  created: number;
  /** Object type */
  object: "chat.completion";
  /** Model used */
  model: string;
  /** New text received in this chunk */
  delta: string;
  /** Accumulated content so far */
  content: string;
  /** Parsed JSON object — only populated on the final chunk when responseFormat is json_object or json_schema */
  content_object?: Record<string, unknown>;
  /** True on the final chunk */
  done: boolean;
  /** Usage stats — only populated on the final chunk */
  usage?: Usage;
  /** Execution time in milliseconds — only populated on the final chunk */
  execution_time?: number;
  /** Metadata passed through from options */
  metadata?: Record<string, unknown>;
}
