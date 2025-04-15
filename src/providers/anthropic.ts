import Anthropic from "@anthropic-ai/sdk";
import { MessageModel, ResultChatCompletion } from "../types/chat.js";
import { ChatOptions, ProviderBase } from "./_base.js";

export class AnthropicProvider implements ProviderBase {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({
      apiKey: apiKey,
    });
    this.model = model;
  }

  async createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions
  ): Promise<ResultChatCompletion> {
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
    };

    // Add temperature if provided
    if (options.temperature !== undefined) {
      anthropicOptions.temperature = options.temperature;
    }

    // Handle response format (Anthropic uses system prompt for this)
    if (options.responseFormat === "json_object") {
      anthropicOptions.system = "Please provide your response in JSON format.";
    }

    const response = await this.client.messages.create({
      ...anthropicOptions,
      stream: false,
    });

    const result: ResultChatCompletion = {
      id: response.id,
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      object: "chat.completion",
      content:
        response.content[0].type === "text" ? response.content[0].text : "",
      usage: {
        input_tokens: response.usage.input_tokens || 0,
        output_tokens: response.usage.output_tokens || 0,
        total_tokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
    };

    return result;
  }
}
