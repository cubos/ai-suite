import type { FileCreateParams } from "openai/resources";
import type { FileListParams } from "openai/resources.js";
import type { CreateFileOptions, ListFileOptions, SuccessCreateFile, SuccessListFile } from "../../../types/file.js";
import { FileProviderBase } from "../../fileProviderBase.js";
import type { OpenAIProvider } from "../openaiProvider.js";

export class FileOpenAI extends FileProviderBase<OpenAIProvider> {
  async create(file: File, options: CreateFileOptions): Promise<SuccessCreateFile> {
    this.checkFileSupport(file);

    const request: FileCreateParams = {
      file: file,
      purpose: "batch", // file oly supports batch purpose as of now.
      expires_after: options.expires_after,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.files.create(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      id: response.id,
      bytes: response.bytes,
      created_at: response.created_at,
      filename: response.filename,
      object: "file",
      success: true,
      content: file,
      model: this.provider.model,
      expires_at: response.expires_at,
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
      model: this.provider.model,
      content: response.data.map((file) => ({
        id: file.id,
        bytes: file.bytes,
        created_at: file.created_at,
        filename: file.filename,
        object:  "file",
        expires_at: file.expires_at, 
      })),
      has_next_page: response.has_more,
    };
  }
    
  
  retrieve(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  delete(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
