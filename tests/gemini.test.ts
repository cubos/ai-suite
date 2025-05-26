import { describe, it, expect, beforeAll, vi } from "vitest";
import { GeminiProvider } from "../src/providers/gemini.js";
import { GenerateContentResponse } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let apiKey: string;

beforeAll(() => {
  apiKey = process.env.GEMINI_API_KEY || "fake-api-key";
  expect(apiKey).toBeDefined();
});

describe("GeminiProvider", () => {
  it("should mock a response using mock and call the hooks", async () => {
    const handleRequest = vi.fn(async (req: unknown) => {
      console.log("handleRequest Gemini", req);

      expect(req).toBeDefined();
    });

    const handleResponse = vi.fn(async (res: unknown) => {
      console.log("handleResponse Gemini", res);

      expect(res).toBeDefined();
    });

    const ai = new GeminiProvider(apiKey, "gemini-2.0-flash", {
      handleRequest,
      handleResponse,
    });
  
    const mockChat = {
      model: "gemini-model",
      history: [{ role: "user", content: "Hello, how are you?" }],
    };

    const mockResponse: GenerateContentResponse = {
      responseId: "mock",
      createTime: new Date().toISOString(),
      modelVersion: "gemini-2.0-flash",
      usageMetadata: {
        promptTokenCount: 5,
        candidatesTokenCount: 3,
        totalTokenCount: 8,
        cachedContentTokenCount: 0,
        thoughtsTokenCount: 0,
      },
      candidates: [
        {
          content: {
            parts: [{
              text: "I'm fine!",
            }],
            role: "model",
          }
        }
      ],
      text: "I'm fine!",
      data: undefined,
      functionCalls: undefined,
      executableCode: undefined,
      codeExecutionResult: undefined,
    };

    vi.spyOn(ai, "createChatCompletion").mockImplementation(async () => {
      await handleRequest(mockChat);
      await handleResponse(mockResponse);
      return {
        success: true,
        id: "mock",
        created: Date.now(),
        model: "gemini-2.0-flash",
        object: "chat.completion",
        content: "I'm fine!",
        content_object: { role: "assistant", content: "I'm fine!" },
        tools: [],
        usage: {
          input_tokens: 5,
          output_tokens: 3,
          total_tokens: 8,
          cached_tokens: 0,
          reasoning_tokens: 0,
          thoughts_tokens: 0,
        },
      };
    });

    const result = await ai.createChatCompletion(
      [{ role: "user", content: "Hello, how are you?" }],
      { stream: false, responseFormat: "text" }
    );

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.content).toContain("fine");

    expect(handleRequest).toHaveBeenCalledTimes(1);
    expect(handleRequest).toHaveBeenCalledWith(mockChat);

    expect(handleResponse).toHaveBeenCalledTimes(1);
    expect(handleResponse).toHaveBeenCalledWith(mockResponse);
  });
});
