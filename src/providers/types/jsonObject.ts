import { ChatOptionsBase } from "./chatOptionsBase.js";

export interface JSONObject extends ChatOptionsBase {
  /**
   * The response format
   */
  responseFormat: "json_object";
}