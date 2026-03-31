---
layout: home.njk
title: AI-Suite Documentation
description: Unified TypeScript interface for multiple AI providers
permalink: /
eleventyNavigation:
  key: Home
  order: 1
---

# AI-Suite Documentation

All AI providers in one place - a unified TypeScript interface for working with multiple AI models.

## Overview

AI-Suite provides a consistent, type-safe interface for interacting with multiple AI providers including OpenAI, Anthropic, Google Gemini, DeepSeek, Grok, and any OpenAI-compatible custom LLM.

### Key Features

- **Unified API** - Same interface for all providers
- **Structured Output** - JSON Schema support via Zod
- **Function Calling** - Tools support across providers
- **Advanced Reasoning** - Support for o1/o3, Grok, and Gemini thinking modes
- **Retry Logic** - Built-in exponential backoff
- **Hooks System** - Intercept requests and responses
- **Langfuse Integration** - Built-in tracking and monitoring
- **TypeScript First** - Full type safety and IntelliSense
- **Custom LLMs** - Support for any OpenAI-compatible API

## Quick Start

Install the package:

```bash
npm install @cubos/ai-suite
```

Basic usage:

```typescript
import { AISuite } from '@cubos/ai-suite';

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY
});

const response = await aiSuite.createChatCompletion(
  'openai/gpt-4o',
  [{ role: 'user', content: 'Hello!' }],
  { responseFormat: 'text' }
);

if (response.success) {
  console.log(response.content);
}
```

## Supported Providers

| Provider | Models | Special Features |
|----------|--------|------------------|
| **OpenAI** | GPT-4o, GPT-4, o1, o3 | Reasoning modes, function calling |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus/Haiku | Extended context, vision |
| **Google Gemini** | 2.5 Pro/Flash, 2.0 Flash, 1.5 Pro/Flash | Thinking budget, multimodal |
| **DeepSeek** | Chat, Coder | Code-specialized models |
| **Grok** | Grok 3, Grok 3 Mini | Reasoning modes |
| **Custom LLM** | Any model | OpenAI-compatible APIs |

## Documentation

<div class="doc-grid">

### [Getting Started](/getting-started/)
Installation, setup, and basic usage examples.

### [Providers](/providers/)
Detailed information about each supported provider.

### [API Reference](/api-reference/)
Complete API documentation with all types and methods.

### [Advanced Usage](/advanced-usage/)
Advanced features like structured output, tools, retry logic, and hooks.

### [Examples](/examples/)
Practical code examples for common use cases.

</div>

## Example: Structured Output with Zod

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email()
});

const response = await aiSuite.createChatCompletion(
  'openai/gpt-4o',
  [{ role: 'user', content: 'Generate a sample user' }],
  {
    responseFormat: 'json_schema',
    zodSchema: UserSchema
  }
);

if (response.success) {
  const user = response.content_object; // Fully typed!
}
```

## Example: Multi-Provider Comparison

```typescript
const responses = await aiSuite.createChatCompletionMultiResult(
  ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20241022', 'gemini/gemini-2.5-flash'],
  [{ role: 'user', content: 'Explain quantum computing' }],
  { responseFormat: 'text' }
);

const [openai, claude, gemini] = responses;
// Compare responses and execution times
```