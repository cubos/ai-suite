import dotenv from "dotenv";
import { beforeAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { AISuite } from "../src/index.js";
import type { SuccessChatCompletion } from "../src/types/chat.js";

dotenv.config();

let apiKey: string | undefined;

beforeAll(() => {
  apiKey = process.env.GEMINI_API_KEY;
  expect(apiKey).toBeDefined();
});

describe("GeminiProvider", () => {
  it("should mock a response using mock and call the hooks", async () => {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    const handleRequest = vi.fn(async (req: unknown) => {
      expect(req).toBeDefined();
    });

    const handleResponse = vi.fn(async (res: unknown) => {
      expect(res).toBeDefined();
    });

    const gemini = new AISuite(
      {
        geminiKey: apiKey,
      },
      {
        hooks: {
          handleRequest,
          handleResponse,
        },
      },
    );

    const result = await gemini.createChatCompletion("gemini/gemini-2.0-flash-lite", [
      {
        role: "user",
        content: "Hello, world!",
      },
    ]);

    if (!result.success) {
      console.log("Gemini error:", result);
    }

    expect(result.success).toBe(true);
    expect((result as SuccessChatCompletion).content).toBeDefined();
    expect(handleRequest).toHaveBeenCalled();
    expect(handleResponse).toHaveBeenCalled();
  }, 15000);

  it("should return JSON format response", async () => {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    const gemini = new AISuite({
      geminiKey: apiKey,
    });

    const result = await gemini.createChatCompletion(
      "gemini/gemini-2.0-flash-lite",
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

    const result2 = await gemini.createChatCompletion(
      "gemini/gemini-2.5-flash-lite",
      [
        {
          role: "user",
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

    expect(result2.success).toBe(true);
    expect((result2 as SuccessChatCompletion).content).toBeDefined();
    expect((result2 as SuccessChatCompletion).content_object).toBeDefined();
    expect((result2 as SuccessChatCompletion).content_object).toHaveProperty("message");
    expect((result2 as SuccessChatCompletion).content_object.message).toBe("Hello, world!");
  });
});
