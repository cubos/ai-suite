import { OpenAIProvider } from "./openai.js";

export type GrokModels =
  | "grok-3"
  | "grok-3-mini"
  | "grok-3-fast"
  | "grok-3-mini-fast";

export class GrokProvider extends OpenAIProvider {
  constructor(apiKey: string, model: string, customURL?: string, hooks?: {
    handleRequest?: (req: unknown) => Promise<void>;
    handleResponse?: (res: unknown) => Promise<void>;
  }) {
    super(apiKey, model, customURL, hooks);
  }
}
