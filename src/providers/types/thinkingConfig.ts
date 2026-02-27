export interface ThinkingConfig {
  /**
   * The thinking to use (only for Gemini) default is 0 and output is false
   */
  thinking?: {
    budget?: number;
    level?: "minimal" | "low" | "medium" | "high";
    output: boolean;
  };
}
