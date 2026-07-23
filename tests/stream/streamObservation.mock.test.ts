import { OpenAI } from "openai";
import { describe, expect, it, vi } from "vitest";
import { AISuite } from "../../src/index.js";
import { OpenAIProvider } from "../../src/providers/openai/openaiProvider.js";
import type { ResultChatCompletion } from "../../src/types/chat.js";
import type { StreamChunk, StreamResult } from "../../src/types/stream.js";

function fakeLangfuse() {
  const generationEnd = vi.fn();
  const traceUpdate = vi.fn();
  const generation = vi.fn(() => ({ end: generationEnd }));
  const trace = vi.fn(() => ({ generation, update: traceUpdate }));
  return {
    langFuse: { trace } as unknown as ConstructorParameters<typeof AISuite>[1] extends { langFuse?: infer L }
      ? L
      : never,
    spies: { trace, generation, generationEnd, traceUpdate },
  };
}

function fakeSuccessStream(): AsyncGenerator<StreamChunk> {
  async function* gen() {
    yield {
      id: "cmpl-1",
      created: 100,
      object: "chat.completion",
      model: "gpt-4o-mini",
      delta: "Hel",
      content: "Hel",
      done: false,
    } satisfies StreamChunk;
    yield {
      id: "cmpl-1",
      created: 100,
      object: "chat.completion",
      model: "gpt-4o-mini",
      delta: "lo",
      content: "Hello",
      done: false,
    } satisfies StreamChunk;
    yield {
      id: "cmpl-1",
      created: 100,
      object: "chat.completion",
      model: "gpt-4o-mini",
      delta: "",
      content: "Hello",
      done: true,
      usage: {
        input_tokens: 3,
        output_tokens: 5,
        total_tokens: 8,
        cached_tokens: 0,
        reasoning_tokens: 0,
        thoughts_tokens: 0,
      },
      execution_time: 42,
    } satisfies StreamChunk;
  }
  return gen();
}

function fakeFailingStream(error: Error): AsyncGenerator<StreamChunk> {
  async function* gen() {
    yield {
      id: "cmpl-1",
      created: 100,
      object: "chat.completion",
      model: "gpt-4o-mini",
      delta: "Par",
      content: "Par",
      done: false,
    } satisfies StreamChunk;
    throw error;
  }
  return gen();
}

function fakeImmediateFailStream(error: Error): AsyncGenerator<StreamChunk> {
  // biome-ignore lint/correctness/useYield: intentionally throws before producing any chunk
  async function* gen() {
    throw error;
  }
  return gen();
}

async function collect(gen: AsyncGenerator<StreamResult>): Promise<StreamResult[]> {
  const chunks: StreamResult[] = [];
  for await (const chunk of gen) chunks.push(chunk);
  return chunks;
}

function apiError(status: number) {
  return new OpenAI.APIError(status, { message: "boom" }, undefined, undefined);
}

describe("streamWithObservation - happy path", () => {
  it("passes data chunks intact, stamps success on the final chunk, and traces", async () => {
    const { langFuse, spies } = fakeLangfuse();
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse });
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockReturnValue(fakeSuccessStream() as never);

    const chunks = await collect(
      await suite.createChatCompletion("openai/gpt-4o-mini", [{ role: "user", content: "hi" }], {
        stream: true,
        responseFormat: "text",
      }),
    );

    expect(chunks).toHaveLength(3);
    const data = chunks.filter(c => !c.done);
    expect(data).toHaveLength(2);
    expect(data.every(c => (c as StreamChunk).success === undefined)).toBe(true);

    const final = chunks[2];
    expect(final.done).toBe(true);
    expect(final.success).toBe(true);
    expect(final.content).toBe("Hello");

    expect(spies.trace).toHaveBeenCalledTimes(1);
    expect(spies.generationEnd).toHaveBeenCalledWith(
      expect.objectContaining({ usage: { input: 3, output: 5, total: 8 } }),
    );
    expect(spies.traceUpdate).toHaveBeenCalledWith(expect.objectContaining({ output: "Hello" }));
  });
});

describe("streamWithObservation - errors become data", () => {
  it("resolves (never rejects) and yields a final error chunk on a mid-stream failure", async () => {
    const { langFuse, spies } = fakeLangfuse();
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse });
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockReturnValue(
      fakeFailingStream(apiError(401)) as never,
    );

    const chunks = await collect(
      await suite.createChatCompletion("openai/gpt-4o-mini", [{ role: "user", content: "hi" }], {
        stream: true,
        responseFormat: "text",
      }),
    );

    const last = chunks[chunks.length - 1];
    expect(last.done).toBe(true);
    expect(last.success).toBe(false);
    if (last.success === false) {
      expect(last.tag).toBe("InvalidAuth");
      expect(last.content).toBe("Par");
      expect(last.model).toBe("gpt-4o-mini");
      expect(last.raw).toBeInstanceOf(Error);
      expect(last.execution_time).toBeTypeOf("number");
    }

    expect(spies.generationEnd).toHaveBeenCalledWith(expect.objectContaining({ output: expect.any(Error) }));
  });

  it("yields exactly one error chunk when the stream fails before any data", async () => {
    const suite = new AISuite({ openaiKey: "fake" });
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockReturnValue(
      fakeImmediateFailStream(apiError(429)) as never,
    );

    const chunks = await collect(
      await suite.createChatCompletion("openai/gpt-4o-mini", [{ role: "user", content: "hi" }], {
        stream: true,
        responseFormat: "text",
      }),
    );

    expect(chunks).toHaveLength(1);
    const only = chunks[0];
    expect(only.success).toBe(false);
    if (only.success === false) {
      expect(only.content).toBe("");
      expect(only.tag).toBe("RateLimitExceeded");
    }
  });

  it("maps a non-API error (e.g. hook failure) to tag Unknown without throwing", async () => {
    const suite = new AISuite({ openaiKey: "fake" });
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockReturnValue(
      fakeFailingStream(new Error("hook exploded")) as never,
    );

    const chunks = await collect(
      await suite.createChatCompletion("openai/gpt-4o-mini", [{ role: "user", content: "hi" }], {
        stream: true,
        responseFormat: "text",
      }),
    );

    const last = chunks[chunks.length - 1];
    expect(last.success).toBe(false);
    if (last.success === false) expect(last.tag).toBe("Unknown");
  });
});

describe("streamWithObservation - Langfuse optional", () => {
  it("streams identically when no Langfuse is configured", async () => {
    const suite = new AISuite({ openaiKey: "fake" });
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockReturnValue(fakeSuccessStream() as never);

    const chunks = await collect(
      await suite.createChatCompletion("openai/gpt-4o-mini", [{ role: "user", content: "hi" }], {
        stream: true,
        responseFormat: "text",
      }),
    );

    expect(chunks).toHaveLength(3);
    expect(chunks[2].success).toBe(true);
  });
});

describe("streamWithObservation - inherited providers", () => {
  it("wraps a stream from a provider that inherits OpenAI (deepseek)", async () => {
    const suite = new AISuite({ deepseekKey: "fake" });
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockReturnValue(
      fakeFailingStream(apiError(401)) as never,
    );

    const chunks = await collect(
      await suite.createChatCompletion("deepseek/deepseek-chat", [{ role: "user", content: "hi" }], {
        stream: true,
        responseFormat: "text",
      }),
    );

    const last = chunks[chunks.length - 1];
    expect(last.success).toBe(false);
    if (last.success === false) expect(last.tag).toBe("InvalidAuth");
  });
});

describe("createChatCompletion - non-stream regression", () => {
  it("still returns a ResultChatCompletion when stream is not set", async () => {
    const suite = new AISuite({ openaiKey: "fake" });
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockResolvedValue({
      success: true,
      id: "cmpl-1",
      created: 1,
      model: "gpt-4o-mini",
      object: "chat.completion",
      content: "hi",
      content_object: {},
    } as never);

    const result: ResultChatCompletion = await suite.createChatCompletion("openai/gpt-4o-mini", [
      { role: "user", content: "hi" },
    ]);

    expect(result.success).toBe(true);
    if (result.success) expect(result.content).toBe("hi");
  });
});
