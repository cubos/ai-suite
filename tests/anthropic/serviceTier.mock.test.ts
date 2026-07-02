import type { Anthropic } from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { AnthropicProvider } from "../../src/providers/anthropic/anthropicProvider.js";
import type { SuccessChatCompletion } from "../../src/types/chat.js";
import type { StreamChunk } from "../../src/types/stream.js";

function fakeMessage(appliedTier?: string | null): Anthropic.Messages.Message {
  return {
    id: "msg-1",
    type: "message",
    role: "assistant",
    model: "claude-3-5-haiku-latest",
    content: [{ type: "text", text: "ok" }],
    stop_reason: "end_turn",
    usage: {
      input_tokens: 1,
      output_tokens: 1,
      cache_read_input_tokens: 0,
      ...(appliedTier !== undefined ? { service_tier: appliedTier } : {}),
    },
  } as unknown as Anthropic.Messages.Message;
}

function fakeStream(appliedTier?: string | null) {
  const finalMessage = fakeMessage(appliedTier);
  async function* gen() {
    yield { type: "message_start", message: { id: "msg-1" } } as unknown as Anthropic.Messages.RawMessageStreamEvent;
    yield {
      type: "content_block_delta",
      delta: { type: "text_delta", text: "ok" },
    } as unknown as Anthropic.Messages.RawMessageStreamEvent;
  }
  const stream = gen() as AsyncGenerator<Anthropic.Messages.RawMessageStreamEvent> & {
    finalMessage: () => Promise<Anthropic.Messages.Message>;
  };
  stream.finalMessage = async () => finalMessage;
  return stream;
}

function newProvider(): AnthropicProvider {
  return new AnthropicProvider("fake-key", "claude-3-5-haiku-latest", "anthropic");
}

async function collectStream(gen: AsyncGenerator<StreamChunk>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = [];
  for await (const chunk of gen) chunks.push(chunk);
  return chunks;
}

describe("AnthropicProvider - serviceTier request mapping (non-stream)", () => {
  it("maps 'priority' to service_tier 'auto'", async () => {
    const provider = newProvider();
    const spy = vi.spyOn(provider.client.messages, "create").mockResolvedValue(fakeMessage() as never);

    await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
      serviceTier: "priority",
    });

    const sentReq = spy.mock.calls[0][0] as { service_tier?: string };
    expect(sentReq.service_tier).toBe("auto");
  });

  it("maps 'standard' to service_tier 'standard_only'", async () => {
    const provider = newProvider();
    const spy = vi.spyOn(provider.client.messages, "create").mockResolvedValue(fakeMessage() as never);

    await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
      serviceTier: "standard",
    });

    const sentReq = spy.mock.calls[0][0] as { service_tier?: string };
    expect(sentReq.service_tier).toBe("standard_only");
  });

  it("ignores tiers Anthropic does not support (scale, default, flex)", async () => {
    for (const tier of ["scale", "default", "flex"] as const) {
      const provider = newProvider();
      const spy = vi.spyOn(provider.client.messages, "create").mockResolvedValue(fakeMessage() as never);

      await provider.createChatCompletion([{ role: "user", content: "hi" }], {
        responseFormat: "text",
        serviceTier: tier,
      });

      const sentReq = spy.mock.calls[0][0] as { service_tier?: string };
      expect(sentReq.service_tier).toBeUndefined();
    }
  });

  it("omits service_tier entirely when no tier is provided", async () => {
    const provider = newProvider();
    const spy = vi.spyOn(provider.client.messages, "create").mockResolvedValue(fakeMessage() as never);

    await provider.createChatCompletion([{ role: "user", content: "hi" }], { responseFormat: "text" });

    const sentReq = spy.mock.calls[0][0] as { service_tier?: string };
    expect(sentReq.service_tier).toBeUndefined();
  });
});

describe("AnthropicProvider - serviceTier response echo (non-stream)", () => {
  it("reports the applied tier from usage.service_tier", async () => {
    const provider = newProvider();
    vi.spyOn(provider.client.messages, "create").mockResolvedValue(fakeMessage("priority") as never);

    const result = (await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
      serviceTier: "priority",
    })) as SuccessChatCompletion;

    expect(result.service_tier).toBe("priority");
  });

  it("reports the downgraded tier when the API returns 'standard'", async () => {
    const provider = newProvider();
    vi.spyOn(provider.client.messages, "create").mockResolvedValue(fakeMessage("standard") as never);

    const result = (await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
      serviceTier: "priority",
    })) as SuccessChatCompletion;

    expect(result.service_tier).toBe("standard");
  });

  it("reports undefined for 'batch' (no shared-union equivalent)", async () => {
    const provider = newProvider();
    vi.spyOn(provider.client.messages, "create").mockResolvedValue(fakeMessage("batch") as never);

    const result = (await provider.createChatCompletion([{ role: "user", content: "hi" }], {
      responseFormat: "text",
      serviceTier: "priority",
    })) as SuccessChatCompletion;

    expect(result.service_tier).toBeUndefined();
  });
});

describe("AnthropicProvider - serviceTier (stream)", () => {
  it("forwards the mapped tier and reports the applied tier on the final chunk", async () => {
    const provider = newProvider();
    const spy = vi.spyOn(provider.client.messages, "stream").mockReturnValue(fakeStream("priority") as never);

    const chunks = await collectStream(
      provider.createChatCompletion([{ role: "user", content: "hi" }], {
        stream: true,
        responseFormat: "text",
        serviceTier: "priority",
      }),
    );

    const sentReq = spy.mock.calls[0][0] as { service_tier?: string };
    expect(sentReq.service_tier).toBe("auto");

    const final = chunks.find(c => c.done);
    expect(final?.service_tier).toBe("priority");
  });
});
