# Examples

This document provides practical examples of using AI-Suite in different scenarios.

## Basic Examples

### Simple Q&A

```typescript
import { AISuite } from 'ai-suite';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY
});

async function main() {
  const response = await aiSuite.createChatCompletion(
    'openai/gpt-4',
    [{ role: 'user', content: 'What is the capital of France?' }]
  );

  console.log(`Answer: ${response.message.content}`);
}

main().catch(console.error);
```

### Conversation with Context

```typescript
import { AISuite } from 'ai-suite';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  anthropicKey: process.env.ANTHROPIC_API_KEY
});

async function main() {
  const messages = [
    { role: 'system', content: 'You are a helpful travel assistant.' },
    { role: 'user', content: 'I want to visit Japan.' },
    { role: 'assistant', content: 'That sounds exciting! Japan is a beautiful country with rich culture. Do you have specific cities in mind?' },
    { role: 'user', content: 'I\'m interested in Tokyo and Kyoto. What\'s the best time to visit?' }
  ];

  const response = await aiSuite.createChatCompletion(
    'anthropic/claude-3-opus',
    messages
  );

  console.log(`Response: ${response.message.content}`);
}

main().catch(console.error);
```

## Advanced Examples

### Provider Comparison

```typescript
import { AISuite } from 'ai-suite';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  geminiKey: process.env.GEMINI_API_KEY
});

async function compareProviders() {
  const prompt = 'Explain the concept of recursion in programming to a beginner.';
  const messages = [{ role: 'user', content: prompt }];

  const responses = await aiSuite.createChatCompletionMultiResult(
    [
      'openai/gpt-4',
      'anthropic/claude-3-sonnet',
      'gemini/gemini-pro'
    ],
    messages
  );

  // Format the results
  let comparison = `# AI Provider Comparison\n\n`;
  comparison += `**Prompt:** ${prompt}\n\n`;

  // OpenAI response
  const openaiResponse = responses[0]['openai/gpt-4'];
  comparison += `## OpenAI (GPT-4)\n\n${openaiResponse.message.content}\n\n`;
  comparison += `*Execution time: ${openaiResponse.execution_time}ms*\n\n`;

  // Anthropic response
  const anthropicResponse = responses[1]['anthropic/claude-3-sonnet'];
  comparison += `## Anthropic (Claude 3 Sonnet)\n\n${anthropicResponse.message.content}\n\n`;
  comparison += `*Execution time: ${anthropicResponse.execution_time}ms*\n\n`;

  // Gemini response
  const geminiResponse = responses[2]['gemini/gemini-pro'];
  comparison += `## Google (Gemini Pro)\n\n${geminiResponse.message.content}\n\n`;
  comparison += `*Execution time: ${geminiResponse.execution_time}ms*\n\n`;

  // Save to file
  fs.writeFileSync('ai-comparison.md', comparison);
  console.log('Comparison saved to ai-comparison.md');
}

compareProviders().catch(console.error);
```

### Task-Specific Example: Code Explanation

```typescript
import { AISuite } from 'ai-suite';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY
});

async function explainCode() {
  // Read a code file
  const code = fs.readFileSync('path/to/your/code.js', 'utf8');

  const response = await aiSuite.createChatCompletion(
    'openai/gpt-4',
    [
      {
        role: 'system',
        content: 'You are a helpful programming assistant. Explain code in detail but in a way that is easy to understand.'
      },
      {
        role: 'user',
        content: `Please explain the following code:\n\n${code}`
      }
    ],
    { temperature: 0.2 }
  );

  console.log('Code Explanation:');
  console.log(response.message.content);
}

explainCode().catch(console.error);
```

### Using Langfuse for Monitoring

```typescript
import { AISuite } from 'ai-suite';
import { Langfuse } from 'langfuse';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Langfuse
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  projectId: process.env.LANGFUSE_PROJECT_ID,
});

// Initialize AI-Suite with Langfuse
const aiSuite = new AISuite(
  {
    openaiKey: process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY
  },
  {
    langFuse: langfuse
  }
);

async function runAIWorkflow() {
  try {
    // Create an initial response
    const initialResponse = await aiSuite.createChatCompletion(
      'openai/gpt-4',
      [{ role: 'user', content: 'Generate a short poem about technology.' }]
    );

    console.log('Initial poem:');
    console.log(initialResponse.message.content);

    // Request a follow-up analysis from another provider
    const followupResponse = await aiSuite.createChatCompletion(
      'anthropic/claude-3-sonnet',
      [
        { role: 'user', content: 'Generate a short poem about technology.' },
        { role: 'assistant', content: initialResponse.message.content },
        { role: 'user', content: 'Analyze the themes in this poem.' }
      ]
    );

    console.log('\nPoem analysis:');
    console.log(followupResponse.message.content);

    // All interactions are automatically tracked in Langfuse

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Wait for Langfuse to finish sending data
    await langfuse.flush();
  }
}

runAIWorkflow().catch(console.error);
```