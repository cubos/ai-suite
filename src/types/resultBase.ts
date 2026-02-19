export interface ResultBase {
  /**
   * Whether the request was successful
   */
  success: boolean;

  /**
   * The content of the response, if the request was successful. It can be null if the provider doesn't return a content or if there was an error.
   */
  content: unknown;

  /**
   * The model used for AI.
   */
  model: string;

  /**
   * The usage information for the request.
   */
  usage?:
    | {
        input_tokens: number;
        output_tokens: 0;
        total_tokens: number;
      }
    | {
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
        cached_tokens: number;
        reasoning_tokens: number;
        thoughts_tokens: number;
      };
}
