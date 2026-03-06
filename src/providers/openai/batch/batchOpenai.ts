import type { BatchCreateParams } from "openai/resources";
import type { BatchListParams } from "openai/resources.js";
import type {
  BatchStatus,
  CreateBatchOptions,
  CreateBatchRequest,
  ListBatchOptions,
  SuccessCreateBatch,
  SuccessListBatch,
  SuccessRetrieveBatch,
} from "../../../types/batch.js";
import { AISuiteError } from "../../../utils.js";
import { BatchProviderBase } from "../../batchProviderBase.js";
import type { OptionsBase } from "../../types/optionsBase.js";
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
      success: true,
      content: {
        id: response.id,
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
        object: "batch",
        status: response.status as BatchStatus,
        errors: response.errors,
      },
      model: response.model || "",
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
          errors: res.errors,
        };
      }),
      has_next_page: response.has_more,
    };
  }

  async retrieve(id: string, options: OptionsBase): Promise<SuccessRetrieveBatch> {
    const request = id;

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.batches.retrieve(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      model: this.provider.providerName,
      content:{
          id: response.id,
          createdAt: response.created_at,
          endpoint: /embeddings/.test(response.endpoint) ? "embeddings" : "chat/completions",
          object: "batch",
          status: response.status as BatchStatus,
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
          errors: response.errors,
      }
    };
  }

  cancel(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
