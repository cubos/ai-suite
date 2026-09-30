import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AISuite } from "../../src/index.js";
import type { ChatOptions } from "../../src/providers/types/index.js";
import type { MessageModel } from "../../src/types/chat.js";
import type { ProviderChatModel } from "../../src/types/providerModel.js";
import { splitProviderModel } from "../../src/utils.js";

const MODEL = "fireworks/accounts/fireworks/models/deepseek-v4p1-flash";

async function captureRequest(
  model: ProviderChatModel<string>,
  options: ChatOptions,
  messages: MessageModel[] = [{ role: "user", content: "Hello" }],
): Promise<Record<string, unknown> | undefined> {
  let captured: Record<string, unknown> | undefined;

  const aiSuite = new AISuite(
    { fireworksKey: "test-key" },
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
    if (options.stream) {
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

const peopleSchema = z.object({
  people: z.array(
    z.object({
      name: z.string(),
      role: z.enum(["ADMIN", "MEMBER", "GUEST"]),
      nickname: z.string().nullable(),
    }),
  ),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("splitProviderModel", () => {
  it("splits on the first slash only", () => {
    expect(splitProviderModel(MODEL)).toEqual({
      providerName: "fireworks",
      model: "accounts/fireworks/models/deepseek-v4p1-flash",
    });
  });

  it("keeps single-segment models as before", () => {
    expect(splitProviderModel("openai/gpt-4o")).toEqual({ providerName: "openai", model: "gpt-4o" });
  });

  it("returns an empty model for a bare provider name", () => {
    expect(splitProviderModel("openai")).toEqual({ providerName: "openai", model: "" });
  });
});

describe("FireworksProvider request", () => {
  it("sends the full model path", async () => {
    const captured = await captureRequest(MODEL, { stream: false, responseFormat: "text" });

    expect(captured?.model).toBe("accounts/fireworks/models/deepseek-v4p1-flash");
  });

  it("sends reasoning_effort and temperature together", async () => {
    const captured = await captureRequest(MODEL, {
      stream: false,
      responseFormat: "text",
      reasoning: { effort: "low" },
      temperature: 0.5,
    });

    expect(captured?.reasoning_effort).toBe("low");
    expect(captured?.temperature).toBe(0.5);
  });

  it("sends reasoning_effort and temperature together on the streaming path", async () => {
    const captured = await captureRequest(MODEL, {
      stream: true,
      responseFormat: "text",
      reasoning: { effort: "low" },
      temperature: 0.5,
    });

    expect(captured?.reasoning_effort).toBe("low");
    expect(captured?.temperature).toBe(0.5);
  });

  it("omits reasoning_effort when reasoning is not set", async () => {
    const captured = await captureRequest(MODEL, { stream: false, responseFormat: "text", temperature: 0.2 });

    expect(captured?.temperature).toBe(0.2);
    expect(captured).not.toHaveProperty("reasoning_effort");
  });

  it("sends the Zod JSON Schema as is, without strict", async () => {
    const captured = await captureRequest(MODEL, {
      stream: false,
      responseFormat: "json_schema",
      zodSchema: peopleSchema,
    });

    expect(captured?.response_format).toEqual({
      type: "json_schema",
      json_schema: {
        name: "default",
        schema: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: {
            people: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string", enum: ["ADMIN", "MEMBER", "GUEST"] },
                  nickname: { anyOf: [{ type: "string" }, { type: "null" }] },
                },
                required: ["name", "role", "nickname"],
                additionalProperties: false,
              },
            },
          },
          required: ["people"],
          additionalProperties: false,
        },
      },
    });
  });

  it("sends developer messages with the system role and keeps the others", async () => {
    const captured = await captureRequest(MODEL, { stream: false, responseFormat: "text" }, [
      { role: "developer", content: "You are a helpful assistant." },
      { role: "user", content: "Say hello in Spanish." },
      { role: "assistant", content: "Sure." },
    ]);

    expect(captured?.messages).toEqual([
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: [{ type: "text", text: "Say hello in Spanish." }] },
      { role: "assistant", content: "Sure." },
    ]);
  });
});

describe("FireworksProvider developer messages", () => {
  it("rejects non-text content instead of dropping it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const aiSuite = new AISuite({ fireworksKey: "test-key" });

    const response = await aiSuite.createChatCompletion(
      MODEL,
      [
        {
          role: "developer",
          content: [
            { type: "text", text: "Describe the image." },
            { type: "image", image: "https://example.com/cat.jpg" },
          ],
        },
        { role: "user", content: "Go." },
      ],
      { stream: false, responseFormat: "text" },
    );

    expect(response.success).toBe(false);
    if (response.success) {
      return;
    }
    expect(String((response.raw as Error).message)).toContain('Move the "image_url" content to a user message');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("FireworksProvider response", () => {
  it("calls the Fireworks endpoint and parses the structured content", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "cmpl-1",
          object: "chat.completion",
          created: 1,
          model: "accounts/fireworks/models/deepseek-v4p1-flash",
          choices: [
            {
              index: 0,
              finish_reason: "stop",
              message: {
                role: "assistant",
                content: JSON.stringify({ people: [{ name: "John", role: "MEMBER", nickname: null }] }),
              },
            },
          ],
          usage: {
            prompt_tokens: 120,
            completion_tokens: 30,
            total_tokens: 150,
            prompt_tokens_details: { cached_tokens: 100 },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const aiSuite = new AISuite({ fireworksKey: "test-key" });
    const response = await aiSuite.createChatCompletion(MODEL, [{ role: "user", content: "Hello" }], {
      stream: false,
      responseFormat: "json_schema",
      zodSchema: peopleSchema,
    });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("https://api.fireworks.ai/inference/v1/chat/completions");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-key");

    expect(response.success).toBe(true);
    if (!response.success) {
      return;
    }
    expect(response.content_object).toEqual({
      people: [{ name: "John", role: "MEMBER", nickname: null }],
    });
    expect(response.usage).toMatchObject({ input_tokens: 120, output_tokens: 30, cached_tokens: 100 });
  });
});
