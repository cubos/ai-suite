export interface ReasoningConfig {
    /**
     * The reasoning to use (only for OpenAI and Grok)
     */
    reasoning?: {
        effort: "low" | "medium" | "high";
    };
}
