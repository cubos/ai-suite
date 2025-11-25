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

/**
 * Represents an image input content.
 */
export interface InputContentImage {
  /**
   * The type of the content, which is always "image".
   */
  type: "image";
  /**
   * The image data, either as a base64 string or a Buffer.
   */
  image: string | Buffer;
}

/**
 * Represents a file input content.
 */
export interface InputContentFile {
  /**
   * The type of the content, which is always "file".
   */
  type: "file";
  /**
   * The media type of the file.
   */
  mediaType:
    | "application/pdf"
    | "image/png"
    | "image/jpg"
    | "image/jpeg"
    | "image/gif"
    | "image/webp";
  /**
   * The file data, either as a Buffer, ArrayBuffer, or base64 string.
   */
  file: Buffer | ArrayBuffer | string;
  /**
   * The name of the file.
   */
  fileName: string;
}

/**
 * Represents a text input content.
 */
export interface InputContentText {
  /**
   * The type of the content, which is always "text".
   */
  type: "text";
  /**
   * The text content.
   */
  text: string;
}

/**
 * Represents the input content for a message.
 * It can be a simple string, an image, a file, or a structured text object.
 */
export type InputContent =
  | string
  | InputContentImage
  | InputContentFile
  | InputContentText;

/**
 * Text-only content for assistant and tool messages.
 * Images are not supported in assistant/tool messages by any provider (OpenAI, Anthropic, Gemini).
 */
export type InputContentTextOnly = string | InputContentText;

/**
 * Represents a message in the conversation.
 * Assistant and tool messages can only contain text content (no images/files).
 * User and developer messages can contain any content type including images and files.
 */
export type MessageModel =
  | {
      role: "assistant";
      content: InputContentTextOnly | Array<InputContentTextOnly>;
      name?: string;
    }
  | {
      role: "tool";
      content: InputContentTextOnly | Array<InputContentTextOnly>;
      name?: string;
    }
  | {
      role: "user" | "developer";
      content: InputContent | Array<InputContent>;
      name?: string;
    };
