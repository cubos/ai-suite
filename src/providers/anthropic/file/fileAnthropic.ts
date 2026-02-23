import type { FileListParams } from "@anthropic-ai/sdk/resources/beta.mjs";
import type {
  CreateFileOptions,
  ListFileOptions,
  SuccessCreateFile,
  SuccessListFile,
  SuccessRetrieveFile,
} from "../../../types/file.js";
import { FileProviderBase } from "../../fileProviderBase.js";
import type { OptionsBase } from "../../types/optionsBase.js";
import type { AnthropicProvider } from "../index.js";

export class FileAnthropic extends FileProviderBase<AnthropicProvider> {
  async create(file: File, options: CreateFileOptions): Promise<SuccessCreateFile> {
    this.checkFileSupport(file);

    const request = {
      file: file,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.beta.files.upload(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      content: {
        id: response.id,
        bytes: response.size_bytes,
        created_at: response.created_at ? Math.floor(new Date(response.created_at).getTime() / 1000) : 0,
        filename: response.filename,
        object: "file",
      },
      model: this.provider.model,
    };
  }

  async list(options: ListFileOptions): Promise<SuccessListFile> {
    const request: FileListParams = {
      after_id: options.after,
      limit: options.limit ?? 10,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.beta.files.list(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      model: this.provider.model,
      content: response.data.map(file => ({
        id: file.id,
        bytes: file.size_bytes,
        created_at: file.created_at ? Math.floor(new Date(file.created_at).getTime() / 1000) : 0,
        filename: file.filename,
        object: "file",
      })),
      has_next_page: response.has_more,
    };
  }

  async retrieve(id: string, options: OptionsBase): Promise<SuccessRetrieveFile> {
    const request = id;

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.beta.files.retrieveMetadata(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      content: {
        id: response.id,
        bytes: response.size_bytes,
        created_at: response.created_at ? Math.floor(new Date(response.created_at).getTime() / 1000) : 0,
        filename: response.filename,
        object: "file",
      },
      model: this.provider.model,
    };
  }

  delete(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
