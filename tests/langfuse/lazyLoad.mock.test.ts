import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { moduleEvaluated } = vi.hoisted(() => ({ moduleEvaluated: vi.fn() }));

const chatResult = {
  success: true,
  id: "cmpl-1",
  created: 1,
  model: "gpt-4o-mini",
  object: "chat.completion",
  content: "hi",
  content_object: {},
} as never;

const messages = [{ role: "user" as const, content: "hello" }];

async function freshSuite(langFuse?: boolean) {
  vi.resetModules();
  const { AISuite } = await import("../../src/index.js");
  const { OpenAIProvider } = await import("../../src/providers/openai/openaiProvider.js");
  vi.spyOn(OpenAIProvider.prototype, "createChatCompletion").mockResolvedValue(chatResult);
  return new AISuite({ openaiKey: "fake" }, langFuse === undefined ? undefined : { langFuse });
}

beforeEach(() => {
  moduleEvaluated.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock("@langfuse/tracing");
});

describe("@langfuse/tracing is loaded only when Langfuse is on", () => {
  it("never loads it for a suite without langFuse", async () => {
    vi.doMock("@langfuse/tracing", () => {
      moduleEvaluated();
      return {};
    });
    const suite = await freshSuite();

    const result = await suite.createChatCompletion("openai/gpt-4o-mini", messages);

    expect(result.success).toBe(true);
    expect(moduleEvaluated).not.toHaveBeenCalled();
  });

  it("loads it once langFuse is true", async () => {
    vi.doMock("@langfuse/tracing", () => {
      moduleEvaluated();
      return {
        LangfuseOtelSpanAttributes: {},
        startObservation: () => ({
          otelSpan: { setAttributes: () => undefined },
          update: () => undefined,
          end: () => undefined,
        }),
      };
    });
    const suite = await freshSuite(true);

    await suite.createChatCompletion("openai/gpt-4o-mini", messages);

    expect(moduleEvaluated).toHaveBeenCalledTimes(1);
  });

  it("keeps the AI call working when the package cannot be loaded", async () => {
    vi.doMock("@langfuse/tracing", () => {
      throw new Error("Cannot find package '@langfuse/tracing'");
    });
    const suite = await freshSuite(true);

    const result = await suite.createChatCompletion("openai/gpt-4o-mini", messages);

    expect(result.success).toBe(true);
  });
});
