import type { LangfuseGeneration } from "@langfuse/tracing";
import type { LangfuseData, LangfusePromptReference } from "./providers/types/optionsBase.js";

type TracingModule = typeof import("@langfuse/tracing");

export interface LangfuseOptions {
  maxStringChars?: number;
}

export interface ResolvedLangfuseOptions {
  maxStringChars: number;
}

export interface GenerationTraceStart {
  langfuseData: LangfuseData;
  model: string;
  input: unknown;
}

export interface TraceUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

export interface GenerationTrace {
  succeed(output: unknown, usage?: TraceUsage): void;
  fail(error: unknown): void;
}

export const DEFAULT_MAX_STRING_CHARS = 50_000;

const DEFAULT_TRACE_NAME = "create-chat-completion";
const DEFAULT_ENVIRONMENT = "default";
const MAX_IDENTIFIER_LENGTH = 200;
const MAX_PROMPT_NAME_LENGTH = 500;
const MAX_ENVIRONMENT_LENGTH = 40;
const MAX_DEPTH = 10;
const VALID_ENVIRONMENT = /^(?!langfuse)[a-z0-9_-]+$/;

const noopTrace: GenerationTrace = {
  succeed: () => undefined,
  fail: () => undefined,
};

let tracingModule: Promise<TracingModule | undefined> | undefined;

export function loadTracing(): Promise<TracingModule | undefined> {
  tracingModule ??= import("@langfuse/tracing").catch(() => undefined);
  return tracingModule;
}

export function resolveLangfuseOptions(
  option: boolean | LangfuseOptions | undefined,
): ResolvedLangfuseOptions | undefined {
  if (!option) {
    return undefined;
  }
  const requested = option === true ? undefined : option.maxStringChars;
  const maxStringChars = requested !== undefined && requested > 0 ? requested : DEFAULT_MAX_STRING_CHARS;
  return { maxStringChars };
}

export function capLargeStrings(value: unknown, maxChars: number, depth = 0, ancestors = new Set<object>()): unknown {
  if (typeof value === "string") {
    return value.length > maxChars ? `[omitted: ${value.length} characters]` : value;
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    return `[binary: ${value.byteLength} bytes]`;
  }
  if (value instanceof Error) {
    return { name: value.name, message: capLargeStrings(value.message, maxChars) };
  }
  if (depth >= MAX_DEPTH || ancestors.has(value)) {
    return "[max depth]";
  }
  ancestors.add(value);
  const capped = Array.isArray(value)
    ? value.map(item => capLargeStrings(item, maxChars, depth + 1, ancestors))
    : Object.fromEntries(
        Object.keys(value).map(key => [
          key,
          capLargeStrings((value as Record<string, unknown>)[key], maxChars, depth + 1, ancestors),
        ]),
      );
  ancestors.delete(value);
  return capped;
}

function describeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }
  return { name: "Error", message: String(error) };
}

function withoutBreakingTheCall(action: () => void): void {
  try {
    action();
  } catch {
    return;
  }
}

function validIdentifier(value: string | undefined): string | undefined {
  return value && value.length <= MAX_IDENTIFIER_LENGTH ? value : undefined;
}

function validEnvironment(value: string | undefined): string {
  if (value && value.length <= MAX_ENVIRONMENT_LENGTH && VALID_ENVIRONMENT.test(value)) {
    return value;
  }
  return DEFAULT_ENVIRONMENT;
}

function validPrompt(prompt: LangfuseData["prompt"]): Required<LangfusePromptReference> | undefined {
  if (!prompt || typeof prompt.name !== "string" || prompt.name.length === 0) {
    return undefined;
  }
  if (prompt.name.length > MAX_PROMPT_NAME_LENGTH || !Number.isInteger(prompt.version) || prompt.version < 1) {
    return undefined;
  }
  return { name: prompt.name, version: prompt.version, isFallback: prompt.isFallback === true };
}

function traceAttributes(
  tracing: TracingModule,
  name: string,
  langfuseData: LangfuseData,
): Record<string, string | string[]> {
  const attributes = tracing.LangfuseOtelSpanAttributes;
  const sessionId = validIdentifier(langfuseData.sessionId);
  const userId = validIdentifier(langfuseData.userId);
  return {
    [attributes.TRACE_NAME]: name,
    [attributes.TRACE_TAGS]: langfuseData.tags ?? [],
    [attributes.ENVIRONMENT]: validEnvironment(langfuseData.environment),
    ...(sessionId ? { [attributes.TRACE_SESSION_ID]: sessionId } : {}),
    ...(userId ? { [attributes.TRACE_USER_ID]: userId } : {}),
  };
}

export async function startGenerationTrace(
  options: ResolvedLangfuseOptions | undefined,
  params: GenerationTraceStart,
): Promise<GenerationTrace> {
  if (!options) {
    return noopTrace;
  }

  const tracing = await loadTracing();
  if (!tracing) {
    return noopTrace;
  }

  const { langfuseData, model, input } = params;
  const { maxStringChars } = options;
  const name = langfuseData.name ?? DEFAULT_TRACE_NAME;

  let generation: LangfuseGeneration;
  try {
    const prompt = validPrompt(langfuseData.prompt);
    generation = tracing.startObservation(
      name,
      { model, input: capLargeStrings(input, maxStringChars), prompt },
      { asType: "generation" },
    );
    generation.otelSpan.setAttributes(traceAttributes(tracing, name, langfuseData));
  } catch {
    return noopTrace;
  }

  return {
    succeed(output, usage) {
      withoutBreakingTheCall(() => {
        generation.update({
          output: capLargeStrings(output, maxStringChars),
          usageDetails: {
            input: usage?.input_tokens ?? 0,
            output: usage?.output_tokens ?? 0,
            total: usage?.total_tokens ?? 0,
          },
        });
        generation.end();
      });
    },
    fail(error) {
      withoutBreakingTheCall(() => {
        const details = capLargeStrings(describeError(error), maxStringChars) as { name: string; message: string };
        generation.update({ level: "ERROR", statusMessage: details.message, output: details });
        generation.end();
      });
    },
  };
}
