import { FileProviderBase } from "../../fileProviderBase.js";
import type { GeminiProvider } from "../geminiProvider.js";

export class FileGemini extends FileProviderBase<GeminiProvider> {
  async create(file: File): Promise<void> {
    this.checkFileSupport(file);
    this.provider.client.files.upload({
      file: file,
    });
    throw new Error("Method not implemented.");
  }
  list(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  retrieve(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  delete(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
