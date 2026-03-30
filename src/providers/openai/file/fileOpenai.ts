import type { FileCreateParams } from "openai/resources";
import type { FileListParams } from "openai/resources.js";
import type {
  CreateFileOptions,
  ListFileOptions,
  SuccessCreateFile,
  SuccessDeleteFile,
  SuccessListFile,
  SuccessRetrieveFile,
} from "../../../types/file.js";
import { FileProviderBase } from "../../fileProviderBase.js";
import type { OptionsBase } from "../../types/optionsBase.js";
import type { OpenAIProvider } from "../openaiProvider.js";

export class FileOpenAI extends FileProviderBase<OpenAIProvider> {
  async create(file: File, options: CreateFileOptions): Promise<SuccessCreateFile> {
    await this.checkFileSupport(file);

    const request: FileCreateParams = {
      file: file,
      purpose: "batch", // file oly supports batch purpose as of now.
      expires_after: options.expires_after,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.files.create(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      content: {
        id: response.id,
        bytes: response.bytes,
        created_at: response.created_at,
        filename: response.filename,
        object: "file",
        expires_at: response.expires_at,
      },
      model: this.provider.providerName,
    };
  }

  async list(options: ListFileOptions): Promise<SuccessListFile> {
    const request: FileListParams = {
      after: options.after,
      limit: options.limit ?? 10,
    };
    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.files.list(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      model: this.provider.providerName,
      content: response.data.map(file => ({
        id: file.id,
        bytes: file.bytes,
        created_at: file.created_at,
        filename: file.filename,
        object: "file",
        expires_at: file.expires_at,
      })),
      has_next_page: response.has_more,
    };
  }

  async retrieve(id: string, options: OptionsBase): Promise<SuccessRetrieveFile> {
    const request = id;

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.files.retrieve(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      content: {
        id: response.id,
        bytes: response.bytes,
        created_at: response.created_at,
        filename: response.filename,
        object: "file",
        expires_at: response.expires_at,
      },
      model: this.provider.providerName,
    };
  }
  async delete(id: string, options: OptionsBase): Promise<SuccessDeleteFile> {
    const request = id;

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.files.delete(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      content: {
        id: response.id,
        object: "file",
      },
      model: this.provider.providerName,
    };
  }
}
