import type { ErrorAISuite } from "./handleErrorResponse.js";
import type { ServiceTier } from "./serviceTier.js";
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
  /** The service tier used for processing the request */
  service_tier?: ServiceTier | null;
  /** True on the final chunk */
  done: boolean;
  /** Usage stats — only populated on the final chunk */
  usage?: Usage;
  /** Execution time in milliseconds — only populated on the final chunk */
  execution_time?: number;
  /** Metadata passed through from options */
  metadata?: Record<string, unknown>;
  /** Present (true) only on the final success chunk */
  success?: true;
}

/** Final chunk emitted when the stream fails, mirroring the non-stream ErrorAISuite shape */
export interface StreamErrorChunk {
  success: false;
  done: true;
  object: "chat.completion";
  /** Unique identifier for the completion */
  id: string;
  /** Unix timestamp (in seconds) of when the chunk was created */
  created: number;
  /** Model used */
  model: string;
  delta: "";
  /** Content accumulated before the failure (may be empty) */
  content: string;
  /** The error message */
  error: string;
  /** The error tag */
  tag: ErrorAISuite["tag"];
  /** The raw error from the API */
  raw: Error;
  /** Execution time in milliseconds */
  execution_time: number;
  /** Metadata passed through from options */
  metadata?: Record<string, unknown>;
}

export type StreamResult = StreamChunk | StreamErrorChunk;
