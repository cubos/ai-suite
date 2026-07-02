import { OpenAI } from "openai";
import { describe, expect, it } from "vitest";
import { AISuite } from "../../src/index.js";
import { OpenAIProvider } from "../../src/providers/openai/openaiProvider.js";
import type { ChatOptions } from "../../src/providers/types/index.js";
import type { MessageModel } from "../../src/types/chat.js";
import type { ProviderChatModel } from "../../src/types/providerModel.js";

/**
 * These tests assert how the request payload is built for the OpenAI provider.
 * The handleRequest hook runs before the network call, so throwing inside it lets
 * us capture the outgoing request and short-circuit before reaching the real API.
 * No OPENAI_API_KEY is required.
 */
async function captureRequest(
  model: ProviderChatModel<string>,
  options: ChatOptions,
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

  const messages: MessageModel[] = [{ role: "user", content: "Hello" }];

  try {
    if (options.stream) {
      // The streaming path returns a lazy async generator, so handleRequest only fires once we consume it.
      const stream = await aiSuite.createChatCompletion(model, messages, { ...options, stream: true });
      for await (const _chunk of stream) {
        // no-op: handleRequest throws before any chunk is produced
      }
    } else {
      await aiSuite.createChatCompletion(model, messages, { ...options, stream: false });
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
      {
        param: "reasoning_effort",
        message: "Unsupported parameter: 'reasoning_effort' is not supported with this model.",
      },
      undefined,
      undefined,
    );

    const result = provider.handleError(apiError);

    expect(result.tag).toBe("InvalidRequest");
    expect(result.error).toContain("gpt-4o-mini");
    expect(result.error).toContain("reasoning");
  });
});
