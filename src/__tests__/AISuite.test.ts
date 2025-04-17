import { AISuite } from "../index";
import { MessageModel } from "../types/chat";
import { OpenAIProvider } from "../providers/openai";
import { AnthropicProvider } from "../providers/anthropic";
import { GeminiProvider } from "../providers/gemini";
import { DeepSeekProvider } from "../providers/deepseek";

// Mock all providers
jest.mock("../providers/openai", () => ({
  OpenAIProvider: jest.fn().mockImplementation(() => ({
    createChatCompletion: jest.fn().mockResolvedValue({
      id: "mock-openai-id",
      created: Date.now(),
      model: "gpt-4",
      object: "chat.completion",
      content: "Mock OpenAI response",
      usage: {
        input_tokens: 10,
        output_tokens: 20,
        total_tokens: 30,
      },
      execution_time: 100,
    }),
  })),
}));

jest.mock("../providers/anthropic", () => ({
  AnthropicProvider: jest.fn().mockImplementation(() => ({
    createChatCompletion: jest.fn().mockResolvedValue({
      id: "mock-anthropic-id",
      created: Date.now(),
      model: "claude-3-opus-latest",
      object: "chat.completion",
      content: "Mock Anthropic response",
      usage: {
        input_tokens: 15,
        output_tokens: 25,
        total_tokens: 40,
      },
      execution_time: 150,
    }),
  })),
}));

jest.mock("../providers/gemini", () => ({
  GeminiProvider: jest.fn().mockImplementation(() => ({
    createChatCompletion: jest.fn().mockResolvedValue({
      id: "mock-gemini-id",
      created: Date.now(),
      model: "gemini-1.5-pro",
      object: "chat.completion",
      content: "Mock Gemini response",
      usage: {
        input_tokens: 12,
        output_tokens: 18,
        total_tokens: 30,
      },
      execution_time: 120,
    }),
  })),
  GeminiModels: ["gemini-1.5-pro"],
}));

jest.mock("../providers/deepseek", () => ({
  DeepSeekProvider: jest.fn().mockImplementation(() => ({
    createChatCompletion: jest.fn().mockResolvedValue({
      id: "mock-deepseek-id",
      created: Date.now(),
      model: "deepseek-chat",
      object: "chat.completion",
      content: "Mock DeepSeek response",
      usage: {
        input_tokens: 8,
        output_tokens: 16,
        total_tokens: 24,
      },
      execution_time: 90,
    }),
  })),
  DeepSeekModels: ["deepseek-chat"],
}));

describe("AISuite", () => {
  let aiSuite: AISuite;
  const mockKeys = {
    openaiKey: "mock-openai-key",
    anthropicKey: "mock-anthropic-key",
    geminiKey: "mock-gemini-key",
    deepseekKey: "mock-deepseek-key",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    aiSuite = new AISuite(mockKeys);
  });

  describe("constructor", () => {
    it("should initialize with provided API keys", () => {
      expect(aiSuite).toBeInstanceOf(AISuite);
    });

    it("should initialize with optional Langfuse", () => {
      const langfuse = {
        trace: jest.fn(),
      };
      const suiteWithLangfuse = new AISuite(mockKeys, {
        langFuse: langfuse as never,
      });
      expect(suiteWithLangfuse).toBeInstanceOf(AISuite);
    });
  });

  describe("getProvider", () => {
    it("should return OpenAI provider for openai models", () => {
      const provider = aiSuite["getProvider"]("openai/gpt-4" as const);
      expect(provider).toBeDefined();
      expect(OpenAIProvider).toHaveBeenCalledWith(mockKeys.openaiKey, "gpt-4");
    });

    it("should return Anthropic provider for anthropic models", () => {
      const provider = aiSuite["getProvider"](
        "anthropic/claude-3-opus-latest" as const
      );
      expect(provider).toBeDefined();
      expect(AnthropicProvider).toHaveBeenCalledWith(
        mockKeys.anthropicKey,
        "claude-3-opus-latest"
      );
    });

    it("should return Gemini provider for gemini models", () => {
      const provider = aiSuite["getProvider"]("gemini/gemini-1.5-pro");
      expect(provider).toBeDefined();
      expect(GeminiProvider).toHaveBeenCalledWith(
        mockKeys.geminiKey,
        "gemini-1.5-pro"
      );
    });

    it("should return DeepSeek provider for deepseek models", () => {
      const provider = aiSuite["getProvider"]("deepseek/deepseek-chat");
      expect(provider).toBeDefined();
      expect(DeepSeekProvider).toHaveBeenCalledWith(
        mockKeys.deepseekKey,
        "deepseek-chat"
      );
    });

    it("should throw error for unsupported provider", () => {
      expect(() => {
        aiSuite["getProvider"]("unsupported/model" as never);
      }).toThrow("Unsupported provider: unsupported");
    });
  });

  describe("createChatCompletion", () => {
    const mockMessages: MessageModel[] = [
      {
        role: "user",
        content: "Hello, world!",
      },
    ];

    it("should throw error for streaming option", async () => {
      await expect(
        aiSuite.createChatCompletion("openai/gpt-4" as const, mockMessages, {
          stream: true,
        } as never)
      ).rejects.toThrow("Streaming is not supported");
    });

    it("should return chat completion with execution time", async () => {
      const result = await aiSuite.createChatCompletion(
        "openai/gpt-4" as const,
        mockMessages
      );
      expect(result).toHaveProperty("execution_time");
      expect(typeof result.execution_time).toBe("number");
    });
  });

  describe("createChatCompletionMultiResult", () => {
    const mockMessages: MessageModel[] = [
      {
        role: "user",
        content: "Hello, world!",
      },
    ];

    it("should return results for multiple providers", async () => {
      const providers = [
        "openai/gpt-4",
        "anthropic/claude-3-opus-latest",
        "gemini/gemini-1.5-pro",
        "deepseek/deepseek-chat",
      ] as const;

      const results = await aiSuite.createChatCompletionMultiResult(
        providers as never,
        mockMessages
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(providers.length);
      results.forEach((result) => {
        expect(Object.values(result)[0]).toHaveProperty("execution_time");
      });
    });
  });
});
