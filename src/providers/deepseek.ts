import { OpenAIProvider } from "./openai.js";

export type DeepSeekModels =
  | "deepseek-chat"
  | "deepseek-coder"
  | "deepseek-coder-plus";

export class DeepSeekProvider extends OpenAIProvider {
  constructor(apiKey: string, model: string, customURL?: string, hooks?: {
    handleRequest?: (req: unknown) => Promise<void>;
    handleResponse?: (res: unknown) => Promise<void>;
  }) {
    super(apiKey, model, customURL, hooks);
  }
}
