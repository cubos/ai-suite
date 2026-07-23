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

Pass `stream: true` in the options to receive an `AsyncGenerator<StreamResult>` instead of a `Promise<SuccessChatCompletion>`. A `StreamResult` is either a `StreamChunk` (a data chunk or the final success chunk) or a `StreamErrorChunk` (the final chunk when the stream fails).

```typescript
import { AISuite } from '@cubos/ai-suite';
import type { StreamResult } from '@cubos/ai-suite';

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
  } else if (chunk.success === false) {
    console.error('\n--- stream failed ---');
    console.error(chunk.tag, chunk.error); // e.g. "InvalidAuth" "Unauthorized"
  } else {
    console.log('\n--- done ---');
    console.log('Total tokens:', chunk.usage?.total_tokens);
    console.log('Execution time:', chunk.execution_time + 'ms');
  }
}
```

---

## StreamResult Structure

Each iteration of the generator yields a `StreamResult`, which is the union `StreamChunk | StreamErrorChunk`:

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
  success?: true;                           // Present (true) only on the final success chunk
}

interface StreamErrorChunk {
  success: false;                           // Discriminates the error chunk
  done: true;                               // The error chunk is always the final chunk
  object: 'chat.completion';
  id: string;
  created: number;                          // Unix timestamp (seconds)
  model: string;
  delta: '';
  content: string;                          // Content accumulated before the failure (may be '')
  error: string;                            // Error message
  tag: 'InvalidAuth' | 'InvalidRequest' | 'InvalidModel' | 'RateLimitExceeded' | 'ServerError' | 'ServerOverloaded' | 'Unknown';
  raw: Error;                               // The raw error from the API
  execution_time: number;                   // Milliseconds
  metadata?: Record<string, unknown>;
}

type StreamResult = StreamChunk | StreamErrorChunk;
```

Key rules:
- **Intermediate chunks** (`done: false`): have a non-empty `delta` and a growing `content`.
- **Final success chunk** (`done: true`, `success: true`): empty `delta`, the complete `content`, and populated `usage` and `execution_time`.
- **Final error chunk** (`done: true`, `success: false`): a `StreamErrorChunk` carrying `tag`, `error`, and `raw`. See [Errors are data, not exceptions](#errors-in-streaming-are-data-not-exceptions).

---

## Collecting All Chunks

A common pattern is to collect all chunks into an array and process them after the stream ends:

```typescript
import type { StreamResult } from '@cubos/ai-suite';

const chunks: StreamResult[] = [];

const stream = await aiSuite.createChatCompletion(
  'openai/gpt-4o-mini',
  [{ role: 'user', content: 'Hello!' }],
  { stream: true, responseFormat: 'text' }
);

for await (const chunk of stream) {
  chunks.push(chunk);
}

const final = chunks.find(c => c.done)!;
if (final.success === false) {
  console.error('Stream failed:', final.tag, final.error);
} else {
  console.log('Full response:', final.content);
  console.log('Usage:', final.usage);
}
```

---

## Errors in streaming are data, not exceptions

Just like the non-streaming API, a failed stream never throws. Instead, the generator's **final chunk** is a `StreamErrorChunk` with `success: false`, mirroring the `{ success: false, tag, error, raw }` shape returned by non-streaming calls. This holds for any failure — authentication, rate limiting, network errors, or a `handleRequest`/`handleResponse` hook that throws with `failOnError: true`.

You therefore never need a `try`/`catch` around the loop:

```typescript
const stream = await aiSuite.createChatCompletion(
  'openai/gpt-4o-mini',
  [{ role: 'user', content: 'Hello!' }],
  { stream: true, responseFormat: 'text' }
);

for await (const chunk of stream) {
  if (!chunk.done) {
    process.stdout.write(chunk.delta);
    continue;
  }
  if (chunk.success === false) {
    // Final error chunk. `chunk.content` holds whatever text arrived before the failure.
    console.error(`[${chunk.tag}] ${chunk.error}`);
    console.error(chunk.raw); // the raw Error from the provider
  } else {
    // Final success chunk.
    console.log('Done. Tokens:', chunk.usage?.total_tokens);
  }
}
```

> **Note:** streams are also traced in Langfuse (when a `langFuse` instance is configured), exactly like the non-streaming path — a trace and generation are created, usage and output are recorded on completion, and failures are reported to the generation. No configuration change is needed.

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
  if (chunk.done && chunk.success !== false) {
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
