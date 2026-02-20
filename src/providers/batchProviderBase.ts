import type { ProviderBase } from "./_base.js";

export abstract class BatchProviderBase {
  constructor(protected provider: ProviderBase) {
    this.provider = provider;
  }

  abstract create(): Promise<void>;
  abstract list(): Promise<void>;
  abstract retrieve(): Promise<void>;
  abstract cancel(): Promise<void>;
}
