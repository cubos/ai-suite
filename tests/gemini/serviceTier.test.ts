import type { GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { GeminiProvider } from "../../src/providers/gemini/geminiProvider.js";
import type { SuccessChatCompletion } from "../../src/types/chat.js";
import type { StreamChunk } from "../../src/types/stream.js";

function fakeResponse(): GenerateContentResponse {
  return {
    text: "ok",
    functionCalls: undefined,
    usageMetadata: {
      promptTokenCount: 1,
      candidatesTokenCount: 1,
      thoughtsTokenCount: 0,
      cachedContentTokenCount: 0,
    },
  } as unknown as GenerateContentResponse;
}

function fakeStream(): AsyncGenerator<GenerateContentResponse> {
  async function* gen() {
    yield {
      text: "ok",
      usageMetadata: {
        promptTokenCount: 1,
        candidatesTokenCount: 1,
        thoughtsTokenCount: 0,
        cachedContentTokenCount: 0,
      },
    } as unknown as GenerateContentResponse;
  }
  return gen();
}

function newProvider(): GeminiProvider {
  return new GeminiProvider("fake-key", "gemini-2.5-flash-lite", "gemini");
}

async function collectStream(gen: AsyncGenerator<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = [];
  for await (const chunk of gen) chunks.push(chunk);
  return chunks;
}

describe("GeminiProvider - serviceTier (non-stream)", () => {
  it("forwards a Gemini-supported tier to config.serviceTier and echoes it on the response", async () => {
    const provider = newProvider();
    const spy = vi.spyOn(provider.client.models, "generateContent").mockResolvedValue(fakeResponse());

    const result = (await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
      serviceTier: "priority",
    })) as SuccessChatCompletion;

    const sentReq = spy.mock.calls[0][0] as GenerateContentParameters;
    expect(sentReq.config?.serviceTier).toBe("priority");
    expect(result.success).toBe(true);
    expect(result.service_tier).toBe("priority");
  });

  it("supports the other Gemini tiers (flex, standard)", async () => {
    for (const tier of ["flex", "standard"] as const) {
      const provider = newProvider();
      const spy = vi.spyOn(provider.client.models, "generateContent").mockResolvedValue(fakeResponse());

      const result = (await provider.createChatCompletion([{ role: "user", content: "hi" }], {
        responseFormat: "text",
        serviceTier: tier,
      })) as SuccessChatCompletion;

      const sentReq = spy.mock.calls[0][0] as GenerateContentParameters;
      expect(sentReq.config?.serviceTier).toBe(tier);
      expect(result.service_tier).toBe(tier);
    }
  });

  it("ignores tiers Gemini does not support (e.g. OpenAI's 'scale') and does not echo them", async () => {
    const provider = newProvider();
    const spy = vi.spyOn(provider.client.models, "generateContent").mockResolvedValue(fakeResponse());

    const result = (await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
      serviceTier: "scale",
    })) as SuccessChatCompletion;

    const sentReq = spy.mock.calls[0][0] as GenerateContentParameters;
    expect(sentReq.config?.serviceTier).toBeUndefined();
    expect(result.service_tier).toBeUndefined();
  });

  it("omits serviceTier entirely when no tier is provided", async () => {
    const provider = newProvider();
    const spy = vi.spyOn(provider.client.models, "generateContent").mockResolvedValue(fakeResponse());

    const result = (await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
    })) as SuccessChatCompletion;

    const sentReq = spy.mock.calls[0][0] as GenerateContentParameters;
    expect(sentReq.config?.serviceTier).toBeUndefined();
    expect(result.service_tier).toBeUndefined();
  });
});

describe("GeminiProvider - serviceTier (stream)", () => {
  it("forwards the tier to config.serviceTier and echoes it on the final chunk", async () => {
    const provider = newProvider();
    const spy = vi.spyOn(provider.client.models, "generateContentStream").mockResolvedValue(fakeStream());

    const chunks = await collectStream(
      provider.createChatCompletion([{ role: "user", content: "hi" }], {
        stream: true,
        responseFormat: "text",
        serviceTier: "flex",
      }),
    );

    const sentReq = spy.mock.calls[0][0] as GenerateContentParameters;
    expect(sentReq.config?.serviceTier).toBe("flex");

    const final = chunks.find(c => c.done);
    expect(final).toBeDefined();
    expect(final?.service_tier).toBe("flex");
  });
});
