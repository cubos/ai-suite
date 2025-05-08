import { Model } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { ChatModel as OpenAIModels } from "openai/resources/index.mjs";
import { MessageModel, ResultChatCompletion } from "./types/chat.js";
import { IsLiteral } from "./types/utils.js";
import { OpenAIProvider } from "./providers/openai.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import { GeminiModels, GeminiProvider } from "./providers/gemini.js";
import { ChatOptions } from "./providers/_base.js";
import { DeepSeekModels, DeepSeekProvider } from "./providers/deepseek.js";
import { Langfuse } from "langfuse";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export type ProviderModel =
  | `openai/${OpenAIModels}`
  | `anthropic/${IsLiteral<Model>}`
  | `gemini/${GeminiModels}`
  | `deepseek/${DeepSeekModels}`;

export class AISuite {
  private openaiKey: string;
  private anthropicKey: string;
  private geminiKey: string;
  private deepseekKey: string;
  private langFuse?: Langfuse;
  private applicationName = "ai-suite";

  constructor(
    keys: {
      openaiKey?: string;
      anthropicKey?: string;
      geminiKey?: string;
      deepseekKey?: string;
    },
    options?: {
      langFuse?: Langfuse;
    }
  ) {
    this.openaiKey = keys.openaiKey || "";
    this.anthropicKey = keys.anthropicKey || "";
    this.geminiKey = keys.geminiKey || "";
    this.deepseekKey = keys.deepseekKey || "";
    this.langFuse = options?.langFuse;
  }

  /**
   * Create a chat completion with multiple providers
   * @param providers - The providers to use
   * @param messages - The messages to send to the providers
   * @param options - The options to use
   * @returns The chat completion
   */
  async createChatCompletionMultiResult(
    providers: ProviderModel[],
    messages: MessageModel[],
    options: { stream: false } & ChatOptions = {
      stream: false,
      responseFormat: "text" as const,
      temperature: 0.7,
    }
  ): Promise<{ [key in ProviderModel]: ResultChatCompletion }[]> {
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

    if (opts.stream) {
      throw new Error("Streaming is not supported");
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
    const start = Date.now();
    const result = await p.createChatCompletion(messages, opts);
    const end = Date.now();

    generation?.end({
      output: result,
    });

    return {
      ...result,
      execution_time: end - start,
    };
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
      return new DeepSeekProvider(this.deepseekKey, model);
    }
    throw new Error(`Unsupported provider: ${providerName}`);
  }
}
