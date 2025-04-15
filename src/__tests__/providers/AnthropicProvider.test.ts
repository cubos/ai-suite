import { AnthropicProvider } from "../../providers/anthropic";
import { MessageModel } from "../../types/chat";
import { ChatOptions } from "../../providers/_base";
import { Anthropic } from "@anthropic-ai/sdk";

// Mock the Anthropic module
jest.mock("@anthropic-ai/sdk", () => {
  const mockCreate = jest.fn().mockResolvedValue({
    id: "test-id",
    content: [
      {
        type: "text",
        text: "Test response",
      },
    ],
    usage: {
      input_tokens: 10,
      output_tokens: 20,
    },
  });

  return {
    Anthropic: jest.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    })),
  };
});

describe("AnthropicProvider", () => {
  let provider: AnthropicProvider;
  const mockApiKey = "test-api-key";
  const mockModel = "claude-3-opus";
  const mockMessages: MessageModel[] = [
    {
      role: "user",
      content: "Hello, world!",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new AnthropicProvider(mockApiKey, mockModel);
  });

  describe("constructor", () => {
    it("should initialize with API key and model", () => {
      expect(provider).toBeInstanceOf(AnthropicProvider);
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
      const mockAnthropic = jest.mocked(Anthropic);
      const mockInstance = mockAnthropic.mock.results[0].value;

      expect(mockInstance.messages.create).toHaveBeenCalledWith(
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
              role: "user",
              content: "Tool Response (test_tool): Tool message",
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
      const mockAnthropic = jest.mocked(Anthropic);
      const mockInstance = mockAnthropic.mock.results[0].value;

      expect(mockInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
          system: "Please provide your response in JSON format.",
        })
      );
    });

    it("should return formatted result", async () => {
      const options: ChatOptions = { stream: false };
      const result = await provider.createChatCompletion(mockMessages, options);

      expect(result).toEqual(
        expect.objectContaining({
          id: "test-id",
          model: mockModel,
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
