import type { BatchCreateParams } from "openai/resources";
import type { BatchListParams } from "openai/resources.js";
import type {
  BatchStatus,
  CreateBatchOptions,
  CreateBatchRequest,
  ListBatchOptions,
  SuccessCreateBatch,
  SuccessListBatch,
} from "../../../types/batch.js";
import { AISuiteError } from "../../../utils.js";
import { BatchProviderBase } from "../../batchProviderBase.js";
import type { OpenAIProvider } from "../openaiProvider.js";

export class BatchOpenAI extends BatchProviderBase<OpenAIProvider> {
  async create(batch: CreateBatchRequest, options: CreateBatchOptions): Promise<SuccessCreateBatch> {
    if (!batch.inputFileId) {
      throw new AISuiteError("Openai needs a file ID.");
    }

    if (batch.batch) {
      throw new AISuiteError("OpenAI only allows batch processing with files.");
    }

    const request: BatchCreateParams = {
      output_expires_after: options?.outputExpiresAfter
        ? {
            anchor: options.outputExpiresAfter.anchor,
            seconds: options?.outputExpiresAfter.seconds,
          }
        : undefined,
      input_file_id: batch.inputFileId,
      endpoint: `/v1/${batch.endpoint}`,
      completion_window: "24h",
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.batches.create(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      ...response,
      success: true,
      content: null,
      model: response.model || "",
      createdAt: response.created_at,
      endpoint: batch.endpoint,
      inputFileId: response.input_file_id,
      cancelledAt: response.cancelled_at,
      cancellingAt: response.cancelling_at,
      completedAt: response.completed_at,
      errorFileId: response.error_file_id,
      expiredAt: response.expired_at,
      expiresAt: response.expires_at,
      requestCounts: response.request_counts,
      failedAt: response.failed_at,
      finalizingAt: response.finalizing_at,
      inProgressAt: response.in_progress_at,
      outputFileId: response.output_file_id,
      usage: response.usage
        ? {
            input_tokens: response.usage?.input_tokens || 0,
            output_tokens: response.usage?.output_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0,
            cached_tokens: response.usage?.input_tokens_details?.cached_tokens || 0,
            reasoning_tokens: response.usage.output_tokens_details?.reasoning_tokens || 0,
            thoughts_tokens: 0,
          }
        : undefined,
    };
  }

  async list(options: ListBatchOptions): Promise<SuccessListBatch> {
    const request: BatchListParams = {
      after: options.after,
      limit: options.limit,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.batches.list(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      model: this.provider.providerName,
      content: response.data.map(res => {
        return {
          id: res.id,
          createdAt: res.created_at,
          endpoint: /embeddings/.test(res.endpoint) ? "embeddings" : "chat/completions",
          object: "batch",
          status: res.status as BatchStatus,
          inputFileId: res.input_file_id,
          cancelledAt: res.cancelled_at,
          cancellingAt: res.cancelling_at,
          completedAt: res.completed_at,
          errorFileId: res.error_file_id,
          expiredAt: res.expired_at,
          expiresAt: res.expires_at,
          requestCounts: res.request_counts,
          failedAt: res.failed_at,
          finalizingAt: res.finalizing_at,
          inProgressAt: res.in_progress_at,
          outputFileId: res.output_file_id,
          usage: res.usage
            ? {
                input_tokens: res.usage?.input_tokens || 0,
                output_tokens: res.usage?.output_tokens || 0,
                total_tokens: res.usage?.total_tokens || 0,
                cached_tokens: res.usage?.input_tokens_details?.cached_tokens || 0,
                reasoning_tokens: res.usage.output_tokens_details?.reasoning_tokens || 0,
                thoughts_tokens: 0,
              }
            : undefined,
        };
      }),
      has_next_page: response.has_more,
    };
  }
  retrieve(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  cancel(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
