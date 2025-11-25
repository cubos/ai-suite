import dotenv from "dotenv";
import { beforeAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { AISuite } from "../src/index.js";
import type { SuccessChatCompletion } from "../src/types/chat.js";

dotenv.config();

let apiKey: string | undefined;

beforeAll(() => {
  apiKey = process.env.ANTHROPIC_API_KEY;
  expect(apiKey).toBeDefined();
});

describe("AnthropicProvider", () => {
  it("should mock a response using mock and call the hooks", async () => {
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not defined");
    }

    const handleRequest = vi.fn(async (req: unknown) => {
      expect(req).toBeDefined();
    });

    const handleResponse = vi.fn(async (res: unknown) => {
      expect(res).toBeDefined();
    });

    const anthropic = new AISuite(
      {
        anthropicKey: apiKey,
      },
      {
        hooks: {
          handleRequest,
          handleResponse,
        },
      },
    );

    const result = await anthropic.createChatCompletion("anthropic/claude-sonnet-4-5", [
      {
        role: "user",
        content: "Hello, world!",
      },
    ]);

    if (!result.success) {
      console.log("Anthropic error:", result);
    }

    expect(result.success).toBe(true);
    expect((result as SuccessChatCompletion).content).toBeDefined();
    expect(handleRequest).toHaveBeenCalled();
    expect(handleResponse).toHaveBeenCalled();
  }, 15000);

  it("should return JSON format response", async () => {
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not defined");
    }

    const anthropic = new AISuite({
      anthropicKey: apiKey,
    });

    const result = await anthropic.createChatCompletion(
      "anthropic/claude-sonnet-4-5",
      [
        {
          role: "assistant",
          content: "Return a JSON object with a field 'message' containing 'Hello, world!'",
        },
      ],
      {
        stream: false,
        zodSchema: z.object({
          message: z.string(),
        }),
        responseFormat: "json_schema",
      },
    );

    expect(result.success).toBe(true);
    expect((result as SuccessChatCompletion).content).toBeDefined();
  }, 15000);
});
