import { promisify } from "util";
import type {
  EmbeddingOptions,
  EmbeddingRequest,
  HandleErrorResponse,
  InputContent,
  MessageModel,
  RetryOptions,
  SuccessChatCompletion,
  SuccessEmbedding,
} from "../types/index.js";
import { AISuiteError } from "../utils.js";
import type { ChatOptions } from "./types/index.js";

const sleep = promisify(setTimeout);

export abstract class ProviderBase {
  /**
   * Abstract method that must be implemented by each provider
   */
  protected abstract _createChatCompletion(
    messages: MessageModel[],
    options: ChatOptions,
  ): Promise<SuccessChatCompletion>;

  /**
   * Abstract method that must be implemented by each provider
   */
  protected abstract _createEmbedding(
    embedding: EmbeddingRequest,
    metadata?: Record<string, unknown>,
  ): Promise<SuccessEmbedding>;

  /**
   * Abstract method that must be implemented by each provider
   */
  abstract handleError(error: Error): Pick<HandleErrorResponse, "error" | "raw" | "tag">;

  /**
   * Abstract method that must be implemented by each provider
   */
  abstract parseInputContent<T>(content: InputContent): T;

  private async retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
    const attempts = options?.attempts || 1;
    const delay = options?.delay || (attempt => 2 ** attempt * 100);

    const debug = false;

    for (let i = 0; i < attempts; i++) {
      try {
        if (debug) {
          console.log(`Attempt ${i + 1} of ${attempts} with delay ${delay(i)}`);
        }
        return await fn();
      } catch (error) {
        if (error instanceof AISuiteError) {
          if (debug) {
            console.log(`Error is an AISuiteError, throwing it`);
          }
          throw error;
        }

        if (i === attempts - 1) {
          if (debug) {
            console.log(`This is the last attempt, throwing the error`);
          }
          throw error;
        }

        await sleep(delay(i));
      }
    }

    throw new Error("Retry logic failed");
  }

  /**
   * Public method that includes retry logic
   */
  async createChatCompletion(messages: MessageModel[], options: ChatOptions): Promise<SuccessChatCompletion> {
    return this.retry(() => this._createChatCompletion(messages, options), options.retry);
  }

  async createEmbedding(embedding: EmbeddingRequest, options: EmbeddingOptions): Promise<SuccessEmbedding> {
    return this.retry(() => this._createEmbedding(embedding, options.metadata), options.retry);
  }
}

export class BaseHook {
  handleRequest: (req: unknown) => Promise<void>;
  handleResponse: (req: unknown, res: unknown, metadata: Record<string, unknown>) => Promise<void>;
  constructor(hooks?: {
    handleRequest?: (req: unknown) => Promise<void>;
    handleResponse?: (req: unknown, res: unknown, metadata: Record<string, unknown>) => Promise<void>;
    failOnError?: boolean;
  }) {
    const failOnError = hooks?.failOnError ?? true;

    this.handleRequest = async (req: unknown) => {
      if (hooks?.handleRequest) {
        try {
          await hooks.handleRequest(req);
        } catch (error) {
          console.warn("Error in handleRequest", error);
          if (failOnError) {
            throw new AISuiteError(error as string);
          }
        }
      }
    };

    this.handleResponse = async (req: unknown, res: unknown, metadata: Record<string, unknown>) => {
      if (hooks?.handleResponse) {
        try {
          await hooks.handleResponse(req, res, metadata);
        } catch (error) {
          console.warn("Error in handleResponse", error);
          if (failOnError) {
            throw new AISuiteError(error as string);
          }
        }
      }
    };
  }
}
