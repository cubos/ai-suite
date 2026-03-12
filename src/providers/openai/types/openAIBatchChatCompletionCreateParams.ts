import type { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs";

export interface OpenAIBatchChatCompletionCreateParams {
  custom_id: string;
  method: "POST";
  url: "/v1/chat/completions";
  body: ChatCompletionCreateParamsBase;
}
