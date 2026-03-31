# AI-Suite

<p align="center">
  <a href="https://www.npmjs.com/package/@cubos/ai-suite"><img src="https://img.shields.io/npm/v/@cubos/ai-suite?style=flat-square&color=4f46e5" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@cubos/ai-suite"><img src="https://img.shields.io/npm/dm/@cubos/ai-suite?style=flat-square&color=4f46e5" alt="npm downloads" /></a>
  <a href="https://github.com/cubos/ai-suite/actions"><img src="https://img.shields.io/github/actions/workflow/status/cubos/ai-suite/ci.yml?style=flat-square&color=4f46e5" alt="CI" /></a>
  <a href="https://cubos.github.io/ai-suite/"><img src="https://img.shields.io/badge/docs-online-4f46e5?style=flat-square" alt="docs" /></a>
  <a href="https://github.com/cubos/ai-suite/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@cubos/ai-suite?style=flat-square&color=4f46e5" alt="license" /></a>
</p>

<p align="center">
  All AI providers in one place — a unified TypeScript interface for OpenAI, Anthropic, Gemini, DeepSeek, Grok, and any OpenAI-compatible API.
</p>

---

## Features

- **Unified API** — same interface across all providers, swap models with a one-line change
- **Multimodal** — images, PDFs and files supported where available
- **Structured Output** — JSON Schema via Zod, validated and typed
- **Tool / Function Calling** — consistent across all compatible providers
- **Reasoning & Thinking** — reasoning and thinking modes for supported models
- **Batch Processing** — async batch jobs for OpenAI, Anthropic and Gemini
- **File Upload** — upload `.jsonl` files for batch inputs
- **Retry Logic** — built-in exponential backoff
- **Hooks** — intercept every request and response globally
- **Langfuse** — built-in tracing and monitoring integration
- **TypeScript-first** — full type safety with discriminated unions

## Installation

```bash
npm install @cubos/ai-suite
# or
pnpm add @cubos/ai-suite
# or
yarn add @cubos/ai-suite
```

## Quick Start

```typescript
import { AISuite } from '@cubos/ai-suite';

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  geminiKey: process.env.GEMINI_API_KEY,
  deepseekKey: process.env.DEEPSEEK_API_KEY,
  grokKey: process.env.GROK_API_KEY,
});

const response = await aiSuite.createChatCompletion(
  'openai/gpt-4o',
  [{ role: 'user', content: 'Hello, world!' }],
);

if (response.success) {
  console.log(response.content);
}
```

## Supported Providers

| Provider | Chat | Embeddings | Batch | Files |
|----------|:----:|:----------:|:-----:|:-----:|
| **OpenAI** | ✓ | ✓ | ✓ | ✓ |
| **Anthropic** | ✓ | — | ✓ | ✓ |
| **Google Gemini** | ✓ | ✓ | ✓ | ✓ |
| **DeepSeek** | ✓ | ✓ | — | — |
| **Grok** | ✓ | — | — | — |
| **Custom LLM** | ✓ | ✓ | — | — |

## Documentation

Full documentation, guides and API reference at **[cubos.github.io/ai-suite](https://cubos.github.io/ai-suite/)**.

- [Getting Started](https://cubos.github.io/ai-suite/getting-started/)
- [Providers](https://cubos.github.io/ai-suite/providers/)
- [API Reference](https://cubos.github.io/ai-suite/api-reference/)
- [Advanced Usage](https://cubos.github.io/ai-suite/advanced-usage/)
- [Batch](https://cubos.github.io/ai-suite/usage-batch/)
- [File Upload](https://cubos.github.io/ai-suite/usage-file-upload/)

## Contributors

<a href="https://github.com/cubos/ai-suite/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=cubos/ai-suite" alt="contributors" />
</a>
