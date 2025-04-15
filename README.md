# AI-Suite

All AI providers in one place - a unified interface for working with multiple AI models.

## Features

- Unified API for multiple AI providers (OpenAI, Anthropic, Google Gemini, DeepSeek)
- Simple and consistent message format
- Support for Langfuse integration for tracking and monitoring
- Robust TypeScript typing

## Installation

```bash
pnpm install
```

## Usage

```typescript
import { AISuite } from './src/index';

// Initialize with API keys
const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  geminiKey: process.env.GEMINI_API_KEY,
  deepseekKey: process.env.DEEPSEEK_API_KEY,
});

// Single provider chat completion
const response = await aiSuite.createChatCompletion(
  'openai/gpt-4',
  [{ role: 'user', content: 'Hello, world!' }]
);

// Multiple provider chat completion
const responses = await aiSuite.createChatCompletionMultiResult(
  ['openai/gpt-4', 'anthropic/claude-3-opus'],
  [{ role: 'user', content: 'Hello, world!' }]
);
```
## Development

```bash
# Build the project
pnpm build

# Run in development mode
pnpm dev
```

## License

MIT