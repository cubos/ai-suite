import type { BatchListParams } from "@anthropic-ai/sdk/resources/beta/messages.mjs";
import type { MessageBatchRequestCounts } from "@anthropic-ai/sdk/resources/messages.js";
import type { BatchCreateParams } from "@anthropic-ai/sdk/resources/messages.mjs";
import JSON5 from "json5";
import type {
  BatchRequestCounts,
  BatchStatus,
  ChatCompletionBatchResponse,
  CreateBatchArgs,
  ListBatchOptions,
  SuccessCancelBatch,
  SuccessCreateBatch,
  SuccessListBatch,
  SuccessResultBatch,
  SuccessRetrieveBatch,
} from "../../../types/batch.js";
import { AISuiteError } from "../../../utils.js";
import { BatchProviderBase } from "../../batchProviderBase.js";
import type { OptionsBase } from "../../types/optionsBase.js";
import type { AnthropicProvider } from "../index.js";
import { convertToAnthropicFunctions } from "../utils/convertToAnthropicFunctions.js";

export class BatchAnthropic extends BatchProviderBase<AnthropicProvider> {
  async create(args: CreateBatchArgs): Promise<SuccessCreateBatch> {
    if (args.endpoint === "embeddings") {
      throw new AISuiteError("Anthropic does not have embedding.");
    }

    const { batch, endpoint, options } = args;

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
          model: this.provider.model,
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
        endpoint: endpoint,
        inProgressAt: response.created_at ? Math.floor(new Date(response.created_at).getTime() / 1000) : undefined,
        cancelledAt: response.cancel_initiated_at
          ? Math.floor(new Date(response.cancel_initiated_at).getTime() / 1000)
          : undefined,
        requestCounts: this.getRequestCounts(response.request_counts),
        id: response.id,
        object: "batch",
        status: this.getStatus(response.processing_status),
        completedAt: response.ended_at ? Math.floor(new Date(response.ended_at).getTime() / 1000) : undefined,
        resultsUrl: response.results_url ?? undefined,
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
        resultsUrl: batch.results_url ?? undefined,
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
        completedAt: response.ended_at ? Math.floor(new Date(response.ended_at).getTime() / 1000) : undefined,
        resultsUrl: response.results_url ?? undefined,
      },
    };
  }

  async result(id: string, options: OptionsBase): Promise<SuccessResultBatch> {
    await this.provider.hooks.handleRequest(id);

    const result: ChatCompletionBatchResponse[] = [];
    const errors: { customId: string; code: string; message: string }[] = [];

    for await (const response of await this.provider.client.messages.batches.results(id)) {
      if (response.result.type !== "succeeded") {
        const err = response.result.type === "errored" ? response.result.error : null;
        errors.push({
          customId: response.custom_id,
          code: err?.type ?? response.result.type,
          message:
            "error" in (err ?? {}) ? (err as { error: { message: string } }).error.message : response.result.type,
        });
        continue;
      }

      const message = response.result.message;
      const textBlock = message.content.find(b => b.type === "text");
      const content = textBlock?.type === "text" ? textBlock.text : null;

      let content_object: Record<string, unknown> = {};
      try {
        content_object = JSON5.parse<Record<string, unknown>>(content ?? "");
      } catch (_) {}

      const tools = message.content
        .filter(b => b.type === "tool_use")
        .map(b => {
          const tool = b as { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
          return {
            id: tool.id,
            type: "function" as const,
            name: tool.name,
            content: tool.input,
            rawContent: JSON.stringify(tool.input),
          };
        });

      result.push({
        customId: response.custom_id,
        id: message.id,
        model: message.model,
        object: "chat.completion",
        content,
        content_object,
        tools: tools.length ? tools : undefined,
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          total_tokens: message.usage.input_tokens + message.usage.output_tokens,
          cached_tokens: message.usage.cache_read_input_tokens ?? 0,
          reasoning_tokens: 0,
          thoughts_tokens: 0,
        },
      });
    }

    const usage = result.reduce(
      (acc, r) => ({
        input_tokens: acc.input_tokens + (r.usage?.input_tokens ?? 0),
        output_tokens: acc.output_tokens + (r.usage?.output_tokens ?? 0),
        total_tokens: acc.total_tokens + (r.usage?.total_tokens ?? 0),
        cached_tokens: acc.cached_tokens + (r.usage?.cached_tokens ?? 0),
        reasoning_tokens: 0,
        thoughts_tokens: 0,
      }),
      { input_tokens: 0, output_tokens: 0, total_tokens: 0, cached_tokens: 0, reasoning_tokens: 0, thoughts_tokens: 0 },
    );

    await this.provider.hooks.handleResponse(id, result, options.metadata ?? {});

    return {
      success: true,
      model: this.provider.providerName,
      object: "batch.chat.completion",
      content: result,
      errors,
      usage,
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
