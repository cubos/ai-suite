import type { FileOptions } from "../types/file.js";
import type { ProviderBase } from "./_base.js";

export abstract class FileProviderBase<T extends ProviderBase = ProviderBase> {
  constructor(protected provider: T) {
    this.provider = provider;
  }

  abstract create(file: Blob, options: FileOptions): Promise<void>;
  abstract list(): Promise<void>;
  abstract retrieve(): Promise<void>;
  abstract delete(): Promise<void>;

  checkFileSupport(file: File): void {
    if (!(file instanceof File)) {
      throw new Error("The provided input is not a valid File object.");
    }

    const supportedTypes = ["text/jsonl"];
    if (!supportedTypes.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Supported types are: ${supportedTypes.join(", ")}`);
    }
  }
}
