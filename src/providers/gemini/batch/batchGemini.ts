import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type BatchJob,
  type CancelBatchJobParameters,
  type CompletionStats,
  type GetBatchJobParameters,
  JobState,
  type ListBatchJobsParameters,
  ThinkingLevel,
} from "@google/genai";
import { toGeminiSchema } from "gemini-zod";
import JSON5 from "json5";
import type { BatchRequestCounts } from "openai/resources";
import type {
  Batch,
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
import { notUseThinkingConfig } from "../constants/notUseThinkingConfig.js";
import { onlyWorksWithThinking } from "../constants/onlyWorksWithThinking.js";
import { useThinkingLevel } from "../constants/useThinkingLevel.js";
import type { GeminiProvider } from "../geminiProvider.js";
import { convertToGeminiFunctions } from "../utils/convertToGeminiFunctions.js";

export class BatchGemini extends BatchProviderBase<GeminiProvider> {
  async create(args: CreateBatchArgs): Promise<SuccessCreateBatch> {
    const { endpoint, batch, options } = args;
    let inputFileId = batch.inputFileId;
    let config = null;

    if (batch.batch) {
      let jsonl: string;

      if (endpoint === "embeddings") {
        config = {
          outputDimensionality: options.dimensions,
          taskType: options.taskType,
        };

        jsonl = batch.batch
          .map(item =>
            JSON.stringify({
              key: item.customId,
              request: {
                content: {
                  parts: Array.isArray(item.params.content)
                    ? item.params.content.map((text: string) => ({ text }))
                    : [{ text: item.params.content }],
                },
              },
            }),
          )
          .join("\n");
      } else {
        const thinkingLevelMap: Record<string, ThinkingLevel> = {
          minimal: ThinkingLevel.MINIMAL,
          low: ThinkingLevel.LOW,
          medium: ThinkingLevel.MEDIUM,
          high: ThinkingLevel.HIGH,
        };

        let thinkingConfig: {
          thinkingBudget?: number;
          thinkingLevel?: ThinkingLevel;
          includeThoughts: boolean;
        } | null = null;

        if (useThinkingLevel.includes(this.provider.model)) {
          thinkingConfig = {
            thinkingLevel: thinkingLevelMap[options.thinking?.level ?? "high"],
            includeThoughts: options.thinking?.output ?? false,
          };
        } else if (onlyWorksWithThinking.includes(this.provider.model)) {
          thinkingConfig = {
            thinkingBudget: options.thinking?.budget ?? 128,
            includeThoughts: options.thinking?.output ?? false,
          };
        } else if (!notUseThinkingConfig.includes(this.provider.model)) {
          thinkingConfig = {
            thinkingBudget: options.thinking?.budget ?? 0,
            includeThoughts: options.thinking?.output ?? false,
          };
        }

        config = {
          tools: options.tools ? convertToGeminiFunctions(options.tools) : undefined,
          temperature: options.temperature ?? 0.7,
          thinkingConfig: thinkingConfig ?? { thinkingBudget: 0 },
          responseMimeType: options.responseFormat !== "text" ? "application/json" : undefined,
          ...(options.responseFormat === "json_schema" ? { responseSchema: toGeminiSchema(options.zodSchema) } : {}),
          ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
        };

        jsonl = batch.batch
          .map(item =>
            JSON.stringify({
              key: item.customId,
              request: {
                contents: this.provider.mapMessages(item.params.mensagens),
              },
            }),
          )
          .join("\n");
      }

      const fileBlob = new File([jsonl], "batch.jsonl", { type: "application/jsonl" });

      const uploadedFile = await this.provider.client.files.upload({
        file: fileBlob,
        config: { displayName: "batch.jsonl", ...config },
      });

      inputFileId = uploadedFile.name;
    }

    const request = {
      model: this.provider.model,
      src: {
        fileName: inputFileId,
      },
    };

    await this.provider.hooks.handleRequest(request);

    let response: BatchJob;
    if (endpoint === "chat/completions") {
      response = await this.provider.client.batches.create(request);
    } else {
      response = await this.provider.client.batches.createEmbeddings(request);
    }

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      model: response.model || "",
      content: {
        createdAt: Math.floor(new Date(response.createTime!).getTime() / 1000),
        endpoint: endpoint,
        inputFileId: response.src?.fileName || "",
        completedAt: response.endTime ? Math.floor(new Date(response.endTime).getTime() / 1000) : undefined,
        requestCounts: this.getRequestCounts(response.completionStats),
        outputFileId: response.dest?.fileName || undefined,
        id: response.name || "",
        object: "batch",
        status: this.getStatus(response.state),
        errors: response.error,
      },
    };
  }

  private getRequestCounts(completionStats?: CompletionStats): BatchRequestCounts {
    const completed = completionStats?.successfulCount ? Number(completionStats.successfulCount) : 0;
    const failed = completionStats?.failedCount ? Number(completionStats.failedCount) : 0;
    const total = completed + failed + (completionStats?.incompleteCount ? Number(completionStats.incompleteCount) : 0);
    return {
      completed,
      failed,
      total,
    };
  }

  private getStatus(status?: JobState): BatchStatus {
    if (!status) {
      return "validating";
    }
    switch (status) {
      case JobState.JOB_STATE_QUEUED:
      case JobState.JOB_STATE_UNSPECIFIED:
        return "validating";
      case JobState.JOB_STATE_PENDING:
      case JobState.JOB_STATE_PARTIALLY_SUCCEEDED:
      case JobState.JOB_STATE_RUNNING:
        return "in_progress";
      case JobState.JOB_STATE_SUCCEEDED:
        return "completed";
      case JobState.JOB_STATE_FAILED:
        return "failed";
      case JobState.JOB_STATE_CANCELLING:
        return "cancelling";
      case JobState.JOB_STATE_CANCELLED:
        return "cancelled";
      case JobState.JOB_STATE_EXPIRED:
        return "expired";
      case JobState.JOB_STATE_PAUSED:
        return "paused";
      case JobState.JOB_STATE_UPDATING:
        return "updating";

      default:
        return "validating";
    }
  }

  async list(options: ListBatchOptions): Promise<SuccessListBatch> {
    const request: ListBatchJobsParameters = {
      config: {
        pageSize: options.limit,
        pageToken: options.after,
      },
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.batches.list(request);

    const batches: Batch[] = [];

    for await (const batch of response) {
      batches.push({
        createdAt: Math.floor(new Date(batch.createTime!).getTime() / 1000),
        endpoint: /embeddings/.test(batch.model || "") ? "embeddings" : "chat/completions",
        inputFileId: batch.src?.fileName || "",
        completedAt: batch.endTime ? Math.floor(new Date(batch.endTime).getTime() / 1000) : undefined,
        requestCounts: this.getRequestCounts(batch.completionStats),
        outputFileId: batch.dest?.fileName || undefined,
        id: response.name || "",
        object: "batch",
        status: this.getStatus(batch.state),
        errors: batch.error,
      });
    }

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      model: this.provider.providerName,
      content: batches,
      has_next_page: response.hasNextPage(),
    };
  }

  async retrieve(id: string, options: OptionsBase): Promise<SuccessRetrieveBatch> {
    const request: GetBatchJobParameters = {
      name: id,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.batches.get(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      model: response.model || "",
      content: {
        createdAt: Math.floor(new Date(response.createTime!).getTime() / 1000),
        endpoint: /embeddings/.test(response.model || "") ? "embeddings" : "chat/completions",
        inputFileId: response.src?.fileName || "",
        completedAt: response.endTime ? Math.floor(new Date(response.endTime).getTime() / 1000) : undefined,
        requestCounts: this.getRequestCounts(response.completionStats),
        outputFileId: response.dest?.fileName || undefined,
        id: response.name || "",
        object: "batch",
        status: this.getStatus(response.state),
        errors: response.error,
      },
    };
  }

  async result(id: string, options: OptionsBase): Promise<SuccessResultBatch> {
    await this.provider.hooks.handleRequest(id);

    const batch = await this.provider.client.batches.get({ name: id });

    if (!batch.dest?.fileName) {
      throw new AISuiteError("Gemini batch output file is not available yet.");
    }

    const isEmbeddings = /embeddings/.test(batch.model || "");
    const tmpPath = join(tmpdir(), `gemini-batch-${Date.now()}.jsonl`);

    await this.provider.client.files.download({ file: batch.dest.fileName, downloadPath: tmpPath });

    const text = await readFile(tmpPath, "utf-8");
    await unlink(tmpPath);

    const lines = text.trim().split("\n").filter(Boolean);

    type GeminiLine<T> = { key: string; response?: T; status?: { code: number; message: string } };

    if (isEmbeddings) {
      type EmbedResponse = { embedding: { values: number[] } };

      const parsed = lines.map(l => JSON.parse(l) as GeminiLine<EmbedResponse>);

      const errors = parsed
        .filter(p => p.status)
        .map(p => ({ customId: p.key, code: String(p.status!.code), message: p.status!.message }));

      const result: EmbeddingtBatchResponse[] = parsed
        .filter(p => p.response)
        .map(p => ({
          customId: p.key,
          id: "",
          content: [p.response!.embedding.values],
          model: batch.model || "",
          object: "list" as const,
        }));

      await this.provider.hooks.handleResponse(id, result, options.metadata ?? {});

      return { success: true, content: result, model: this.provider.providerName, object: "batch.list", errors };
    }

    type ChatResponse = {
      candidates: {
        content: { parts: { text?: string; functionCall?: { name: string; args: Record<string, unknown> } }[] };
      }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
      modelVersion?: string;
    };

    const parsed = lines.map(l => JSON.parse(l) as GeminiLine<ChatResponse>);

    const errors = parsed
      .filter(p => p.status)
      .map(p => ({ customId: p.key, code: String(p.status!.code), message: p.status!.message }));

    const result: ChatCompletionBatchResponse[] = parsed
      .filter(p => p.response)
      .map(p => {
        const resp = p.response!;
        const parts = resp.candidates[0]?.content?.parts ?? [];

        const textPart = parts.find(pt => pt.text != null);
        const content = textPart?.text ?? null;

        let content_object: Record<string, unknown> = {};
        try {
          content_object = JSON5.parse<Record<string, unknown>>(content ?? "");
        } catch (_) {}

        const tools = parts
          .filter(pt => pt.functionCall)
          .map(pt => ({
            id: pt.functionCall!.name,
            type: "function" as const,
            name: pt.functionCall!.name,
            content: pt.functionCall!.args,
            rawContent: JSON.stringify(pt.functionCall!.args),
          }));

        return {
          customId: p.key,
          id: p.key,
          model: resp.modelVersion || batch.model || "",
          object: "chat.completion" as const,
          content,
          content_object,
          tools: tools.length ? tools : undefined,
          usage: resp.usageMetadata
            ? {
                input_tokens: resp.usageMetadata.promptTokenCount ?? 0,
                output_tokens: resp.usageMetadata.candidatesTokenCount ?? 0,
                total_tokens: resp.usageMetadata.totalTokenCount ?? 0,
                cached_tokens: 0,
                reasoning_tokens: 0,
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
        cached_tokens: 0,
        reasoning_tokens: 0,
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
    const request: CancelBatchJobParameters = {
      name: id,
    };

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
