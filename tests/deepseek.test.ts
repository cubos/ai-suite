import dotenv from "dotenv";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { DeepSeekProvider } from "../src/providers/deepseek.js";
import type { SuccessChatCompletion } from "../src/types/chat.js";

dotenv.config();

let apiKey: string;

beforeAll(() => {
  apiKey = process.env.DEEPSEEK_API_KEY || "fake-api-key";
  expect(apiKey).toBeDefined();
});

describe("DeepseekProvider", () => {
  it("should mock a response using mock and call the hooks", async () => {
    const handleRequest = vi.fn(async (req: unknown) => {
      console.log("handleRequest Deepseek", req);

      expect(req).toBeDefined();
    });

    const handleResponse = vi.fn(async (res: unknown) => {
      console.log("handleResponse Deepseek", res);

      expect(res).toBeDefined();
    });

    const ai = new DeepSeekProvider(apiKey, "deepseek-model", "https://api.deepseek.com/v1", {
      handleRequest,
      handleResponse,
    });

    const mockRequest = {
      model: "deepseek-model",
      messages: [{ role: "user", content: "Hello, how are you?" }],
      stream: false,
    };

    const mockResponse: SuccessChatCompletion = {
      id: "mock",
      object: "chat.completion",
      created: Date.now(),
      model: "deepseek-model",
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
      },
    };

    vi.spyOn(ai, "createChatCompletion").mockImplementation(async () => {
      await handleRequest(mockRequest);
      await handleResponse(mockResponse);
      return mockResponse;
    });

    const response = await ai.createChatCompletion([{ role: "user", content: "Hello, how are you?" }], {
      stream: false,
      responseFormat: "text",
    });

    expect(response).toBeDefined();
    expect(response.success).toBe(true);
    expect(response.content).toContain("fine");

    expect(handleRequest).toHaveBeenCalledTimes(1);
    expect(handleRequest).toHaveBeenCalledWith(mockRequest);

    expect(handleResponse).toHaveBeenCalledTimes(1);
    expect(handleResponse).toHaveBeenCalledWith(mockResponse);
  });
});
