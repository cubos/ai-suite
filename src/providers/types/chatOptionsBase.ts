import { ReasoningConfig } from "./reasoningConfig.js";
import { ThinkingConfig } from "./thinkingConfig.js";
import { ToolModel } from "./toolModel.js";

export interface ChatOptionsBase extends ReasoningConfig, ThinkingConfig {
    /**
     * The retry options
     */
    retry?: {
        attempts: number;
        delay?: (attempt: number) => number;
    };
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

    /**
     * The metadata to use
     */
    metadata?: Record<string, unknown> & {
        langFuse?: {
            userId?: string;
            environment?: string;
            sessionId?: string;
            name?: string;
            tags?: string[];
        };
    };
}