# Getting Started with AI-Suite

This guide will help you get started with AI-Suite quickly.

## Installation

Install AI-Suite using your preferred package manager:

```bash
# Using npm
npm install ai-suite

# Using yarn
yarn add ai-suite

# Using pnpm
pnpm add ai-suite
```

## Basic Setup

To use AI-Suite, you'll need API keys for the providers you want to use. Set up your environment variables:

```bash
# .env file
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key
DEEPSEEK_API_KEY=your_deepseek_key
```

Then, initialize the AISuite instance:

```typescript
import { AISuite } from 'ai-suite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize AISuite with your API keys
const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  geminiKey: process.env.GEMINI_API_KEY,
  deepseekKey: process.env.DEEPSEEK_API_KEY
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

console.log(response.message.content);
```

### Multi-Provider Chat Completion

Send the same message to multiple providers and compare results:

```typescript
const responses = await aiSuite.createChatCompletionMultiResult(
  ['openai/gpt-4', 'anthropic/claude-3-opus'],
  [{ role: 'user', content: 'Hello, world!' }]
);

// Access individual responses
const openaiResponse = responses[0]['openai/gpt-4'];
const anthropicResponse = responses[1]['anthropic/claude-3-opus'];

console.log('OpenAI response:', openaiResponse.message.content);
console.log('Anthropic response:', anthropicResponse.message.content);
```

## Langfuse Integration

To track and monitor your AI interactions, you can integrate with Langfuse:

```typescript
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  projectId: process.env.LANGFUSE_PROJECT_ID,
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