import type { OptionsBase } from "../providers/types/optionsBase.js";
import type { ErrorAISuite } from "./handleErrorResponse.js";
import type { ResultBase } from "./resultBase.js";

export interface FileOptions extends OptionsBase {
  /**
   * The expiration time for the file, specified as a number of seconds after the file's creation time (only supported by OpenAI).
   */
  expires_after?: {
    anchor: "created_at";
    seconds: number;
  };
}

export interface SuccessCreateFile extends ResultBase {
  id: string;

  object: "file";
  /**
   * The size of the file in bytes.
   */
  bytes: number;
  /**
   * The Unix timestamp (in seconds) of when the file was created.
   */
  created_at: number;

  filename: string;

  /**
   * Expiration time of the file, specified as a Unix timestamp (in seconds).
   */
  expires_at?: number;
}

export type ResultCreateFile = SuccessCreateFile | ErrorAISuite;
