import { promisify } from "util";
import type { ZodType } from "zod";
import type { ErrorChatCompletion, MessageModel, SuccessChatCompletion } from "../types/chat.js";
import { AISuiteError } from "../utils.js";

const sleep = promisify(setTimeout);
/**
 * The JSON schema to use for the response and tool parameters
 */
type IJsonSchema = {
  type: "object";
  properties: Record<
    string,
    {
      type: "string" | "number" | "boolean" | "object" | "array";
      description?: string;
    }
  >;
  additionalProperties: boolean;
  required: string[];
};

/**
 * The tool model
 */
export interface ToolModel {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: IJsonSchema;
    additionalProperties: boolean;
    strict: boolean;
  };
}

export interface ThinkingConfig {
  /**
   * The thinking to use (only for Gemini) default is 0 and output is false
   */
  thinking?: {
    budget: number;
    output: boolean;
  };
}

export interface ReasoningConfig {
  /**
   * The reasoning to use (only for OpenAI and Grok)
   */
  reasoning?: {
    effort: "low" | "medium" | "high";
  };
}

export interface ChatOptionsBase extends ReasoningConfig, ThinkingConfig {
  /**
   * The retry options
   */
  retry?: {
    attempts: number;
    delay?: (attempt: number) => number;
  };
  /**
   * Whether to stream the response
   */
  stream?: boolean;
  /**
   * The temperature
   */
  temperature?: number;

  /**
   * The tools to use
   */
  tools?: ToolModel[];

  /**
   * Maximum number of output tokens
   *
   * Anthropic max_tokens is set to 4096 by default
   */
  maxOutputTokens?: number;

  /**
   * The metadata to use
   */
  metadata?: Record<string, unknown> & {
    langFuse?: {
      userId?: string;
      environment?: string;
      sessionId?: string;
      name?: string;
      tags?: string[];
    };
  };
}

export interface JSONSchema<T = unknown> extends ChatOptionsBase {
  /**
   * The response format
   */
  responseFormat: "json_schema";
  /**
   * The Zod schema to use for the response
   */
  zodSchema: ZodType<T>;
}

export interface JSONObject extends ChatOptionsBase {
  /**
   * The response format
   */
  responseFormat: "json_object";
}

export interface Text extends ChatOptionsBase {
  /**
   * The response format
   */
  responseFormat: "text";
}

export type ChatOptions = JSONSchema | JSONObject | Text;

export abstract class ProviderBase {
  /**
   * Abstract method that must be implemented by each provider
   */
  protected abstract _createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions,
  ): Promise<SuccessChatCompletion>;

  /**
   * Abstract method that must be implemented by each provider
   */
  abstract handleError(error: Error): Pick<ErrorChatCompletion, "error" | "raw" | "tag">;

  /**
   * Public method that includes retry logic
   */
  async createChatCompletion(messages: MessageModel[], options: ChatOptions): Promise<SuccessChatCompletion> {
    const attempts = options.retry?.attempts || 1;
    const delay = options.retry?.delay || (attempt => 2 ** attempt * 100);

    const debug = false;

    for (let i = 0; i < attempts; i++) {
      try {
        if (debug) {
          console.log(`Attempt ${i + 1} of ${attempts} with delay ${delay(i)}`);
        }
        return await this._createChatCompletion(messages, options);
      } catch (error) {
        if (error instanceof AISuiteError) {
          if (debug) {
            console.log(`Error is an AISuiteError, throwing it`);
          }
          throw error;
        }

        if (i === attempts - 1) {
          if (debug) {
            console.log(`This is the last attempt, throwing the error`);
          }
          throw error;
        }

        await sleep(delay(i));
      }
    }

    throw new Error("Retry logic failed");
  }
}

export class BaseHook {
  handleRequest: (req: unknown) => Promise<void>;
  handleResponse: (req: unknown, res: unknown, metadata: Record<string, unknown>) => Promise<void>;
  constructor(hooks?: {
    handleRequest?: (req: unknown) => Promise<void>;
    handleResponse?: (req: unknown, res: unknown, metadata: Record<string, unknown>) => Promise<void>;
    failOnError?: boolean;
  }) {
    const failOnError = hooks?.failOnError ?? true;

    this.handleRequest = async (req: unknown) => {
      if (hooks?.handleRequest) {
        try {
          await hooks.handleRequest(req);
        } catch (error) {
          console.warn("Error in handleRequest", error);
          if (failOnError) {
            throw new AISuiteError(error as string);
          }
        }
      }
    };

    this.handleResponse = async (req: unknown, res: unknown, metadata: Record<string, unknown>) => {
      if (hooks?.handleResponse) {
        try {
          await hooks.handleResponse(req, res, metadata);
        } catch (error) {
          console.warn("Error in handleResponse", error);
          if (failOnError) {
            throw new AISuiteError(error as string);
          }
        }
      }
    };
  }
}
