import type { FileOptions } from "../../../types/file.js";
import { FileProviderBase } from "../../fileProviderBase.js";
import type { AnthropicProvider } from "../index.js";

export class FileAnthropic extends FileProviderBase<AnthropicProvider> {
  async create(file: File, options: FileOptions): Promise<void> {
    this.checkFileSupport(file);

    const request = {
      file: file,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.beta.files.upload(request);

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
