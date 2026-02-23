import type { FileCreateParams } from "openai/resources";
import type { FileOptions } from "../../../types/file.js";
import { FileProviderBase } from "../../fileProviderBase.js";
import type { OpenAIProvider } from "../openaiProvider.js";

export class FileOpenAI extends FileProviderBase<OpenAIProvider> {
  async create(file: File, options: FileOptions): Promise<void> {
    this.checkFileSupport(file);

    const request: FileCreateParams = {
      file: file,
      purpose: "batch", // file oly supports batch purpose as of now.
      expires_after: options.expires_after,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.files.create(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});
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
