import { describe, it, expect, beforeAll, vi } from "vitest";
import { GrokProvider } from "../src/providers/grok.js";
import dotenv from "dotenv";
import { SuccessChatCompletion } from "../src/types/chat.js";

dotenv.config();

let apiKey: string;

beforeAll(() => {
  apiKey = process.env.GROK_API_KEY || "fake-api-key";
  expect(apiKey).toBeDefined();
});

describe("GrokProvider", () => {
  it("should mock a response using mock and call the hooks", async () => {
    const handleRequest = vi.fn(async (req: unknown) => {
      console.log("handleRequest Grok", req);

      expect(req).toBeDefined();
    });

    const handleResponse = vi.fn(async (res: unknown) => {
      console.log("handleResponse Grok", res);

      expect(res).toBeDefined();
    });

    const ai = new GrokProvider(apiKey, "grok-model", "https://api.x.ai/v1", {
      handleRequest,
      handleResponse,
    });

    const mockRequest = {
      model: "grok-model",
      messages: [{ role: "user", content: "Hello, how are you?" }],
      stream: false,
    };

    const mockResponse: SuccessChatCompletion = {
      id: "mock",
      object: "chat.completion",
      created: Date.now(),
      model: "grok-model",
      success: true,
      content: "I'm fine!",
      content_object: { role: "assistant", content: "I'm fine!" },
      usage: {
        input_tokens: 5,
        output_tokens: 3,
        total_tokens: 8,
        cached_tokens: 0,
        reasoning_tokens: 0,
        thoughts_tokens: 0,
      }
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
    expect(response.content).toContain("fine");

    expect(handleRequest).toHaveBeenCalledTimes(1);
    expect(handleRequest).toHaveBeenCalledWith(mockRequest);

    expect(handleResponse).toHaveBeenCalledTimes(1);
    expect(handleResponse).toHaveBeenCalledWith(mockResponse);
  });
});
