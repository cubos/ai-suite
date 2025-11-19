import {
  ApiError,
  type FunctionCall,
  type GenerateContentParameters,
  GoogleGenAI,
  Type as SchemaType,
  type Tool,
} from "@google/genai";
import { toGeminiSchema } from "gemini-zod";
import JSON5 from "json5";
import { z } from "zod";
import { extendZodWithOpenApi } from "zod-openapi";
import type { ErrorChatCompletion, MessageModel, SuccessChatCompletion } from "../types/chat.js";
import { BaseHook, type ChatOptions, ProviderBase, type ToolModel } from "./_base.js";

extendZodWithOpenApi(z);

export type GeminiModels =
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite"
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  | "gemini-1.5-flash"
  | "gemini-1.5-flash-8b"
  | "gemini-1.5-pro";

const onlyWorksWithThinking = ["gemini-2.5-pro"];

const notUseThinkingConfig = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
];

export class GeminiProvider extends ProviderBase {
  private client: GoogleGenAI;
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
    this.client = new GoogleGenAI({
      apiKey: apiKey,
    });
    this.model = model;
  }

  async _createChatCompletion(messages: MessageModel[], options: ChatOptions): Promise<SuccessChatCompletion> {
    const systemPrompt = messages[0].role !== "user" ? messages[0].content : null;

    const req: GenerateContentParameters = {
      config: {
        tools: options.tools ? convertToGeminiFunctions(options.tools) : undefined,
        temperature: options.temperature ?? 0.7,
        ...(!onlyWorksWithThinking.includes(this.model) && {
          thinkingConfig: {
            thinkingBudget: options.thinking?.budget ?? 128,
            includeThoughts: options.thinking?.output ?? false,
          },
        }),
        ...(!notUseThinkingConfig.includes(this.model) && {
          thinkingConfig: {
            thinkingBudget: options.thinking?.budget ?? 0,
            includeThoughts: options.thinking?.output ?? false,
          },
        }),
        ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
        responseMimeType: options.responseFormat !== "text" ? "application/json" : undefined,
        ...(options.responseFormat === "json_schema"
          ? {
              responseSchema: toGeminiSchema(options.zodSchema),
            }
          : {}),
        ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
      },
      contents: messages.slice(systemPrompt ? 1 : 0, messages.length).map(msg => {
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
                text: `Tool Response (${msg.name || "default_tool"}): ${msg.content}`,
              },
            ],
          };
        }
        throw new Error(`Unsupported role: ${msg.role}`);
      }),
      model: this.model,
    };

    const response = await this.client.models.generateContent(req);

    await this.hooks.handleRequest(req);

    await this.hooks.handleResponse(req, response, options.metadata ?? {});

    let contentObject: Record<string, unknown> | undefined;

    if (options.responseFormat !== "text" && response.text) {
      try {
        contentObject = JSON5.parse<Record<string, unknown>>(response.text ?? "");
      } catch (_) {
        // ignore JSON5 parse errors
      }
    }

    // eslint-disable-next-line no-useless-escape
    const regex = /[{[]{1}([,:{}[\]0-9.\-+Eaeflnr-u \n\r\t]|".*?")+[}\]]{1}/gi;

    const matches = response.text?.match(regex);

    const obj = Object.assign({}, ...(matches ?? []).map(m => JSON5.parse(m)));

    const result: SuccessChatCompletion = {
      success: true,
      id: `gemini-${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      object: "chat.completion",
      content: response.text ?? null,
      content_object: contentObject ?? obj,
      tools: response.functionCalls?.map((tool: FunctionCall) => ({
        id: tool.name ?? "",
        type: "function",
        name: tool.name ?? "",
        content: tool.args as Record<string, unknown>,
        rawContent: JSON.stringify(tool.args),
      })),
      usage: {
        input_tokens: response.usageMetadata?.promptTokenCount || 0,
        output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
        total_tokens:
          (response.usageMetadata?.promptTokenCount || 0) +
          (response.usageMetadata?.candidatesTokenCount || 0) +
          (response.usageMetadata?.thoughtsTokenCount || 0),
        cached_tokens: response.usageMetadata?.cachedContentTokenCount || 0,
        thoughts_tokens: response.usageMetadata?.thoughtsTokenCount || 0,
        reasoning_tokens: 0,
      },
      metadata: options.metadata,
    };

    return result;
  }

  handleError(error: Error): Pick<ErrorChatCompletion, "error" | "raw" | "tag"> {
    if (error instanceof ApiError) {
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
    }

    return {
      error: `${error.name} : ${error.message}`,
      raw: error,
      tag: "Unknown",
    };
  }
}

export function convertToGeminiFunctions(tools?: ToolModel[]): Tool[] | undefined {
  if (!tools) return undefined;

  return [
    {
      functionDeclarations: tools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: {
          type: SchemaType.OBJECT,
          properties: Object.fromEntries(
            Object.entries(tool.function.parameters.properties).map(([key, value]) => [
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
            ]),
          ),
          required: tool.function.parameters.required,
        },
      })),
    },
  ];
}
