import JSON5 from "json5";
import type OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import type {
  BatchCreateParams,
  ChatCompletion,
  ChatCompletionMessageToolCall,
  CreateEmbeddingResponse,
} from "openai/resources";
import type { BatchListParams } from "openai/resources.js";
import type {
  BatchStatus,
  ChatCompletionBatchResponse,
  CreateBatchArgs,
  EmbeddingtBatchResponse,
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
import type { OpenAIProvider } from "../openaiProvider.js";
import type { OpenAIBatchChatCompletionCreateParams } from "../types/openAIBatchChatCompletionCreateParams.js";
import type { OpenAIBatchEmbeddingCreateParams } from "../types/openAIBatchEmbeddingCreateParams.js";

export class BatchOpenAI extends BatchProviderBase<OpenAIProvider> {
  async create(args: CreateBatchArgs): Promise<SuccessCreateBatch> {
    const { endpoint, batch, options } = args;

    if (!batch.inputFileId && !batch.batch) {
      throw new AISuiteError("OpenAI requires either a file ID or a batch array.");
    }

    let inputFileId = batch.inputFileId;
    if (batch.batch) {
      let jsonl: string;

      if (endpoint === "embeddings") {
        jsonl = batch.batch
          .map(item =>
            JSON.stringify({
              custom_id: item.customId,
              method: "POST",
              url: `/v1/embeddings` as const,
              body: {
                model: this.provider.model,
                input: item.params.content,
                dimensions: options.dimensions,
                encoding_format: options.encodingFormat,
              },
            } as OpenAIBatchEmbeddingCreateParams),
          )
          .join("\n");
      } else {
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
              url: `/v1/chat/completions` as const,
              body: {
                model: this.provider.model,
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
      output_expires_after:
        endpoint === "chat/completions" && options.outputExpiresAfter
          ? {
              anchor: options.outputExpiresAfter.anchor,
              seconds: options.outputExpiresAfter.seconds,
            }
          : undefined,
      input_file_id: inputFileId!,
      endpoint: endpoint === "embeddings" ? "/v1/embeddings" : "/v1/chat/completions",
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
        endpoint: endpoint,
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

  async result(id: string, options: OptionsBase): Promise<SuccessResultBatch> {
    await this.provider.hooks.handleRequest(id);

    const batch = await this.provider.client.batches.retrieve(id);

    if (!batch.output_file_id) {
      throw new AISuiteError("Batch output file is not available yet.");
    }

    const isEmbeddings = /embeddings/.test(batch.endpoint);

    const fileResponse = await this.provider.client.files.content(batch.output_file_id);
    const text = await fileResponse.text();
    const lines = text.trim().split("\n").filter(Boolean);

    type ParsedLine<T> = {
      custom_id: string;
      response: { body: T } | null;
      error: { code: string; message: string } | null;
    };

    if (isEmbeddings) {
      const parsed = lines.map(line => JSON.parse(line) as ParsedLine<CreateEmbeddingResponse>);

      const errors = parsed
        .filter(p => p.error !== null)
        .map(p => ({ customId: p.custom_id, code: p.error!.code, message: p.error!.message }));

      const result: EmbeddingtBatchResponse[] = parsed
        .filter(p => p.response !== null)
        .map(p => {
          const body = p.response!.body;
          return {
            customId: p.custom_id,
            content: body.data.map(d => d.embedding),
            model: body.model,
            object: "list" as const,
            usage: body.usage
              ? {
                  input_tokens: body.usage.prompt_tokens ?? 0,
                  output_tokens: 0 as const,
                  total_tokens: body.usage.total_tokens ?? 0,
                }
              : undefined,
          };
        });

      const usage = result.reduce(
        (acc, r) => ({
          input_tokens: acc.input_tokens + (r.usage?.input_tokens ?? 0),
          output_tokens: 0 as const,
          total_tokens: acc.total_tokens + (r.usage?.total_tokens ?? 0),
        }),
        { input_tokens: 0, output_tokens: 0 as const, total_tokens: 0 },
      );

      await this.provider.hooks.handleResponse(id, result, options.metadata ?? {});

      return { success: true, content: result, model: this.provider.providerName, object: "batch.list", errors, usage };
    }

    const parsed = lines.map(line => JSON.parse(line) as ParsedLine<ChatCompletion>);

    const errors = parsed
      .filter(p => p.error !== null)
      .map(p => ({ customId: p.custom_id, code: p.error!.code, message: p.error!.message }));

    const result: ChatCompletionBatchResponse[] = parsed
      .filter(p => p.response !== null)
      .map(p => {
        const body = p.response!.body;
        const message = body.choices[0]?.message;

        const tools = message?.tool_calls
          ?.filter((tc): tc is Extract<ChatCompletionMessageToolCall, { type: "function" }> => tc.type === "function")
          .map(tc => ({
            id: tc.id,
            type: "function" as const,
            name: tc.function.name,
            content: JSON.parse(tc.function.arguments),
            rawContent: tc.function.arguments,
          }));

        return {
          customId: p.custom_id,
          id: body.id,
          model: body.model,
          object: "chat.completion" as const,
          content: message?.content ?? null,
          content_object: (() => {
            try {
              return JSON5.parse<Record<string, unknown>>(message?.content ?? "");
            } catch (_) {
              return {};
            }
          })(),
          tools: tools?.length ? tools : undefined,
          usage: body.usage
            ? {
                input_tokens: body.usage.prompt_tokens ?? 0,
                output_tokens: body.usage.completion_tokens ?? 0,
                total_tokens: body.usage.total_tokens ?? 0,
                cached_tokens: body.usage.prompt_tokens_details?.cached_tokens ?? 0,
                reasoning_tokens: body.usage.completion_tokens_details?.reasoning_tokens ?? 0,
                thoughts_tokens: 0,
              }
            : undefined,
        };
      });

    const usage = result.reduce(
      (acc, r) => ({
        input_tokens: acc.input_tokens + (r.usage?.input_tokens ?? 0),
        output_tokens: acc.output_tokens + (r.usage?.output_tokens ?? 0),
        total_tokens: acc.total_tokens + (r.usage?.total_tokens ?? 0),
        cached_tokens: acc.cached_tokens + (r.usage?.cached_tokens ?? 0),
        reasoning_tokens: acc.reasoning_tokens + (r.usage?.reasoning_tokens ?? 0),
        thoughts_tokens: 0,
      }),
      { input_tokens: 0, output_tokens: 0, total_tokens: 0, cached_tokens: 0, reasoning_tokens: 0, thoughts_tokens: 0 },
    );

    await this.provider.hooks.handleResponse(id, result, options.metadata ?? {});

    return {
      success: true,
      content: result,
      model: this.provider.providerName,
      object: "batch.chat.completion",
      errors,
      usage,
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
