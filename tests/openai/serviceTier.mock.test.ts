import type { OpenAI } from "openai";
import { describe, expect, it, vi } from "vitest";
import { DeepSeekProvider } from "../../src/providers/deepSeek/deepSeekProvider.js";
import { OpenAIProvider } from "../../src/providers/openai/openaiProvider.js";
import type { SuccessChatCompletion } from "../../src/types/chat.js";
import type { StreamChunk } from "../../src/types/stream.js";

type CreateReturn = OpenAI.Chat.Completions.ChatCompletion;

function fakeCompletion(serviceTier?: string | null): CreateReturn {
  return {
    id: "cmpl-1",
    model: "gpt-4o-mini",
    object: "chat.completion",
    created: 0,
    choices: [
      { index: 0, finish_reason: "stop", logprobs: null, message: { role: "assistant", content: "ok", refusal: null } },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    ...(serviceTier !== undefined ? { service_tier: serviceTier } : {}),
  } as unknown as CreateReturn;
}

function fakeStream(serviceTier?: string | null): AsyncGenerator<OpenAI.Chat.Completions.ChatCompletionChunk> {
  async function* gen() {
    yield {
      id: "cmpl-1",
      model: "gpt-4o-mini",
      object: "chat.completion.chunk",
      created: 0,
      choices: [{ index: 0, delta: { content: "ok" }, finish_reason: null }],
    } as unknown as OpenAI.Chat.Completions.ChatCompletionChunk;
    yield {
      id: "cmpl-1",
      model: "gpt-4o-mini",
      object: "chat.completion.chunk",
      created: 0,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      ...(serviceTier !== undefined ? { service_tier: serviceTier } : {}),
    } as unknown as OpenAI.Chat.Completions.ChatCompletionChunk;
  }
  return gen();
}

// Some OpenAI-compatible providers report service_tier on the finish_reason chunk
// but omit it from a trailing usage-only chunk.
function fakeSplitStream(serviceTier: string): AsyncGenerator<OpenAI.Chat.Completions.ChatCompletionChunk> {
  async function* gen() {
    yield {
      id: "cmpl-1",
      model: "gpt-4o-mini",
      object: "chat.completion.chunk",
      created: 0,
      choices: [{ index: 0, delta: { content: "ok" }, finish_reason: null }],
    } as unknown as OpenAI.Chat.Completions.ChatCompletionChunk;
    yield {
      id: "cmpl-1",
      model: "gpt-4o-mini",
      object: "chat.completion.chunk",
      created: 0,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      service_tier: serviceTier,
    } as unknown as OpenAI.Chat.Completions.ChatCompletionChunk;
    yield {
      id: "cmpl-1",
      model: "gpt-4o-mini",
      object: "chat.completion.chunk",
      created: 0,
      choices: [],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    } as unknown as OpenAI.Chat.Completions.ChatCompletionChunk;
  }
  return gen();
}

function newProvider(): OpenAIProvider {
  return new OpenAIProvider("fake-key", "gpt-4o-mini", "openai");
}

async function collectStream(gen: AsyncGenerator<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = [];
  for await (const chunk of gen) chunks.push(chunk);
  return chunks;
}

describe("OpenAIProvider - serviceTier request mapping (non-stream)", () => {
  it("forwards an OpenAI-supported tier to service_tier", async () => {
    for (const tier of ["flex", "scale", "priority", "default"] as const) {
      const provider = newProvider();
      const spy = vi.spyOn(provider.client.chat.completions, "create").mockResolvedValue(fakeCompletion() as never);

      await provider.createChatCompletion([{ role: "user", content: "hi" }], {
        responseFormat: "text",
        serviceTier: tier,
      });

      const sentReq = spy.mock.calls[0][0] as { service_tier?: string };
      expect(sentReq.service_tier).toBe(tier);
    }
  });

  it("ignores tiers OpenAI does not support (Gemini's 'standard')", async () => {
    const provider = newProvider();
    const spy = vi.spyOn(provider.client.chat.completions, "create").mockResolvedValue(fakeCompletion() as never);

    const result = (await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
      serviceTier: "standard",
    })) as SuccessChatCompletion;

    const sentReq = spy.mock.calls[0][0] as { service_tier?: string };
    expect(sentReq.service_tier).toBeUndefined();
    expect(result.service_tier).toBeUndefined();
  });

  it("omits service_tier entirely when no tier is provided", async () => {
    const provider = newProvider();
    const spy = vi.spyOn(provider.client.chat.completions, "create").mockResolvedValue(fakeCompletion() as never);

    await provider.createChatCompletion([{ role: "user", content: "hi" }], { responseFormat: "text" });

    const sentReq = spy.mock.calls[0][0] as { service_tier?: string };
    expect(sentReq.service_tier).toBeUndefined();
  });
});

describe("OpenAIProvider - serviceTier response echo (non-stream)", () => {
  it("reports the real applied tier from completion.service_tier", async () => {
    const provider = newProvider();
    vi.spyOn(provider.client.chat.completions, "create").mockResolvedValue(fakeCompletion("flex") as never);

    const result = (await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
      serviceTier: "flex",
    })) as SuccessChatCompletion;

    expect(result.service_tier).toBe("flex");
  });

  it("reports the downgraded tier, not the requested one, when the API downgrades", async () => {
    const provider = newProvider();
    vi.spyOn(provider.client.chat.completions, "create").mockResolvedValue(fakeCompletion("default") as never);

    const result = (await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
      serviceTier: "priority",
    })) as SuccessChatCompletion;

    expect(result.service_tier).toBe("default");
  });

  it("reports undefined when the API does not report a tier", async () => {
    const provider = newProvider();
    vi.spyOn(provider.client.chat.completions, "create").mockResolvedValue(fakeCompletion(null) as never);

    const result = (await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
      serviceTier: "priority",
    })) as SuccessChatCompletion;

    expect(result.service_tier).toBeUndefined();
  });
});

describe("OpenAIProvider - serviceTier (stream)", () => {
  it("forwards the tier and reports the real applied tier on the final chunk", async () => {
    const provider = newProvider();
    const spy = vi.spyOn(provider.client.chat.completions, "create").mockResolvedValue(fakeStream("flex") as never);

    const chunks = await collectStream(
      provider.createChatCompletion([{ role: "user", content: "hi" }], {
        stream: true,
        responseFormat: "text",
        serviceTier: "flex",
      }),
    );

    const sentReq = spy.mock.calls[0][0] as { service_tier?: string };
    expect(sentReq.service_tier).toBe("flex");

    const final = chunks.find(c => c.done);
    expect(final?.service_tier).toBe("flex");
  });

  it("keeps the applied tier when only an earlier chunk reported it (usage-only final chunk)", async () => {
    const provider = newProvider();
    vi.spyOn(provider.client.chat.completions, "create").mockResolvedValue(fakeSplitStream("priority") as never);

    const chunks = await collectStream(
      provider.createChatCompletion([{ role: "user", content: "hi" }], {
        stream: true,
        responseFormat: "text",
        serviceTier: "priority",
      }),
    );

    const final = chunks.find(c => c.done);
    expect(final?.service_tier).toBe("priority");
  });
});

describe("DeepSeekProvider (inherits OpenAI) - serviceTier", () => {
  it("forwards the tier just like OpenAI", async () => {
    const provider = new DeepSeekProvider("fake-key", "deepseek-chat", "deepseek", "https://api.deepseek.com/v1");
    const spy = vi.spyOn(provider.client.chat.completions, "create").mockResolvedValue(fakeCompletion() as never);

    await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
      serviceTier: "priority",
    });

    const sentReq = spy.mock.calls[0][0] as { service_tier?: string };
    expect(sentReq.service_tier).toBe("priority");
  });
});
