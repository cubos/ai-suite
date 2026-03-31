---
layout: doc.njk
title: Examples
description: Practical code examples for common use cases
permalink: /examples/
eleventyNavigation:
  key: Examples
  order: 6
---

# Examples

This document provides practical examples of using AI-Suite in different scenarios.

## Basic Examples

### Simple Q&A

```typescript
import { AISuite } from '@cubos/ai-suite';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY
});

async function main() {
  const response = await aiSuite.createChatCompletion(
    'openai/gpt-4o',
    [{ role: 'user', content: 'What is the capital of France?' }],
    { responseFormat: 'text' }
  );

  if (response.success) {
    console.log(`Answer: ${response.content}`);
    console.log(`Tokens used: ${response.usage?.total_tokens}`);
  } else {
    console.error(`Error: ${response.error}`);
  }
}

main().catch(console.error);
```

### Conversation with Context

```typescript
import { AISuite } from '@cubos/ai-suite';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  anthropicKey: process.env.ANTHROPIC_API_KEY
});

async function main() {
  const messages = [
    { role: 'developer', content: 'You are a helpful travel assistant.' },
    { role: 'user', content: 'I want to visit Japan.' },
    { role: 'assistant', content: 'That sounds exciting! Japan is a beautiful country with rich culture. Do you have specific cities in mind?' },
    { role: 'user', content: 'I\'m interested in Tokyo and Kyoto. What\'s the best time to visit?' }
  ];

  const response = await aiSuite.createChatCompletion(
    'anthropic/claude-3-5-sonnet-20241022',
    messages,
    { responseFormat: 'text' }
  );

  if (response.success) {
    console.log(`Response: ${response.content}`);
  }
}

main().catch(console.error);
```

## Structured Output Examples

### JSON Schema with Zod

```typescript
import { AISuite } from '@cubos/ai-suite';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY
});

// Define schema
const RecipeSchema = z.object({
  name: z.string(),
  description: z.string(),
  ingredients: z.array(z.object({
    name: z.string(),
    amount: z.string()
  })),
  steps: z.array(z.string()),
  prepTime: z.number(),
  servings: z.number()
});

async function generateRecipe() {
  const response = await aiSuite.createChatCompletion(
    'openai/gpt-4o',
    [{ role: 'user', content: 'Generate a simple pasta recipe' }],
    {
      responseFormat: 'json_schema',
      zodSchema: RecipeSchema
    }
  );

  if (response.success) {
    const recipe = response.content_object;
    console.log(`Recipe: ${recipe.name}`);
    console.log(`Description: ${recipe.description}`);
    console.log(`Prep Time: ${recipe.prepTime} minutes`);
    console.log(`Servings: ${recipe.servings}`);
    console.log('\nIngredients:');
    recipe.ingredients.forEach(ing => {
      console.log(`- ${ing.amount} ${ing.name}`);
    });
    console.log('\nSteps:');
    recipe.steps.forEach((step, i) => {
      console.log(`${i + 1}. ${step}`);
    });
  }
}

generateRecipe().catch(console.error);
```

### JSON Object Mode

```typescript
import { AISuite } from '@cubos/ai-suite';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  geminiKey: process.env.GEMINI_API_KEY
});

async function extractData() {
  const response = await aiSuite.createChatCompletion(
    'gemini/gemini-2.5-flash',
    [{
      role: 'user',
      content: 'Extract key information from this text into JSON: "John Doe is a 30 year old software engineer living in San Francisco. He enjoys hiking and photography."'
    }],
    {
      responseFormat: 'json_object'
    }
  );

  if (response.success) {
    console.log('Extracted data:', response.content_object);
  }
}

extractData().catch(console.error);
```

## Advanced Examples

### Provider Comparison

```typescript
import { AISuite } from '@cubos/ai-suite';
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
      'openai/gpt-4o',
      'anthropic/claude-3-5-sonnet-20241022',
      'gemini/gemini-2.5-flash'
    ],
    messages,
    { responseFormat: 'text' }
  );

  // Format the results
  let comparison = `# AI Provider Comparison\n\n`;
  comparison += `**Prompt:** ${prompt}\n\n`;

  const [openaiResponse, anthropicResponse, geminiResponse] = responses;

  if (openaiResponse.success) {
    comparison += `## OpenAI (GPT-4o)\n\n${openaiResponse.content}\n\n`;
    comparison += `*Execution time: ${openaiResponse.execution_time}ms*\n`;
    comparison += `*Tokens: ${openaiResponse.usage?.total_tokens}*\n\n`;
  }

  if (anthropicResponse.success) {
    comparison += `## Anthropic (Claude 3.5 Sonnet)\n\n${anthropicResponse.content}\n\n`;
    comparison += `*Execution time: ${anthropicResponse.execution_time}ms*\n`;
    comparison += `*Tokens: ${anthropicResponse.usage?.total_tokens}*\n\n`;
  }

  if (geminiResponse.success) {
    comparison += `## Google (Gemini 2.5 Flash)\n\n${geminiResponse.content}\n\n`;
    comparison += `*Execution time: ${geminiResponse.execution_time}ms*\n`;
    comparison += `*Tokens: ${geminiResponse.usage?.total_tokens}*\n\n`;
  }

  // Save to file
  fs.writeFileSync('ai-comparison.md', comparison);
  console.log('Comparison saved to ai-comparison.md');
}

compareProviders().catch(console.error);
```

### Function Calling / Tools

```typescript
import { AISuite } from '@cubos/ai-suite';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY
});

// Mock weather function
function getWeather(location: string): string {
  // In real app, call actual weather API
  return `The weather in ${location} is sunny, 22°C`;
}

async function weatherAssistant() {
  const tools = [{
    type: 'function' as const,
    function: {
      name: 'get_weather',
      description: 'Get the current weather for a location',
      parameters: {
        type: 'object' as const,
        properties: {
          location: {
            type: 'string' as const,
            description: 'The city name'
          }
        },
        required: ['location'],
        additionalProperties: false
      },
      additionalProperties: false,
      strict: true
    }
  }];

  const response = await aiSuite.createChatCompletion(
    'openai/gpt-4o',
    [{ role: 'user', content: 'What is the weather in Tokyo?' }],
    {
      responseFormat: 'text',
      tools
    }
  );

  if (response.success && response.tools) {
    // Execute the function
    for (const tool of response.tools) {
      if (tool.name === 'get_weather') {
        const location = tool.content.location as string;
        const weatherData = getWeather(location);
        console.log(weatherData);

        // Continue conversation with function result
        const followUp = await aiSuite.createChatCompletion(
          'openai/gpt-4o',
          [
            { role: 'user', content: 'What is the weather in Tokyo?' },
            { role: 'assistant', content: response.content || '' },
            { role: 'tool', content: weatherData, name: 'get_weather' }
          ],
          { responseFormat: 'text' }
        );

        if (followUp.success) {
          console.log('Assistant:', followUp.content);
        }
      }
    }
  }
}

weatherAssistant().catch(console.error);
```

### Reasoning with OpenAI o1

```typescript
import { AISuite } from '@cubos/ai-suite';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY
});

async function solveComplexProblem() {
  const response = await aiSuite.createChatCompletion(
    'openai/o1',
    [{
      role: 'user',
      content: 'A farmer has 17 sheep. All but 9 die. How many sheep are left?'
    }],
    {
      responseFormat: 'text',
      reasoning: {
        effort: 'high'
      }
    }
  );

  if (response.success) {
    console.log('Answer:', response.content);
    console.log('\nToken usage:');
    console.log('- Input tokens:', response.usage?.input_tokens);
    console.log('- Reasoning tokens:', response.usage?.reasoning_tokens);
    console.log('- Output tokens:', response.usage?.output_tokens);
    console.log('- Total tokens:', response.usage?.total_tokens);
  }
}

solveComplexProblem().catch(console.error);
```

### Thinking Mode with Gemini 2.5

```typescript
import { AISuite } from '@cubos/ai-suite';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  geminiKey: process.env.GEMINI_API_KEY
});

async function deepAnalysis() {
  const response = await aiSuite.createChatCompletion(
    'gemini/gemini-2.5-pro',
    [{
      role: 'user',
      content: 'Analyze the ethical implications of AI in healthcare'
    }],
    {
      responseFormat: 'text',
      thinking: {
        budget: 1024,
        output: true
      }
    }
  );

  if (response.success) {
    console.log('Analysis:', response.content);
    console.log('\nThinking tokens used:', response.usage?.thoughts_tokens);
  }
}

deepAnalysis().catch(console.error);
```

### Using Langfuse for Monitoring

```typescript
import { AISuite } from '@cubos/ai-suite';
import { Langfuse } from 'langfuse';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Langfuse
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
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
      'openai/gpt-4o',
      [{ role: 'user', content: 'Generate a short poem about technology.' }],
      {
        responseFormat: 'text',
        metadata: {
          langFuse: {
            sessionId: 'session-123',
            userId: 'user-456',
            tags: ['poetry', 'creative']
          }
        }
      }
    );

    if (initialResponse.success) {
      console.log('Initial poem:');
      console.log(initialResponse.content);

      // Request a follow-up analysis from another provider
      const followupResponse = await aiSuite.createChatCompletion(
        'anthropic/claude-3-5-sonnet-20241022',
        [
          { role: 'user', content: 'Generate a short poem about technology.' },
          { role: 'assistant', content: initialResponse.content || '' },
          { role: 'user', content: 'Analyze the themes in this poem.' }
        ],
        {
          responseFormat: 'text',
          metadata: {
            langFuse: {
              sessionId: 'session-123',
              userId: 'user-456',
              tags: ['analysis', 'poetry']
            }
          }
        }
      );

      if (followupResponse.success) {
        console.log('\nPoem analysis:');
        console.log(followupResponse.content);
      }
    }

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

### Custom Hooks for Logging

```typescript
import { AISuite } from '@cubos/ai-suite';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const aiSuite = new AISuite(
  {
    openaiKey: process.env.OPENAI_API_KEY
  },
  {
    hooks: {
      handleRequest: async (req) => {
        const logEntry = {
          timestamp: new Date().toISOString(),
          type: 'request',
          data: req
        };
        fs.appendFileSync('ai-logs.jsonl', JSON.stringify(logEntry) + '\n');
      },
      handleResponse: async (req, res, metadata) => {
        const logEntry = {
          timestamp: new Date().toISOString(),
          type: 'response',
          request: req,
          response: res,
          metadata
        };
        fs.appendFileSync('ai-logs.jsonl', JSON.stringify(logEntry) + '\n');
      },
      failOnError: false
    }
  }
);

async function main() {
  const response = await aiSuite.createChatCompletion(
    'openai/gpt-4o',
    [{ role: 'user', content: 'Hello!' }],
    { responseFormat: 'text' }
  );

  if (response.success) {
    console.log(response.content);
  }

  console.log('Logged to ai-logs.jsonl');
}

main().catch(console.error);
```

### Using Custom LLM (Ollama)

```typescript
import { AISuite } from '@cubos/ai-suite';

const aiSuite = new AISuite({
  customURL: 'http://localhost:11434/v1',
  customLLMKey: 'not-needed'
});

async function main() {
  const response = await aiSuite.createChatCompletion(
    'custom-llm/llama3.2',
    [{ role: 'user', content: 'What is TypeScript?' }],
    {
      responseFormat: 'text',
      temperature: 0.7
    }
  );

  if (response.success) {
    console.log(response.content);
  } else {
    console.error('Error:', response.error);
  }
}

main().catch(console.error);
```

### Retry Logic Example

```typescript
import { AISuite } from '@cubos/ai-suite';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY
});

async function robustRequest() {
  const response = await aiSuite.createChatCompletion(
    'openai/gpt-4o',
    [{ role: 'user', content: 'Hello!' }],
    {
      responseFormat: 'text',
      retry: {
        attempts: 3,
        delay: (attempt) => {
          // Custom delay: 1s, 3s, 5s
          return (attempt * 2 + 1) * 1000;
        }
      }
    }
  );

  if (response.success) {
    console.log('Success:', response.content);
  } else {
    console.error('Failed after retries:', response.error);
  }
}

robustRequest().catch(console.error);
```

## Image and File Processing Examples

### Image Analysis

Analyze images using AI vision capabilities:

```typescript
import { AISuite } from '@cubos/ai-suite';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY
});

async function analyzeImage() {
  const img = readFileSync('./photo.jpg');

  const response = await aiSuite.createChatCompletion(
    'openai/gpt-4o',
    [
      {
        role: 'user',
        content: {
          type: 'image',
          image: img  // could also be base64 string
        }
      },
      {
        role: 'user',
        content: 'What do you see in this image? Provide a detailed description.'
      }
    ],
    { responseFormat: 'text' }
  );

  if (response.success) {
    console.log('Image Analysis:', response.content);
  }
}

analyzeImage().catch(console.error);
```

### Image Classification with Structured Output

Classify images with type-safe JSON output:

```typescript
import { AISuite } from '@cubos/ai-suite';
import { readFileSync } from 'fs';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY
});

const ImageClassificationSchema = z.object({
  description: z.string().describe('A detailed description of the image'),
  objects: z.array(z.string()).describe('List of objects detected in the image'),
  scene: z.string().describe('The type of scene (indoor, outdoor, nature, urban, etc.)'),
  colors: z.array(z.string()).describe('Dominant colors in the image'),
  mood: z.string().describe('The mood or atmosphere of the image')
});

async function classifyImage() {
  const img = readFileSync('./photo.jpg');

  const response = await aiSuite.createChatCompletion(
    'openai/gpt-4o',
    [
      {
        role: 'user',
        content: {
          type: 'image',
          image: img
        }
      },
      {
        role: 'user',
        content: 'Analyze and classify this image'
      }
    ],
    {
      responseFormat: 'json_schema',
      zodSchema: ImageClassificationSchema
    }
  );

  if (response.success) {
    const classification = response.content_object;
    console.log('Description:', classification.description);
    console.log('Objects:', classification.objects.join(', '));
    console.log('Scene Type:', classification.scene);
    console.log('Colors:', classification.colors.join(', '));
    console.log('Mood:', classification.mood);
  }
}

classifyImage().catch(console.error);
```

### Compare Multiple Images

Send multiple images in a single request:

```typescript
import { AISuite } from '@cubos/ai-suite';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  anthropicKey: process.env.ANTHROPIC_API_KEY
});

async function compareImages() {
  const image1 = readFileSync('./before.jpg');
  const image2 = readFileSync('./after.jpg');

  const response = await aiSuite.createChatCompletion(
    'anthropic/claude-3-5-sonnet-20241022',
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Compare these two images and describe the differences:'
          },
          {
            type: 'image',
            image: image1
          },
          {
            type: 'image',
            image: image2
          }
        ]
      }
    ],
    { responseFormat: 'text' }
  );

  if (response.success) {
    console.log('Comparison:', response.content);
  }
}

compareImages().catch(console.error);
```

### PDF Document Analysis

Analyze and extract information from PDF documents:

```typescript
import { AISuite } from '@cubos/ai-suite';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  anthropicKey: process.env.ANTHROPIC_API_KEY
});

async function analyzePDF() {
  const pdf = readFileSync('./report.pdf');

  const response = await aiSuite.createChatCompletion(
    'anthropic/claude-3-5-sonnet-20241022',
    [
      {
        role: 'user',
        content: {
          type: 'file',
          mediaType: 'application/pdf',
          file: pdf,
          fileName: 'report.pdf'
        }
      },
      {
        role: 'user',
        content: 'Summarize the key points from this document and extract any important dates or numbers.'
      }
    ],
    { responseFormat: 'text' }
  );

  if (response.success) {
    console.log('PDF Summary:', response.content);
  }
}

analyzePDF().catch(console.error);
```

### Extract Structured Data from PDF

Extract structured information from documents:

```typescript
import { AISuite } from '@cubos/ai-suite';
import { readFileSync } from 'fs';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  anthropicKey: process.env.ANTHROPIC_API_KEY
});

const InvoiceSchema = z.object({
  invoiceNumber: z.string(),
  date: z.string(),
  vendor: z.string(),
  total: z.number(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    price: z.number()
  }))
});

async function extractInvoiceData() {
  const pdf = readFileSync('./invoice.pdf');

  const response = await aiSuite.createChatCompletion(
    'anthropic/claude-3-5-sonnet-20241022',
    [
      {
        role: 'user',
        content: {
          type: 'file',
          mediaType: 'application/pdf',
          file: pdf,
          fileName: 'invoice.pdf'
        }
      },
      {
        role: 'user',
        content: 'Extract the invoice information from this document'
      }
    ],
    {
      responseFormat: 'json_schema',
      zodSchema: InvoiceSchema
    }
  );

  if (response.success) {
    const invoice = response.content_object;
    console.log('Invoice Number:', invoice.invoiceNumber);
    console.log('Date:', invoice.date);
    console.log('Vendor:', invoice.vendor);
    console.log('Total:', `$${invoice.total}`);
    console.log('\nItems:');
    invoice.items.forEach(item => {
      console.log(`- ${item.description}: ${item.quantity} x $${item.price}`);
    });
  }
}

extractInvoiceData().catch(console.error);
```

### Image OCR (Text Extraction)

Extract text from images:

```typescript
import { AISuite } from '@cubos/ai-suite';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  geminiKey: process.env.GEMINI_API_KEY
});

async function extractTextFromImage() {
  const img = readFileSync('./document-scan.jpg');

  const response = await aiSuite.createChatCompletion(
    'gemini/gemini-2.5-flash',
    [
      {
        role: 'user',
        content: {
          type: 'image',
          image: img
        }
      },
      {
        role: 'user',
        content: 'Extract all text from this image, maintaining the original formatting as much as possible.'
      }
    ],
    { responseFormat: 'text' }
  );

  if (response.success) {
    console.log('Extracted Text:');
    console.log(response.content);
  }
}

extractTextFromImage().catch(console.error);
```

### Using Base64 Images

Work with base64-encoded images:

```typescript
import { AISuite } from '@cubos/ai-suite';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const aiSuite = new AISuite({
  openaiKey: process.env.OPENAI_API_KEY
});

async function analyzeBase64Image() {
  // Read image and convert to base64
  const img = readFileSync('./photo.jpg');
  const base64Image = img.toString('base64');

  const response = await aiSuite.createChatCompletion(
    'openai/gpt-4o-mini',
    [
      {
        role: 'user',
        content: {
          type: 'image',
          image: base64Image  // Can also pass Buffer directly instead
        }
      },
      {
        role: 'user',
        content: 'What is the main subject of this image?'
      }
    ],
    { responseFormat: 'text' }
  );

  if (response.success) {
    console.log('Analysis:', response.content);
  }
}

analyzeBase64Image().catch(console.error);
```
