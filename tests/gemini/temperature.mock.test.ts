import type { BatchJob, File as GeminiFile, GenerateContentParameters, GenerateContentResponse } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { GeminiProvider } from "../../src/providers/gemini/geminiProvider.js";

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
    yield fakeResponse();
  }
  return gen();
}

async function sentChatConfig(model: string, temperature?: number) {
  const provider = new GeminiProvider("fake-key", model, "gemini");
  const spy = vi.spyOn(provider.client.models, "generateContent").mockResolvedValue(fakeResponse());

  await provider.createChatCompletion([{ role: "user", content: "hi" }], {
    responseFormat: "text",
    ...(temperature !== undefined ? { temperature } : {}),
  });

  return (spy.mock.calls[0][0] as GenerateContentParameters).config;
}

async function sentBatchConfig(model: string) {
  const provider = new GeminiProvider("fake-key", model, "gemini");
  const uploadSpy = vi
    .spyOn(provider.client.files, "upload")
    .mockResolvedValue({ name: "files/batch" } as unknown as GeminiFile);
  vi.spyOn(provider.client.batches, "create").mockResolvedValue({
    name: "batches/1",
    model,
    createTime: new Date().toISOString(),
  } as unknown as BatchJob);

  await provider.batch.create({
    endpoint: "chat/completions",
    batch: { batch: [{ customId: "req-1", params: { mensagens: [{ role: "user", content: "hi" }] } }] },
    options: { responseFormat: "text", temperature: 0.2 },
  } as unknown as Parameters<typeof provider.batch.create>[0]);

  return uploadSpy.mock.calls[0][0].config as Record<string, unknown>;
}

describe("GeminiProvider - temperature", () => {
  it("omits temperature for models configured by thinking level, even when one is provided", async () => {
    const config = await sentChatConfig("gemini-3.5-flash-lite", 0.2);

    expect(config?.temperature).toBeUndefined();
  });

  it("omits temperature for thinking-level models in streaming requests", async () => {
    const provider = new GeminiProvider("fake-key", "gemini-3.5-flash-lite", "gemini");
    const spy = vi.spyOn(provider.client.models, "generateContentStream").mockResolvedValue(fakeStream());

    for await (const _ of provider.createChatCompletion([{ role: "user", content: "hi" }], {
      stream: true,
      responseFormat: "text",
      temperature: 0.2,
    })) {
    }

    expect((spy.mock.calls[0][0] as GenerateContentParameters).config?.temperature).toBeUndefined();
  });

  it("keeps the provided temperature for models configured by thinking budget", async () => {
    const config = await sentChatConfig("gemini-2.5-flash-lite", 0.2);

    expect(config?.temperature).toBe(0.2);
  });

  it("keeps the default temperature for models configured by thinking budget", async () => {
    const config = await sentChatConfig("gemini-2.5-flash-lite");

    expect(config?.temperature).toBe(0.7);
  });
});

describe("BatchGemini - temperature", () => {
  it("omits temperature for models configured by thinking level", async () => {
    const config = await sentBatchConfig("gemini-3.5-flash-lite");

    expect(config?.temperature).toBeUndefined();
  });

  it("keeps temperature for models configured by thinking budget", async () => {
    const config = await sentBatchConfig("gemini-2.5-flash-lite");

    expect(config.temperature).toBe(0.2);
  });
});
