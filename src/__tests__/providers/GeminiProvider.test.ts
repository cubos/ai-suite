import { GeminiProvider } from "../../providers/gemini";
import { MessageModel } from "../../types/chat";
import { ChatOptions } from "../../providers/_base";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Mock the Google Generative AI module
jest.mock("@google/generative-ai", () => {
  const mockSendMessage = jest.fn().mockResolvedValue({
    response: {
      text: jest.fn().mockReturnValue("Test response"),
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 20,
      },
    },
  });

  const mockStartChat = jest.fn().mockReturnValue({
    sendMessage: mockSendMessage,
  });

  const mockGetGenerativeModel = jest.fn().mockReturnValue({
    startChat: mockStartChat,
  });

  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
  };
});

describe("GeminiProvider", () => {
  let provider: GeminiProvider;
  const mockApiKey = "test-api-key";
  const mockModel = "gemini-1.5-pro";
  const mockMessages: MessageModel[] = [
    {
      role: "user",
      content: "Hello, world!",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new GeminiProvider(mockApiKey, mockModel);
  });

  describe("constructor", () => {
    it("should initialize with API key and model", () => {
      expect(provider).toBeInstanceOf(GeminiProvider);
      expect(GoogleGenerativeAI).toHaveBeenCalledWith(mockApiKey);
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
      const mockGAI = jest.mocked(GoogleGenerativeAI);
      const mockInstance = mockGAI.mock.results[0].value;

      expect(mockInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: mockModel,
      });

      const mockGenerativeModel =
        mockInstance.getGenerativeModel.mock.results[0].value;
      expect(mockGenerativeModel.startChat).toHaveBeenCalledWith({
        generationConfig: {
          temperature: 0.7,
        },
      });

      const mockChat = mockGenerativeModel.startChat.mock.results[0].value;
      expect(mockChat.sendMessage).toHaveBeenCalled();
    });

    it("should handle temperature option", async () => {
      const options: ChatOptions = {
        stream: false,
        temperature: 0.5,
      };

      await provider.createChatCompletion(mockMessages, options);
      const mockGAI = jest.mocked(GoogleGenerativeAI);
      const mockInstance = mockGAI.mock.results[0].value;
      const mockGenerativeModel =
        mockInstance.getGenerativeModel.mock.results[0].value;

      expect(mockGenerativeModel.startChat).toHaveBeenCalledWith({
        generationConfig: {
          temperature: 0.5,
        },
      });
    });

    it("should return formatted result", async () => {
      const options: ChatOptions = { stream: false };
      const result = await provider.createChatCompletion(mockMessages, options);

      expect(result).toEqual(
        expect.objectContaining({
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
        { role: "invalid" as never, content: "Invalid message" },
      ];

      await expect(
        provider.createChatCompletion(invalidMessages, { stream: false })
      ).rejects.toThrow("Unsupported role: invalid");
    });
  });
});
