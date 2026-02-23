import type { OptionsBase } from "../providers/types/optionsBase.js";

export interface FileOptions extends OptionsBase {
  /**
   * The expiration time for the file, specified as a number of seconds after the file's creation time (only supported by OpenAI).
   */
  expires_after?: {
    anchor: "created_at";
    seconds: number;
  };
}
