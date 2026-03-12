import type { AnthropicModels } from "../providers/anthropic/index.js";
import type { DeepSeekEmbeddingModels, DeepSeekModels } from "../providers/deepSeek/index.js";
import type { GeminiEmbeddingModels, GeminiModels } from "../providers/gemini/index.js";
import type { GrokModels } from "../providers/grok/index.js";
import type { OpenAIEmbeddingModels, OpenAIModels } from "../providers/openai/index.js";
import type { ChatOptions } from "../providers/types/chatOptions.js";
import type { OptionsBase } from "../providers/types/optionsBase.js";
import type { MessageModel } from "./chat.js";
import type { ErrorAISuite } from "./handleErrorResponse.js";
import type { EmbeddingOptions } from "./index.js";
import type { ProviderBatchType } from "./providerModel.js";
import type { ResultBase } from "./resultBase.js";

export type Endpoint = "chat/completions" | "embeddings";

export type BatchChatModel<P extends ProviderBatchType, S extends string = string> =
  P extends "openai" ? OpenAIModels :
  P extends "anthropic" ? AnthropicModels :
  P extends "gemini" ? GeminiModels :
  P extends "deepseek" ? DeepSeekModels :
  P extends "grok" ? GrokModels :
  P extends "custom-llm" ? S :
  never;

export type BatchEmbeddingModel<P extends ProviderBatchType, S extends string = string> =
  P extends "openai" ? OpenAIEmbeddingModels :
  P extends "gemini" ? GeminiEmbeddingModels :
  P extends "deepseek" ? DeepSeekEmbeddingModels :
  P extends "custom-llm" ? S :
  never;

export type CreateBatchRequest<P extends ProviderBatchType = ProviderBatchType, S extends string = string> =
  | {
      inputFileId?: string;
      endpoint: "chat/completions";
      batch?: {
        customId: string;
        params: {
          model: BatchChatModel<P, S>;
          mensagens: MessageModel[];
        };
      }[];
    }
  | {
      inputFileId?: string;
      endpoint: "embeddings";
      batch?: {
        customId: string;
        params: {
          model: BatchEmbeddingModel<P, S>;
          content: string | string[];
        };
      }[];
    };

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

export type CreateBatchOptionsBase  = EmbeddingOptions & { type: "embedding"} | ChatOptions  & { type: "chat/completions"}
export type  CreateBatchOptions  = {
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
} & CreateBatchOptionsBase ;

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
