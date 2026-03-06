import type { BatchListParams } from "@anthropic-ai/sdk/resources/beta/messages.mjs";
import type { MessageBatchRequestCounts } from "@anthropic-ai/sdk/resources/messages.js";
import type { BatchCreateParams } from "@anthropic-ai/sdk/resources/messages.mjs";
import type {
  BatchRequestCounts,
  BatchStatus,
  CreateBatchOptions,
  CreateBatchRequest,
  ListBatchOptions,
  SuccessCancelBatch,
  SuccessCreateBatch,
  SuccessListBatch,
  SuccessRetrieveBatch,
} from "../../../types/batch.js";
import { AISuiteError } from "../../../utils.js";
import { BatchProviderBase } from "../../batchProviderBase.js";
import type { OptionsBase } from "../../types/optionsBase.js";
import type { AnthropicProvider } from "../index.js";
import { convertToAnthropicFunctions } from "../utils/convertToAnthropicFunctions.js";

export class BatchAnthropic extends BatchProviderBase<AnthropicProvider> {
  async create(batch: CreateBatchRequest, options: CreateBatchOptions): Promise<SuccessCreateBatch> {
    if (batch.endpoint === "embeddings") {
      throw new AISuiteError("Anthropic does not have embedding.");
    }

    if (batch.inputFileId) {
      throw new AISuiteError("Anthropic does not use files for batch.");
    }

    if (!batch.batch) {
      throw new AISuiteError("Necessary to pass the messages.");
    }

    const requests: Array<BatchCreateParams.Request> = batch.batch.map(req => {
      return {
        custom_id: req.customId,
        params: {
          messages: this.provider.mapMessagesToChat(req.params.mensagens),
          model: req.params.model,
          ...(options.maxOutputTokens ? { max_tokens: options.maxOutputTokens } : { max_tokens: 4096 }),
          tools: convertToAnthropicFunctions(options.tools),
          thinking: {
            ...((options.thinking?.budget ?? 0) > 0
              ? { budget_tokens: options.thinking?.budget ?? 0, type: "enabled" }
              : { type: "disabled" }),
          },
        },
      };
    });

    const request: BatchCreateParams = {
      requests: requests,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.messages.batches.create(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      model: this.provider.model,
      content: {
        createdAt: Math.floor(new Date(response.created_at).getTime() / 1000),
        endpoint: batch.endpoint,
        inProgressAt: response.created_at ? Math.floor(new Date(response.created_at).getTime() / 1000) : undefined,
        cancelledAt: response.cancel_initiated_at
          ? Math.floor(new Date(response.cancel_initiated_at).getTime() / 1000)
          : undefined,
        requestCounts: this.getRequestCounts(response.request_counts),
        id: response.id,
        object: "batch",
        status: this.getStatus(response.processing_status),
      },
    };
  }

  getRequestCounts(counts: MessageBatchRequestCounts): BatchRequestCounts {
    const completed = counts.succeeded;
    const failed = counts.errored + counts.expired + counts.canceled;
    const total = completed + failed + counts.processing;

    return {
      completed,
      failed,
      total,
    };
  }

  getStatus(status: "in_progress" | "canceling" | "ended"): BatchStatus {
    switch (status) {
      case "canceling":
        return "cancelled";
      case "ended":
        return "completed";
      case "in_progress":
        return "in_progress";
    }
  }

  async list(options: ListBatchOptions): Promise<SuccessListBatch> {
    const request: BatchListParams = {
      limit: options.limit,
      after_id: options.after,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.messages.batches.list(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      model: this.provider.providerName,
      content: response.data.map(batch => ({
        createdAt: Math.floor(new Date(batch.created_at).getTime() / 1000),
        endpoint: "chat/completions",
        inProgressAt: Math.floor(new Date(batch.created_at).getTime() / 1000),
        cancelledAt: batch.cancel_initiated_at
          ? Math.floor(new Date(batch.cancel_initiated_at).getTime() / 1000)
          : undefined,
        completedAt: batch.ended_at ? Math.floor(new Date(batch.ended_at).getTime() / 1000) : undefined,
        requestCounts: this.getRequestCounts(batch.request_counts),
        id: batch.id,
        object: "batch",
        status: this.getStatus(batch.processing_status),
      })),
      has_next_page: response.has_more,
    };
  }

  async retrieve(id: string, options: OptionsBase): Promise<SuccessRetrieveBatch> {
    const request = id;
    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.messages.batches.retrieve(id);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      model: this.provider.model,
      content: {
        createdAt: Math.floor(new Date(response.created_at).getTime() / 1000),
        endpoint: "chat/completions",
        inProgressAt: response.created_at ? Math.floor(new Date(response.created_at).getTime() / 1000) : undefined,
        cancelledAt: response.cancel_initiated_at
          ? Math.floor(new Date(response.cancel_initiated_at).getTime() / 1000)
          : undefined,
        requestCounts: this.getRequestCounts(response.request_counts),
        id: response.id,
        object: "batch",
        status: this.getStatus(response.processing_status),
      },
    };
  }

  async cancel(id: string, options: OptionsBase): Promise<SuccessCancelBatch> {
    const request = id;
    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.messages.batches.cancel(id);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      content: null,
      model: this.provider.providerName,
    };
  }
}
