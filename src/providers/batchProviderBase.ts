import type { CreateBatchOptions, CreateBatchRequest, SuccessCreateBatch } from "../types/batch.js";
import type { ProviderBase } from "./_base.js";

export abstract class BatchProviderBase<T extends ProviderBase> {
  constructor(protected provider: T) {
    this.provider = provider;
  }

  abstract create(batch: CreateBatchRequest, options: CreateBatchOptions): Promise<SuccessCreateBatch>;
  abstract list(): Promise<void>;
  abstract retrieve(): Promise<void>;
  abstract cancel(): Promise<void>;
}
