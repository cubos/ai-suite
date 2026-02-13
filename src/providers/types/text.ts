import { ChatOptionsBase } from "./chatOptionsBase.js";

export interface Text extends ChatOptionsBase {
  /**
   * The response format
   */
  responseFormat: "text";
}