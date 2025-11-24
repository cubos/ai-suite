---
layout: doc.njk
title: API Reference
description: Complete API documentation for AI-Suite
permalink: /api-reference/
eleventyNavigation:
  key: API Reference
  order: 4
---

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
    grokKey?: string;
    customURL?: string;
    customLLMKey?: string;
  },
  options?: {
    hooks?: {
      handleRequest?: (req: unknown) => Promise<void>;
      handleResponse?: (req: unknown, res: unknown, metadata: Record<string, unknown>) => Promise<void>;
      failOnError?: boolean;
    };
    langFuse?: Langfuse;
  }
)
```

Parameters:
- `keys`: API keys and configuration for various providers
  - `openaiKey`: OpenAI API key
  - `anthropicKey`: Anthropic API key
  - `geminiKey`: Google Gemini API key
  - `deepseekKey`: DeepSeek API key
  - `grokKey`: Grok (xAI) API key
  - `customURL`: Base URL for custom OpenAI-compatible endpoints
  - `customLLMKey`: API key for custom endpoints (optional)
- `options`: Additional configuration options
  - `hooks`: Custom request/response interceptors
  - `langFuse`: Langfuse instance for tracking

### Methods

#### createChatCompletion

```typescript
async createChatCompletion(
  provider: ProviderModel<S>,
  messages: MessageModel[],
  options?: ChatOptions
): Promise<ResultChatCompletion>
```

Send a chat completion request to a single provider.

Parameters:
- `provider`: The provider and model to use (e.g., `'openai/gpt-4'`, `'anthropic/claude-3-5-sonnet-20241022'`)
- `messages`: Array of message objects
- `options`: Additional options for the request

Returns:
- `Promise<ResultChatCompletion>`: The completion result (either success or error)

#### createChatCompletionMultiResult

```typescript
async createChatCompletionMultiResult<T extends ProviderModel<S>>(
  providers: T[],
  messages: MessageModel[],
  options?: { stream: false } & ChatOptions
): Promise<ResultChatCompletion[]>
```

Send a chat completion request to multiple providers in parallel.

Parameters:
- `providers`: Array of provider models to use
- `messages`: Array of message objects
- `options`: Additional options for the request

Returns:
- `Promise<ResultChatCompletion[]>`: Array of results (one per provider, in same order)

## Types

### ProviderModel

```typescript
type ProviderModel<S extends string = string> =
  | `openai/${OpenAIModels}`
  | `anthropic/${AnthropicModels}`
  | `gemini/${GeminiModels}`
  | `deepseek/${DeepSeekModels}`
  | `grok/${GrokModels}`
  | `custom-llm/${S}`;
```

A string representation of a provider and model, in the format `provider/model`.

### MessageModel

```typescript
interface MessageModel {
  role: 'user' | 'developer' | 'assistant' | 'tool';
  content: string;
  name?: string;  // Required for 'tool' role
}
```

Represents a message in a conversation.

- `user`: User message
- `developer`: System/developer message (mapped to appropriate role per provider)
- `assistant`: Assistant response
- `tool`: Tool/function call result

### ResultChatCompletion

```typescript
type ResultChatCompletion = SuccessChatCompletion | ErrorChatCompletion;
```

The result of a chat completion request can be either a success or error.

#### SuccessChatCompletion

```typescript
interface SuccessChatCompletion {
  success: true;
  id: string;
  created: number;  // Unix timestamp in seconds
  model: string;
  object: 'chat.completion';
  service_tier?: 'scale' | 'default' | null;
  system_fingerprint?: string;

  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cached_tokens: number;
    reasoning_tokens: number;  // For reasoning models (o1, o3, Grok)
    thoughts_tokens: number;   // For Gemini thinking mode
  };

  content: string | null;  // The main text response
  content_object: Record<string, unknown>;  // Parsed JSON (when using json_schema or json_object)

  tools?: {
    id: string;
    type: 'function';
    name: string;
    content: Record<string, unknown>;
    rawContent: string;
  }[];

  execution_time?: number;  // In milliseconds
  metadata?: Record<string, unknown>;
}
```

#### ErrorChatCompletion

```typescript
interface ErrorChatCompletion {
  success: false;
  created: number;
  model: string;
  error: string;
  tag: 'InvalidAuth' | 'InvalidRequest' | 'InvalidModel' | 'RateLimitExceeded' | 'ServerError' | 'ServerOverloaded' | 'Unknown';
  raw: Error;
  execution_time?: number;
}
```

### ChatOptions

ChatOptions is a union type that varies based on the response format:

```typescript
type ChatOptions = JSONSchema | JSONObject | Text;
```

#### Common Options (available in all formats)

```typescript
interface ChatOptionsBase {
  stream?: boolean;  // Currently not supported
  temperature?: number;  // Default: 0.7

  // Token management
  maxOutputTokens?: number;

  // Tools/Functions
  tools?: ToolModel[];

  // Retry configuration
  retry?: {
    attempts: number;
    delay?: (attempt: number) => number;  // Default: exponential backoff
  };

  // Reasoning (OpenAI o1/o3, Grok)
  reasoning?: {
    effort: 'low' | 'medium' | 'high';
  };

  // Thinking (Gemini 2.5)
  thinking?: {
    budget: number;   // Thinking budget tokens
    output: boolean;  // Include thinking in output
  };

  // Langfuse tracking metadata
  metadata?: Record<string, unknown> & {
    langFuse?: {
      userId?: string;
      environment?: string;
      sessionId?: string;
      name?: string;
      tags?: string[];
    };
  };
}
```

#### Text Response Format

```typescript
interface Text extends ChatOptionsBase {
  responseFormat: 'text';
}
```

#### JSON Object Response Format

```typescript
interface JSONObject extends ChatOptionsBase {
  responseFormat: 'json_object';
}
```

Returns any valid JSON object. The model will be instructed to return JSON.

#### JSON Schema Response Format

```typescript
interface JSONSchema<T = unknown> extends ChatOptionsBase {
  responseFormat: 'json_schema';
  zodSchema: ZodType<T>;  // Zod schema for validation
}
```

Returns JSON conforming to the provided Zod schema. The schema is converted to JSON Schema and sent to the provider.

### ToolModel

```typescript
interface ToolModel {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: 'string' | 'number' | 'boolean' | 'object' | 'array';
        description?: string;
      }>;
      additionalProperties: boolean;
      required: string[];
    };
    additionalProperties: boolean;
    strict: boolean;
  };
}
```

Defines a tool/function that the model can call.

## Usage Examples

### Basic Text Completion

```typescript
const response = await aiSuite.createChatCompletion(
  'openai/gpt-4o',
  [{ role: 'user', content: 'Hello!' }],
  {
    responseFormat: 'text',
    temperature: 0.7
  }
);

if (response.success) {
  console.log(response.content);
}
```

### JSON Schema Response

```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email()
});

const response = await aiSuite.createChatCompletion(
  'openai/gpt-4o',
  [{ role: 'user', content: 'Generate a sample user profile' }],
  {
    responseFormat: 'json_schema',
    zodSchema: schema
  }
);

if (response.success) {
  console.log(response.content_object);  // Parsed, typed object
}
```

### With Tools

```typescript
const response = await aiSuite.createChatCompletion(
  'openai/gpt-4o',
  [{ role: 'user', content: 'What is the weather in Tokyo?' }],
  {
    responseFormat: 'text',
    tools: [{
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get the current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'City name'
            }
          },
          required: ['location'],
          additionalProperties: false
        },
        additionalProperties: false,
        strict: true
      }
    }]
  }
);

if (response.success && response.tools) {
  console.log('Tool calls:', response.tools);
}
```

### With Retry Logic

```typescript
const response = await aiSuite.createChatCompletion(
  'openai/gpt-4o',
  [{ role: 'user', content: 'Hello!' }],
  {
    responseFormat: 'text',
    retry: {
      attempts: 3,
      delay: (attempt) => Math.pow(2, attempt) * 1000  // 1s, 2s, 4s
    }
  }
);
```

### With Reasoning (OpenAI o1/o3, Grok)

```typescript
const response = await aiSuite.createChatCompletion(
  'openai/o1',
  [{ role: 'user', content: 'Solve this complex math problem...' }],
  {
    responseFormat: 'text',
    reasoning: {
      effort: 'high'
    }
  }
);

if (response.success) {
  console.log('Reasoning tokens:', response.usage?.reasoning_tokens);
}
```

### With Thinking (Gemini 2.5)

```typescript
const response = await aiSuite.createChatCompletion(
  'gemini/gemini-2.5-pro',
  [{ role: 'user', content: 'Analyze this problem deeply...' }],
  {
    responseFormat: 'text',
    thinking: {
      budget: 512,
      output: true
    }
  }
);

if (response.success) {
  console.log('Thoughts tokens:', response.usage?.thoughts_tokens);
}
```
