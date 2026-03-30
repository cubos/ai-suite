import type { AnthropicModels } from "../providers/anthropic/index.js";
import type { DeepSeekEmbeddingModels, DeepSeekModels } from "../providers/deepSeek/index.js";
import type { GeminiEmbeddingModels, GeminiModels } from "../providers/gemini/index.js";
import type { GrokModels } from "../providers/grok/index.js";
import type { OpenAIEmbeddingModels, OpenAIModels } from "../providers/openai/index.js";

export type ProviderModel<S extends string> =
  | ProviderChatModel<S>
  | ProviderEmbeddingModel<S>
  | ProviderFileType
  | ProviderBatchModel<S>;

export type ProviderChatModel<S extends string> =
  | `openai/${OpenAIModels}`
  | `anthropic/${AnthropicModels}`
  | `gemini/${GeminiModels}`
  | `deepseek/${DeepSeekModels}`
  | `custom-llm/${S}`
  | `grok/${GrokModels}`;

export type ProviderEmbeddingModel<S extends string> =
  | `openai/${OpenAIEmbeddingModels}`
  | `gemini/${GeminiEmbeddingModels}`
  | `deepseek/${DeepSeekEmbeddingModels}`
  | `custom-llm/${S}`;

export type ProviderBatchModel<S extends string = string> = ProviderChatModel<S> | ProviderEmbeddingModel<S>;

export type ProviderFileType = "openai" | "anthropic" | "gemini" | "deepseek" | "custom-llm" | "grok";

export type ProviderBatchType = "openai" | "anthropic" | "gemini" | "deepseek" | "custom-llm" | "grok";
