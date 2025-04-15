# Advanced Usage

This document covers advanced usage patterns for AI-Suite.

## Configuration Options

### Temperature Control

Control the randomness of responses by adjusting the temperature:

```typescript
const response = await aiSuite.createChatCompletion(
  'openai/gpt-4',
  [{ role: 'user', content: 'Hello, world!' }],
  { temperature: 0.2 } // Lower temperature for more deterministic responses
);
```

### Token Limits

Limit the maximum number of tokens in the response:

```typescript
const response = await aiSuite.createChatCompletion(
  'anthropic/claude-3-sonnet',
  [{ role: 'user', content: 'Write a short story.' }],
  { max_tokens: 500 } // Limit response to 500 tokens
);
```

## Langfuse Integration

AI-Suite provides built-in integration with Langfuse for tracking and monitoring AI interactions.

### Setup

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

### Tracking Details

When Langfuse is integrated, AI-Suite automatically tracks:

- Model used for each request
- Input messages
- Output responses
- Execution time
- Success/failure status

## Comparing Multiple Providers

AI-Suite makes it easy to compare responses from different providers:

```typescript
const responses = await aiSuite.createChatCompletionMultiResult(
  [
    'openai/gpt-4',
    'anthropic/claude-3-opus',
    'gemini/gemini-pro'
  ],
  [{ role: 'user', content: 'Explain quantum computing in simple terms.' }]
);

// Extract and compare responses
const openaiResponse = responses[0]['openai/gpt-4'];
const claudeResponse = responses[1]['anthropic/claude-3-opus'];
const geminiResponse = responses[2]['gemini/gemini-pro'];

console.log('OpenAI:', openaiResponse.message.content);
console.log('Claude:', claudeResponse.message.content);
console.log('Gemini:', geminiResponse.message.content);

// Compare execution times
console.log('OpenAI time:', openaiResponse.execution_time + 'ms');
console.log('Claude time:', claudeResponse.execution_time + 'ms');
console.log('Gemini time:', geminiResponse.execution_time + 'ms');
```

## Provider-Specific Features

Each provider may have specific features or parameters. You can access these through the options parameter:

```typescript
// OpenAI-specific options
const openaiResponse = await aiSuite.createChatCompletion(
  'openai/gpt-4',
  [{ role: 'user', content: 'Hello!' }],
  {
    temperature: 0.7,
    top_p: 1,
    presence_penalty: 0.6,
    frequency_penalty: 0.5
  }
);

// Anthropic-specific options
const anthropicResponse = await aiSuite.createChatCompletion(
  'anthropic/claude-3-opus',
  [{ role: 'user', content: 'Hello!' }],
  {
    temperature: 0.7,
    top_k: 50
  }
);
```

## Error Handling

AI-Suite provides a consistent error handling approach across all providers:

```typescript
try {
  const response = await aiSuite.createChatCompletion(
    'openai/gpt-4',
    [{ role: 'user', content: 'Hello, world!' }]
  );
  console.log(response.message.content);
} catch (error) {
  console.error('Error type:', error.name);
  console.error('Error message:', error.message);
  console.error('Provider:', error.provider);
  console.error('Status code:', error.statusCode);
}
```