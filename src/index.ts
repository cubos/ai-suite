import { Model } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { ChatModel } from "openai/resources/index.mjs";
import { MessageModel, ResultChatCompletion } from "./types/chat";
import { IsLiteral } from "./types/utils";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";
import { ChatOptions } from "./providers/_base";
import { DeepSeekProvider } from "./providers/deepseek";

type ProviderModel =
  | `openai/${ChatModel}`
  | `anthropic/${IsLiteral<Model>}`
  | `gemini/${"gemini-pro" | "gemini-1.5-pro" | "gemini-1.5-flash"}`
  | `deepseek/${"deepseek-chat" | "deepseek-coder" | "deepseek-coder-plus"}`;

export class AISuite {
  private openaiKey: string;
  private anthropicKey: string;
  private geminiKey: string;
  private deepseekKey: string;

  constructor(keys: {
    openaiKey?: string;
    anthropicKey?: string;
    geminiKey?: string;
    deepseekKey?: string;
  }) {
    this.openaiKey = keys.openaiKey || "";
    this.anthropicKey = keys.anthropicKey || "";
    this.geminiKey = keys.geminiKey || "";
    this.deepseekKey = keys.deepseekKey || "";
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
    options: { stream: false } & Partial<ChatOptions> = { stream: false }
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
    options?: { stream: false } & Partial<ChatOptions>
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
    options?: Partial<ChatOptions>
  ): Promise<ResultChatCompletion> {
    const opts = { stream: false, ...options };

    if (opts.stream) {
      throw new Error("Streaming is not supported");
    }

    const p = this.getProvider(provider);
    const start = Date.now();
    const result = await p.createChatCompletion(messages, opts);
    const end = Date.now();
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

(async () => {
  const client = new AISuite({});

  const example = await client.createChatCompletion(
    "anthropic/claude-2.0",
    [{ role: "user", content: "Hello, how are you?" }],
    {
      stream: false,
    }
  );

  console.log({ example });

  const example2 = await client.createChatCompletion(
    "openai/gpt-4o-mini",
    [{ role: "user", content: "Hello, how are you?" }],
    {
      stream: false,
    }
  );

  console.log({ example2 });

  const example3 = await client.createChatCompletion(
    "gemini/gemini-1.5-flash",
    [{ role: "user", content: "Hello, how are you?" }],
    {
      stream: false,
    }
  );

  console.log({ example3 });
})();
