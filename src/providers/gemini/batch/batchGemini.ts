import type { BatchJob, CompletionStats, GetBatchJobParameters, ListBatchJobsParameters } from "@google/genai";
import { JobState } from "@google/genai";
import type { BatchRequestCounts } from "openai/resources";
import type {
  Batch,
  BatchStatus,
  CreateBatchOptions,
  CreateBatchRequest,
  ListBatchOptions,
  SuccessCreateBatch,
  SuccessListBatch,
  SuccessRetrieveBatch,
} from "../../../types/batch.js";
import { BatchProviderBase } from "../../batchProviderBase.js";
import type { OptionsBase } from "../../types/optionsBase.js";
import type { GeminiProvider } from "../geminiProvider.js";

export class BatchGemini extends BatchProviderBase<GeminiProvider> {
  async create(batch: CreateBatchRequest, options: CreateBatchOptions): Promise<SuccessCreateBatch> {
    const request = {
      src: {
        fileName: batch.inputFileId,
      },
      model: this.provider.model,
    };

    await this.provider.hooks.handleRequest(request);

    let response: BatchJob;
    if (batch.endpoint === "chat/completions") {
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
        endpoint: batch.endpoint,
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

  cancel(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
