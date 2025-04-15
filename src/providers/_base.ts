import { Readable } from "stream";
import { MessageModel, ResultChatCompletion } from "../types/chat.js";

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
}

export interface ProviderBase {
  createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions
  ): Promise<Readable | ResultChatCompletion>;
}
