import type Langfuse from "langfuse";
import type { AnthropicProvider } from "./providers/anthropic/anthropicProvider.js";
import type { GeminiProvider } from "./providers/gemini/geminiProvider.js";
import type { OpenAIProvider } from "./providers/openai/openaiProvider.js";
import type { LangfuseData, OptionsBase } from "./providers/types/optionsBase.js";
import type {
  CreateFileOptions,
  ListFileOptions,
  ResultCreateFile,
  ResultDeleteFile,
  ResultListFile,
} from "./types/file.js";
import type { ErrorAISuite } from "./types/handleErrorResponse.js";
import type { ProviderFileType, ProviderModel } from "./types/providerModel.js";
import type { ResponseBase } from "./types/responseBase.js";
import type { ResultBase } from "./types/resultBase.js";

export class File<S extends string = string> {
  protected openaiKey: string;
  protected anthropicKey: string;
  protected geminiKey: string;
  protected deepseekKey: string;
  protected grokKey: string;
  protected customURL?: string;
  protected customLLMKey?: string;
  protected langFuse?: Langfuse;
  constructor(
    keys: {
      openaiKey?: string;
      anthropicKey?: string;
      geminiKey?: string;
      deepseekKey?: string;
      grokKey?: string;
      customURL?: string;
      customLLMKey?: string;
      langFuse?: Langfuse;
    },
    protected getProvider: (provider: ProviderModel<S>) => OpenAIProvider | AnthropicProvider | GeminiProvider,
    protected resultWhithObservation: <R extends ResultBase>(
      func: () => Promise<R>,
      langfuseOptions: { langfuseData: LangfuseData; model: string; input: unknown },
      provider: OpenAIProvider | AnthropicProvider | GeminiProvider,
      start: number,
    ) => Promise<(R & ResponseBase) | (ErrorAISuite & ResponseBase)>,
  ) {
    this.openaiKey = keys.openaiKey || "";
    this.anthropicKey = keys.anthropicKey || "";
    this.geminiKey = keys.geminiKey || "";
    this.deepseekKey = keys.deepseekKey || "";
    this.grokKey = keys.grokKey || "";
    this.customURL = keys.customURL || "";
    this.customLLMKey = keys.customLLMKey || "";
    this.langFuse = keys.langFuse;
    this.getProvider = getProvider;
    this.resultWhithObservation = resultWhithObservation;
  }

  /**
   *  Creates a file resource on the provider's platform.
   * @partam provider the AI provider to use for file management (e.g., "openai", "anthropic", "gemini").
   * @param file the file to be uploaded, must be a File object and of a supported type (e.g., "text/jsonl").
   * @param options options for file creation, including optional expiration time and metadata for hooks.
   * @return a promise that resolves to the result of the file creation operation, including success status, file details, and provider information.
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
        model: provider,
        input: file,
      },
      p,
      start,
    );
  }

  /**
   *  Lists files available on the provider's platform.
   * @param provider the AI provider to use for file management (e.g., "openai", "anthropic", "gemini").
   * @param options options for listing files, including pagination parameters and metadata for hooks.
   * @return a promise that resolves to the result of the file listing operation, including success status, list of files, and provider information.
   */       
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
        model: provider,
        input: { after: options.after, limit: options.limit },
      },
      p,
      start,
    );
  }

  /**
   * Retrieves a specific file from the provider's platform using its unique identifier.
   * @param provider  the AI provider to use for file management (e.g., "openai", "anthropic", "gemini").
   * @param id  the unique identifier of the file to be retrieved.
   * @param options options for retrieving the file, including metadata for hooks.
   * @returns a promise that resolves to the result of the file retrieval operation, including success status, file details, and provider information.
   */
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
        model: provider,
        input: id,
      },
      p,
      start,
    );
  }

  /**
   *  Deletes a specific file from the provider's platform using its unique identifier.
   * @param provider the AI provider to use for file management (e.g., "openai", "anthropic", "gemini").
   * @param id the unique identifier of the file to be deleted.
   * @param options options for deleting the file, including metadata for hooks.
   * @returns a promise that resolves to the result of the file deletion operation, including success status and provider information.
   */
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
        model: provider,
        input: id,
      },
      p,
      start,
    );
  }
}
