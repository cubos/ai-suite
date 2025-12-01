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
import type { ErrorChatCompletion, InputContent, MessageModel, SuccessChatCompletion } from "../types/chat.js";
import { BaseHook, type ChatOptions, ProviderBase, type ToolModel } from "./_base.js";

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
    const systemMessage = messages[0].role !== "user" ? messages[0] : null;
    const systemPrompt = systemMessage
      ? Array.isArray(systemMessage.content)
        ? systemMessage.content.map(c =>
          this.parseInputContent<{ text?: string; inlineData?: { mimeType: string; data: string } }>(c),
        )
        : [
          this.parseInputContent<{ text?: string; inlineData?: { mimeType: string; data: string } }>(
            systemMessage.content,
          ),
        ]
      : null;

    let thinkingConfig: {
      thinkingBudget: number;
      includeThoughts: boolean;
    } | null = null;

    if (onlyWorksWithThinking.includes(this.model)) {
      thinkingConfig = {
        thinkingBudget: options.thinking?.budget ?? 128,
        includeThoughts: options.thinking?.output ?? false,
      };
    } else if (notUseThinkingConfig.includes(this.model)) {
      thinkingConfig = null;
    } else {
      thinkingConfig = {
        thinkingBudget: options.thinking?.budget ?? 0,
        includeThoughts: options.thinking?.output ?? false,
      };
    }

    const req: GenerateContentParameters = {
      config: {
        tools: options.tools ? convertToGeminiFunctions(options.tools) : undefined,
        temperature: options.temperature ?? 0.7,
        ...(thinkingConfig ?? {}),
        ...(systemPrompt ? { systemInstruction: { role: "user", parts: systemPrompt } } : {}),
        responseMimeType: options.responseFormat !== "text" ? "application/json" : undefined,
        ...(options.responseFormat === "json_schema"
          ? {
            responseSchema: toGeminiSchema(options.zodSchema),
          }
          : {}),
        ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
      },
      contents: messages.slice(systemMessage ? 1 : 0, messages.length).map(msg => {
        const content = Array.isArray(msg.content) ? msg.content : [msg.content];
        const parsedContent = content.map(c =>
          this.parseInputContent<{ text?: string; inlineData?: { mimeType: string; data: string } }>(c),
        );

        if (msg.role === "user" || msg.role === "developer") {
          return {
            role: "user",
            parts: parsedContent,
          };
        }
        if (msg.role === "assistant") {
          const textContent = parsedContent
            .filter(c => c.text !== undefined)
            .map(c => c.text!)
            .join("");

          return {
            role: "model",
            parts: [{ text: textContent }],
          };
        }
        if (msg.role === "tool") {
          const textContent = parsedContent
            .filter(c => c.text !== undefined)
            .map(c => c.text!)
            .join("");

          return {
            role: "user",
            parts: [
              {
                text: `Tool Response (${msg.name || "default_tool"}): ${textContent}`,
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

    const result: SuccessChatCompletion = {
      success: true,
      id: `gemini-${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      model: this.model,
      object: "chat.completion",
      content: response.text ?? null,
      content_object: contentObject ?? {},
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

  /**
   * Parses the input content into a Gemini-compatible content part.
   * @param content The input content to parse.
   * @returns The parsed content part.
   */
  parseInputContent<T>(content: InputContent): T {
    if (typeof content === "string") {
      return { text: content } as unknown as T;
    }

    if (content.type === "text") {
      return { text: content.text } as unknown as T;
    }

    if (content.type === "image") {
      let base64: string;
      if (Buffer.isBuffer(content.image)) {
        base64 = content.image.toString("base64");
      } else if (typeof content.image === "string") {
        if (content.image.startsWith("http") || content.image.startsWith("data:")) {
          throw new Error("Gemini does not support image URLs directly. Please provide base64 encoded images.");
        } else {
          base64 = content.image;
        }
      } else {
        throw new Error("Unsupported image type");
      }

      return {
        inlineData: {
          mimeType: "image/png",
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

      return {
        inlineData: {
          mimeType: content.mediaType,
          data: base64,
        },
      } as unknown as T;
    }

    throw new Error("Unsupported content type");
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
