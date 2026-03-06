import type {
  CreateBatchOptions,
  CreateBatchRequest,
  ListBatchOptions,
  SuccessCancelBatch,
  SuccessCreateBatch,
  SuccessListBatch,
  SuccessRetrieveBatch,
} from "../types/batch.js";
import type { ProviderBase } from "./_base.js";
import type { OptionsBase } from "./types/optionsBase.js";

export abstract class BatchProviderBase<T extends ProviderBase = ProviderBase> {
  constructor(protected provider: T) {
    this.provider = provider;
  }

  abstract create(batch: CreateBatchRequest, options: CreateBatchOptions): Promise<SuccessCreateBatch>;
  abstract list(options: ListBatchOptions): Promise<SuccessListBatch>;
  abstract retrieve(id: string, options: OptionsBase): Promise<SuccessRetrieveBatch>;
  abstract cancel(id: string, options: OptionsBase): Promise<SuccessCancelBatch>;
}
