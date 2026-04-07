---
layout: doc.njk
title: Usage — Stream
description: How to use AI-Suite's streaming API for real-time chat completions
permalink: /usage-stream/
eleventyNavigation:
  key: Usage — Stream
  order: 8
---

## Usage — Stream

This page describes how to use AI-Suite's streaming feature to receive chat completion responses incrementally as they are generated.

**Supported providers**

| Provider   | Streaming |
|----------- |:---------:|
| OpenAI     | ✓         |
| Anthropic  | ✓         |
| Gemini     | ✓         |
| DeepSeek   | ✓         |
| Grok       | ✓         |
| Custom LLM | ✓        |

---

## Basic Usage

Pass `stream: true` in the options to receive an `AsyncGenerator<StreamChunk>` instead of a `Promise<SuccessChatCompletion>`.

```typescript
import { AISuite } from '@cubos/ai-suite';
import type { StreamChunk } from '@cubos/ai-suite';

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY,
});

const stream = await aiSuite.createChatCompletion(
  'openai/gpt-4o-mini',
  [{ role: 'user', content: 'Tell me a short story.' }],
  { stream: true, responseFormat: 'text' }
);

for await (const chunk of stream) {
  if (!chunk.done) {
    process.stdout.write(chunk.delta); // print each new piece of text
  } else {
    console.log('\n--- done ---');
    console.log('Total tokens:', chunk.usage?.total_tokens);
    console.log('Execution time:', chunk.execution_time + 'ms');
  }
}
```

---

## StreamChunk Structure

Each iteration of the generator yields a `StreamChunk` object:

```typescript
interface StreamChunk {
  id: string;                               // Completion identifier
  created: number;                          // Unix timestamp (seconds)
  object: 'chat.completion';
  model: string;                            // Model used
  delta: string;                            // New text in this chunk (empty on final chunk)
  content: string;                          // Full accumulated text so far
  content_object?: Record<string, unknown>; // Parsed JSON — only on the final chunk when using json_object or json_schema
  done: boolean;                            // true only on the last chunk
  usage?: {                                 // Only populated on the final chunk
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cached_tokens: number;
    reasoning_tokens: number;
    thoughts_tokens: number;
  };
  execution_time?: number;                  // Milliseconds — only on the final chunk
  metadata?: Record<string, unknown>;       // Passed through from options
}
```

Key rules:
- **Intermediate chunks** (`done: false`): have a non-empty `delta` and a growing `content`.
- **Final chunk** (`done: true`): has an empty `delta`, the complete `content`, and populated `usage` and `execution_time`.

---

## Collecting All Chunks

A common pattern is to collect all chunks into an array and process them after the stream ends:

```typescript
const chunks: StreamChunk[] = [];

const stream = await aiSuite.createChatCompletion(
  'openai/gpt-4o-mini',
  [{ role: 'user', content: 'Hello!' }],
  { stream: true, responseFormat: 'text' }
);

for await (const chunk of stream) {
  chunks.push(chunk);
}

const final = chunks.find(c => c.done)!;
console.log('Full response:', final.content);
console.log('Usage:', final.usage);
```

---

## JSON Responses with Streaming

You can use `responseFormat: 'json_object'` with streaming. The `content_object` field on the **final chunk** will contain the parsed JSON:

```typescript
const stream = await aiSuite.createChatCompletion(
  'openai/gpt-4o-mini',
  [{ role: 'user', content: 'Return a JSON object with a "status" field set to "ok".' }],
  { stream: true, responseFormat: 'json_object' }
);

for await (const chunk of stream) {
  if (chunk.done) {
    console.log('Parsed JSON:', chunk.content_object); // { status: 'ok' }
  }
}
```

---

## Streaming with Hooks

Hooks work exactly the same as in non-streaming mode. `handleRequest` is called before the stream starts and `handleResponse` is called after the stream ends:

```typescript
const aiSuite = new AISuite(
  { openaiKey: process.env.OPENAI_API_KEY },
  {
    hooks: {
      handleRequest: async (req) => {
        console.log('Stream request sent:', req);
      },
      handleResponse: async (req, res, metadata) => {
        console.log('Stream finished. Final message:', res);
      },
    },
  }
);

const stream = await aiSuite.createChatCompletion(
  'openai/gpt-4o-mini',
  [{ role: 'user', content: 'Hello!' }],
  { stream: true, responseFormat: 'text' }
);

for await (const chunk of stream) {
  // consume stream
}
// handleResponse is called after the loop completes
```

---

## Streaming with Metadata

Pass `metadata` in options and it will be present on every yielded chunk:

```typescript
const stream = await aiSuite.createChatCompletion(
  'openai/gpt-4o-mini',
  [{ role: 'user', content: 'Hello!' }],
  {
    stream: true,
    responseFormat: 'text',
    metadata: { requestId: 'abc-123', userId: 'user-456' }
  }
);

for await (const chunk of stream) {
  console.log(chunk.metadata); // { requestId: 'abc-123', userId: 'user-456' }
}
```
