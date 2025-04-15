# API Reference

## AISuite Class

The main class that provides the unified interface for AI providers.

### Constructor

```typescript
constructor(
  keys: {
    openaiKey?: string;
    anthropicKey?: string;
    geminiKey?: string;
    deepseekKey?: string;
  },
  options?: {
    langFuse?: Langfuse;
  }
)
```

Parameters:
- `keys`: API keys for various providers
- `options`: Additional options, such as Langfuse integration

### Methods

#### createChatCompletion

```typescript
async createChatCompletion(
  provider: ProviderModel,
  messages: MessageModel[],
  options?: Partial<ChatOptions>
): Promise<ResultChatCompletion>
```

Send a chat completion request to a single provider.

Parameters:
- `provider`: The provider and model to use (e.g., 'openai/gpt-4')
- `messages`: Array of message objects
- `options`: Additional options for the request

Returns:
- `Promise<ResultChatCompletion>`: The completion result

#### createChatCompletionMultiResult

```typescript
async createChatCompletionMultiResult(
  providers: ProviderModel[],
  messages: MessageModel[],
  options: { stream: false } & Partial<ChatOptions> = { stream: false }
): Promise<{ [key in ProviderModel]: ResultChatCompletion }[]>
```

Send a chat completion request to multiple providers.

Parameters:
- `providers`: Array of provider models to use
- `messages`: Array of message objects
- `options`: Additional options for the request

Returns:
- `Promise<{ [key in ProviderModel]: ResultChatCompletion }[]>`: Array of results from each provider

## Types

### ProviderModel

```typescript
type ProviderModel =
  | `openai/${OpenAIModels}`
  | `anthropic/${IsLiteral<Model>}`
  | `gemini/${GeminiModels}`
  | `deepseek/${DeepSeekModels}`;
```

A string representation of a provider and model, in the format `provider/model`.

### MessageModel

```typescript
interface MessageModel {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

Represents a message in a conversation.

### ResultChatCompletion

```typescript
interface ResultChatCompletion {
  message: {
    role: string;
    content: string;
  };
  execution_time: number;
  provider_specific?: any;
}
```

The result of a chat completion request.

### ChatOptions

```typescript
interface ChatOptions {
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  [key: string]: any;
}
```

Options for chat completion requests.