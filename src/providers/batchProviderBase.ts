import type {
  CreateBatchOptions,
  CreateBatchRequest,
  ListBatchOptions,
  SuccessCreateBatch,
  SuccessListBatch,
} from "../types/batch.js";
import type { ProviderBase } from "./_base.js";

export abstract class BatchProviderBase<T extends ProviderBase> {
  constructor(protected provider: T) {
    this.provider = provider;
  }

  abstract create(batch: CreateBatchRequest, options: CreateBatchOptions): Promise<SuccessCreateBatch>;
  abstract list(options: ListBatchOptions): Promise<SuccessListBatch>;
  abstract retrieve(): Promise<void>;
  abstract cancel(): Promise<void>;
}
