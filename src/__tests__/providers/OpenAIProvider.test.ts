import { OpenAIProvider } from "../../providers/openai";
import { MessageModel } from "../../types/chat";
import { ChatOptions } from "../../providers/_base";
import { OpenAI } from "openai";

// Mock the OpenAI module
jest.mock("openai", () => {
  const mockCreate = jest.fn().mockResolvedValue({
    id: "test-id",
    model: "gpt-4",
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

describe("OpenAIProvider", () => {
  let provider: OpenAIProvider;
  const mockApiKey = "test-api-key";
  const mockModel = "gpt-4";
  const mockMessages: MessageModel[] = [
    {
      role: "user",
      content: "Hello, world!",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OpenAIProvider(mockApiKey, mockModel);
  });

  describe("constructor", () => {
    it("should initialize with API key and model", () => {
      expect(provider).toBeInstanceOf(OpenAIProvider);
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
          model: "gpt-4",
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
        { role: "invalid" as any, content: "Invalid message" },
      ];

      await expect(
        provider.createChatCompletion(invalidMessages, { stream: false })
      ).rejects.toThrow("Unsupported role: invalid");
    });
  });
});
