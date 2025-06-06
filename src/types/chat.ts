interface ResultErrorChatCompletion {
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

interface ResultSuccessChatCompletion {
  /**
   * A unique identifier for the chat completion.
   */
  id: string;

  /**
   * A list of chat completion choices. Can be more than one if `n` is greater
   * than 1.
   */
  // choices: Array<ChatCompletion.Choice>;

  /**
   * The Unix timestamp (in seconds) of when the chat completion was created.
   */
  created: number;

  /**
   * The model used for the chat completion.
   */
  model: string;

  /**
   * The object type, which is always `chat.completion`.
   */
  object: "chat.completion";

  /**
   * The service tier used for processing the request.
   */
  service_tier?: "scale" | "default" | null;

  /**
   * This fingerprint represents the backend configuration that the model runs with.
   *
   * Can be used in conjunction with the `seed` request parameter to understand when
   * backend changes have been made that might impact determinism.
   */
  system_fingerprint?: string;

  /**
   * Usage statistics for the completion request.
   */
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cached_tokens: number;
    reasoning_tokens: number;
    thoughts_tokens: number;
  };

  /**
   * The content of the chat completion.
   */
  content: string | null;

  /**
   * The content of the chat completion.
   */
  content_object: Record<string, unknown>;

  tools?: {
    id: string;
    type: "function";
    name: string;
    content: Record<string, unknown>;
    rawContent: string;
  }[];

  /**
   * The execution time of the completion request. In milliseconds.
   */
  execution_time?: number;

  /**
   * The metadata to use
   */
  metadata?: Record<string, unknown>;
}

export type SuccessChatCompletion = ResultSuccessChatCompletion & {
  success: true;
};

export type ErrorChatCompletion = ResultErrorChatCompletion & {
  success: false;
};

export type ResultChatCompletion = SuccessChatCompletion | ErrorChatCompletion;

export type MessageModel = {
  role: "user" | "developer" | "assistant" | "tool";
  content: string;
  name?: string;
};
