import dotenv from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { AISuite } from "../../src/index.js";
import type {
  SuccessCancelBatch,
  SuccessCreateBatch,
  SuccessListBatch,
  SuccessRetrieveBatch,
} from "../../src/types/batch.js";

dotenv.config();

let apiKey: string | undefined;

beforeAll(() => {
  apiKey = process.env.OPENAI_API_KEY;
  expect(apiKey).toBeDefined();
});

describe("OpenAI Batch API", () => {
  it("should throw error when neither inputFileId nor batch is provided", async () => {
    if (!apiKey) throw new Error("OPENAI_API_KEY is not defined");

    const ai = new AISuite({ openaiKey: apiKey });

    const result = await ai.batch.create("openai/gpt-4o-mini", "chat/completions", {}, { responseFormat: "text" });

    expect(result.success).toBe(false);
  });

  it("should create, list, retrieve and cancel a chat batch", async () => {
    if (!apiKey) throw new Error("OPENAI_API_KEY is not defined");

    const ai = new AISuite({ openaiKey: apiKey });

    // create
    const createResult = await ai.batch.create(
      "openai/gpt-4o-mini",
      "chat/completions",
      {
        batch: [
          {
            customId: "req-1",
            params: {
              mensagens: [{ role: "user", content: "Say hello" }],
            },
          },
        ],
      },
      { responseFormat: "text", maxOutputTokens: 100 },
    );

    expect(createResult.success).toBe(true);
    const batchId = (createResult as SuccessCreateBatch).content.id;
    expect(batchId).toBeDefined();
    expect((createResult as SuccessCreateBatch).content.object).toBe("batch");
    expect((createResult as SuccessCreateBatch).content.endpoint).toBe("chat/completions");

    // list
    const listResult = await ai.batch.list("openai/gpt-4o-mini", { limit: 10 });
    expect(listResult.success).toBe(true);
    expect(Array.isArray((listResult as SuccessListBatch).content)).toBe(true);

    // retrieve
    const retrieveResult = await ai.batch.retrieve("openai/gpt-4o-mini", batchId, {});
    expect(retrieveResult.success).toBe(true);
    expect((retrieveResult as SuccessRetrieveBatch).content.id).toBe(batchId);

    // cancel
    const cancelResult = await ai.batch.cancel("openai/gpt-4o-mini", batchId, {});
    expect(cancelResult.success).toBe(true);
    expect((cancelResult as SuccessCancelBatch).content).toBeNull();
  }, 30000);

  it("should create an embedding batch", async () => {
    if (!apiKey) throw new Error("OPENAI_API_KEY is not defined");

    const ai = new AISuite({ openaiKey: apiKey });

    const createResult = await ai.batch.create(
      "openai/text-embedding-3-small",
      "embeddings",
      {
        batch: [
          { customId: "emb-1", params: { content: "Hello world" } },
          { customId: "emb-2", params: { content: "Goodbye world" } },
        ],
      },
      {},
    );

    expect(createResult.success).toBe(true);
    expect((createResult as SuccessCreateBatch).content.endpoint).toBe("embeddings");
  }, 30000);
});
