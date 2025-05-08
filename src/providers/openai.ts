import { OpenAI } from "openai";
import { MessageModel, ResultChatCompletion } from "../types/chat.js";
import { ChatOptions, ProviderBase } from "./_base.js";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { tryCatch } from "../types/utils.js";

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
      response_format:
        options.responseFormat === "json_schema"
          ? zodResponseFormat(options.zodSchema, "default")
          : { type: options.responseFormat },
      tools: options.tools,
    });

    const completion = response as OpenAI.Chat.Completions.ChatCompletion;
    const result: ResultChatCompletion = {
      id: completion.id,
      created: Math.floor(Date.now() / 1000),
      model: completion.model,
      object: "chat.completion",
      content: completion.choices[0].message.content,
      content_object:
        options.responseFormat !== "text" ?
          tryCatch(() => JSON.parse(completion.choices[0].message.content!))
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
      },
    };

    return result;
  }
}
