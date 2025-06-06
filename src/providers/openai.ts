import { OpenAI } from "openai";
import {
  ErrorChatCompletion,
  MessageModel,
  SuccessChatCompletion,
} from "../types/chat.js";
import { BaseHook, ChatOptions, ProviderBase } from "./_base.js";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { tryCatch } from "../types/utils.js";
import { ChatModel } from "openai/resources/index.mjs";

export type OpenAIModels = ChatModel;

export class OpenAIProvider extends BaseHook implements ProviderBase {
  private client: OpenAI;
  private model: string;

  constructor(
    apiKey: string,
    model: string,
    customURL?: string,
    hooks?: {
      handleRequest?: (req: unknown) => Promise<void>;
      handleResponse?: (
        req: unknown,
        res: unknown,
        metadata: Record<string, unknown>
      ) => Promise<void>;
    }
  ) {
    super(hooks);
    this.client = new OpenAI({
      apiKey: apiKey,
      ...(customURL ? { baseURL: customURL } : {}),
    });
    this.model = model;
  }

  async createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions
  ): Promise<SuccessChatCompletion> {
    const mappedMessages = messages.map(
      (msg): OpenAI.ChatCompletionMessageParam => {
        if (msg.role === "developer") {
          return {
            role: "user",
            content: msg.content,
          };
        }
        if (msg.role === "tool") {
          return {
            role: "function",
            content: msg.content,
            name: msg.name || "default_tool",
          };
        }
        if (msg.role === "assistant" || msg.role === "user") {
          return {
            role: msg.role,
            content: msg.content,
          };
        }
        throw new Error(`Unsupported role: ${msg.role}`);
      }
    );

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
      stream: options.stream || false,
      temperature: options.temperature,
      response_format,
      tools: options.tools,
    };

    await this.handleRequest(request);

    const response = await this.client.chat.completions.create(request);

    await this.handleResponse(request, response, options.metadata ?? {});

    const completion = response as OpenAI.Chat.Completions.ChatCompletion;
    const result: SuccessChatCompletion = {
      success: true,
      id: completion.id,
      created: Math.floor(Date.now() / 1000),
      model: completion.model,
      object: "chat.completion",
      content: completion.choices[0].message.content,
      content_object:
        options.responseFormat !== "text"
          ? tryCatch(() => JSON.parse(completion.choices[0].message.content!))
          : undefined,
      tools: completion.choices[0].message.tool_calls?.map((tool) => ({
        id: tool.id,
        type: "function",
        name: tool.function.name,
        content: JSON.parse(tool.function.arguments),
        rawContent: tool.function.arguments,
      })),
      usage: {
        input_tokens: completion.usage?.prompt_tokens || 0,
        output_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0,
        cached_tokens:
          completion.usage?.prompt_tokens_details?.cached_tokens || 0,
        reasoning_tokens:
          completion.usage?.completion_tokens_details?.reasoning_tokens || 0,
        thoughts_tokens: 0,
      },
      metadata: options.metadata,
    };

    return result;
  }

  handleError(
    error: Error
  ): Pick<ErrorChatCompletion, "error" | "raw" | "tag"> {
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
