import {
  FunctionDeclarationsTool,
  GoogleGenerativeAI,
  SchemaType,
  Schema,
} from "@google/generative-ai";
import { MessageModel, ResultChatCompletion } from "../types/chat.js";
import { ChatOptions, ProviderBase, ToolModel } from "./_base.js";
import { extendZodWithOpenApi } from "zod-openapi";
import { z } from "zod";
import { toGeminiSchema } from "gemini-zod";
import { tryCatch } from "../types/utils.js";

extendZodWithOpenApi(z);

export type GeminiModels =
  | "gemini-2.5-pro-preview-03-25"
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  | "gemini-1.5-flash"
  | "gemini-1.5-flash-8b"
  | "gemini-1.5-pro";

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

    const mappedMessages = messages.slice(0, messages.length - 1).map((msg) => {
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
              text: `Tool Response (${msg.name || "default_tool"}): ${msg.content
                }`,
            },
          ],
        };
      }
      throw new Error(`Unsupported role: ${msg.role}`);
    });

    const chat = generativeModel.startChat({
      history: mappedMessages,
      tools: convertToGeminiFunctions(options.tools),
      generationConfig: {
        responseMimeType:
          options.responseFormat !== "text" ? "application/json" : undefined,
        ...(options.responseFormat === "json_schema"
          ? {
            responseSchema: toGeminiSchema(options.zodSchema),
          }
          : {}),
        temperature: options.temperature ?? 0.7,
      },
    });

    const lastResponse = await chat.sendMessage(
      messages[messages.length - 1].content
    );

    const result: ResultChatCompletion = {
      id: `gemini-${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      object: "chat.completion",
      content: lastResponse?.response.text() || "",
      content_object:
        options.responseFormat !== "text" && lastResponse?.response.text()
          ? tryCatch(() => JSON.parse(lastResponse?.response.text()))
          : undefined,
      tools: lastResponse?.response.functionCalls()?.map((tool) => ({
        id: tool.name,
        type: "function",
        name: tool.name,
        content: tool.args as Record<string, unknown>,
        rawContent: JSON.stringify(tool.args),
      })),
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

function convertToGeminiFunctions(
  tools?: ToolModel[]
): FunctionDeclarationsTool[] | undefined {
  return tools?.map((tool) => ({
    functionDeclarations: [
      {
        name: tool.function.name,
        description: tool.function.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: Object.fromEntries(
            Object.entries(tool.function.parameters.properties).map(
              ([key, value]) => [
                key,
                {
                  type:
                    value.type === "string"
                      ? SchemaType.STRING
                      : value.type === "number"
                        ? SchemaType.NUMBER
                        : value.type === "boolean"
                          ? SchemaType.BOOLEAN
                          : value.type === "array"
                            ? SchemaType.ARRAY
                            : SchemaType.OBJECT,
                  description: value.description,
                  ...(value.type === "array"
                    ? {
                      items: {
                        type: SchemaType.STRING,
                      },
                    }
                    : {}),
                  ...(value.type === "object"
                    ? {
                      properties: {},
                      required: [],
                    }
                    : {}),
                } as Schema,
              ]
            )
          ),
          required: tool.function.parameters.required,
        },
      },
    ],
  }));
}
