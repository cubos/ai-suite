import { Readable } from "stream";
import { MessageModel, ResultChatCompletion } from "../types/chat.js";

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

export interface ChatOptions {
  /**
   * Whether to stream the response
   */
  stream?: boolean;
  /**
   * The response format
   */
  responseFormat?: "json_object" | "text";
  /**
   * The temperature
   */
  temperature?: number;

  /**
   * The tools to use
   */
  tools?: ToolModel[];
}

export interface ProviderBase {
  createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions
  ): Promise<Readable | ResultChatCompletion>;
}
