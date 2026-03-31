---
layout: doc.njk
title: Getting Started
description: Quick start guide for AI-Suite
permalink: /getting-started/
eleventyNavigation:
  key: Getting Started
  order: 2
---

# Getting Started with AI-Suite

This guide will help you get started with AI-Suite quickly.

## Installation

Install AI-Suite using your preferred package manager:

```bash
# Using npm
npm install @cubos/ai-suite

# Using yarn
yarn add @cubos/ai-suite

# Using pnpm
pnpm add @cubos/ai-suite
```

## Basic Setup

To use AI-Suite, you'll need API keys for the providers you want to use. Set up your environment variables:

```bash
# .env file
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key
DEEPSEEK_API_KEY=your_deepseek_key
GROK_API_KEY=your_grok_key
# For custom LLM providers (OpenAI-compatible APIs)
CUSTOM_LLM_URL=https://your-custom-endpoint.com/v1
CUSTOM_LLM_KEY=your_custom_key  # Optional, some endpoints don't require auth
```

Then, initialize the AISuite instance:

```typescript
import { AISuite } from '@cubos/ai-suite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize AISuite with your API keys
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
```

## Basic Usage

### Single Provider Chat Completion

Send a message to a single AI provider:

```typescript
const response = await aiSuite.createChatCompletion(
  'openai/gpt-4',
  [{ role: 'user', content: 'Hello, world!' }]
);

if (response.success) {
  console.log(response.content);
} else {
  console.error('Error:', response.error);
}
```

### Multi-Provider Chat Completion

Send the same message to multiple providers and compare results:

```typescript
const responses = await aiSuite.createChatCompletionMultiResult(
  ['openai/gpt-4', 'anthropic/claude-3-5-sonnet-20241022'],
  [{ role: 'user', content: 'Hello, world!' }]
);

// Responses is an array, one result per provider
const [openaiResponse, anthropicResponse] = responses;

if (openaiResponse.success) {
  console.log('OpenAI response:', openaiResponse.content);
}

if (anthropicResponse.success) {
  console.log('Anthropic response:', anthropicResponse.content);
}
```

## Langfuse Integration

To track and monitor your AI interactions, you can integrate with Langfuse:

```typescript
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
});

const aiSuite = new AISuite(
  {
    openaiKey: process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY
  },
  {
    langFuse: langfuse
  }
);
```

With this setup, all your interactions will be automatically tracked in your Langfuse dashboard.

## Hooks (Optional)

You can add custom hooks to intercept requests and responses:

```typescript
const aiSuite = new AISuite(
  {
    openaiKey: process.env.OPENAI_API_KEY,
  },
  {
    hooks: {
      handleRequest: async (req) => {
        console.log('Request:', req);
      },
      handleResponse: async (req, res, metadata) => {
        console.log('Response:', res);
        console.log('Metadata:', metadata);
      },
      failOnError: true  // Set to false to continue on hook errors
    }
  }
);
```

## Next Steps

- Learn about [all supported providers](/providers/)
- Explore the [API Reference](/api-reference/)
- Check out [advanced usage patterns](/advanced-usage/)
- See [practical examples](/examples/)
