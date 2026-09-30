import { describe, expect, it, vi } from "vitest";
import { AnthropicProvider } from "../../src/providers/anthropic/anthropicProvider.js";
import { GeminiProvider } from "../../src/providers/gemini/geminiProvider.js";
import { OpenAIProvider } from "../../src/providers/openai/openaiProvider.js";

describe("file.list pagination - anthropic", () => {
  const file = { id: "file_1", size_bytes: 10, created_at: "2026-01-01T00:00:00Z", filename: "a.jsonl" };

  it("sends `after` as `page` and exposes `next_page` as `next_cursor`", async () => {
    const provider = new AnthropicProvider("fake-key", "claude", "anthropic");
    const spy = vi
      .spyOn(provider.client.beta.files, "list")
      .mockResolvedValue({ data: [file], next_page: "cursor_2" } as never);

    const result = await provider.file.list({ after: "cursor_1", limit: 1 });

    expect(spy.mock.calls[0]?.[0]).toMatchObject({ page: "cursor_1", limit: 1 });
    expect(result.content.map(f => f.id)).toEqual(["file_1"]);
    expect(result.has_next_page).toBe(true);
    expect(result.next_cursor).toBe("cursor_2");
  });

  it("reports no next page when `next_page` is null", async () => {
    const provider = new AnthropicProvider("fake-key", "claude", "anthropic");
    vi.spyOn(provider.client.beta.files, "list").mockResolvedValue({ data: [file], next_page: null } as never);

    const result = await provider.file.list({});

    expect(result.has_next_page).toBe(false);
    expect(result.next_cursor).toBeNull();
  });
});

describe("file.list pagination - openai", () => {
  const files = [
    { id: "file-1", bytes: 10, created_at: 0, filename: "a.jsonl" },
    { id: "file-2", bytes: 10, created_at: 0, filename: "b.jsonl" },
  ];

  it("uses the last file id as `next_cursor` when there are more pages", async () => {
    const provider = new OpenAIProvider("fake-key", "gpt-4o-mini", "openai");
    const spy = vi.spyOn(provider.client.files, "list").mockResolvedValue({ data: files, has_more: true } as never);

    const result = await provider.file.list({ after: "file-0", limit: 2 });

    expect(spy.mock.calls[0]?.[0]).toMatchObject({ after: "file-0", limit: 2 });
    expect(result.has_next_page).toBe(true);
    expect(result.next_cursor).toBe("file-2");
  });

  it("returns a null `next_cursor` on the last page", async () => {
    const provider = new OpenAIProvider("fake-key", "gpt-4o-mini", "openai");
    vi.spyOn(provider.client.files, "list").mockResolvedValue({ data: files, has_more: false } as never);

    const result = await provider.file.list({});

    expect(result.has_next_page).toBe(false);
    expect(result.next_cursor).toBeNull();
  });
});

describe("file.list pagination - gemini", () => {
  function fakePager(names: string[], nextPageToken?: string) {
    return {
      page: names.map(name => ({ name, sizeBytes: "10", displayName: name })),
      params: { config: { pageToken: nextPageToken } },
      hasNextPage: () => nextPageToken !== undefined,
      [Symbol.asyncIterator]: () => {
        throw new Error("must not auto-paginate");
      },
    };
  }

  it("returns only the current page and exposes the next `pageToken` as `next_cursor`", async () => {
    const provider = new GeminiProvider("fake-key", "gemini-2.5-flash", "gemini");
    const spy = vi.spyOn(provider.client.files, "list").mockResolvedValue(fakePager(["files/a"], "token_2") as never);

    const result = await provider.file.list({ after: "token_1", limit: 1 });

    expect(spy.mock.calls[0]?.[0]).toMatchObject({ config: { pageSize: 1, pageToken: "token_1" } });
    expect(result.content.map(f => f.id)).toEqual(["files/a"]);
    expect(result.has_next_page).toBe(true);
    expect(result.next_cursor).toBe("token_2");
  });

  it("returns a null `next_cursor` on the last page", async () => {
    const provider = new GeminiProvider("fake-key", "gemini-2.5-flash", "gemini");
    vi.spyOn(provider.client.files, "list").mockResolvedValue(fakePager(["files/a"]) as never);

    const result = await provider.file.list({});

    expect(result.has_next_page).toBe(false);
    expect(result.next_cursor).toBeNull();
  });
});
