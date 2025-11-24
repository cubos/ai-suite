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

Read the full documentation at [https://ai-suite-a94dd0.pages.cubos.io](https://ai-suite-a94dd0.pages.cubos.io)