import { OpenAIProvider } from "./openai.js";

export class CustomLLMProvider extends OpenAIProvider {
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
