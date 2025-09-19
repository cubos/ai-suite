import dotenv from "dotenv";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CustomLLMProvider } from "../src/providers/customLLM.js";
import type { SuccessChatCompletion } from "../src/types/chat.js";

dotenv.config();

let apiKey: string;

beforeAll(() => {
  apiKey = process.env.ANTHROPIC_API_KEY || "fake-api-key";
  expect(apiKey).toBeDefined();
});

describe("CustomLLMProvider", () => {
  it("should mock a response using mock and call the hooks", async () => {
    const handleRequest = vi.fn(async (req: unknown) => {
      console.log("handleRequest CustomLLM", req);

      expect(req).toBeDefined();
    });

    const handleResponse = vi.fn(async (res: unknown) => {
      console.log("handleResponse CustomLLM", res);

      expect(res).toBeDefined();
    });

    const ai = new CustomLLMProvider(apiKey, "custom-model", "https://api.custom-llm.com/v1", {
      handleRequest,
      handleResponse,
    });

    const mockRequest = {
      model: "custom-model",
      messages: [{ role: "user", content: "Hello, how are you?" }],
      stream: false,
    };

    const mockResponse = {
      id: "mock",
      created: Date.now(),
      model: "custom-model",
      object: "chat.completion",
      success: true,
      content: "I'm fine!",
      content_object: { role: "assistant", content: "I'm fine!" },
      usage: {
        prompt_tokens: 5,
        completion_tokens: 3,
        total_tokens: 8,
      },
    };

    vi.spyOn(ai, "createChatCompletion").mockImplementation(async () => {
      await handleRequest(mockRequest);
      await handleResponse(mockResponse);
      return mockResponse as unknown as SuccessChatCompletion;
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
