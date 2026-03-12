import type {
  BatchJob,
  CancelBatchJobParameters,
  CompletionStats,
  GetBatchJobParameters,
  ListBatchJobsParameters,
} from "@google/genai";
import { JobState } from "@google/genai";
import { toGeminiSchema } from "gemini-zod";
import type { BatchRequestCounts } from "openai/resources";
import type {
  Batch,
  BatchStatus,
  CreateBatchArgs,
  ListBatchOptions,
  SuccessCancelBatch,
  SuccessCreateBatch,
  SuccessListBatch,
  SuccessRetrieveBatch,
} from "../../../types/batch.js";
import { BatchProviderBase } from "../../batchProviderBase.js";
import type { OptionsBase } from "../../types/optionsBase.js";
import { notUseThinkingConfig } from "../constants/notUseThinkingConfig.js";
import { onlyWorksWithThinking } from "../constants/onlyWorksWithThinking.js";
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
        let thinkingConfig: { thinkingBudget: number; includeThoughts: boolean } | null = null;
        if (onlyWorksWithThinking.includes(this.provider.model)) {
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
          ...(options.responseFormat === "json_schema"
            ? { responseSchema: toGeminiSchema(options.zodSchema) }
            : {}),
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
