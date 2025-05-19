import {
  GoogleGenAI,
  Type as SchemaType,
  Tool,
  FunctionCall,
} from "@google/genai";
import { MessageModel, SuccessChatCompletion } from "../types/chat.js";
import { ChatOptions, ProviderBase, ToolModel } from "./_base.js";
import { extendZodWithOpenApi } from "zod-openapi";
import { z } from "zod";
import { toGeminiSchema } from "gemini-zod";
import { tryCatch } from "../types/utils.js";

extendZodWithOpenApi(z);

export type GeminiModels =
  | "gemini-2.5-flash-preview-04-17"
  | "gemini-2.5-pro-preview-05-06"
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  | "gemini-1.5-flash"
  | "gemini-1.5-flash-8b"
  | "gemini-1.5-pro";

const notUseThinkingConfig = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
];

export class GeminiProvider implements ProviderBase {
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions
  ): Promise<SuccessChatCompletion> {
    const systemPrompt =
      messages[0].role !== "user" ? messages[0].content : null;

    const chat = this.client.chats.create({
      model: this.model,
      history: (systemPrompt
        ? messages.slice(1, messages.length - 1)
        : messages.slice(0, messages.length - 1)
      ).map((msg) => {
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
      }),
      config: {
        tools: options.tools
          ? convertToGeminiFunctions(options.tools)
          : undefined,
        temperature: options.temperature ?? 0.7,
        ...(!notUseThinkingConfig.includes(this.model) && {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        }),
        ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
        responseMimeType:
          options.responseFormat !== "text" ? "application/json" : undefined,
        ...(options.responseFormat === "json_schema"
          ? {
              responseSchema: toGeminiSchema(options.zodSchema),
            }
          : {}),
      },
    });

    const lastResponse = await chat.sendMessage({
      message: messages[messages.length - 1].content,
    });

    const result: SuccessChatCompletion = {
      success: true,
      id: `gemini-${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      object: "chat.completion",
      content: lastResponse.text ?? null,
      content_object:
        options.responseFormat !== "text" && (lastResponse.text ?? null)
          ? tryCatch(() => JSON.parse(lastResponse.text ?? ""))
          : undefined,
      tools: lastResponse.functionCalls?.map((tool: FunctionCall) => ({
        id: tool.name ?? "",
        type: "function",
        name: tool.name ?? "",
        content: tool.args as Record<string, unknown>,
        rawContent: JSON.stringify(tool.args),
      })),
      usage: {
        input_tokens: lastResponse.usageMetadata?.promptTokenCount || 0,
        output_tokens: lastResponse.usageMetadata?.candidatesTokenCount || 0,
        total_tokens:
          (lastResponse.usageMetadata?.promptTokenCount || 0) +
          (lastResponse.usageMetadata?.candidatesTokenCount || 0),
        cached_tokens: lastResponse.usageMetadata?.cachedContentTokenCount || 0,
      },
    };

    return result;
  }
}

export function convertToGeminiFunctions(
  tools?: ToolModel[]
): Tool[] | undefined {
  if (!tools) return undefined;

  return [
    {
      functionDeclarations: tools.map((tool) => ({
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
                },
              ]
            )
          ),
          required: tool.function.parameters.required,
        },
      })),
    },
  ];
}
