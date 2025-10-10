import { OpenAIProvider } from "./openai.js";

export type DeepSeekModels = "deepseek-chat" | "deepseek-coder" | "deepseek-coder-plus";

export class DeepSeekProvider extends OpenAIProvider {}
