import { FileProviderBase } from "../../fileProviderBase.js";
import type { AnthropicProvider } from "../index.js";

export class FileAnthropic extends FileProviderBase<AnthropicProvider> {
  create(): Promise<void> {
    this.provider.client.files.upload({
      file: new Blob(["Hello, world!"], { type: "text/plain" }),
    });
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
