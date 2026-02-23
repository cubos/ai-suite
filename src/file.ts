import type { AnthropicProvider } from "./providers/anthropic/anthropicProvider.js";
import type { GeminiProvider } from "./providers/gemini/geminiProvider.js";
import type { OpenAIProvider } from "./providers/openai/openaiProvider.js";
import type { LangfuseData } from "./providers/types/optionsBase.js";
import type { CreateFileOptions, ResultCreateFile } from "./types/file.js";
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
  async create(provider: ProviderFileType, file: globalThis.File, options: CreateFileOptions): Promise<ResultCreateFile> {
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

  async list(): Promise<void> {
    console.log("File list not implemented for provider");
  }

  async retrieve(): Promise<void> {
    console.log("File retrieve  not implemented for provider");
  }

  async delete(): Promise<void> {
    console.log("File delete not implemented for provider");
  }
}
