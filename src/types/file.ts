import type { OptionsBase } from "../providers/types/optionsBase.js";
import type { ErrorAISuite } from "./handleErrorResponse.js";
import type { ResultBase } from "./resultBase.js";

export interface CreateFileOptions extends OptionsBase {
  /**
   * The expiration time for the file, specified as a number of seconds after the file's creation time (only supported by OpenAI).
   */
  expires_after?: {
    anchor: "created_at";
    seconds: number;
  };
}

export interface ListFileOptions extends OptionsBase {
  /**
   * The cursor for pagination, returned in the previous response's `after` field.
   */
  after?: string;

  /**
   * The maximum number of files to return. Defaults to 10.
   */
  limit?: number;
}

export interface FileResponse {
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

export interface SuccessCreateFile extends ResultBase<FileResponse> {}

export interface SuccessListFile extends ResultBase<FileResponse[]> {
  has_next_page: boolean;
}

export interface SuccessRetrieveFile extends ResultBase<FileResponse> {}

export type ResultCreateFile = SuccessCreateFile | ErrorAISuite;

export type ResultListFile = SuccessListFile | ErrorAISuite;

export type ResultRetrieveFile = SuccessRetrieveFile | ErrorAISuite;
