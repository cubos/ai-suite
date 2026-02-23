import type { FileOptions, SuccessCreateFile } from "../../../types/file.js";
import { FileProviderBase } from "../../fileProviderBase.js";
import type { AnthropicProvider } from "../index.js";

export class FileAnthropic extends FileProviderBase<AnthropicProvider> {
  async create(file: File, options: FileOptions): Promise<SuccessCreateFile> {
    this.checkFileSupport(file);

    const request = {
      file: file,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.beta.files.upload(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      id: response.id,
      bytes: response.size_bytes,
      created_at: response.created_at ? Math.floor(new Date(response.created_at).getTime() / 1000) : 0,
      filename: response.filename,
      object: "file",
      success: true,
      content: file,
      model: this.provider.model,
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
