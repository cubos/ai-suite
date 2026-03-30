---
layout: doc.njk
title: Usage — Batch
description: How to use AI-Suite's batch API for chat completions and embeddings
permalink: /usage-batch/
eleventyNavigation:
  key: Usage — Batch
  order: 7
---

## Usage — Batch

This page describes how to use AI-Suite's batch feature to submit multiple requests in a single operation.
Batches are processed asynchronously — you create a batch, poll for its status, and retrieve results when complete.

**Supported providers**
| Provider  | `chat/completions` | `embeddings` | `inputFileId` |
|-----------|:-----------------:|:------------:|:-------------:|
| OpenAI    | ✓                 | ✓            | ✓             |
| Gemini    | ✓                 | ✓            | ✓             |
| Anthropic | ✓                 | ✗            | ✗             |

**How it works**
- Pass the `endpoint` as a separate argument — either `"chat/completions"` or `"embeddings"`.
- Pass an inline `batch` array **or** a pre-uploaded `inputFileId` (OpenAI and Gemini only).
- The model used comes from the provider configuration — it is **not** set per request.

---

## Create — chat/completions

```typescript
const result = await aiSuite.batch.create(
  'openai/gpt-4o-mini',
  'chat/completions',
  {
    batch: [
      {
        customId: 'req-1',
        params: {
          mensagens: [{ role: 'user', content: 'What is the capital of France?' }],
        },
      },
      {
        customId: 'req-2',
        params: {
          mensagens: [{ role: 'user', content: 'What is 2 + 2?' }],
        },
      },
    ],
  },
  {
    temperature: 0.7,
    maxOutputTokens: 512,
  },
);

if (result.success) {
  console.log('Batch created:', result.content.id);
  console.log('Status:', result.content.status);
} else {
  console.error('Error:', result.error);
}
```

---

## Create — embeddings

```typescript
const result = await aiSuite.batch.create(
  'openai/text-embedding-3-small',
  'embeddings',
  {
    batch: [
      {
        customId: 'emb-1',
        params: {
          content: 'The quick brown fox jumps over the lazy dog',
        },
      },
      {
        customId: 'emb-2',
        params: {
          content: ['Hello world', 'Another sentence'],
        },
      },
    ],
  },
  {
    dimensions: 512,
    encodingFormat: 'float',
  },
);

if (result.success) {
  console.log('Batch created:', result.content.id);
} else {
  console.error('Error:', result.error);
}
```

> For **Gemini** embeddings, you can also pass `taskType` in the options:
> ```typescript
> { taskType: 'RETRIEVAL_DOCUMENT' }
> ```

---

## Create — using a pre-uploaded file

Instead of an inline `batch` array you can supply the ID of a file already uploaded via `aiSuite.file.create` (OpenAI and Gemini only):

```typescript
const result = await aiSuite.batch.create(
  'gemini/gemini-2.0-flash',
  'chat/completions',
  {
    inputFileId: 'files/abc123',
  },
  {
    temperature: 0.5,
  },
);
```

> **Anthropic** does not support `inputFileId` — always pass an inline `batch` array.

---

## Retrieve — poll until complete

Batches are asynchronous. Poll `retrieve` until `status` is `"completed"` (or `"failed"` / `"cancelled"`).

```typescript
let batch: Batch | null = null;

do {
  const result = await aiSuite.batch.retrieve('openai/gpt-4o-mini', batchId, {});

  if (!result.success) {
    console.error('Retrieve error:', result.error);
    break;
  }

  batch = result.content;
  console.log('Status:', batch.status, '— counts:', batch.requestCounts);

  if (batch.status !== 'completed') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5s
  }
} while (batch.status !== 'completed' && batch.status !== 'failed' && batch.status !== 'cancelled');

// OpenAI / Gemini: use outputFileId
console.log('Output file:', batch?.outputFileId);

// Anthropic: use resultsUrl
console.log('Results URL:', batch?.resultsUrl);
```

---

## List

```typescript
const result = await aiSuite.batch.list('openai/gpt-4o-mini', { limit: 10 });

if (result.success) {
  for (const b of result.content) {
    console.log(b.id, b.endpoint, b.status, b.requestCounts);
  }

  if (result.has_next_page) {
    // pass the last batch id as `after` for the next page
    const next = await aiSuite.batch.list('openai/gpt-4o-mini', {
      limit: 10,
      after: result.content.at(-1)?.id,
    });
  }
} else {
  console.error('List error:', result.error);
}
```

---

## Cancel

```typescript
const result = await aiSuite.batch.cancel('openai/gpt-4o-mini', batchId, {});

if (result.success) {
  console.log('Batch cancelled');
} else {
  console.error('Cancel error:', result.error);
}
```

---

## Batch statuses

| Status       | Description                                      |
|--------------|--------------------------------------------------|
| `validating` | The batch is being validated before processing   |
| `in_progress`| Requests are being processed                     |
| `finalizing` | Processing complete, results being assembled     |
| `completed`  | All requests finished — `outputFileId` / `resultsUrl` available |
| `failed`     | Batch failed — check `errors`                    |
| `cancelled`  | Batch was cancelled                              |
| `cancelling` | Cancellation in progress                         |
| `expired`    | Batch expired before completing                  |
| `paused`     | Batch is paused (Gemini only)                    |
| `updating`   | Batch is being updated                           |

---

## Common error messages

- `"OpenAI requires either a file ID or a batch array."` — neither `inputFileId` nor `batch` was provided.
- `"Anthropic does not use files for batch."` — `inputFileId` was passed for Anthropic.
- `"Necessary to pass the messages."` — `batch` array was not provided for Anthropic.
- `"Anthropic does not have embedding."` — `endpoint` is `"embeddings"` for Anthropic, which is unsupported.
