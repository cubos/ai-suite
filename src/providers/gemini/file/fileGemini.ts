import type { FileOptions, SuccessCreateFile } from "../../../types/file.js";
import { FileProviderBase } from "../../fileProviderBase.js";
import type { GeminiProvider } from "../geminiProvider.js";

export class FileGemini extends FileProviderBase<GeminiProvider> {
  async create(file: File, options: FileOptions): Promise<SuccessCreateFile> {
    this.checkFileSupport(file);

    const request = {
      file: file,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.files.upload(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      id: response.name || "",
      bytes: response.sizeBytes ? Number(response.sizeBytes) : 0,
      created_at: response.createTime ? Math.floor(new Date(response.createTime!).getTime() / 1000) : 0,
      filename: response.name || "",
      object: "file",
      success: true,
      content: file,
      model: this.provider.model,
      expires_at: response.expirationTime ? Math.floor(new Date(response.expirationTime).getTime() / 1000) : undefined,
    };
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
