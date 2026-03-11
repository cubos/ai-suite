import dotenv from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";
import { AISuite } from "../../src/index.js";
import type {
  SuccessCreateFile,
  SuccessDeleteFile,
  SuccessListFile,
  SuccessRetrieveFile,
} from "../../src/types/file.js";

dotenv.config();

let apiKey: string | undefined;

beforeAll(() => {
  apiKey = process.env.GEMINI_API_KEY;
  expect(apiKey).toBeDefined();
});

describe("Gemini File API", () => {
  it("should not create with invalid file type", async () => {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");

    const ai = new AISuite({ geminiKey: apiKey });

    const content = new File(["This is a plain text file, not JSONL."], "test.txt", { type: "text/plain" });

    const createResult = await ai.file.create("gemini", content, {});
    expect(createResult.success).toBe(false);
  });

  it("should create, list, retrieve and delete a jsonl file", async () => {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");

    const ai = new AISuite({ geminiKey: apiKey });

    // small JSONL content
    const content = new File(
      [
        JSON.stringify(
          JSON.stringify({ id: 1, text: "hello" }) + "\n" + JSON.stringify({ id: 2, text: "world" }) + "\n",
        ),
      ],
      "test.jsonl",
      { type: "text/jsonl" },
    );

    // create
    const createResult = await ai.file.create("gemini", content, {});

    expect(createResult.success).toBe(true);
    const fileId = (createResult as SuccessCreateFile).content.id;
    expect(fileId).toBeDefined();

    // list
    const listResult = await ai.file.list("gemini", { limit: 10 });
    expect(listResult.success).toBe(true);
    expect(Array.isArray((listResult as SuccessListFile).content)).toBe(true);

    // retrieve
    const retrieveResult = await ai.file.retrieve("gemini", fileId, {});
    expect(retrieveResult.success).toBe(true);
    expect((retrieveResult as SuccessRetrieveFile).content.id).toBe(fileId);

    // delete
    const deleteResult = await ai.file.delete("gemini", fileId, {});
    expect(deleteResult.success).toBe(true);
    expect((deleteResult as SuccessDeleteFile).content.id).toBe(fileId);
  }, 30000);
});
