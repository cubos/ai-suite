import { OpenAIProvider } from "./openai.js";

export type GrokModels =
  | "grok-3"
  | "grok-3-mini"
  | "grok-3-fast"
  | "grok-3-mini-fast";

export class GrokProvider extends OpenAIProvider {
  constructor(
    apiKey: string,
    model: string,
    customURL?: string,
    hooks?: {
      handleRequest?: (req: unknown) => Promise<void>;
      handleResponse?: (
        req: unknown,
        res: unknown,
        metadata: Record<string, unknown>
      ) => Promise<void>;
      failOnError?: boolean;
    }
  ) {
    super(apiKey, model, customURL, hooks);
  }
}
