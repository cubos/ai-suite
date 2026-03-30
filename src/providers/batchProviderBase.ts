import type {
  CreateBatchArgs,
  ListBatchOptions,
  SuccessCancelBatch,
  SuccessCreateBatch,
  SuccessListBatch,
  SuccessResultBatch,
  SuccessRetrieveBatch,
} from "../types/batch.js";
import type { ProviderBase } from "./_base.js";
import type { OptionsBase } from "./types/optionsBase.js";

export abstract class BatchProviderBase<T extends ProviderBase = ProviderBase> {
  constructor(protected provider: T) {
    this.provider = provider;
  }

  abstract create(args: CreateBatchArgs): Promise<SuccessCreateBatch>;
  abstract list(options: ListBatchOptions): Promise<SuccessListBatch>;
  abstract retrieve(id: string, options: OptionsBase): Promise<SuccessRetrieveBatch>;
  abstract cancel(id: string, options: OptionsBase): Promise<SuccessCancelBatch>;
  abstract result(id: string, options: OptionsBase): Promise<SuccessResultBatch>;
}
