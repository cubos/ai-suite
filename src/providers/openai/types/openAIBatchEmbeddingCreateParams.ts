import type { EmbeddingCreateParams } from "openai/resources";

export interface OpenAIBatchEmbeddingCreateParams {
  custom_id: string;
  method: "POST";
  url: "/v1/embeddings";
  body: EmbeddingCreateParams;
}
