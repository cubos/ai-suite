import { OpenAIProvider } from "./openai.js";

export type CustomLLMModels = `${string}`;

export class CustomLLMProvider extends OpenAIProvider {
  constructor(apiKey: string, model: string, customURL?: string) {
    super(apiKey, model, customURL);
  }
}
