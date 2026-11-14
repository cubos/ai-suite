import type { RetryOptions } from "../../types/retryOptions.js";

export interface OptionsBase {
  /**
   * The retry options
   */
  retry?: RetryOptions;

  /**
   * The metadata to use
   */
  metadata?: Record<string, unknown> & {
    langFuse?: LangfuseData;
  };
}

export interface LangfusePromptReference {
  /**
   * Name of the prompt in Langfuse Prompt Management
   */
  name: string;

  /**
   * Version of the prompt that produced the messages of this call
   */
  version: number;

  /**
   * True when the prompt came from a local fallback instead of Langfuse; no link is recorded then
   */
  isFallback?: boolean;
}

export interface LangfuseData {
  userId?: string;
  environment?: string;
  sessionId?: string;
  name?: string;
  tags?: string[];

  /**
   * Links the generation to a prompt version of Langfuse Prompt Management
   */
  prompt?: LangfusePromptReference;
}
