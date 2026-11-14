import { LangfuseSpanProcessor } from "@langfuse/otel";
import { setLangfuseTracerProvider } from "@langfuse/tracing";
import { BasicTracerProvider, InMemorySpanExporter, type ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AISuite } from "../../src/index.js";
import { OpenAIProvider } from "../../src/providers/openai/openaiProvider.js";
import type { StreamChunk } from "../../src/types/stream.js";

const exporter = new InMemorySpanExporter();
const processor = new LangfuseSpanProcessor({
  exporter,
  publicKey: "pk-lf-test",
  secretKey: "sk-lf-test",
  baseUrl: "http://127.0.0.1:9",
  flushAt: 1,
});

beforeAll(() => {
  setLangfuseTracerProvider(new BasicTracerProvider({ spanProcessors: [processor] }));
});

beforeEach(() => {
  exporter.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function exportedSpans(): Promise<ReadableSpan[]> {
  await processor.forceFlush();
  return exporter.getFinishedSpans();
}

function parsed(span: ReadableSpan, key: string): unknown {
  const value = span.attributes[key];
  return typeof value === "string" ? JSON.parse(value) : value;
}

const successResult = {
  success: true,
  id: "cmpl-1",
  created: 1,
  model: "gpt-4o-mini",
  object: "chat.completion",
  content: "hi there",
  content_object: {},
  usage: { input_tokens: 3, output_tokens: 5, total_tokens: 8 },
} as never;

const messages = [{ role: "user" as const, content: "hello" }];

describe("Langfuse tracing through OpenTelemetry", () => {
  it("exports one generation with model, input, output, usage and the trace attributes", async () => {
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockResolvedValue(successResult);
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse: true });

    await suite.createChatCompletion("openai/gpt-4o-mini", messages, {
      metadata: {
        langFuse: {
          name: "EXTRACT",
          tags: ["chat", "EXTRACT"],
          sessionId: "meeting-1",
          userId: "user-1",
          environment: "prod",
        },
      },
    });

    const spans = await exportedSpans();
    expect(spans).toHaveLength(1);
    const [span] = spans;
    expect(span.name).toBe("EXTRACT");
    expect(span.attributes["langfuse.observation.type"]).toBe("generation");
    expect(span.attributes["langfuse.observation.model.name"]).toBe("gpt-4o-mini");
    expect(parsed(span, "langfuse.observation.input")).toEqual(messages);
    expect(parsed(span, "langfuse.observation.usage_details")).toEqual({ input: 3, output: 5, total: 8 });
    expect(parsed(span, "langfuse.observation.output")).toMatchObject({ content: "hi there" });
    expect(span.attributes["langfuse.trace.name"]).toBe("EXTRACT");
    expect(span.attributes["session.id"]).toBe("meeting-1");
    expect(span.attributes["user.id"]).toBe("user-1");
    expect(span.attributes["langfuse.environment"]).toBe("prod");
    expect(span.attributes["langfuse.trace.tags"]).toEqual(["chat", "EXTRACT"]);
  });

  it("falls back to the default name and environment when the caller sends no langFuse data", async () => {
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockResolvedValue(successResult);
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse: true });

    await suite.createChatCompletion("openai/gpt-4o-mini", messages);

    const [span] = await exportedSpans();
    expect(span.name).toBe("create-chat-completion");
    expect(span.attributes["langfuse.environment"]).toBe("default");
    expect(span.attributes["session.id"]).toBeUndefined();
    expect(span.attributes["user.id"]).toBeUndefined();
  });

  it("links the generation to a prompt version of Langfuse Prompt Management", async () => {
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockResolvedValue(successResult);
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse: true });

    const result = await suite.createChatCompletion("openai/gpt-4o-mini", messages, {
      metadata: { langFuse: { name: "EXTRACT", prompt: { name: "queues-api/meeting/overview/pt", version: 7 } } },
    });

    expect(result.success).toBe(true);
    const [span] = await exportedSpans();
    expect(span.attributes["langfuse.observation.prompt.name"]).toBe("queues-api/meeting/overview/pt");
    expect(span.attributes["langfuse.observation.prompt.version"]).toBe(7);
    expect(parsed(span, "langfuse.observation.input")).toEqual(messages);
  });

  it("records no link when there is no prompt or the prompt came from a fallback", async () => {
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockResolvedValue(successResult);
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse: true });

    await suite.createChatCompletion("openai/gpt-4o-mini", messages);
    await suite.createChatCompletion("openai/gpt-4o-mini", messages, {
      metadata: { langFuse: { prompt: { name: "from-fallback", version: 3, isFallback: true } } },
    });

    const spans = await exportedSpans();
    expect(spans).toHaveLength(2);
    for (const span of spans) {
      expect(span.attributes["langfuse.observation.prompt.name"]).toBeUndefined();
      expect(span.attributes["langfuse.observation.prompt.version"]).toBeUndefined();
    }
  });

  it("ignores a malformed prompt reference and still traces and resolves the call", async () => {
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockResolvedValue(successResult);
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse: true });
    const malformed = [
      { name: "", version: 1 },
      { name: "ok", version: 0 },
      { name: "ok", version: 1.5 },
      { name: "ok", version: "2" },
      { name: "n".repeat(501), version: 1 },
    ];

    for (const prompt of malformed) {
      const result = await suite.createChatCompletion("openai/gpt-4o-mini", messages, {
        metadata: { langFuse: { prompt: prompt as never } },
      });
      expect(result.success).toBe(true);
    }

    const spans = await exportedSpans();
    expect(spans).toHaveLength(malformed.length);
    for (const span of spans) {
      expect(span.attributes["langfuse.observation.prompt.name"]).toBeUndefined();
    }
  });

  it("links the prompt on streams too", async () => {
    async function* stream(): AsyncGenerator<StreamChunk> {
      yield {
        id: "s",
        created: 1,
        object: "chat.completion",
        model: "gpt-4o-mini",
        delta: "ok",
        content: "ok",
        done: true,
        usage: {
          input_tokens: 1,
          output_tokens: 1,
          total_tokens: 2,
          cached_tokens: 0,
          reasoning_tokens: 0,
          thoughts_tokens: 0,
        },
      };
    }
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockReturnValue(stream() as never);
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse: true });

    for await (const _chunk of await suite.createChatCompletion("openai/gpt-4o-mini", messages, {
      stream: true,
      metadata: { langFuse: { prompt: { name: "streamed", version: 2 } } },
    })) {
      // consume
    }

    const [span] = await exportedSpans();
    expect(span.attributes["langfuse.observation.prompt.name"]).toBe("streamed");
    expect(span.attributes["langfuse.observation.prompt.version"]).toBe(2);
  });

  it("marks the generation as an error when the provider throws, and still resolves", async () => {
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockRejectedValue(new Error("provider down"));
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse: true });

    const result = await suite.createChatCompletion("openai/gpt-4o-mini", messages);

    expect(result.success).toBe(false);
    const [span] = await exportedSpans();
    expect(span.attributes["langfuse.observation.level"]).toBe("ERROR");
    expect(span.attributes["langfuse.observation.status_message"]).toBe("provider down");
  });

  it("traces a stream once, at its final chunk", async () => {
    async function* stream(): AsyncGenerator<StreamChunk> {
      yield {
        id: "s",
        created: 1,
        object: "chat.completion",
        model: "gpt-4o-mini",
        delta: "Hel",
        content: "Hel",
        done: false,
      };
      yield {
        id: "s",
        created: 1,
        object: "chat.completion",
        model: "gpt-4o-mini",
        delta: "lo",
        content: "Hello",
        done: true,
        usage: {
          input_tokens: 2,
          output_tokens: 4,
          total_tokens: 6,
          cached_tokens: 0,
          reasoning_tokens: 0,
          thoughts_tokens: 0,
        },
      };
    }
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockReturnValue(stream() as never);
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse: true });

    const chunks = [];
    for await (const chunk of await suite.createChatCompletion("openai/gpt-4o-mini", messages, { stream: true })) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    const spans = await exportedSpans();
    expect(spans).toHaveLength(1);
    expect(parsed(spans[0], "langfuse.observation.usage_details")).toEqual({ input: 2, output: 4, total: 6 });
  });

  it("replaces a string above the default cap with its size, in the input and in the output", async () => {
    const hugeOutput = {
      ...(successResult as object),
      content: "o".repeat(60_000),
    } as never;
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockResolvedValue(hugeOutput);
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse: true });

    await suite.createChatCompletion("openai/gpt-4o-mini", [{ role: "user", content: "t".repeat(200_000) }]);

    const [span] = await exportedSpans();
    expect(parsed(span, "langfuse.observation.input")).toEqual([
      { role: "user", content: "[omitted: 200000 characters]" },
    ]);
    expect(parsed(span, "langfuse.observation.output")).toMatchObject({ content: "[omitted: 60000 characters]" });
  });

  it("keeps a string at the cap and honours a custom maxStringChars", async () => {
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockResolvedValue(successResult);
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse: { maxStringChars: 10 } });

    await suite.createChatCompletion("openai/gpt-4o-mini", [
      { role: "user", content: "a".repeat(10) },
      { role: "user", content: "b".repeat(11) },
    ]);

    const [span] = await exportedSpans();
    expect(parsed(span, "langfuse.observation.input")).toEqual([
      { role: "user", content: "a".repeat(10) },
      { role: "user", content: "[omitted: 11 characters]" },
    ]);
  });

  it("summarises binary data and survives circular references", async () => {
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockResolvedValue(successResult);
    const suite = new AISuite({ openaiKey: "fake" }, { langFuse: true });
    const circular: Record<string, unknown> = { note: "ok" };
    circular.self = circular;

    const result = await suite.createChatCompletion("openai/gpt-4o-mini", [
      { role: "user", content: "x", file: Buffer.alloc(5000), meta: circular } as never,
    ]);

    expect(result.success).toBe(true);
    const [span] = await exportedSpans();
    const [message] = parsed(span, "langfuse.observation.input") as Array<Record<string, unknown>>;
    expect(message.file).toBe("[binary: 5000 bytes]");
    expect(message.meta).toEqual({ note: "ok", self: "[max depth]" });
  });

  it("exports nothing when langFuse is not enabled", async () => {
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockResolvedValue(successResult);
    const suite = new AISuite({ openaiKey: "fake" });

    const result = await suite.createChatCompletion("openai/gpt-4o-mini", messages);

    expect(result.success).toBe(true);
    expect(await exportedSpans()).toHaveLength(0);
  });
});
