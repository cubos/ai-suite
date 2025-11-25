import { Anthropic } from "@anthropic-ai/sdk";
import type { Model } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import JSON5 from "json5";
import type { ErrorChatCompletion, InputContent, MessageModel, SuccessChatCompletion } from "../types/chat.js";
import type { IsLiteral } from "../types/utils.js";
import { BaseHook, type ChatOptions, ProviderBase, type ToolModel } from "./_base.js";

export type AnthropicModels = IsLiteral<Model>;

export class AnthropicProvider extends ProviderBase {
  private client: Anthropic;
  private model: string;
  private hooks: BaseHook;

  constructor(
    apiKey: string,
    model: string,
    hooks?: {
      handleRequest?: (req: unknown) => Promise<void>;
      handleResponse?: (req: unknown, res: unknown, metadata: Record<string, unknown>) => Promise<void>;
      failOnError?: boolean;
    },
  ) {
    super();
    this.hooks = new BaseHook(hooks);
    this.client = new Anthropic({
      apiKey: apiKey,
    });
    this.model = model;
  }

  async _createChatCompletion(messages: MessageModel[], options: ChatOptions): Promise<SuccessChatCompletion> {
    type AnthropicImageType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";
    type AnthropicDocumentType = "application/pdf";
    type AnthropicContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "base64"; media_type: AnthropicImageType; data: string } }
      | { type: "document"; source: { type: "base64"; media_type: AnthropicDocumentType; data: string } };

    const mappedMessages = messages.map(
      (
        msg,
      ): {
        role: "user" | "assistant";
        content: string | Array<AnthropicContentBlock>;
      } => {
        const content = Array.isArray(msg.content) ? msg.content : [msg.content];
        const parsedContent = content.map(c => this.parseInputContent<AnthropicContentBlock>(c));

        if (msg.role === "developer" || msg.role === "user") {
          return {
            role: "user",
            content: parsedContent,
          };
        }
        if (msg.role === "assistant") {
          const textContent = parsedContent
            .filter((c): c is { type: "text"; text: string } => c.type === "text")
            .map(c => c.text)
            .join("");

          return {
            role: "assistant",
            content: textContent,
          };
        }
        if (msg.role === "tool") {
          const textContent = parsedContent
            .filter((c): c is { type: "text"; text: string } => c.type === "text")
            .map(c => c.text)
            .join("");

          return {
            role: "user",
            content: `Tool Response (${msg.name || "default_tool"}): ${textContent}`,
          };
        }
        throw new Error(`Unsupported role: ${msg.role}`);
      },
    );

    // Prepare common options
    const anthropicOptions: Anthropic.Messages.MessageCreateParams = {
      model: this.model,
      messages: mappedMessages,
      ...(options.maxOutputTokens ? { max_tokens: options.maxOutputTokens } : { max_tokens: 4096 }),
      stream: options.stream || false,
      tools: convertToAnthropicFunctions(options.tools),
      thinking: {
        ...((options.thinking?.budget ?? 0) > 0
          ? { budget_tokens: options.thinking?.budget ?? 0, type: "enabled" }
          : { type: "disabled" }),
      },
    };

    // Add temperature if provided
    if (options.temperature !== undefined) {
      anthropicOptions.temperature = options.temperature;
    }

    // Handle response format (Anthropic uses system prompt for this)
    if (options.responseFormat === "json_object") {
      anthropicOptions.system = "Please provide your response in JSON format.";
    }

    await this.hooks.handleRequest(anthropicOptions);

    const response = await this.client.messages.create({
      ...anthropicOptions,
      stream: false,
    });

    await this.hooks.handleResponse(anthropicOptions, response, options.metadata ?? {});

    const content = response.content[0].type === "text" ? response.content[0].text : "";

    let contentObject: Record<string, unknown> | undefined;

    if (options.responseFormat !== "text") {
      try {
        contentObject = JSON5.parse<Record<string, unknown>>(content);
      } catch {
        // ignore JSON5 parse errors
      }
    }

    const result: SuccessChatCompletion = {
      success: true,
      id: response.id,
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      object: "chat.completion",
      content,
      content_object: contentObject ?? {},
      tools: response.content
        .filter((block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use")
        .map(tool => ({
          id: tool.id,
          type: "function",
          name: tool.name,
          content: tool.input as Record<string, unknown>,
          rawContent: JSON.stringify(tool.input),
        })),
      usage: {
        input_tokens: response.usage.input_tokens || 0,
        output_tokens: response.usage.output_tokens || 0,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
        cached_tokens: response.usage.cache_read_input_tokens || 0,
        reasoning_tokens: 0,
        thoughts_tokens: 0,
      },
      metadata: options.metadata,
    };

    return result;
  }

  /**
   * Parses the input content into an Anthropic-compatible content part.
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
      let base64: string;
      if (Buffer.isBuffer(content.image)) {
        base64 = content.image.toString("base64");
      } else if (typeof content.image === "string") {
        if (content.image.startsWith("http") || content.image.startsWith("data:")) {
          throw new Error("Anthropic does not support image URLs directly. Please provide base64 encoded images.");
        } else {
          base64 = content.image;
        }
      } else {
        throw new Error("Unsupported image type");
      }

      return {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png" as const,
          data: base64,
        },
      } as unknown as T;
    }

    if (content.type === "file") {
      let base64: string;
      if (Buffer.isBuffer(content.file)) {
        base64 = content.file.toString("base64");
      } else if (content.file instanceof ArrayBuffer) {
        base64 = Buffer.from(content.file).toString("base64");
      } else {
        base64 = content.file;
      }

      if (content.mediaType.startsWith("image/")) {
        // Map media type to Anthropic's allowed types
        let mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
        if (content.mediaType === "image/jpeg" || content.mediaType === "image/jpg") {
          mediaType = "image/jpeg";
        } else if (content.mediaType === "image/gif") {
          mediaType = "image/gif";
        } else if (content.mediaType === "image/webp") {
          mediaType = "image/webp";
        } else {
          mediaType = "image/png";
        }

        return {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64,
          },
        } as unknown as T;
      }

      if (content.mediaType === "application/pdf") {
        return {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf" as const,
            data: base64,
          },
        } as unknown as T;
      }

      throw new Error(`Unsupported media type for Anthropic: ${content.mediaType}`);
    }

    throw new Error("Unsupported content type");
  }

  handleError(error: Error): Pick<ErrorChatCompletion, "error" | "raw" | "tag"> {
    if (error instanceof Anthropic.APIError) {
      const status = error.status;

      if (status === 400) {
        return {
          error: "Bad Request: Invalid request parameters",
          raw: error,
          tag: "InvalidRequest",
        };
      }

      if (status === 401) {
        return {
          error: "Unauthorized: Invalid API key",
          raw: error,
          tag: "InvalidAuth",
        };
      }

      if (status === 403) {
        return {
          error: "Forbidden: Insufficient permissions",
          raw: error,
          tag: "InvalidRequest",
        };
      }

      if (status === 404) {
        return {
          error: "Not Found: Resource not found",
          raw: error,
          tag: "InvalidRequest",
        };
      }

      if (status === 409) {
        return {
          error: "Conflict: Request conflicts with current state",
          raw: error,
          tag: "InvalidRequest",
        };
      }

      if (status === 422) {
        return {
          error: "Unprocessable Entity: Invalid input data",
          raw: error,
          tag: "InvalidRequest",
        };
      }

      if (status === 429) {
        return {
          error: "Rate Limit Exceeded: Too many requests",
          raw: error,
          tag: "RateLimitExceeded",
        };
      }

      if (status >= 500) {
        return {
          error: "Internal Server Error: Anthropic API is experiencing issues",
          raw: error,
          tag: "ServerError",
        };
      }

      return {
        error: `${error.name}: ${error.message}`,
        raw: error,
        tag: "Unknown",
      };
    }

    // Handle connection errors
    if (error instanceof Anthropic.APIConnectionError) {
      return {
        error: "Connection Error: Failed to connect to Anthropic API",
        raw: error,
        tag: "ServerError",
      };
    }

    // Handle any other errors
    return {
      error: `${error.name} : ${error.message}`,
      raw: error,
      tag: "Unknown",
    };
  }
}

function convertToAnthropicFunctions(tools?: ToolModel[]): Anthropic.Messages.ToolUnion[] | undefined {
  if (!tools) {
    return undefined;
  }

  return tools.map((tool): Anthropic.Messages.ToolUnion => {
    return {
      name: tool.function.name,
      description: tool.function.description,
      input_schema: {
        type: "object",
        properties: tool.function.parameters.properties,
        required: tool.function.parameters.required,
      },
    };
  });
}
