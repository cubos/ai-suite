export class AISuiteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AISuiteError";
  }
}