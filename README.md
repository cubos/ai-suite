# AI-Suite

All AI providers in one place - a unified TypeScript interface for working with multiple AI models.

## Features

- **Unified API** for multiple AI providers (OpenAI, Anthropic, Google Gemini, DeepSeek, Grok, Custom LLMs)
- **Simple and consistent** message format across all providers
- **Structured Output** with JSON Schema support via Zod
- **Tool/Function Calling** for all compatible providers
- **Reasoning & Thinking Modes** (OpenAI o1/o3, Grok, Gemini 2.5)
- **Built-in Retry Logic** with exponential backoff
- **Hooks System** for request/response interceptors
- **Langfuse Integration** for tracking and monitoring
- **Robust TypeScript** typing with full type safety
- **Custom LLM Support** for any OpenAI-compatible API

## Installation

```bash
npm install @cubos-ai/ai-suite
# or
yarn add @cubos-ai/ai-suite
# or
pnpm add @cubos-ai/ai-suite
```

## Quick Start

```typescript
import { AISuite } from '@cubos-ai/ai-suite';
import dotenv from 'dotenv';

dotenv.config();

// Initialize with API keys
const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  geminiKey: process.env.GEMINI_API_KEY,
  deepseekKey: process.env.DEEPSEEK_API_KEY,
  grokKey: process.env.GROK_API_KEY,
  // Optional: for custom LLM providers
  customURL: process.env.CUSTOM_LLM_URL,
  customLLMKey: process.env.CUSTOM_LLM_KEY
});

// Single provider chat completion
const response = await aiSuite.createChatCompletion(
  'openai/gpt-4o',
  [{ role: 'user', content: 'Hello, world!' }],
  { responseFormat: 'text' }
);

if (response.success) {
  console.log(response.content);
} else {
  console.error('Error:', response.error);
}
```

## Supported Providers

- **OpenAI** - GPT-4o, GPT-4, o1, o3, and more
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus, Haiku
- **Google Gemini** - Gemini 2.5 Pro, 2.5 Flash, 2.0 Flash, 1.5 Pro/Flash
- **DeepSeek** - DeepSeek Chat, DeepSeek Coder
- **Grok** - Grok 3, Grok 3 Mini
- **Custom LLM** - Any OpenAI-compatible API (Ollama, LM Studio, vLLM, etc.)

## Key Features

### Multi-Provider Comparison

Compare responses from multiple providers in parallel:

```typescript
const responses = await aiSuite.createChatCompletionMultiResult(
  ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20241022', 'gemini/gemini-2.5-flash'],
  [{ role: 'user', content: 'Explain quantum computing' }],
  { responseFormat: 'text' }
);

const [openai, claude, gemini] = responses;
```

### Structured Output with Zod

Get type-safe JSON responses:

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email()
});

const response = await aiSuite.createChatCompletion(
  'openai/gpt-4o',
  [{ role: 'user', content: 'Generate a sample user profile' }],
  {
    responseFormat: 'json_schema',
    zodSchema: UserSchema
  }
);

if (response.success) {
  const user = response.content_object; // Fully typed!
}
```

### Tool/Function Calling

```typescript
const response = await aiSuite.createChatCompletion(
  'openai/gpt-4o',
  [{ role: 'user', content: 'What is the weather in Paris?' }],
  {
    responseFormat: 'text',
    tools: [{
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get current weather',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name' }
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
  // Handle tool calls
}
```

### Reasoning & Thinking Modes

**OpenAI o1/o3 and Grok - Reasoning:**
```typescript
const response = await aiSuite.createChatCompletion(
  'openai/o1',
  [{ role: 'user', content: 'Solve this complex problem...' }],
  {
    responseFormat: 'text',
    reasoning: { effort: 'high' }
  }
);
```

**Gemini 2.5 - Thinking:**
```typescript
const response = await aiSuite.createChatCompletion(
  'gemini/gemini-2.5-pro',
  [{ role: 'user', content: 'Analyze this deeply...' }],
  {
    responseFormat: 'text',
    thinking: {
      budget: 1024,
      output: true
    }
  }
);
```

### Retry Logic

Built-in retry with exponential backoff:

```typescript
const response = await aiSuite.createChatCompletion(
  'openai/gpt-4o',
  [{ role: 'user', content: 'Hello!' }],
  {
    responseFormat: 'text',
    retry: {
      attempts: 3,
      delay: (attempt) => Math.pow(2, attempt) * 1000
    }
  }
);
```

### Hooks System

Intercept requests and responses:

```typescript
const aiSuite = new AISuite(
  { openaiKey: process.env.OPENAI_API_KEY },
  {
    hooks: {
      handleRequest: async (req) => {
        console.log('Sending:', req);
      },
      handleResponse: async (req, res, metadata) => {
        console.log('Received:', res);
      },
      failOnError: false
    }
  }
);
```

### Langfuse Integration

Track and monitor AI interactions:

```typescript
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

const aiSuite = new AISuite(
  { openaiKey: process.env.OPENAI_API_KEY },
  { langFuse: langfuse }
);
```

### Custom LLM Support

Use any OpenAI-compatible API:

```typescript
// Ollama
const aiSuite = new AISuite({
  customURL: 'http://localhost:11434/v1',
  customLLMKey: 'not-needed'
});

const response = await aiSuite.createChatCompletion(
  'custom-llm/llama3.2',
  [{ role: 'user', content: 'Hello!' }],
  { responseFormat: 'text' }
);
```

## Documentation

For detailed documentation, see the [/doc](./doc) folder:

- [Introduction](./doc/introduction.md) - Overview and features
- [Getting Started](./doc/getting-started.md) - Installation and basic setup
- [API Reference](./doc/api-reference.md) - Complete API documentation
- [Providers](./doc/providers.md) - Provider-specific details
- [Advanced Usage](./doc/advanced-usage.md) - Advanced features and patterns
- [Examples](./doc/examples.md) - Practical code examples

## Development

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm lint:fix
```

## Error Handling

All responses include a `success` field for easy error handling:

```typescript
const response = await aiSuite.createChatCompletion(
  'openai/gpt-4o',
  [{ role: 'user', content: 'Hello!' }],
  { responseFormat: 'text' }
);

if (response.success) {
  console.log('Content:', response.content);
  console.log('Tokens:', response.usage?.total_tokens);
} else {
  console.error('Error:', response.error);
  console.error('Tag:', response.tag);
  // Possible tags: InvalidAuth, RateLimitExceeded, InvalidRequest, etc.
}
```