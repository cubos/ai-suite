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
  apiKey = process.env.ANTHROPIC_API_KEY;
  expect(apiKey).toBeDefined();
});

describe("Anthropic Batch API", () => {
  it("should throw error when inputFileId is provided", async () => {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not defined");

    const ai = new AISuite({ anthropicKey: apiKey });

    const result = await ai.batch.create(
      "chat/completions",
      "anthropic/claude-haiku-4-5-20251001",
      { inputFileId: "file-123" },
      { responseFormat: "text" },
    );

    expect(result.success).toBe(false);
  });

  it("should throw error when batch messages are not provided", async () => {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not defined");

    const ai = new AISuite({ anthropicKey: apiKey });

    const result = await ai.batch.create(
      "chat/completions",
      "anthropic/claude-haiku-4-5-20251001",
      {},
      { responseFormat: "text" },
    );

    expect(result.success).toBe(false);
  });

  it("should create, list, retrieve and cancel a batch", async () => {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not defined");

    const ai = new AISuite({ anthropicKey: apiKey });

    // create
    const createResult = await ai.batch.create(
      "chat/completions",
      "anthropic/claude-haiku-4-5-20251001",
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
    const listResult = await ai.batch.list("anthropic", { limit: 10 });
    expect(listResult.success).toBe(true);
    expect(Array.isArray((listResult as SuccessListBatch).content)).toBe(true);

    // retrieve
    const retrieveResult = await ai.batch.retrieve("anthropic", batchId, {});
    expect(retrieveResult.success).toBe(true);
    expect((retrieveResult as SuccessRetrieveBatch).content.id).toBe(batchId);

    // cancel
    const cancelResult = await ai.batch.cancel("anthropic", batchId, {});
    expect(cancelResult.success).toBe(true);
    expect((cancelResult as SuccessCancelBatch).content).toBeNull();
  }, 30000);
});
