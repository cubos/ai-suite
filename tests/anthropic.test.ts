import { describe, it, expect, beforeAll, vi } from "vitest";
import { AnthropicProvider } from "../src/providers/anthropic.js";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

let apiKey: string;

beforeAll(() => {
  apiKey = process.env.ANTHROPIC_API_KEY || "fake-api-key";
  expect(apiKey).toBeDefined();
});

describe("AnthropicProvider", () => {
  it("should mock a response using mock and call the hooks", async () => {
    const handleRequest = vi.fn(async (req: unknown) => {
      console.log("handleRequest Anthropic", req);

      expect(req).toBeDefined();
    });

    const handleResponse = vi.fn(async (res: unknown) => {
      console.log("handleResponse Anthropic", res);

      expect(res).toBeDefined();
    });

    const ai = new AnthropicProvider(apiKey, "claude-3-opus-20240229", {
      handleRequest,
      handleResponse,
    });

    const mockAnthropicOptions: Anthropic.Messages.MessageCreateParams = {
      model: "claude-3-opus-20240229",
      messages: [{ role: "user", content: "Hello, how are you?" }],
      stream: false,
      max_tokens: 4096,
    };

    const mockResponse: Anthropic.Messages.Message = {
      id: "mock",
      content: [{ text: "I'm fine!", type: "text", citations: null }],
      model: "claude-3-opus-20240229",
      role: "assistant",
      usage: {
        input_tokens: 5,
        output_tokens: 3,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
        server_tool_use: null,
      },
      stop_reason: null,
      stop_sequence: null,
      type: "message"
    };

    vi.spyOn(ai, "createChatCompletion").mockImplementation(async () => {
      await handleRequest(mockAnthropicOptions);
      await handleResponse(mockResponse);
      return {
        success: true,
        id: "mock",
        created: Date.now(),
        model: "claude-3-opus-20240229",
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
    expect(handleRequest).toHaveBeenCalledWith(mockAnthropicOptions);

    expect(handleResponse).toHaveBeenCalledTimes(1);
    expect(handleResponse).toHaveBeenCalledWith(mockResponse);
  });
});
