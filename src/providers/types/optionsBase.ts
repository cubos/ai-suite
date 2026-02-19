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

export interface LangfuseData {
  userId?: string;
  environment?: string;
  sessionId?: string;
  name?: string;
  tags?: string[];
}