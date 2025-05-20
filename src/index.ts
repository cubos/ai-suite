import { MessageModel, ResultChatCompletion } from "./types/chat.js";
import { OpenAIModels, OpenAIProvider } from "./providers/openai.js";
import { AnthropicModels, AnthropicProvider } from "./providers/anthropic.js";
import { GeminiModels, GeminiProvider } from "./providers/gemini.js";
import { ChatOptions } from "./providers/_base.js";
import { DeepSeekModels, DeepSeekProvider } from "./providers/deepseek.js";
import { Langfuse } from "langfuse";
import dotenv from "dotenv";
import { CustomLLMModels, CustomLLMProvider } from "./providers/customLLM.js";
import { GrokModels, GrokProvider } from "./providers/grok.js";

dotenv.config();

export type ProviderModel =
  | `openai/${OpenAIModels}`
  | `anthropic/${AnthropicModels}`
  | `gemini/${GeminiModels}`
  | `deepseek/${DeepSeekModels}`
  | `custom-llm/${CustomLLMModels}`
  | `grok/${GrokModels}`;

export class AISuite {
  private openaiKey: string;
  private anthropicKey: string;
  private geminiKey: string;
  private deepseekKey: string;
  private grokKey: string;
  private langFuse?: Langfuse;
  private customURL?: string;
  private applicationName = "ai-suite";

  constructor(
    keys: {
      openaiKey?: string;
      anthropicKey?: string;
      geminiKey?: string;
      deepseekKey?: string;
      grokKey?: string;
      customURL?: string;
    },
    options?: {
      langFuse?: Langfuse;
    }
  ) {
    this.openaiKey = keys.openaiKey || "";
    this.anthropicKey = keys.anthropicKey || "";
    this.geminiKey = keys.geminiKey || "";
    this.deepseekKey = keys.deepseekKey || "";
    this.grokKey = keys.grokKey || "";
    this.customURL = keys.customURL || "";
    this.langFuse = options?.langFuse;
  }

  /**
   * Create a chat completion with multiple providers
   * @param providers - The providers to use
   * @param messages - The messages to send to the providers
   * @param options - The options to use
   * @returns The chat completion
   */
  async createChatCompletionMultiResult<T extends ProviderModel>(
    providers: T[],
    messages: MessageModel[],
    options: { stream: false } & ChatOptions = {
      stream: false,
      responseFormat: "text" as const,
      temperature: 0.7,
    }
  ): Promise<{ [key in T]: ResultChatCompletion }[]> {
    // handle possible errors from the providers
    const results = await Promise.all(
      providers.map(async (p) => {
        return {
          [p]: await this.createChatCompletion(p, messages, options),
        };
      })
    );

    return results as { [key in ProviderModel]: ResultChatCompletion }[];
  }

  /**
   * Create a chat completion
   * @param provider - The provider to use
   * @param messages - The messages to send to the provider
   * @param options - The options to use
   * @returns The chat completion
   */
  async createChatCompletion(
    provider: ProviderModel,
    messages: MessageModel[],
    options?: { stream: false } & ChatOptions
  ): Promise<ResultChatCompletion>;

  /**
   * Create a chat completion with streaming
   * @param provider - The provider to use
   * @param messages - The messages to send to the provider
   * @param options - The options to use
   * @returns A stream of the chat completion
   */
  // async createChatCompletion(
  //   provider: ProviderModel,
  //   messages: MessageModel[],
  //   options?: { stream: true } & Partial<ChatOptions>
  // ): Promise<Readable>;

  async createChatCompletion(
    provider: ProviderModel,
    messages: MessageModel[],
    options?: ChatOptions
  ): Promise<ResultChatCompletion> {
    const opts = {
      stream: false,
      responseFormat: "text" as const,
      temperature: 0.7,
      ...options,
    };

    const start = Date.now();

    if (opts.stream) {
      return {
        success: false,
        error: "Streaming is not supported",
        raw: new Error("Streaming is not supported"),
        tag: "InvalidRequest",
        created: start,
        model: provider.split("/")[1],
        execution_time: Date.now() - start,
      };
    }

    const trace = this.langFuse?.trace({
      name: `${this.applicationName}`,
    });

    const generation = trace?.generation({
      name: "create-chat-completion",
      model: provider.split("/")[1],
      input: messages,
    });

    const p = this.getProvider(provider);

    try {
      const result = await p.createChatCompletion(messages, opts);
      const end = Date.now();

      generation?.end({
        output: result,
      });

      return {
        ...result,
        execution_time: end - start,
      };
    } catch (error) {
      const result = p.handleError(error as Error);
      const end = Date.now();
      generation?.end({
        output: error,
      });

      return {
        success: false,
        ...result,
        created: start,
        model: provider.split("/")[1],
        execution_time: end - start,
      };
    }
  }

  private getProvider(provider: ProviderModel) {
    const [providerName, model] = provider.split("/");
    if (providerName === "openai") {
      return new OpenAIProvider(this.openaiKey, model);
    } else if (providerName === "anthropic") {
      return new AnthropicProvider(this.anthropicKey, model);
    } else if (providerName === "gemini") {
      return new GeminiProvider(this.geminiKey, model);
    } else if (providerName === "deepseek") {
      return new DeepSeekProvider(
        this.deepseekKey,
        model,
        "https://api.deepseek.com/v1"
      );
    } else if (providerName === "custom-llm") {
      if (!this.customURL) {
        throw new Error(
          `Need to provide a custom URL for the custom-llm provider`
        );
      }
      return new CustomLLMProvider("not-needed", model, this.customURL);
    } else if (providerName === "grok") {
      return new GrokProvider(this.grokKey, model, "https://api.x.ai/v1");
    }
    throw new Error(`Unsupported provider: ${providerName}`);
  }
}
