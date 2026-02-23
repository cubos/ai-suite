import dotenv from "dotenv";
import type { Langfuse } from "langfuse";
import { Batch } from "./batch.js";
import { File } from "./file.js";
import { AnthropicProvider } from "./providers/anthropic/index.js";
import { CustomLLMProvider } from "./providers/customLLM/index.js";
import { DeepSeekProvider } from "./providers/deepSeek/index.js";
import { GeminiProvider } from "./providers/gemini/index.js";
import { GrokProvider } from "./providers/grok/index.js";
import { OpenAIProvider } from "./providers/openai/openaiProvider.js";
import type { ChatOptions, LangfuseData } from "./providers/types/index.js";
import type { MessageModel, ResultChatCompletion } from "./types/chat.js";
import type { EmbeddingOptions, EmbeddingRequest, ResultEmbedding } from "./types/embed.js";
import type { ErrorAISuite } from "./types/handleErrorResponse.js";
import type { ProviderChatModel, ProviderEmbeddingModel, ProviderModel } from "./types/providerModel.js";
import type { ResponseBase } from "./types/responseBase.js";
import type { ResultBase } from "./types/resultBase.js";

dotenv.config();

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
  public batch = new Batch(this.getProvider, this.resultWhithObservation);
  /**
   * The File class provides an interface for managing file resources across different AI providers.
   * only batch file uploads are supported as of now.
   */
  public file = new File(this.getProvider, this.resultWhithObservation);

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
  async createChatCompletionMultiResult<T extends ProviderChatModel<S>>(
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
    provider: ProviderChatModel<S>,
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
    provider: ProviderChatModel<S>,
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

    const p = this.getProvider(provider);

    return this.resultWhithObservation(
      () => p.createChatCompletion(messages, opts),
      {
        langfuseData: {
          name: "create-chat-completion",
          tags: ["chat", provider],
        },
        model: provider.split("/")[1],
        input: messages,
      },
      p,
      start,
    );
  }

  /**
   * Create a chat completion
   * @param provider - The provider to use
   * @param embedding- The embedding request to send to the provider
   * @param options - The options to use
   * @returns The chat completion
   */
  async createEmbedding(
    provider: ProviderEmbeddingModel<S>,
    embedding: EmbeddingRequest,
    options?: EmbeddingOptions,
  ): Promise<ResultEmbedding>;

  async createEmbedding(
    provider: ProviderEmbeddingModel<S>,
    embedding: EmbeddingRequest,
    options?: EmbeddingOptions,
  ): Promise<ResultEmbedding> {
    const start = Date.now();
    const p = this.getProvider(provider);

    p.batch.create();

    return this.resultWhithObservation(
      () => p.createEmbedding(embedding, options ?? {}),
      {
        langfuseData: {
          name: "create-embedding",
          tags: ["embedding", provider],
        },
        model: provider.split("/")[1],
        input: embedding.content,
      },
      p,
      start,
    );
  }

  private async resultWhithObservation<R extends ResultBase>(
    func: () => Promise<R>,
    langfuseOptions: { langfuseData: LangfuseData; model: string; input: unknown },
    provider: OpenAIProvider | AnthropicProvider | GeminiProvider,
    start: number,
  ): Promise<(R & ResponseBase) | (ErrorAISuite & ResponseBase)> {
    const trace = this.langFuse?.trace({
      ...(langfuseOptions.langfuseData.sessionId ? { sessionId: langfuseOptions.langfuseData.sessionId } : {}),
      name: langfuseOptions.langfuseData.name ?? "create-chat-completion",
      tags: langfuseOptions.langfuseData.tags ?? [],
      environment: langfuseOptions.langfuseData.environment ?? "default",
      ...(langfuseOptions.langfuseData.userId ? { userId: langfuseOptions.langfuseData.userId } : {}),
    });

    const generation = trace?.generation({
      environment: langfuseOptions.langfuseData.environment ?? "default",
      name: langfuseOptions.langfuseData.name ?? "create-chat-completion",
      model: langfuseOptions.model,
      input: langfuseOptions.input,
    });

    try {
      const result = await func();
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
        input: langfuseOptions.input,
        output: result.content,
      });

      return {
        ...result,
        execution_time: end - start,
      };
    } catch (error) {
      const result = provider.handleError(error as Error);
      const end = Date.now();
      generation?.end({
        output: error,
      });

      trace?.update({
        input: langfuseOptions.input,
        output: error,
      });

      return {
        success: false,
        ...result,
        created: start,
        model: langfuseOptions.model,
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
