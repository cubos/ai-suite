# Providers

AI-Suite supports multiple AI providers through a unified interface. This document details each supported provider and its implementation.

## Provider Architecture

Each provider in AI-Suite follows a common interface defined in the base provider class. This ensures a consistent API while allowing for provider-specific implementations.

All providers implement the following methods:
- `createChatCompletion`: Send a chat completion request to the provider
- Provider-specific parameter mapping and error handling

## Supported Providers

### OpenAI

**Module**: `./src/providers/openai.ts`

OpenAI integration supports models like GPT-3.5 and GPT-4. The provider maps AI-Suite's unified message format to OpenAI's API format.

#### Supported Models

- `gpt-3.5-turbo`
- `gpt-4`
- `gpt-4-turbo`
- And other OpenAI chat models

#### Usage Example

```typescript
const response = await aiSuite.createChatCompletion(
  'openai/gpt-4',
  [{ role: 'user', content: 'Hello, world!' }]
);
```

### Anthropic

**Module**: `./src/providers/anthropic.ts`

Anthropic integration supports Claude models. The provider handles the conversion between AI-Suite's message format and Anthropic's API format.

#### Supported Models

- `claude-3-opus`
- `claude-3-sonnet`
- `claude-3-haiku`
- And other Claude models

#### Usage Example

```typescript
const response = await aiSuite.createChatCompletion(
  'anthropic/claude-3-opus',
  [{ role: 'user', content: 'Hello, world!' }]
);
```

### Google Gemini

**Module**: `./src/providers/gemini.ts`

Google Gemini integration supports Gemini models. The provider maps between AI-Suite's message format and Gemini's API requirements.

#### Supported Models

- `gemini-pro`
- `gemini-ultra`
- And other Gemini models

#### Usage Example

```typescript
const response = await aiSuite.createChatCompletion(
  'gemini/gemini-pro',
  [{ role: 'user', content: 'Hello, world!' }]
);
```

### DeepSeek

**Module**: `./src/providers/deepseek.ts`

DeepSeek integration supports DeepSeek AI models. The provider handles mapping between AI-Suite's format and DeepSeek's API.

#### Supported Models

- Various DeepSeek models

#### Usage Example

```typescript
const response = await aiSuite.createChatCompletion(
  'deepseek/deepseek-chat',
  [{ role: 'user', content: 'Hello, world!' }]
);
```

## Adding Custom Providers

To add a new provider to AI-Suite, you need to:

1. Create a new provider class that extends the base provider interface
2. Implement the required methods for the provider
3. Add the provider to the ProviderModel type
4. Update the getProvider method in the AISuite class

Example implementation skeleton:

```typescript
import { BaseProvider, ChatOptions } from './_base';
import { MessageModel, ResultChatCompletion } from '../types/chat';

export type CustomModels = 'model-1' | 'model-2';

export class CustomProvider extends BaseProvider {
  constructor(apiKey: string, model: string) {
    super(apiKey, model);
  }

  async createChatCompletion(
    messages: MessageModel[],
    options?: Partial<ChatOptions>
  ): Promise<ResultChatCompletion> {
    // Implement custom provider logic here
  }
}