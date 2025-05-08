import { Readable } from "stream";
import { MessageModel, ResultChatCompletion } from "../types/chat.js";
import { ZodObject, ZodRawShape, ZodType } from "zod";

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

export interface ChatOptionsBase {
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

export interface ProviderBase {
  createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions
  ): Promise<Readable | ResultChatCompletion>;
}
