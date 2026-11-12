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

  it("exports nothing when langFuse is not enabled", async () => {
    vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockResolvedValue(successResult);
    const suite = new AISuite({ openaiKey: "fake" });

    const result = await suite.createChatCompletion("openai/gpt-4o-mini", messages);

    expect(result.success).toBe(true);
    expect(await exportedSpans()).toHaveLength(0);
  });
});
