import OpenAI from "openai";
import { Readable } from "stream";
import { MessageModel, ResultChatCompletion } from "../types/chat";
import { ChatOptions, ProviderBase } from "./_base";

export class OpenAIProvider implements ProviderBase {
  private client: OpenAI;
  private model: string;
  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
    });
    this.model = model;
  }

  async createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions
  ): Promise<ResultChatCompletion> {
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

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: mappedMessages,
      stream: options.stream || false,
      temperature: options.temperature,
      response_format: options.responseFormat
        ? { type: options.responseFormat }
        : undefined,
    });

    const completion = response as OpenAI.Chat.Completions.ChatCompletion;
    const result: ResultChatCompletion = {
      id: completion.id,
      created: Math.floor(Date.now() / 1000),
      model: completion.model,
      object: "chat.completion",
      content: completion.choices[0].message.content || "",
      usage: {
        input_tokens: completion.usage?.prompt_tokens || 0,
        output_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0,
      },
    };

    return result;
  }
}
