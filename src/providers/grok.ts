import { OpenAIProvider } from "./openai.js";

export type GrokModels = "grok-3" | "grok-3-mini" | "grok-3-fast" | "grok-3-mini-fast";

export class GrokProvider extends OpenAIProvider {}
