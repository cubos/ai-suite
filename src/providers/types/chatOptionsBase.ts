import type { OptionsBase } from "./optionsBase.js";
import type { ReasoningConfig } from "./reasoningConfig.js";
import type { ThinkingConfig } from "./thinkingConfig.js";
import type { ToolModel } from "./toolModel.js";

export interface ChatOptionsBase extends ReasoningConfig, ThinkingConfig, OptionsBase {
  /**
   * Whether to stream the response
   */
  stream?: boolean;
  /**
   * The temperature
   */
  temperature?: number;

  /**
   * The tools to use
   */
  tools?: ToolModel[];

  /**
   * Maximum number of output tokens
   *
   * Anthropic max_tokens is set to 4096 by default
   */
  maxOutputTokens?: number;
}
