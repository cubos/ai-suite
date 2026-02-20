import type { AnthropicProvider } from "./providers/anthropic/anthropicProvider.js";
import type { GeminiProvider } from "./providers/gemini/geminiProvider.js";
import type { OpenAIProvider } from "./providers/openai/openaiProvider.js";
import type { LangfuseData } from "./providers/types/optionsBase.js";
import type { ErrorAISuite } from "./types/handleErrorResponse.js";
import type { ProviderModel } from "./types/providerModel.js";
import type { ResponseBase } from "./types/responseBase.js";
import type { ResultBase } from "./types/resultBase.js";

export class Batch<S extends string = string> {
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
    console.log("Batch create called for provider", this.getProvider("openai/gpt-4o-mini").batch.create);
  }

  async list(): Promise<void> {
    console.log("Batch list called for provider", this.getProvider("openai/gpt-4o-mini").batch.list);
  }

  async retrieve(): Promise<void> {
    console.log("Batch retrieve called for provider", this.getProvider("openai/gpt-4o-mini").batch.retrieve);
  }

  async cancel(): Promise<void> {
    console.log("Batch cancel called for provider", this.getProvider("openai/gpt-4o-mini").batch.cancel);
  }
}
