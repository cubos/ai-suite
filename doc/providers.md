---
layout: doc.njk
title: Providers
description: Detailed information about supported AI providers
permalink: /providers/
eleventyNavigation:
  key: Providers
  order: 3
---

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
  'openai/gpt-4o',
  [{ role: 'user', content: 'Hello, world!' }]
);

if (response.success) {
  console.log(response.content);
}
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
  'anthropic/claude-3-5-sonnet-20241022',
  [{ role: 'user', content: 'Hello, world!' }]
);

if (response.success) {
  console.log(response.content);
}
```

### Google Gemini

**Module**: `./src/providers/gemini.ts`

Google Gemini integration supports Gemini models. The provider maps between AI-Suite's message format and Gemini's API requirements.

#### Supported Models

- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.0-flash`
- `gemini-2.0-flash-lite`
- `gemini-1.5-flash`
- `gemini-1.5-flash-8b`
- `gemini-1.5-pro`

#### Special Features

- **Thinking Budget**: Gemini 2.5 models support thinking budget configuration for extended reasoning
- **JSON Schema**: Native support for structured JSON output via Zod schemas

#### Usage Example

```typescript
const response = await aiSuite.createChatCompletion(
  'gemini/gemini-2.5-pro',
  [{ role: 'user', content: 'Hello, world!' }],
  {
    thinking: {
      budget: 256,      // Thinking budget (only for gemini-2.5-pro)
      output: true      // Include thinking in output
    }
  }
);

if (response.success) {
  console.log(response.content);
}
```

### DeepSeek

**Module**: `./src/providers/deepseek.ts`

DeepSeek integration supports DeepSeek AI models. The provider handles mapping between AI-Suite's format and DeepSeek's API.

#### Supported Models

- `deepseek-chat`
- `deepseek-coder`
- `deepseek-coder-plus`

#### Usage Example

```typescript
const response = await aiSuite.createChatCompletion(
  'deepseek/deepseek-chat',
  [{ role: 'user', content: 'Hello, world!' }]
);

if (response.success) {
  console.log(response.content);
}
```

### Grok

**Module**: `./src/providers/grok.ts`

Grok integration supports Grok models from xAI. The provider extends OpenAI provider as Grok uses OpenAI-compatible API.

#### Supported Models

- `grok-3`
- `grok-3-mini`
- `grok-3-fast`
- `grok-3-mini-fast`

#### Special Features

- **Reasoning Effort**: Grok models support reasoning effort configuration (low, medium, high)

#### Usage Example

```typescript
const response = await aiSuite.createChatCompletion(
  'grok/grok-3',
  [{ role: 'user', content: 'Explain quantum entanglement.' }],
  {
    reasoning: {
      effort: 'high'  // Use extended reasoning
    }
  }
);

if (response.success) {
  console.log(response.content);
}
```

### Custom LLM

**Module**: `./src/providers/customLLM.ts`

Custom LLM provider allows you to use any OpenAI-compatible API endpoint. This is useful for:
- Self-hosted LLMs (Ollama, LM Studio, vLLM, etc.)
- Third-party OpenAI-compatible APIs
- Custom inference endpoints

#### Usage Example

```typescript
const aiSuite = new AISuite({
  customURL: 'http://localhost:11434/v1',  // Example: Ollama endpoint
  customLLMKey: 'optional-api-key'         // Some endpoints don't need auth
});

const response = await aiSuite.createChatCompletion(
  'custom-llm/llama3.2',  // Model name from your custom endpoint
  [{ role: 'user', content: 'Hello, world!' }]
);

if (response.success) {
  console.log(response.content);
}
```

## Adding Custom Providers

To add a new provider to AI-Suite, you need to:

1. Create a new provider class that extends the base provider interface
2. Implement the required methods for the provider
3. Add the provider to the ProviderModel type
4. Update the getProvider method in the AISuite class

Example implementation skeleton:

```typescript
import { ProviderBase, ChatOptions } from './_base';
import { MessageModel, SuccessChatCompletion, ErrorChatCompletion } from '../types/chat';

export type CustomModels = 'model-1' | 'model-2';

export class CustomProvider extends ProviderBase {
  constructor(apiKey: string, model: string, hooks?: any) {
    super();
    // Initialize your provider client
  }

  async _createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions
  ): Promise<SuccessChatCompletion> {
    // Implement custom provider logic here
    // Return SuccessChatCompletion object
  }

  handleError(error: Error): Pick<ErrorChatCompletion, 'error' | 'raw' | 'tag'> {
    // Implement error handling
    return {
      error: error.message,
      raw: error,
      tag: 'Unknown'
    };
  }
}