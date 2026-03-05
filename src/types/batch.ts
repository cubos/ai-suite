import type { OptionsBase } from "../providers/types/optionsBase.js";
import type { ToolModel } from "../providers/types/toolModel.js";
import type { MessageModel } from "./chat.js";
import type { ErrorAISuite } from "./handleErrorResponse.js";
import type { ResultBase } from "./resultBase.js";

type Endpoint = "chat/completions" | "embeddings";

export interface CreateBatchRequest {
  inputFileId?: string;
  endpoint: Endpoint;

  batch?: {
    customId: string;
    params: {
      model: string;
      mensagens: MessageModel[];
    };
  }[];
}

export interface CreateBatchOptions extends OptionsBase {
  /**
   * The temperature
   */
  temperature?: number;

  /**
   * The tools to use
   */
  tools?: ToolModel[];

  /**
   * Maximum number of output tokens
   *
   * Anthropic max_tokens is set to 4096 by default
   */
  maxOutputTokens?: number;

  /**
   * The output expires after (only for OpenAI)
   */
  outputExpiresAfter?: {
    anchor: "created_at";
    seconds: number;
  };

  /**
   * The thinking to use (only for Gemini) default is 0 and output is false
   */
  thinking?: {
    budget: number;
    output: boolean;
  };
}

/**
 * The request counts for different statuses within the batch.
 */
export interface BatchRequestCounts {
  /**
   * Number of requests that have been completed successfully.
   */
  completed: number;

  /**
   * Number of requests that have failed.
   */
  failed: number;

  /**
   * Total number of requests in the batch.
   */
  total: number;
}

export type BatchStatus =
  | "validating"
  | "failed"
  | "in_progress"
  | "finalizing"
  | "completed"
  | "expired"
  | "cancelling"
  | "cancelled"
  | "paused"
  | "updating";

export interface Batch {
  id: string;

  /**
   * The Unix timestamp (in seconds) for when the batch was created.
   */
  createdAt: number;

  /**
   * The endpoint used by the batch.
   */
  endpoint: Endpoint;

  /**
   * The ID of the input file for the batch.
   * (Only Gemini and OpenAI)
   */
  inputFileId?: string;

  /**
   * The url to file for the batch.
   * (Only Anthropic)
   */
  resultsUrl?: string;

  /**
   * The object type, which is always `batch`.
   */
  object: "batch";

  /**
   * The current status of the batch.
   */
  status: BatchStatus;

  /**
   * The Unix timestamp (in seconds) for when the batch was cancelled.
   */
  cancelledAt?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch started cancelling.
   */
  cancellingAt?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch was completed.
   */
  completedAt?: number;

  /**
   * The ID of the file containing the outputs of requests with errors.
   */
  errorFileId?: string;

  errors?: unknown;

  /**
   * The Unix timestamp (in seconds) for when the batch expired.
   */
  expiredAt?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch will expire.
   */
  expiresAt?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch failed.
   */
  failedAt?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch started finalizing.
   */
  finalizingAt?: number;

  /**
   * The Unix timestamp (in seconds) for when the batch started processing.
   */
  inProgressAt?: number;

  /**
   * The ID of the file containing the outputs of successfully executed requests.
   */
  outputFileId?: string;

  /**
   * The request counts for different statuses within the batch.
   */
  requestCounts?: BatchRequestCounts;
}

export interface SuccessCreateBatch extends ResultBase<null>, Batch {}

export type ResultCreateBatch = SuccessCreateBatch | ErrorAISuite;
