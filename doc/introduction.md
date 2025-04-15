# Introduction to AI-Suite

AI-Suite provides a unified interface for working with multiple AI providers, allowing developers to interact with different language models through a consistent API.

## Features

- **Unified API**: Consistent interface for OpenAI, Anthropic, Google Gemini, and DeepSeek AI models
- **Simple Message Format**: Use the same message structure across all providers
- **Provider Switching**: Easily switch between different AI providers without changing your code
- **Multi-Provider Comparison**: Send the same prompts to multiple providers and compare results
- **Langfuse Integration**: Built-in support for tracking and monitoring with Langfuse
- **Strong TypeScript Support**: Comprehensive type definitions for better development experience

## Supported Providers

AI-Suite currently supports the following providers:

- **OpenAI**: GPT models (3.5, 4, etc.)
- **Anthropic**: Claude models (Claude 3 Opus, Sonnet, etc.)
- **Google Gemini**: Gemini models
- **DeepSeek**: DeepSeek AI models

## Architecture

AI-Suite provides a clean abstraction layer that handles provider-specific implementations while exposing a consistent interface. The main components include:

- **AISuite Class**: The main interface for interacting with AI providers
- **Provider Implementations**: Provider-specific code for each supported AI service
- **Unified Message Format**: A consistent structure for messages across all providers
- **Type Definitions**: Strong TypeScript typing for all components