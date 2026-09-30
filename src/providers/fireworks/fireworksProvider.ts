import type { OpenAI } from "openai";
import type { ChatCompletionCreateParamsBase, ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { z as zod } from "zod";
import type { MessageModel } from "../../types/chat.js";
import { OpenAIProvider } from "../openai/openaiProvider.js";
import type { ChatOptions } from "../types/index.js";

export const FIREWORKS_BASE_URL = "https://api.fireworks.ai/inference/v1";

export class FireworksProvider extends OpenAIProvider {
  protected override buildResponseFormat(options: ChatOptions): ChatCompletionCreateParamsBase["response_format"] {
    if (options.responseFormat !== "json_schema") {
      return super.buildResponseFormat(options);
    }

    return {
      type: "json_schema",
      json_schema: {
        name: "default",
        schema: zod.toJSONSchema(options.zodSchema) as Record<string, unknown>,
      },
    };
  }

  protected override buildSamplingParams(
    options: ChatOptions,
  ): Pick<ChatCompletionCreateParamsBase, "reasoning_effort" | "temperature"> {
    return {
      ...(options.reasoning ? { reasoning_effort: options.reasoning.effort } : {}),
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    };
  }

  override mapMessages(messages: MessageModel[]): ChatCompletionMessageParam[] {
    return messages.map(message => {
      if (message.role !== "developer") {
        return super.mapMessages([message])[0];
      }

      const contents = Array.isArray(message.content) ? message.content : [message.content];
      const parts = contents.map(content =>
        this.parseInputContent<OpenAI.Chat.Completions.ChatCompletionContentPart>(content),
      );
      const nonTextPart = parts.find(part => part.type !== "text");
      if (nonTextPart) {
        throw new Error(
          `Fireworks sends developer messages with the system role, which only accepts text. Move the "${nonTextPart.type}" content to a user message.`,
        );
      }

      const text = parts.map(part => (part as OpenAI.Chat.Completions.ChatCompletionContentPartText).text).join("");

      return { role: "system", content: text };
    });
  }
}
