import type OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import type { BatchCreateParams } from "openai/resources";
import type { BatchListParams } from "openai/resources.js";
import type {
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
import type { OpenAIProvider } from "../openaiProvider.js";
import type { OpenAIBatchChatCompletionCreateParams } from "../types/openAIBatchChatCompletionCreateParams.js";
import type { OpenAIBatchEmbeddingCreateParams } from "../types/openAIBatchEmbeddingCreateParams.js";

export class BatchOpenAI extends BatchProviderBase<OpenAIProvider> {
  async create(batch: CreateBatchRequest, options: CreateBatchOptions): Promise<SuccessCreateBatch> {
    if (!batch.inputFileId && !batch.batch) {
      throw new AISuiteError("OpenAI requires either a file ID or a batch array.");
    }

    let inputFileId = batch.inputFileId;
    if (batch.batch) {
      let jsonl: string;

      if (batch.endpoint === "embeddings") {
        if (options.type !== "embedding") {
          throw new AISuiteError("options.type must be 'embedding' when endpoint is 'embeddings'.");
        }

        jsonl = batch.batch
          .map(item =>
            JSON.stringify({
              custom_id: item.customId,
              method: "POST",
              url: `/v1/${batch.endpoint}`,
              body: {
                model: item.params.model,
                input: item.params.content,
                dimensions: options.dimensions,
                encoding_format: options.encodingFormat,
              },
            } as OpenAIBatchEmbeddingCreateParams),
          )
          .join("\n");
      } else {
        if (options.type !== "chat/completions") {
          throw new AISuiteError("options.type must be 'chat/completions' when endpoint is 'chat/completions'.");
        }

        let response_format: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming["response_format"];

        if (options.responseFormat === "text") {
          response_format = undefined;
        } else if (options.responseFormat === "json_schema") {
          response_format = zodResponseFormat(options.zodSchema, "default");
        } else {
          response_format = { type: options.responseFormat };
        }

        jsonl = batch.batch
          .map(item =>
            JSON.stringify({
              custom_id: item.customId,
              method: "POST",
              url: `/v1/${batch.endpoint}`,
              body: {
                model: item.params.model,
                messages: this.provider.mapMessages(item.params.mensagens),
                temperature: options.temperature,
                response_format,
                tools: options.tools,
                ...(options.maxOutputTokens ? { max_completion_tokens: options.maxOutputTokens } : {}),
              },
            } as OpenAIBatchChatCompletionCreateParams),
          )
          .join("\n");
      }

      const fileBlob = new File([jsonl], "batch.jsonl", { type: "application/jsonl" });

      const uploadedFile = await this.provider.client.files.create({
        file: fileBlob,
        purpose: "batch",
      });

      inputFileId = uploadedFile.id;
    }

    const request: BatchCreateParams = {
      output_expires_after: options?.outputExpiresAfter
        ? {
            anchor: options.outputExpiresAfter.anchor,
            seconds: options?.outputExpiresAfter.seconds,
          }
        : undefined,
      input_file_id: inputFileId!,
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
      content: {
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
      },
    };
  }

  async cancel(id: string, options: OptionsBase): Promise<SuccessCancelBatch> {
    const request = id;

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.batches.cancel(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      content: null,
      model: this.provider.providerName,
    };
  }
}
