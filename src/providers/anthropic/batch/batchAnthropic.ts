import { BatchProviderBase } from "../../batchProviderBase.js";

export class BatchAnthropic extends BatchProviderBase {
  create(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  list(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  retrieve(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  cancel(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
