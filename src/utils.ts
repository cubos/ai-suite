export class AISuiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AISuiteError";
  }
}

export const retry = async <T>(
  fn: () => Promise<T>,
  attempts: number,
  delay: (attempt: number) => number
): Promise<T> => {
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof AISuiteError) {
        throw error;
      }
      if (i === attempts - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay(i)));
    }
  }
  // This should not be reached
  throw new Error("Retry logic failed");
}; 