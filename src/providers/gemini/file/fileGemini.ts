import type { ListFilesParameters, UploadFileParameters } from "@google/genai";
import type {
  CreateFileOptions,
  FileResponse,
  ListFileOptions,
  SuccessCreateFile,
  SuccessDeleteFile,
  SuccessListFile,
  SuccessRetrieveFile,
} from "../../../types/file.js";
import { FileProviderBase } from "../../fileProviderBase.js";
import type { OptionsBase } from "../../types/optionsBase.js";
import type { GeminiProvider } from "../geminiProvider.js";

export class FileGemini extends FileProviderBase<GeminiProvider> {
  async create(file: File, options: CreateFileOptions): Promise<SuccessCreateFile> {
    await this.checkFileSupport(file);

    const request: UploadFileParameters = {
      file: file,
      config: {
        displayName: file.name,
      },
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.files.upload(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      content: {
        id: response.name || "",
        bytes: response.sizeBytes ? Number(response.sizeBytes) : 0,
        created_at: response.createTime ? Math.floor(new Date(response.createTime!).getTime() / 1000) : 0,
        filename: response.displayName || "",
        object: "file",
        expires_at: response.expirationTime
          ? Math.floor(new Date(response.expirationTime).getTime() / 1000)
          : undefined,
      },
      model: this.provider.providerName,
    };
  }
  async list(options: ListFileOptions): Promise<SuccessListFile> {
    const request: ListFilesParameters = {
      config: {
        pageSize: options.limit ?? 10,
        pageToken: options.after,
      },
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.files.list(request);

    const files: FileResponse[] = [];

    for await (const file of response) {
      files.push({
        id: file.name || "",
        bytes: file.sizeBytes ? Number(file.sizeBytes) : 0,
        created_at: file.createTime ? Math.floor(new Date(file.createTime!).getTime() / 1000) : 0,
        filename: file.displayName || "",
        object: "file",
        expires_at: file.expirationTime ? Math.floor(new Date(file.expirationTime).getTime() / 1000) : undefined,
      });
    }

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      model: this.provider.providerName,
      content: files,
      has_next_page: response.hasNextPage(),
    };
  }

  async retrieve(id: string, options: OptionsBase): Promise<SuccessRetrieveFile> {
    const request = {
      name: id,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.files.get(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      content: {
        id: response.name || "",
        bytes: response.sizeBytes ? Number(response.sizeBytes) : 0,
        created_at: response.createTime ? Math.floor(new Date(response.createTime!).getTime() / 1000) : 0,
        filename: response.displayName || "",
        object: "file",
        expires_at: response.expirationTime
          ? Math.floor(new Date(response.expirationTime).getTime() / 1000)
          : undefined,
      },
      model: this.provider.providerName,
    };
  }

  async delete(id: string, options: OptionsBase): Promise<SuccessDeleteFile> {
    const request = {
      name: id,
    };

    await this.provider.hooks.handleRequest(request);

    const response = await this.provider.client.files.delete(request);

    await this.provider.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      content: {
        id: id,
        object: "file",
      },
      model: this.provider.providerName,
    };
  }
}
