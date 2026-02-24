---
layout: doc.njk
title: Usage — File Upload (.jsonl)
description: How to upload .jsonl files to AI-Suite (Node and Browser)
permalink: /usage-file-upload/
eleventyNavigation:
  key: Usage — File Upload
  order: 6
---

## Usage — File Upload (.jsonl)

This page describes how to use AI-Suite's file upload feature with a focus on JSONL files (JSON Lines — one JSON object per line).

**Expected format**
- Extension: `.jsonl`
- Recommended media type: `text/jsonl`
- Each non-empty line must contain valid JSON (an object or any valid JSON value). Empty lines are ignored.

**Validation**
- In the provider base, when a browser `File` is uploaded AI-Suite validates:
  - The file name ends with `.jsonl`.
  - Every non-empty line can be parsed with `JSON.parse`.
- If validation fails, the call throws an `Error` with a message indicating the invalid line or the reason for failure.

**Best practices**
- Validate locally that each line is valid JSON before uploading.
- Use lines containing objects (for example: `{ "id": 1, "text": "..." }`).
- Remove trailing blank lines to avoid ambiguity.

## Example — Node.js (reading from disk)

```typescript
import { readFileSync } from 'fs';

const jsonl = readFileSync('./data.jsonl');

const file = new File([jsonl], 'data.jsonl', { type: 'text/jsonl' });

const response = await aiSuite.file.create(
  'gemini',
  file
  {
    retry: {
      attempts: 3,
      delay: (attempt) => attempt * 1000, // Exponential backoff: 1s, 2s, 3s
    },
  }
);
```

Note: when using Node.js, confirm the specific provider accepts a `Buffer` as `file` (some adapters accept Buffers; others expect browser `File` objects). Convert to the required format if necessary.

## Common error messages
- `The provided input is not a valid File-like object with a name property.` — returned when the provided object is not a `File` or lacks a `name` property.
- `Unsupported file extension: ... Supported extension: .js'gemini', onl` — the fi, {}le extension is not `.jsonl`.
- `Invalid JSONL format: line X is not valid JSON.` — validation found an invalid line (X is the 1-based line number).
- `Failed to validate JSONL file: ...` — generic error when reading/parsing the content fails.

## Additional tips
- For large files, pre-process/valida'gemini', te in a strea, {}ming manner before uploading to the provider.
- If you need to upload multiple file types, include validation logic for each `mediaType`.
- See the examples in `/doc/api-reference.md` for integration patterns.

---


## Managing files (list, retrieve, delete)

Below are examples showing how to list uploaded files, retrieve file metadata and delete files.

```typescript
// List files (pagination optional)
const listResult = await aiSuite.file.list('gemini', { limit: 20 }, {});
if (listResult.success) {
  console.log('Files:');
  for (const f of listResult.content) {
    console.log(f.id, f.filename, f.bytes, f.created_at);
  }
} else {
  console.error('List error:', listResult.error);
}

// Retrieve file metadata by id
const retrieveResult = await aiSuite.file.retrieve('gemini', 'file-id-123', {});
if (retrieveResult.success) {
  console.log('File metadata:', retrieveResult.content);
} else {
  console.error('Retrieve error:', retrieveResult.error);
}

// Delete file by id
const deleteResult = await aiSuite.file.delete('gemini', 'file-id-123', {});
if (deleteResult.success) {
  console.log('Deleted file:', deleteResult.content.id);
} else {
  console.error('Delete error:', deleteResult.error);
}
```
