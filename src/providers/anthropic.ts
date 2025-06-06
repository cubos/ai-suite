import { Anthropic } from "@anthropic-ai/sdk";
import {
  ErrorChatCompletion,
  MessageModel,
  SuccessChatCompletion,
} from "../types/chat.js";
import { ChatOptions, ProviderBase, ToolModel } from "./_base.js";
import { BaseHook } from "./_base.js";
import { IsLiteral, tryCatch } from "../types/utils.js";
import { Model } from "@anthropic-ai/sdk/resources/messages/messages.mjs";

export type AnthropicModels = IsLiteral<Model>;

export class AnthropicProvider extends BaseHook implements ProviderBase {
  private client: Anthropic;
  private model: string;

  constructor(
    apiKey: string,
    model: string,
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
    this.client = new Anthropic({
      apiKey: apiKey,
    });
    this.model = model;
  }

  async createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions
  ): Promise<SuccessChatCompletion> {
    const mappedMessages = messages.map(
      (msg): { role: "user" | "assistant"; content: string } => {
        if (msg.role === "developer" || msg.role === "user") {
          return {
            role: "user",
            content: msg.content,
          };
        }
        if (msg.role === "assistant") {
          return {
            role: "assistant",
            content: msg.content,
          };
        }
        if (msg.role === "tool") {
          // Anthropic doesn't have direct tool/function support, so we'll format it as user message
          return {
            role: "user",
            content: `Tool Response (${msg.name || "default_tool"}): ${
              msg.content
            }`,
          };
        }
        throw new Error(`Unsupported role: ${msg.role}`);
      }
    );

    // Prepare common options
    const anthropicOptions: Anthropic.Messages.MessageCreateParams = {
      model: this.model,
      messages: mappedMessages,
      max_tokens: 4096,
      stream: options.stream || false,
      tools: convertToAnthropicFunctions(options.tools),
      thinking: {
        budget_tokens: options.thinking?.budget ?? 0,
        type: (options.thinking?.budget ?? 0) > 0 ? "enabled" : "disabled",
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

    await this.handleRequest(anthropicOptions);

    const response = await this.client.messages.create({
      ...anthropicOptions,
      stream: false,
    });

    await this.handleResponse(
      anthropicOptions,
      response,
      options.metadata ?? {}
    );

    const content =
      response.content[0].type === "text" ? response.content[0].text : "";

    const result: SuccessChatCompletion = {
      success: true,
      id: response.id,
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      object: "chat.completion",
      content,
      content_object:
        response.content[0].type === "text"
          ? tryCatch(() => JSON.parse(content))
          : undefined,
      tools: response.content
        .filter(
          (block): block is Anthropic.Messages.ToolUseBlock =>
            block.type === "tool_use"
        )
        .map((tool) => ({
          id: tool.id,
          type: "function",
          name: tool.name,
          content: tool.input as Record<string, unknown>,
          rawContent: JSON.stringify(tool.input),
        })),
      usage: {
        input_tokens: response.usage.input_tokens || 0,
        output_tokens: response.usage.output_tokens || 0,
        total_tokens:
          response.usage.input_tokens + response.usage.output_tokens,
        cached_tokens: response.usage.cache_read_input_tokens || 0,
        reasoning_tokens: 0,
        thoughts_tokens: 0,
      },
      metadata: options.metadata,
    };

    return result;
  }

  handleError(
    error: Error
  ): Pick<ErrorChatCompletion, "error" | "raw" | "tag"> {
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

function convertToAnthropicFunctions(
  tools?: ToolModel[]
): Anthropic.Messages.ToolUnion[] | undefined {
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
