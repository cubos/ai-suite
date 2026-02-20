import dotenv from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { AISuite } from "../src/index.js";
import type { SuccessChatCompletion } from "../src/types/chat.js";
import type { ErrorAISuite } from "../src/types/handleErrorResponse.js";
import { AISuiteError } from "../src/utils.js";

dotenv.config();

let apiKey: string | undefined;

beforeAll(() => {
  apiKey = process.env.OPENAI_API_KEY;
  expect(apiKey).toBeDefined();
});

describe("Retry Logic - Integration Tests", () => {
  it("should exhaust all retry attempts with invalid API key", async () => {
    const aiSuite = new AISuite({
      openaiKey: "invalid-api-key-that-will-fail",
    });

    const result = await aiSuite.createChatCompletion("openai/gpt-4o-mini", [{ role: "user", content: "Say hello" }], {
      stream: false,
      responseFormat: "text",
      retry: { attempts: 3, delay: () => 100 },
    });

    expect(result.success).toBe(false);
    expect((result as ErrorAISuite).error).toBe("Unauthorized");
    expect((result as ErrorAISuite).tag).toBe("InvalidAuth");
  }, 15000);

  it("should exhaust all retry attempts with network error (invalid URL)", async () => {
    const aiSuite = new AISuite({
      customURL: "http://localhost:99999",
      customLLMKey: "any-key",
    });

    const startTime = Date.now();

    const result = await aiSuite.createChatCompletion(
      "custom-llm/test-model",
      [{ role: "user", content: "Say hello" }],
      {
        stream: false,
        responseFormat: "text",
        retry: {
          attempts: 3,
          delay: () => 50, // 50ms delay for faster test
        },
      },
    );

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    expect(result.success).toBe(false);
    expect((result as ErrorAISuite).error).toBeDefined();
    // Should have taken at least 100ms (2 retries * 50ms delay)
    expect(totalTime).toBeGreaterThanOrEqual(100);
  });

  it("should not retry on AISuiteError from hooks", async () => {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined");
    }

    let requestCount = 0;

    const aiSuite = new AISuite(
      {
        openaiKey: apiKey,
      },
      {
        hooks: {
          handleRequest: async () => {
            requestCount++;
            throw new AISuiteError("Critical validation error");
          },
          failOnError: true,
        },
      },
    );

    const result = await aiSuite.createChatCompletion("openai/gpt-4o-mini", [{ role: "user", content: "Say hello" }], {
      stream: false,
      responseFormat: "text",
      retry: { attempts: 5 },
    });

    expect(result.success).toBe(false);
    expect(requestCount).toBe(1); // Should not retry on AISuiteError
  });

  it("should use custom delay function with network errors", async () => {
    const delays: number[] = [];

    const customDelay = (attempt: number) => {
      const delay = attempt * 50; // 0ms, 50ms, 100ms, etc.
      delays.push(delay);
      return delay;
    };

    const aiSuite = new AISuite({
      customURL: "http://localhost:99999",
      customLLMKey: "any-key",
    });

    const result = await aiSuite.createChatCompletion(
      "custom-llm/test-model",
      [{ role: "user", content: "Say hello" }],
      {
        stream: false,
        responseFormat: "text",
        retry: {
          attempts: 3,
          delay: customDelay,
        },
      },
    );

    expect(result.success).toBe(false);
    expect(delays.length).toBe(2); // 2 delays (before retry 2 and 3)
    expect(delays).toEqual([0, 50]); // First delay: 0ms, second delay: 50ms
  });

  it("should work without retry configuration (default single attempt)", async () => {
    const aiSuite = new AISuite({
      openaiKey: "invalid-api-key-that-will-fail",
    });

    const startTime = Date.now();

    const result = await aiSuite.createChatCompletion("openai/gpt-4o-mini", [{ role: "user", content: "Say hello" }], {
      stream: false,
      responseFormat: "text",
    });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    expect(result.success).toBe(false);
    // Should be fast (single attempt, no retry delay)
    expect(totalTime).toBeLessThan(10000);
  }, 15000);

  it("should successfully complete with valid API key and retry configuration", async () => {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not defined");
    }

    const aiSuite = new AISuite({
      openaiKey: apiKey,
    });

    const result = await aiSuite.createChatCompletion(
      "openai/gpt-4o-mini",
      [{ role: "user", content: "Say hello in one word" }],
      {
        stream: false,
        responseFormat: "text",
        retry: {
          attempts: 3,
          delay: attempt => attempt * 100,
        },
      },
    );

    expect(result.success).toBe(true);
    expect((result as SuccessChatCompletion).content).toBeDefined();
    expect((result as SuccessChatCompletion).content?.length).toBeGreaterThan(0);
  });

  it("should use exponential backoff by default", async () => {
    const aiSuite = new AISuite({
      customURL: "http://localhost:99999",
      customLLMKey: "any-key",
    });

    const startTime = Date.now();

    const result = await aiSuite.createChatCompletion(
      "custom-llm/test-model",
      [{ role: "user", content: "Say hello" }],
      {
        stream: false,
        responseFormat: "text",
        retry: { attempts: 4 }, // Will use default exponential delay
      },
    );

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    expect(result.success).toBe(false);
    // Default delay: 2^0 * 100 = 100ms, 2^1 * 100 = 200ms, 2^2 * 100 = 400ms
    // Total minimum: 700ms for 3 retries
    expect(totalTime).toBeGreaterThanOrEqual(600);
  });
});
