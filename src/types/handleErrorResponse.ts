interface ResultErrorAISuite {
  /**
   * The Unix timestamp (in seconds) of when the chat completion was created.
   */
  created: number;

  /**
   * The model used for the chat completion.
   */
  model: string;

  /**
   * The error message.
   */
  error: string;

  /**
   * The error tag.
   * e.g. "InvalidAuth" | "InvalidRequest" | "InvalidModel" | "RateLimitExceeded" | "ServerError" | "ServerOverloaded" | "Unknown";
   *
   */
  tag:
    | "InvalidAuth"
    | "InvalidRequest"
    | "InvalidModel"
    | "RateLimitExceeded"
    | "ServerError"
    | "ServerOverloaded"
    | "Unknown";
  /**
   *
   * The raw error from the API.
   */
  raw: Error;

  /**
   * The execution time of the completion request. In milliseconds.
   */
  execution_time?: number;
}

export type ErrorAISuite = ResultErrorAISuite & {
  success: false;
};

export type HandleErrorResponse = Pick<ErrorAISuite, "error" | "raw" | "tag">;
