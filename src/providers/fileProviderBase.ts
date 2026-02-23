import type { CreateFileOptions, ListFileOptions, SuccessCreateFile, SuccessListFile, SuccessRetrieveFile } from "../types/file.js";
import type { ProviderBase } from "./_base.js";
import type { OptionsBase } from "./types/optionsBase.js";

export abstract class FileProviderBase<T extends ProviderBase = ProviderBase> {
  constructor(protected provider: T) {
    this.provider = provider;
  }

  abstract create(file: Blob, options: CreateFileOptions): Promise<SuccessCreateFile>;
  abstract list(options: ListFileOptions): Promise<SuccessListFile>;
  abstract retrieve(id: string, options: OptionsBase): Promise<SuccessRetrieveFile>;
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
