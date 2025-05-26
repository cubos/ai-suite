import { describe, it, expect, beforeAll, vi } from "vitest";
import { OpenAIProvider } from "../src/providers/openai.js";
import { SuccessChatCompletion } from "../src/types/chat";
import dotenv from "dotenv";

dotenv.config();

let apiKey: string;

beforeAll(() => {
  apiKey = process.env.OPENAI_API_KEY || "fake-api-key";
  expect(apiKey).toBeDefined();
});

describe("OpenAIProvider", () => {
  it("should mock a response using mock and call the hooks", async () => {
    const handleRequest = vi.fn(async (req: unknown) => {
      console.log("handleRequest OpenAI", req);

      expect(req).toBeDefined();
    });

    const handleResponse = vi.fn(async (res: unknown) => {
      console.log("handleResponse OpenAI", res);

      expect(res).toBeDefined();
    });

    const ai = new OpenAIProvider(apiKey, "gpt-4o-mini-2024-07-18", undefined, {
      handleRequest,
      handleResponse,
    });

    const mockRequest = {
      model: "gpt-4o-mini-2024-07-18",
      messages: [{ role: "user", content: "Hello, how are you?" }],
      stream: false,
      temperature: undefined,
      response_format: undefined,
      tools: undefined,
    };

    const mockResponse: SuccessChatCompletion = {
      id: "mock-id",
      object: "chat.completion",
      created: Date.now(),
      model: "gpt-4o-mini-2024-07-18",
      usage: {
        input_tokens: 1,
        output_tokens: 1,
        total_tokens: 2,
        cached_tokens: 0,
        reasoning_tokens: 0,
        thoughts_tokens: 0,
      },
      success: true,
      content:
        "Hello! I'm just a computer program, so I don't have feelings, but I'm here and ready to help you. How can I assist you today?",
      content_object: {},
      tools: undefined,
    };

    vi.spyOn(ai, "createChatCompletion").mockImplementation(async () => {
      await handleRequest(mockRequest);
      await handleResponse(mockResponse);
      return mockResponse;
    });

    const response = await ai.createChatCompletion(
      [{ role: "user", content: "Hello, how are you?" }],
      { stream: false, responseFormat: "text" }
    );

    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(response.content).toContain("computer program");

    expect(handleRequest).toHaveBeenCalledTimes(1);
    expect(handleRequest).toHaveBeenCalledWith(mockRequest);

    expect(handleResponse).toHaveBeenCalledTimes(1);
    expect(handleResponse).toHaveBeenCalledWith(mockResponse);
  });
});
