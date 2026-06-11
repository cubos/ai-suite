import { OpenAI } from "openai";
import { describe, expect, it } from "vitest";
import { AISuite } from "../../src/index.js";
import { OpenAIProvider } from "../../src/providers/openai/openaiProvider.js";
import type { ResultChatCompletion } from "../../src/types/chat.js";
import type { StreamChunk } from "../../src/types/stream.js";

/**
 * These tests assert how the request payload is built for the OpenAI provider.
 * The handleRequest hook runs before the network call, so throwing inside it lets
 * us capture the outgoing request and short-circuit before reaching the real API.
 * No OPENAI_API_KEY is required.
 */
async function captureRequest(
  // biome-ignore lint/suspicious/noExplicitAny: test helper passes through to the overloaded method
  model: any,
  // biome-ignore lint/suspicious/noExplicitAny: test helper passes through to the overloaded method
  options: any,
): Promise<Record<string, unknown> | undefined> {
  let captured: Record<string, unknown> | undefined;

  const aiSuite = new AISuite(
    { openaiKey: "test-key" },
    {
      hooks: {
        handleRequest: async (req: unknown) => {
          captured = req as Record<string, unknown>;
          throw new Error("short-circuit");
        },
        failOnError: true,
      },
    },
  );

  try {
    const result = (await aiSuite.createChatCompletion(model, [{ role: "user", content: "Hello" }], options)) as
      | ResultChatCompletion
      | AsyncGenerator<StreamChunk>;

    // The streaming path returns a lazy async generator, so handleRequest only fires once we
    // consume it. We know whether to drain it from the stream flag we passed in.
    if (options.stream) {
      for await (const _chunk of result as AsyncGenerator<StreamChunk>) {
        // no-op: handleRequest throws before any chunk is produced
      }
    }
  } catch {
    // handleRequest short-circuits the call after capturing the request
  }

  return captured;
}

describe("OpenAIProvider reasoning effort", () => {
  it("sends reasoning_effort and omits temperature for reasoning models", async () => {
    const captured = await captureRequest("openai/o3-mini", {
      stream: false,
      responseFormat: "text",
      reasoning: { effort: "high" },
    });

    expect(captured?.reasoning_effort).toBe("high");
    expect(captured?.temperature).toBeUndefined();
  });

  it("sends temperature and no reasoning_effort when reasoning is not set", async () => {
    const captured = await captureRequest("openai/gpt-4o-mini", {
      stream: false,
      responseFormat: "text",
      temperature: 0.5,
    });

    expect(captured?.temperature).toBe(0.5);
    expect(captured?.reasoning_effort).toBeUndefined();
  });

  it("trusts the explicit opt-in and sends reasoning_effort regardless of the model name", async () => {
    const captured = await captureRequest("openai/gpt-4o-mini", {
      stream: false,
      responseFormat: "text",
      temperature: 0.3,
      reasoning: { effort: "high" },
    });

    expect(captured?.reasoning_effort).toBe("high");
    expect(captured?.temperature).toBeUndefined();
  });

  it("sends reasoning_effort on the streaming path as well", async () => {
    const captured = await captureRequest("openai/o3-mini", {
      stream: true,
      responseFormat: "text",
      reasoning: { effort: "low" },
    });

    expect(captured?.reasoning_effort).toBe("low");
    expect(captured?.temperature).toBeUndefined();
  });

  it("turns a reasoning_effort rejection into an actionable error", () => {
    const provider = new OpenAIProvider("test-key", "gpt-4o-mini", "openai");
    const apiError = new OpenAI.APIError(
      400,
      { param: "reasoning_effort" },
      "Unsupported parameter: 'reasoning_effort' is not supported with this model.",
      undefined,
    );

    const result = provider.handleError(apiError);

    expect(result.tag).toBe("InvalidRequest");
    expect(result.error).toContain("gpt-4o-mini");
    expect(result.error).toContain("reasoning");
  });
});
