import type { AnthropicProvider } from "./providers/anthropic/anthropicProvider.js";
import type { GeminiProvider } from "./providers/gemini/geminiProvider.js";
import type { OpenAIProvider } from "./providers/openai/openaiProvider.js";
import type { LangfuseData, OptionsBase } from "./providers/types/optionsBase.js";
import type { CreateFileOptions, ListFileOptions, ResultCreateFile, ResultDeleteFile, ResultListFile } from "./types/file.js";
import type { ErrorAISuite } from "./types/handleErrorResponse.js";
import type { ProviderFileType, ProviderModel } from "./types/providerModel.js";
import type { ResponseBase } from "./types/responseBase.js";
import type { ResultBase } from "./types/resultBase.js";

export class File<S extends string = string> {
  constructor(
    protected getProvider: (provider: ProviderModel<S>) => OpenAIProvider | AnthropicProvider | GeminiProvider,
    protected resultWhithObservation: <R extends ResultBase>(
      func: () => Promise<R>,
      langfuseOptions: { langfuseData: LangfuseData; model: string; input: unknown },
      provider: OpenAIProvider | AnthropicProvider | GeminiProvider,
      start: number,
    ) => Promise<(R & ResponseBase) | (ErrorAISuite & ResponseBase)>,
  ) {
    this.getProvider = getProvider;
    this.resultWhithObservation = resultWhithObservation;
  }

  /**
   *  Creates a file resource on the provider's platform.
   * @param file file to be uploaded, must be a Blob (e.g., File) and of supported type (e.g., "text/jsonl").
   * @param options  options for file creation, including optional expiration time.
   */
  async create(
    provider: ProviderFileType,
    file: globalThis.File,
    options: CreateFileOptions,
  ): Promise<ResultCreateFile> {
    const start = Date.now();
    const p = this.getProvider(provider);

    return this.resultWhithObservation(
      () => p.file.create(file, options),
      {
        langfuseData: {
          name: "create-file",
          tags: ["file", provider],
        },
        model: p.model,
        input: file,
      },
      p,
      start,
    );
  }

  async list(provider: ProviderFileType, options: ListFileOptions): Promise<ResultListFile> {
    const start = Date.now();
    const p = this.getProvider(provider);

    return this.resultWhithObservation(
      () => p.file.list(options),
      {
        langfuseData: {
          name: "list-files",
          tags: ["file", provider],
        },
        model: p.model,
        input: { after: options.after, limit: options.limit },
      },
      p,
      start,
    );
  }

  async retrieve(provider: ProviderFileType, id: string, options: OptionsBase): Promise<ResultCreateFile> {
    const start = Date.now();
    const p = this.getProvider(provider);

    return this.resultWhithObservation(
      () => p.file.retrieve(id, options),
      {
        langfuseData: {
          name: "retrieve-file",
          tags: ["file", provider],
        },
        model: p.model,
        input: id,
      },
      p,
      start,
    );
  }

  async delete(provider: ProviderFileType, id: string, options: OptionsBase): Promise<ResultDeleteFile> {
    const start = Date.now();
    const p = this.getProvider(provider);

    return this.resultWhithObservation(
      () => p.file.delete(id, options),
      {
        langfuseData: {
          name: "delete-file",
          tags: ["file", provider],
        },
        model: p.model,
        input: id,
      },
      p,
      start,
    );
  }
}
