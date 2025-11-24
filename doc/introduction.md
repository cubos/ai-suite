---
layout: doc.njk
title: Introduction
description: Introduction to AI-Suite and its features
permalink: /introduction/
eleventyNavigation:
  key: Introduction
  order: 1
---

# Introduction to AI-Suite

AI-Suite provides a unified interface for working with multiple AI providers, allowing developers to interact with different language models through a consistent API.

## Features

- **Unified API**: Consistent interface for OpenAI, Anthropic, Google Gemini, DeepSeek, Grok, and custom LLMs
- **Simple Message Format**: Use the same message structure across all providers
- **Provider Switching**: Easily switch between different AI providers without changing your code
- **Multi-Provider Comparison**: Send the same prompts to multiple providers and compare results
- **Langfuse Integration**: Built-in support for tracking and monitoring with Langfuse
- **Strong TypeScript Support**: Comprehensive type definitions for better development experience
- **Tool/Function Calling**: Support for tools across all compatible providers
- **Structured Output**: JSON Schema, JSON Object, and Text response formats
- **Retry Logic**: Built-in retry mechanism with exponential backoff
- **Hooks System**: Request and response hooks for custom processing
- **Reasoning & Thinking Modes**: Support for extended reasoning (OpenAI o1/o3, Grok) and thinking budget (Gemini)
- **Token Management**: Control over max output tokens for cost optimization

## Supported Providers

AI-Suite currently supports the following providers:

- **OpenAI**: GPT models (3.5, 4, 4o, o1, o3, etc.)
- **Anthropic**: Claude models (Claude 3.5 Sonnet, Claude 3 Opus, Haiku, etc.)
- **Google Gemini**: Gemini models (2.5 Pro, 2.0 Flash, 1.5 Pro/Flash, etc.)
- **DeepSeek**: DeepSeek AI models
- **Grok**: Grok models (Grok 3, Grok 3 Mini, etc.)
- **Custom LLM**: Support for any OpenAI-compatible API endpoint

## Architecture

AI-Suite provides a clean abstraction layer that handles provider-specific implementations while exposing a consistent interface. The main components include:

- **AISuite Class**: The main interface for interacting with AI providers
- **Provider Implementations**: Provider-specific code for each supported AI service
- **Unified Message Format**: A consistent structure for messages across all providers
- **Type Definitions**: Strong TypeScript typing for all components