import dotenv from "dotenv";
import type { Langfuse } from "langfuse";
import type { ChatOptions } from "./providers/_base.js";
import { type AnthropicModels, AnthropicProvider } from "./providers/anthropic.js";
import { CustomLLMProvider } from "./providers/customLLM/index.js";
import { type DeepSeekModels, DeepSeekProvider } from "./providers/deepseek.js";
import { type GeminiModels, GeminiProvider } from "./providers/gemini.js";
import { type GrokModels, GrokProvider } from "./providers/grok/index.js";
import { type OpenAIModels, OpenAIProvider } from "./providers/openai.js";
import type { MessageModel, ResultChatCompletion } from "./types/chat.js";

dotenv.config();

export type ProviderModel<S extends string> =
  | `openai/${OpenAIModels}`
  | `anthropic/${AnthropicModels}`
  | `gemini/${GeminiModels}`
  | `deepseek/${DeepSeekModels}`
  | `custom-llm/${S}`
  | `grok/${GrokModels}`;

export class AISuite<S extends string = string> {
  private openaiKey: string;
  private anthropicKey: string;
  private geminiKey: string;
  private deepseekKey: string;
  private grokKey: string;
  private langFuse?: Langfuse;
  private customURL?: string;
  private customLLMKey?: string;
  public hooks?: {
    handleRequest?: (req: unknown) => Promise<void>;
    handleResponse?: (req: unknown, res: unknown, metadata: Record<string, unknown>) => Promise<void>;
    failOnError?: boolean;
  };

  constructor(
    keys: {
      openaiKey?: string;
      anthropicKey?: string;
      geminiKey?: string;
      deepseekKey?: string;
      grokKey?: string;
      customURL?: string;
      customLLMKey?: string;
    },
    options?: {
      hooks?: {
        handleRequest?: (req: unknown) => Promise<void>;
        handleResponse?: (req: unknown, res: unknown, metadata: Record<string, unknown>) => Promise<void>;
        failOnError?: boolean;
      };
      langFuse?: Langfuse;
    },
  ) {
    this.openaiKey = keys.openaiKey || "";
    this.anthropicKey = keys.anthropicKey || "";
    this.geminiKey = keys.geminiKey || "";
    this.deepseekKey = keys.deepseekKey || "";
    this.grokKey = keys.grokKey || "";
    this.customURL = keys.customURL || "";
    this.customLLMKey = keys.customLLMKey || "";
    this.langFuse = options?.langFuse;
    this.hooks = options?.hooks;
  }

  /**
   * Create a chat completion with multiple providers
   * @param providers - The providers to use
   * @param messages - The messages to send to the providers
   * @param options - The options to use
   * @returns The chat completion
   */
  async createChatCompletionMultiResult<T extends ProviderModel<S>>(
    providers: T[],
    messages: MessageModel[],
    options: { stream: false } & ChatOptions = {
      stream: false,
      responseFormat: "text" as const,
      temperature: 0.7,
    },
  ): Promise<ResultChatCompletion[]> {
    return Promise.all(providers.map(async p => this.createChatCompletion(p, messages, options)));
  }

  /**
   * Create a chat completion
   * @param provider - The provider to use
   * @param messages - The messages to send to the provider
   * @param options - The options to use
   * @returns The chat completion
   */
  async createChatCompletion(
    provider: ProviderModel<S>,
    messages: MessageModel[],
    options?: { stream: false } & ChatOptions,
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
    provider: ProviderModel<S>,
    messages: MessageModel[],
    options?: ChatOptions,
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
      ...(options?.metadata?.langFuse?.sessionId ? { sessionId: options?.metadata?.langFuse?.sessionId } : {}),
      name: options?.metadata?.langFuse?.name ?? "create-chat-completion",
      tags: options?.metadata?.langFuse?.tags ?? [],
      environment: options?.metadata?.langFuse?.environment ?? "default",
      ...(options?.metadata?.langFuse?.userId ? { userId: options?.metadata?.langFuse?.userId } : {}),
    });

    const generation = trace?.generation({
      environment: options?.metadata?.langFuse?.environment ?? "default",
      name: options?.metadata?.langFuse?.name ?? "create-chat-completion",
      model: provider.split("/")[1],
      input: messages,
    });

    const p = this.getProvider(provider);

    try {
      const result = await p.createChatCompletion(messages, opts);
      const end = Date.now();

      generation?.end({
        usage: {
          input: result.usage?.input_tokens ?? 0,
          output: result.usage?.output_tokens ?? 0,
          total: result.usage?.total_tokens ?? 0,
        },
        output: result,
      });

      trace?.update({
        input: messages,
        output: result.content,
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

      trace?.update({
        input: messages,
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

  private getProvider(provider: ProviderModel<S>) {
    const [providerName, model] = provider.split("/");
    if (providerName === "openai") {
      return new OpenAIProvider(this.openaiKey, model, undefined, this.hooks);
    } else if (providerName === "anthropic") {
      return new AnthropicProvider(this.anthropicKey, model, this.hooks);
    } else if (providerName === "gemini") {
      return new GeminiProvider(this.geminiKey, model, this.hooks);
    } else if (providerName === "deepseek") {
      return new DeepSeekProvider(this.deepseekKey, model, "https://api.deepseek.com/v1", this.hooks);
    } else if (providerName === "custom-llm") {
      if (!this.customURL) {
        throw new Error(`Need to provide a custom URL for the custom-llm provider`);
      }
      return new CustomLLMProvider(this.customLLMKey ?? "not-needed", model, this.customURL, this.hooks);
    } else if (providerName === "grok") {
      return new GrokProvider(this.grokKey, model, "https://api.x.ai/v1", this.hooks);
    }
    throw new Error(`Unsupported provider: ${providerName}`);
  }
}
