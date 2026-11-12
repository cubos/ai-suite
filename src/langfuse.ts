import { type LangfuseGeneration, LangfuseOtelSpanAttributes, startObservation } from "@langfuse/tracing";
import type { LangfuseData } from "./providers/types/optionsBase.js";

const DEFAULT_TRACE_NAME = "create-chat-completion";
const DEFAULT_ENVIRONMENT = "default";
const MAX_IDENTIFIER_LENGTH = 200;
const MAX_ENVIRONMENT_LENGTH = 40;
const VALID_ENVIRONMENT = /^(?!langfuse)[a-z0-9_-]+$/;

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

const noopTrace: GenerationTrace = {
  succeed: () => undefined,
  fail: () => undefined,
};

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

function traceAttributes(name: string, langfuseData: LangfuseData): Record<string, string | string[]> {
  const sessionId = validIdentifier(langfuseData.sessionId);
  const userId = validIdentifier(langfuseData.userId);
  return {
    [LangfuseOtelSpanAttributes.TRACE_NAME]: name,
    [LangfuseOtelSpanAttributes.TRACE_TAGS]: langfuseData.tags ?? [],
    [LangfuseOtelSpanAttributes.ENVIRONMENT]: validEnvironment(langfuseData.environment),
    ...(sessionId ? { [LangfuseOtelSpanAttributes.TRACE_SESSION_ID]: sessionId } : {}),
    ...(userId ? { [LangfuseOtelSpanAttributes.TRACE_USER_ID]: userId } : {}),
  };
}

export function startGenerationTrace(enabled: boolean, params: GenerationTraceStart): GenerationTrace {
  if (!enabled) {
    return noopTrace;
  }

  const { langfuseData, model, input } = params;
  const name = langfuseData.name ?? DEFAULT_TRACE_NAME;

  let generation: LangfuseGeneration;
  try {
    generation = startObservation(name, { model, input }, { asType: "generation" });
    generation.otelSpan.setAttributes(traceAttributes(name, langfuseData));
  } catch {
    return noopTrace;
  }

  return {
    succeed(output, usage) {
      withoutBreakingTheCall(() => {
        generation.update({
          output,
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
        const details = describeError(error);
        generation.update({ level: "ERROR", statusMessage: details.message, output: details });
        generation.end();
      });
    },
  };
}
