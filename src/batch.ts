import type Langfuse from "langfuse";
import type { AnthropicProvider } from "./providers/anthropic/anthropicProvider.js";
import type { GeminiProvider } from "./providers/gemini/geminiProvider.js";
import type { OpenAIProvider } from "./providers/openai/openaiProvider.js";
import type { LangfuseData } from "./providers/types/optionsBase.js";
import type { ErrorAISuite } from "./types/handleErrorResponse.js";
import type { ProviderModel } from "./types/providerModel.js";
import type { ResponseBase } from "./types/responseBase.js";
import type { ResultBase } from "./types/resultBase.js";

export class Batch<S extends string = string> {
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

  async create(): Promise<void> {
    console.log("Batch create not implemented for provider");
  }

  async list(): Promise<void> {
    console.log("Batch list not implemented for provider");
  }

  async retrieve(): Promise<void> {
    console.log("Batch retrieve not implemented for provider");
  }

  async cancel(): Promise<void> {
    console.log("Batch cancel not implemented for provider");
  }
}
