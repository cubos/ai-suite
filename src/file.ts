import type { AnthropicProvider } from "./providers/anthropic/anthropicProvider.js";
import type { GeminiProvider } from "./providers/gemini/geminiProvider.js";
import type { OpenAIProvider } from "./providers/openai/openaiProvider.js";
import type { LangfuseData } from "./providers/types/optionsBase.js";
import type { ErrorAISuite } from "./types/handleErrorResponse.js";
import type { ProviderModel } from "./types/providerModel.js";
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

  async create(): Promise<void> {
    console.log("File create not implemented for provider");
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
