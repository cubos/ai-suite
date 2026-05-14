import dotenv from "dotenv";
import { readFileSync } from "fs";
import { beforeAll, describe, expect, it, vi } from "vitest";
import z from "zod";
import { AISuite } from "../../src/index.js";
import type { SuccessChatCompletion } from "../../src/types/chat.js";
import type { SuccessEmbedding } from "../../src/types/embed.js";
import type { StreamChunk } from "../../src/types/stream.js";

dotenv.config();

let apiKey: string | undefined;

beforeAll(() => {
  apiKey = process.env.GEMINI_API_KEY;
  expect(apiKey).toBeDefined();
});

describe("GeminiProvider", () => {
  it("should mock a response using mock and call the hooks", async () => {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    const handleRequest = vi.fn(async (req: unknown) => {
      expect(req).toBeDefined();
    });

    const handleResponse = vi.fn(async (res: unknown) => {
      expect(res).toBeDefined();
    });

    const gemini = new AISuite(
      {
        geminiKey: apiKey,
      },
      {
        hooks: {
          handleRequest,
          handleResponse,
        },
      },
    );

    const result = await gemini.createChatCompletion("gemini/gemini-2.0-flash-lite", [
      {
        role: "user",
        content: "Hello, world!",
      },
    ]);

    if (!result.success) {
      console.log("Gemini error:", result);
    }

    expect(result.success).toBe(true);
    expect((result as SuccessChatCompletion).content).toBeDefined();
    expect(handleRequest).toHaveBeenCalled();
    expect(handleResponse).toHaveBeenCalled();
  }, 15000);

  it("should return JSON format response", async () => {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    const gemini = new AISuite({
      geminiKey: apiKey,
    });

    const result = await gemini.createChatCompletion(
      "gemini/gemini-2.0-flash-lite",
      [
        {
          role: "user",
          content: "Return a JSON object with a field 'message' containing 'Hello, world!'",
        },
      ],
      {
        stream: false,
        responseFormat: "json_object",
      },
    );

    expect(result.success).toBe(true);
    expect((result as SuccessChatCompletion).content).toBeDefined();
    expect((result as SuccessChatCompletion).content_object).toBeDefined();
    expect((result as SuccessChatCompletion).content_object).toHaveProperty("message");
    expect((result as SuccessChatCompletion).content_object.message).toBe("Hello, world!");

    const result2 = await gemini.createChatCompletion(
      "gemini/gemini-2.5-flash-lite",
      [
        {
          role: "user",
          content: "Return a JSON object with a field 'message' containing 'Hello, world!'",
        },
      ],
      {
        stream: false,
        zodSchema: z.object({
          message: z.string(),
        }),
        responseFormat: "json_schema",
      },
    );

    expect(result2.success).toBe(true);
    expect((result2 as SuccessChatCompletion).content).toBeDefined();
    expect((result2 as SuccessChatCompletion).content_object).toBeDefined();
    expect((result2 as SuccessChatCompletion).content_object).toHaveProperty("message");
    expect((result2 as SuccessChatCompletion).content_object.message).toBe("Hello, world!");
  });

  it("should send pdf file", async () => {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    const gemini = new AISuite({
      geminiKey: apiKey,
    });

    const file = readFileSync(`${__dirname}/../assets/teste.pdf`);

    const base64File = file.toString("base64");

    const result = await gemini.createChatCompletion(
      "gemini/gemini-2.5-flash-lite",
      [
        {
          role: "user",
          content: {
            type: "file",
            fileName: "test.pdf",
            mediaType: "application/pdf",
            file: base64File,
          },
        },
        {
          role: "user",
          content: {
            type: "text",
            text: "What is this file about?",
          },
        },
      ],
      {
        stream: false,
        zodSchema: z.object({
          description: z.string().describe("A description of the pdf"),
          title: z.string().describe("The title of the pdf"),
        }),
        responseFormat: "json_schema",
      },
    );

    expect(result.success).toBe(true);
    expect((result as SuccessChatCompletion).content).toBeDefined();
    expect((result as SuccessChatCompletion).content_object).toBeDefined();
    expect((result as SuccessChatCompletion).content_object).toHaveProperty("description");
    expect((result as SuccessChatCompletion).content_object).toHaveProperty("title");
    expect((result as SuccessChatCompletion).content_object.title).toBe("ARQUIVO PDF DE TESTE");
  });

  it("should return a response using gemini-3-flash-preview with thinking level", async () => {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    const gemini = new AISuite({
      geminiKey: apiKey,
    });

    const result = await gemini.createChatCompletion(
      "gemini/gemini-3-flash-preview",
      [
        {
          role: "user",
          content: "Return a JSON object with a field 'message' containing 'Hello, world!'",
        },
      ],
      {
        stream: false,
        zodSchema: z.object({
          message: z.string(),
        }),
        responseFormat: "json_schema",
        thinking: { level: "minimal", output: false },
      },
    );

    if (!result.success) {
      console.log("Gemini 3 Flash error:", result);
    }

    expect(result.success).toBe(true);
    expect((result as SuccessChatCompletion).content).toBeDefined();
    expect((result as SuccessChatCompletion).content_object).toBeDefined();
    expect((result as SuccessChatCompletion).content_object).toHaveProperty("message");
    expect((result as SuccessChatCompletion).content_object.message).toBe("Hello, world!");
  });
});

async function collectStream(gen: Promise<AsyncGenerator<StreamChunk>>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = [];
  for await (const chunk of await gen) chunks.push(chunk);
  return chunks;
}

describe("GeminiProvider - Stream", () => {
  it("should stream chunks with correct structure", async () => {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");

    const ai = new AISuite({ geminiKey: apiKey });
    const chunks = await collectStream(
      ai.createChatCompletion("gemini/gemini-2.0-flash-lite", [{ role: "user", content: "Say hello in one word" }], {
        stream: true,
        responseFormat: "text",
      }),
    );

    const intermediates = chunks.filter(c => !c.done);
    const final = chunks.find(c => c.done);

    expect(intermediates.length).toBeGreaterThan(0);
    intermediates.forEach(c => {
      expect(c.delta).toBeTruthy();
      expect(c.id).toBeDefined();
      expect(c.created).toBeDefined();
      expect(c.object).toBe("chat.completion");
      expect(c.model).toBeDefined();
    });

    expect(final).toBeDefined();
    expect(final!.delta).toBe("");
    expect(final!.content).toBeTruthy();
    expect(final!.execution_time).toBeDefined();
    expect(final!.usage).toBeDefined();
    expect(final!.usage!.input_tokens).toBeGreaterThan(0);
    expect(final!.usage!.output_tokens).toBeGreaterThan(0);
    expect(final!.usage!.total_tokens).toBeGreaterThan(0);
  }, 15000);

  it("should parse content_object on final chunk when using json_object format", async () => {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");

    const ai = new AISuite({ geminiKey: apiKey });
    const chunks = await collectStream(
      ai.createChatCompletion(
        "gemini/gemini-2.0-flash-lite",
        [{ role: "user", content: "Return a JSON object with a field 'message' containing 'Hello, world!'" }],
        { stream: true, responseFormat: "json_object" },
      ),
    );

    const final = chunks.find(c => c.done);
    expect(final).toBeDefined();
    expect(final!.content_object).toBeDefined();
    expect(final!.content_object).toHaveProperty("message");
  }, 15000);
});

describe("GeminiProvider - Embeddings", () => {
  it("should create embedding with a single text string", async () => {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    const gemini = new AISuite({
      geminiKey: apiKey,
    });

    const dimensions = 8;
    const result = await gemini.createEmbedding(
      "gemini/gemini-embedding-001",
      {
        content: "Hello, world!",
      },
      {
        dimensions,
      },
    );

    const successResult = result as SuccessEmbedding;
    expect(result.success).toBe(true);
    expect(successResult.content).toBeDefined();
    expect(Array.isArray(successResult.content)).toBe(true);
    expect(successResult.content.length).toBe(1);
    expect(Array.isArray(successResult.content[0])).toBe(true);
    expect(successResult.content[0].length).toBe(dimensions);
    expect(successResult.model).toBeDefined();
    expect(successResult.object).toBe("list");
    expect(successResult.usage).toBeDefined();
  });

  it("should create embedding with multiple text strings", async () => {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }

    const gemini = new AISuite({
      geminiKey: apiKey,
    });

    const texts = ["Hello, world!", "How are you?", "Great to see you!"];
    const dimensions = 8;
    const result = await gemini.createEmbedding(
      "gemini/gemini-embedding-001",
      {
        content: texts,
      },
      {
        dimensions,
      },
    );

    const successResult = result as SuccessEmbedding;
    expect(successResult.success).toBe(true);
    expect(successResult.content).toBeDefined();
    expect(Array.isArray(successResult.content)).toBe(true);
    expect(successResult.content.length).toBe(texts.length);
    expect(successResult.content).toHaveLength(texts.length);
    successResult.content.forEach(embedding => {
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(dimensions);
    });
    expect(successResult.model).toBeDefined();
    expect(successResult.object).toBe("list");
    expect(successResult.usage).toBeDefined();
  });
});
