import JSON5 from "json5";
import { OpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import type { ChatCompletionCreateParamsBase, ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import type { ChatModel } from "openai/resources/index.mjs";
import type { ErrorChatCompletion, InputContent, MessageModel, SuccessChatCompletion } from "../types/chat.js";
import { BaseHook, type ChatOptions, ProviderBase } from "./_base.js";

export type OpenAIModels = ChatModel;

export class OpenAIProvider extends ProviderBase {
  private client: OpenAI;
  private model: string;
  private hooks: BaseHook;

  constructor(
    apiKey: string,
    model: string,
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
  }

  async _createChatCompletion(messages: MessageModel[], options: ChatOptions): Promise<SuccessChatCompletion> {
    const mappedMessages: ChatCompletionMessageParam[] = messages.map(msg => {
      const content = Array.isArray(msg.content) ? msg.content : [msg.content];
      const parsedContent = content.map(c => this.parseInputContent<OpenAI.Chat.Completions.ChatCompletionContentPart>(c));

      if (msg.role === "developer") {
        return {
          role: "user",
          content: parsedContent,
        };
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

        return {
          role: "assistant",
          content: textContent || null,
        };
      }
      if (msg.role === "user") {
        return {
          role: "user",
          content: parsedContent,
        };
      }
      throw new Error(`Unsupported role: ${msg.role}`);
    });

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
      stream: options.stream || false,
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

    const result: SuccessChatCompletion = {
      success: true,
      id: completion.id,
      created: Math.floor(Date.now() / 1000),
      model: completion.model,
      object: "chat.completion",
      content: completion.choices[0].message.content,
      content_object: contentObject ?? {},
      tools: completion.choices[0].message.tool_calls
        ?.filter(l => l.type === "function")
        .map(tool => {
          return {
            id: tool.id,
            type: "function",
            name: tool.function?.name || "unknown",
            content: tool.function?.arguments ? JSON.parse(tool.function.arguments) : {},
            rawContent: tool.function?.arguments || "",
          };
        }),
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

    return result;
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

  handleError(error: Error): Pick<ErrorChatCompletion, "error" | "raw" | "tag"> {
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
