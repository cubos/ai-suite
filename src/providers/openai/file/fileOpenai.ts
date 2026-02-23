import { FileProviderBase } from "../../fileProviderBase.js";

export class FileOpenAI extends FileProviderBase {
  create(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  list(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  retrieve(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  delete(): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
