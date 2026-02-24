import type {
  CreateFileOptions,
  ListFileOptions,
  SuccessCreateFile,
  SuccessDeleteFile,
  SuccessListFile,
  SuccessRetrieveFile,
} from "../types/file.js";
import type { ProviderBase } from "./_base.js";
import type { OptionsBase } from "./types/optionsBase.js";

export abstract class FileProviderBase<T extends ProviderBase = ProviderBase> {
  constructor(protected provider: T) {
    this.provider = provider;
  }

  abstract create(file: Blob, options: CreateFileOptions): Promise<SuccessCreateFile>;
  abstract list(options: ListFileOptions): Promise<SuccessListFile>;
  abstract retrieve(id: string, options: OptionsBase): Promise<SuccessRetrieveFile>;
  abstract delete(id: string, options: OptionsBase): Promise<SuccessDeleteFile>;

  async checkFileSupport(file: File): Promise<void> {
    if (!(file instanceof File)) {
      throw new Error("The provided input is not a valid File object.");
    }

    const supportedTypes = [".jsonl"];
    if (!file.name.endsWith(".jsonl") || file.type !== "text/jsonl") {
      throw new Error(`Unsupported file type: ${file.type}. Supported types are: ${supportedTypes.join(", ")}`);
    }

    // verify if the file is a valid JSONL by reading its content
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());

      // check if each line is a valid JSON object
      lines.every(line => {
        try {
          JSON.parse(line);
        } catch {
          throw new Error("Invalid JSONL format: Each line must be a valid JSON object.");
        }
      });
    } catch (error) {
      throw error;
    }
  }
}
