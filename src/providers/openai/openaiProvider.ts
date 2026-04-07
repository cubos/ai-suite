import JSON5 from "json5";
import { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import type { ChatCompletionCreateParamsBase, ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
export type { ChatCompletionMessageParam };

import type { InputContent, MessageModel, SuccessChatCompletion } from "../../types/chat.js";
import type { EmbeddingOptions, EmbeddingRequest, SuccessEmbedding } from "../../types/embed.js";
import type { ErrorAISuite } from "../../types/handleErrorResponse.js";
import type { StreamChunk } from "../../types/stream.js";
import { BaseHook, ProviderBase } from "../_base.js";
import type { ChatOptions } from "../types/index.js";
import { BatchOpenAI } from "./batch/index.js";
import { FileOpenAI } from "./file/index.js";

export class OpenAIProvider extends ProviderBase {
  public client: OpenAI;
  public model: string;
  public providerName: string;
  public hooks: BaseHook;
  batch: BatchOpenAI = new BatchOpenAI(this);
  file: FileOpenAI = new FileOpenAI(this);

  constructor(
    apiKey: string,
    model: string,
    provideName: string,
    customURL?: string,
    hooks?: {
      handleRequest?: (req: unknown) => Promise<void>;
      handleResponse?: (req: unknown, res: unknown, metadata: Record<string, unknown>) => Promise<void>;
      failOnError?: boolean;
    },
  ) {
    super();
    this.hooks = new BaseHook(hooks);
    this.client = new OpenAI({
      apiKey: apiKey,
      ...(customURL ? { baseURL: customURL } : {}),
    });
    this.model = model;
    this.providerName = provideName;
  }

  protected _createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions & { stream: true },
  ): AsyncGenerator<StreamChunk>;
  protected _createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions & { stream?: false },
  ): Promise<SuccessChatCompletion>;
  protected _createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions,
  ): Promise<SuccessChatCompletion> | AsyncGenerator<StreamChunk> {
    if (options.stream) {
      return this._createChatCompletionStream(messages, options);
    }
    return this._createChatCompletionNonStream(messages, options);
  }

  private async _createChatCompletionNonStream(
    messages: MessageModel[],
    options: ChatOptions,
  ): Promise<SuccessChatCompletion> {
    const mappedMessages = this.mapMessages(messages);

    let response_format: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming["response_format"];

    if (options.responseFormat === "text") {
      response_format = undefined;
    } else if (options.responseFormat === "json_schema") {
      response_format = zodResponseFormat(options.zodSchema, "default");
    } else {
      response_format = { type: options.responseFormat };
    }

    const request: ChatCompletionCreateParamsBase = {
      model: this.model,
      messages: mappedMessages,
      stream: false,
      temperature: options.temperature,
      response_format,
      tools: options.tools,
      ...(options.maxOutputTokens ? { max_completion_tokens: options.maxOutputTokens } : {}),
    };

    await this.hooks.handleRequest(request);

    const response = await this.client.chat.completions.create(request);

    await this.hooks.handleResponse(request, response, options.metadata ?? {});

    const completion = response as OpenAI.Chat.Completions.ChatCompletion;

    let contentObject: Record<string, unknown> | undefined;

    if (options.responseFormat !== "text") {
      try {
        contentObject = JSON5.parse<Record<string, unknown>>(completion.choices[0].message.content ?? "");
      } catch (_) {
        // ignore JSON5 parse errors
      }
    }

    return {
      success: true,
      id: completion.id,
      created: Math.floor(Date.now() / 1000),
      model: completion.model,
      object: "chat.completion",
      content: completion.choices[0].message.content,
      content_object: contentObject ?? {},
      tools: completion.choices[0].message.tool_calls
        ?.filter(l => l.type === "function")
        .map(tool => ({
          id: tool.id,
          type: "function",
          name: tool.function?.name || "unknown",
          content: tool.function?.arguments ? JSON.parse(tool.function.arguments) : {},
          rawContent: tool.function?.arguments || "",
        })),
      usage: {
        input_tokens: completion.usage?.prompt_tokens || 0,
        output_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0,
        cached_tokens: completion.usage?.prompt_tokens_details?.cached_tokens || 0,
        reasoning_tokens: completion.usage?.completion_tokens_details?.reasoning_tokens || 0,
        thoughts_tokens: 0,
      },
      metadata: options.metadata,
    };
  }

  private async *_createChatCompletionStream(
    messages: MessageModel[],
    options: ChatOptions,
  ): AsyncGenerator<StreamChunk> {
    const start = Date.now();
    const mappedMessages = this.mapMessages(messages);

    let response_format: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming["response_format"];

    if (options.responseFormat === "text") {
      response_format = undefined;
    } else if (options.responseFormat === "json_schema") {
      response_format = zodResponseFormat(options.zodSchema, "default");
    } else {
      response_format = { type: options.responseFormat };
    }

    const request = {
      model: this.model,
      messages: mappedMessages,
      stream: true as const,
      stream_options: { include_usage: true },
      temperature: options.temperature,
      response_format,
      tools: options.tools,
      ...(options.maxOutputTokens ? { max_completion_tokens: options.maxOutputTokens } : {}),
    };

    await this.hooks.handleRequest(request);

    const stream = await this.client.chat.completions.create(request);

    let accumulated = "";
    let chunkId = "";
    let lastChunk: OpenAI.Chat.Completions.ChatCompletionChunk | undefined;
    const created = Math.floor(Date.now() / 1000);

    for await (const chunk of stream) {
      if (chunk.id) chunkId = chunk.id;
      const delta = chunk.choices[0]?.delta?.content ?? "";
      accumulated += delta;

      // Keep track of the last chunk to extract usage after the loop
      if (chunk.usage || chunk.choices[0]?.finish_reason != null) {
        lastChunk = chunk;
      }

      if (delta) {
        yield {
          id: chunkId,
          created,
          object: "chat.completion",
          model: chunk.model || this.model,
          delta,
          content: accumulated,
          done: false,
          metadata: options.metadata,
        };
      }
    }

    await this.hooks.handleResponse(request, lastChunk, options.metadata ?? {});

    let contentObject: Record<string, unknown> | undefined;
    if (options.responseFormat !== "text" && accumulated) {
      try {
        contentObject = JSON5.parse<Record<string, unknown>>(accumulated);
      } catch (_) {
        // ignore JSON5 parse errors
      }
    }

    const usage = lastChunk?.usage;

    yield {
      id: chunkId,
      created,
      object: "chat.completion",
      model: lastChunk?.model || this.model,
      delta: "",
      content: accumulated,
      content_object: contentObject,
      done: true,
      usage: usage
        ? {
            input_tokens: usage.prompt_tokens,
            output_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
            cached_tokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
            reasoning_tokens: usage.completion_tokens_details?.reasoning_tokens ?? 0,
            thoughts_tokens: 0,
          }
        : undefined,
      execution_time: Date.now() - start,
      metadata: options.metadata,
    };
  }

  async _createEmbedding(embedding: EmbeddingRequest, options: EmbeddingOptions): Promise<SuccessEmbedding> {
    const request: OpenAI.Embeddings.EmbeddingCreateParams = {
      model: this.model,
      input: embedding.content,
      encoding_format: options.encodingFormat,
      dimensions: options.dimensions,
    };

    await this.hooks.handleRequest(request);

    const response = await this.client.embeddings.create(request);

    await this.hooks.handleResponse(request, response, options.metadata ?? {});

    return {
      success: true,
      created: Math.floor(Date.now() / 1000),
      content: response.data.map(d => d.embedding),
      model: response.model,
      object: response.object,
      usage: {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
    };
  }

  /**
   * Parses the input content into an OpenAI-compatible content part.
   * @param content The input content to parse.
   * @returns The parsed content part.
   */
  parseInputContent<T>(content: InputContent): T {
    if (typeof content === "string") {
      return { type: "text", text: content } as unknown as T;
    }

    if (content.type === "text") {
      return { type: "text", text: content.text } as unknown as T;
    }

    if (content.type === "image") {
      let url: string;
      if (Buffer.isBuffer(content.image)) {
        url = `data:image/png;base64,${content.image.toString("base64")}`;
      } else if (typeof content.image === "string") {
        if (content.image.startsWith("http") || content.image.startsWith("data:")) {
          url = content.image;
        } else {
          url = `data:image/png;base64,${content.image}`;
        }
      } else {
        throw new Error("Unsupported image type");
      }

      return { type: "image_url", image_url: { url } } as unknown as T;
    }

    if (content.type === "file") {
      if (content.mediaType.startsWith("image/")) {
        let base64: string;
        if (Buffer.isBuffer(content.file)) {
          base64 = content.file.toString("base64");
        } else if (content.file instanceof ArrayBuffer) {
          base64 = Buffer.from(content.file).toString("base64");
        } else {
          base64 = content.file;
        }
        return {
          type: "image_url",
          image_url: { url: `data:${content.mediaType};base64,${base64}` },
        } as unknown as T;
      }
      throw new Error(`Unsupported media type for OpenAI: ${content.mediaType}`);
    }

    throw new Error("Unsupported content type");
  }

  mapMessages(messages: MessageModel[]): ChatCompletionMessageParam[] {
    return messages.map(msg => {
      const content = Array.isArray(msg.content) ? msg.content : [msg.content];
      const parsedContent = content.map(c =>
        this.parseInputContent<OpenAI.Chat.Completions.ChatCompletionContentPart>(c),
      );

      if (msg.role === "developer") {
        return { role: "user", content: parsedContent };
      }
      if (msg.role === "tool") {
        return {
          role: "function",
          content: parsedContent.map(c => (c.type === "text" ? c.text : "")).join(""),
          name: msg.name || "default_tool",
        };
      }
      if (msg.role === "assistant") {
        const textContent = parsedContent
          .filter((c: OpenAI.Chat.Completions.ChatCompletionContentPart) => c.type === "text")
          .map((c: OpenAI.Chat.Completions.ChatCompletionContentPartText) => c.text)
          .join("");
        return { role: "assistant", content: textContent || null };
      }
      if (msg.role === "user") {
        return { role: "user", content: parsedContent };
      }
      throw new Error(`Unsupported role: ${msg.role}`);
    });
  }

  handleError(error: Error): Pick<ErrorAISuite, "error" | "raw" | "tag"> {
    if (error instanceof OpenAI.APIError) {
      const status = error.status;

      if (status === 400) {
        return {
          error: "Bad Request",
          raw: error,
          tag: "InvalidRequest",
        };
      }

      if (status === 401) {
        return {
          error: "Unauthorized",
          raw: error,
          tag: "InvalidAuth",
        };
      }

      if (status === 403) {
        return {
          error: "Forbidden",
          raw: error,
          tag: "InvalidRequest",
        };
      }

      if (status === 404) {
        return {
          error: "Not Found",
          raw: error,
          tag: "InvalidRequest",
        };
      }

      if (status === 409) {
        return {
          error: "Conflict",
          raw: error,
          tag: "InvalidRequest",
        };
      }

      if (status === 422) {
        return {
          error: "Unprocessable Entity",
          raw: error,
          tag: "InvalidRequest",
        };
      }

      if (status === 429) {
        return {
          error: "Rate Limit Exceeded",
          raw: error,
          tag: "RateLimitExceeded",
        };
      }

      if (status >= 500) {
        return {
          error: "Internal Server Error",
          raw: error,
          tag: "ServerError",
        };
      }

      return {
        error: "Unknown Error",
        raw: error,
        tag: "Unknown",
      };
    } else {
      return {
        error: "Unknown Error",
        raw: error,
        tag: "Unknown",
      };
    }
  }
}
