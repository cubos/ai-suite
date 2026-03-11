import dotenv from "dotenv";
import { readFileSync } from "fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { AISuite } from "../../src/index.js";
import type { SuccessChatCompletion } from "../../src/types/chat.js";
import type { SuccessEmbedding } from "../../src/types/index.js";

dotenv.config();

let apiKey: string | undefined;

beforeAll(() => {
  apiKey = process.env.OPENAI_API_KEY;
  expect(apiKey).toBeDefined();
});

describe("OpenAIProvider", () => {
  it("should mock a response using mock and call the hooks", async () => {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined");
    }

    const handleRequest = vi.fn(async (req: unknown) => {
      expect(req).toBeDefined();
    });

    const handleResponse = vi.fn(async (res: unknown) => {
      expect(res).toBeDefined();
    });

    const openAi = new AISuite(
      {
        openaiKey: apiKey,
      },
      {
        hooks: {
          handleRequest,
          handleResponse,
        },
      },
    );

    const result = await openAi.createChatCompletion("openai/gpt-4o-mini", [
      {
        role: "user",
        content: "Hello, world!",
      },
    ]);

    expect(result.success).toBe(true);
    expect((result as SuccessChatCompletion).content).toBeDefined();
    expect(handleRequest).toHaveBeenCalled();
    expect(handleResponse).toHaveBeenCalled();
  });

  it("should return JSON format response", async () => {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined");
    }

    const openAi = new AISuite({
      openaiKey: apiKey,
    });

    const result = await openAi.createChatCompletion(
      "openai/gpt-4o-mini",
      [
        {
          role: "user",
          content: "Return a JSON object with a field 'message' containing 'Hello, world!'",
        },
      ],
      {
        stream: false,
        responseFormat: "json_object",
      },
    );

    expect(result.success).toBe(true);
    expect((result as SuccessChatCompletion).content).toBeDefined();
    expect((result as SuccessChatCompletion).content_object).toBeDefined();
    expect((result as SuccessChatCompletion).content_object).toHaveProperty("message");
    expect((result as SuccessChatCompletion).content_object.message).toBe("Hello, world!");
  });

  it("should send images", async () => {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined");
    }

    const openAi = new AISuite({
      openaiKey: apiKey,
    });

    const img = readFileSync(`${__dirname}/../assets/cat.jpg`);

    const result = await openAi.createChatCompletion(
      "openai/gpt-4o-mini",
      [
        {
          role: "user",
          content: {
            type: "image",
            image: img,
          },
        },
        {
          role: "user",
          content: {
            type: "text",
            text: "What kind of animal is this?",
          },
        },
      ],
      {
        stream: false,
        zodSchema: z.object({
          description: z.string().describe("A description of the image"),
          kind: z.enum(["human", "cat", "dog"]).describe("The kind of animal in the image"),
        }),
        responseFormat: "json_schema",
      },
    );

    expect(result.success).toBe(true);
    expect((result as SuccessChatCompletion).content).toBeDefined();
    expect((result as SuccessChatCompletion).content_object).toBeDefined();
    expect((result as SuccessChatCompletion).content_object).toHaveProperty("kind");
    expect((result as SuccessChatCompletion).content_object.kind).toBe("cat");
  });
});

describe("OpenAIProvider - Embeddings", () => {
  it("should create embedding with a single text string", async () => {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined");
    }

    const openAi = new AISuite({
      openaiKey: apiKey,
    });

    const dimensions = 8;
    const result = await openAi.createEmbedding(
      "openai/text-embedding-3-small",
      {
        content: "Hello, world!",
      },
      {
        dimensions,
      },
    );

    const successResult = result as SuccessEmbedding;
    expect(result.success).toBe(true);
    expect(successResult.content).toBeDefined();
    expect(Array.isArray(successResult.content)).toBe(true);
    expect(successResult.content.length).toBe(1);
    expect(Array.isArray(successResult.content[0])).toBe(true);
    expect(successResult.content[0].length).toBe(dimensions);
    expect(successResult.model).toBeDefined();
    expect(successResult.object).toBe("list");
    expect(successResult.usage).toBeDefined();
  });

  it("should create embedding with multiple text strings", async () => {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined");
    }

    const openAi = new AISuite({
      openaiKey: apiKey,
    });

    const texts = ["Hello, world!", "How are you?", "Great to see you!"];
    const dimensions = 8;
    const result = await openAi.createEmbedding(
      "openai/text-embedding-3-small",
      {
        content: texts,
      },
      {
        dimensions,
      },
    );

    const successResult = result as SuccessEmbedding;
    expect(successResult.success).toBe(true);
    expect(successResult.content).toBeDefined();
    expect(Array.isArray(successResult.content)).toBe(true);
    expect(successResult.content.length).toBe(texts.length);
    expect(successResult.content).toHaveLength(texts.length);
    successResult.content.forEach(embedding => {
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(dimensions);
    });
    expect(successResult.model).toBeDefined();
    expect(successResult.object).toBe("list");
    expect(successResult.usage).toBeDefined();
  });
});
