import { GoogleGenerativeAI } from "@google/generative-ai";
import { Readable } from "stream";
import { MessageModel, ResultChatCompletion } from "../types/chat";
import { ChatOptions, ProviderBase } from "./_base";

export class GeminiProvider implements ProviderBase {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions
  ): Promise<ResultChatCompletion> {
    const generativeModel = this.client.getGenerativeModel({
      model: this.model,
    });

    // Map our message format to Gemini's format
    const mappedMessages = messages.map((msg) => {
      if (msg.role === "user" || msg.role === "developer") {
        return {
          role: "user",
          parts: [{ text: msg.content }],
        };
      }
      if (msg.role === "assistant") {
        return {
          role: "model",
          parts: [{ text: msg.content }],
        };
      }
      if (msg.role === "tool") {
        // Gemini doesn't directly support tools/functions, so format as user message
        return {
          role: "user",
          parts: [
            {
              text: `Tool Response (${msg.name || "default_tool"}): ${
                msg.content
              }`,
            },
          ],
        };
      }
      throw new Error(`Unsupported role: ${msg.role}`);
    });

    // Create chat session
    const chat = generativeModel.startChat({
      generationConfig: {
        temperature: options.temperature,
      },
    });

    // Non-streaming implementation
    // Process all messages in the chat
    let lastResponse;
    for (const msg of mappedMessages) {
      if (msg.role === "user") {
        lastResponse = await chat.sendMessage(msg.parts[0].text);
      }
    }

    // Create a response in the expected format
    const result: ResultChatCompletion = {
      id: `gemini-${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      object: "chat.completion",
      content: lastResponse?.response.text() || "",
      usage: {
        input_tokens:
          lastResponse?.response.usageMetadata?.promptTokenCount || 0,
        output_tokens:
          lastResponse?.response.usageMetadata?.candidatesTokenCount || 0,
        total_tokens:
          (lastResponse?.response.usageMetadata?.promptTokenCount || 0) +
          (lastResponse?.response.usageMetadata?.candidatesTokenCount || 0),
      },
    };

    return result;
  }
}
