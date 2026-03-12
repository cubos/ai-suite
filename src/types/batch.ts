import type { ChatOptions } from "../providers/types/chatOptions.js";
import type { OptionsBase } from "../providers/types/optionsBase.js";
import type { MessageModel } from "./chat.js";
import type { ErrorAISuite } from "./handleErrorResponse.js";
import type { EmbeddingOptions } from "./index.js";
import type { ResultBase } from "./resultBase.js";

export type Endpoint = "chat/completions" | "embeddings";

export type ChatBatchRequest = {
  inputFileId?: string;
  batch?: {
    customId: string;
    params: { mensagens: MessageModel[] };
  }[];
};

export type EmbeddingBatchRequest = {
  inputFileId?: string;
  batch?: {
    customId: string;
    params: { content: string | string[] };
  }[];
};

export type CreateBatchRequest = ChatBatchRequest | EmbeddingBatchRequest;

export interface ListBatchOptions extends OptionsBase {
  /**
   * The cursor for pagination, returned in the previous response's `after` field.
   */
  after?: string;

  /**
   * The maximum number of files to return. Defaults to 10.
   */
  limit?: number;
}

export type ChatBatchOptions = ChatOptions & {
  /**
   * The output expires after (only for OpenAI)
   */
  outputExpiresAfter?: {
    anchor: "created_at";
    seconds: number;
  };
};

export type CreateBatchOptions = EmbeddingOptions | ChatBatchOptions;

/**
 * Discriminated union that binds endpoint, batch request and options together,
 * allowing TypeScript to narrow all three automatically inside provider implementations.
 */
export type CreateBatchArgs =
  | { endpoint: "chat/completions"; batch: ChatBatchRequest; options: ChatBatchOptions }
  | { endpoint: "embeddings"; batch: EmbeddingBatchRequest; options: EmbeddingOptions };

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

export interface SuccessCreateBatch extends ResultBase<Batch> {}

export type ResultCreateBatch = SuccessCreateBatch | ErrorAISuite;

export interface SuccessListBatch extends ResultBase<Batch[]> {
  has_next_page: boolean;
}
export type ResultListBatch = SuccessListBatch | ErrorAISuite;

export interface SuccessRetrieveBatch extends ResultBase<Batch> {}
export type ResultRetrieveBatch = SuccessRetrieveBatch | ErrorAISuite;

export interface SuccessCancelBatch extends ResultBase<null> {}
export type ResultCancelBatch = SuccessCancelBatch | ErrorAISuite;
