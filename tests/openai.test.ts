import dotenv from "dotenv";
import { readFileSync } from "fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { AISuite } from "../src/index.js";
import type { SuccessChatCompletion } from "../src/types/chat.js";

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

    const img = readFileSync(`${__dirname}/cat.jpg`);

    const result = await openAi.createChatCompletion(
      "openai/gpt-4o-mini",
      [
        {
          role: "user",
          content: {
            type: "image",
            image: Buffer.from(img.buffer),
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
