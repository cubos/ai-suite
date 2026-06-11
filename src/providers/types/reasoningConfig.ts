export interface ReasoningConfig {
  /**
   * The reasoning effort to use (only for OpenAI and Grok reasoning models).
   *
   * When set, `temperature` is omitted from the request, since reasoning models reject a custom
   * temperature. If both are passed, `reasoning` wins and `temperature` is ignored.
   */
  reasoning?: {
    effort: "low" | "medium" | "high";
  };
}
