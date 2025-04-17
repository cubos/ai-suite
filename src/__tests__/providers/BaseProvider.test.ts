/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatOptions, ProviderBase } from "../../providers/_base";
import { MessageModel, ResultChatCompletion } from "../../types/chat";

describe("ProviderBase", () => {
  class MockProvider implements ProviderBase {
    async createChatCompletion(
      messages: MessageModel[],
      options: ChatOptions
    ): Promise<ResultChatCompletion> {
      return {
        id: "mock-id",
        created: Date.now(),
        model: "mock-model",
        object: "chat.completion",
        content: "Mock response",
        execution_time: 100,
      };
    }
  }

  let provider: MockProvider;
  const mockMessages: MessageModel[] = [
    {
      role: "user",
      content: "Hello, world!",
    },
  ];

  beforeEach(() => {
    provider = new MockProvider();
  });

  describe("createChatCompletion", () => {
    it("should implement the ProviderBase interface", () => {
      expect(provider).toBeInstanceOf(MockProvider);
      expect(provider.createChatCompletion).toBeDefined();
    });

    it("should accept messages and options parameters", async () => {
      const options: ChatOptions = {
        stream: false,
        temperature: 0.7,
      };

      const result = await provider.createChatCompletion(mockMessages, options);
      expect(result).toBeDefined();
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("execution_time");
    });

    it("should handle different chat options", async () => {
      const options: ChatOptions = {
        stream: false,
        responseFormat: "json_object",
        temperature: 0.5,
      };

      const result = await provider.createChatCompletion(mockMessages, options);
      expect(result).toBeDefined();
    });
  });
});
