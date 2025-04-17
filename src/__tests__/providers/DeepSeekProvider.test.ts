import { DeepSeekProvider } from "../../providers/deepseek";
import { MessageModel } from "../../types/chat";
import { ChatOptions } from "../../providers/_base";
import { OpenAI } from "openai";

// Mock the OpenAI module for DeepSeek
jest.mock("openai", () => {
  const mockCreate = jest.fn().mockResolvedValue({
    id: "test-id",
    model: "deepseek-chat",
    choices: [
      {
        message: {
          content: "Test response",
        },
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    },
  });

  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

describe("DeepSeekProvider", () => {
  let provider: DeepSeekProvider;
  const mockApiKey = "test-api-key";
  const mockModel = "deepseek-chat";
  const mockMessages: MessageModel[] = [
    {
      role: "user",
      content: "Hello, world!",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new DeepSeekProvider(mockApiKey, mockModel);
  });

  describe("constructor", () => {
    it("should initialize with API key and model", () => {
      expect(provider).toBeInstanceOf(DeepSeekProvider);
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: mockApiKey,
        baseURL: "https://api.deepseek.com/v1",
      });
    });
  });

  describe("createChatCompletion", () => {
    it("should map messages correctly", async () => {
      const messages: MessageModel[] = [
        { role: "user", content: "User message" },
        { role: "assistant", content: "Assistant message" },
        { role: "developer", content: "Developer message" },
        { role: "tool", content: "Tool message", name: "test_tool" },
      ];

      const options: ChatOptions = {
        stream: false,
        temperature: 0.7,
      };

      await provider.createChatCompletion(messages, options);
      const mockOpenAI = jest.mocked(OpenAI);
      const mockInstance = mockOpenAI.mock.results[0].value;

      expect(mockInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockModel,
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "user", content: "User message" }),
            expect.objectContaining({
              role: "assistant",
              content: "Assistant message",
            }),
            expect.objectContaining({
              role: "user",
              content: "Developer message",
            }),
            expect.objectContaining({
              role: "function",
              content: "Tool message",
              name: "test_tool",
            }),
          ]),
        })
      );
    });

    it("should handle different options", async () => {
      const options: ChatOptions = {
        stream: false,
        temperature: 0.5,
        responseFormat: "json_object",
      };

      await provider.createChatCompletion(mockMessages, options);
      const mockOpenAI = jest.mocked(OpenAI);
      const mockInstance = mockOpenAI.mock.results[0].value;

      expect(mockInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
          response_format: { type: "json_object" },
        })
      );
    });

    it("should return formatted result", async () => {
      const options: ChatOptions = { stream: false };
      const result = await provider.createChatCompletion(mockMessages, options);

      expect(result).toEqual(
        expect.objectContaining({
          id: "test-id",
          model: "deepseek-chat",
          content: "Test response",
          usage: {
            input_tokens: 10,
            output_tokens: 20,
            total_tokens: 30,
          },
        })
      );
    });

    it("should throw error for unsupported role", async () => {
      const invalidMessages: MessageModel[] = [
        { role: "invalid" as never, content: "Invalid message" },
      ];

      await expect(
        provider.createChatCompletion(invalidMessages, { stream: false })
      ).rejects.toThrow("Unsupported role: invalid");
    });
  });
});
