import type { ProviderBase } from "./_base.js";

export abstract class FileProviderBase {
  constructor(protected provider: ProviderBase) {
    this.provider = provider;
  }

  abstract create(): Promise<void>;
  abstract list(): Promise<void>;
  abstract retrieve(): Promise<void>;
  abstract delete(): Promise<void>;
}
