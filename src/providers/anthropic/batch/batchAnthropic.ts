import { BatchCreateParams } from "openai/resources";
import { CreateBatchOptions, CreateBatchRequest, SuccessCreateBatch } from "../../../types/batch.js";
import { BatchProviderBase } from "../../batchProviderBase.js";
import { AnthropicProvider } from "../index.js";

export class BatchAnthropic extends BatchProviderBase<AnthropicProvider> {
  async create(batch: CreateBatchRequest, options: CreateBatchOptions): Promise<SuccessCreateBatch> {
    const request: BatchCreateParams = {
      input_file_id: batch.inputFileId,
      endpoint: `/v1/${batch.endpoint}`,
      completion_window: "24h",
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.messages.batches.create(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      ...response,
      success: true,
      content: null,
      model: this.provider.model,
      createdAt: Math.floor(Date.now() / 1000),
      endpoint: batch.endpoint,
      inputFileId: response.input_file_id,
      completedAt: response.completed_at ? Math.floor(new Date(response.completed_at).getTime() / 1000) : undefined,
      requestCounts: this.getRequestCounts(response.request_counts),
      outputFileId: response.output_file_id,
      id: response.id,
      object: "batch",
      status: this.getStatus(response.status),
    };
  }
  list(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  retrieve(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  cancel(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
