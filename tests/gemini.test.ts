import { describe, expect, it, vi } from "vitest";
import { GeminiSuggestionProvider } from "../src/gemini";

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    models: {
      generateContent: vi.fn().mockResolvedValue({ text: "", ...overrides }),
    },
  };
}

const baseRequest = {
  diff: "diff --git a/a.ts b/a.ts\n+hello",
  includeBody: true,
  maxSubjectLength: 72,
};

describe("GeminiSuggestionProvider", () => {
  it("parses a valid JSON response from the model", async () => {
    const provider = new GeminiSuggestionProvider({ apiKey: "test", model: "gemini-2.5-flash-lite" });
    (provider as unknown as { client: ReturnType<typeof makeClient> }).client = makeClient({
      text: '{"type":"feat","scope":"api","subject":"add gemini support","body":"Integrates Google Gemini as a commit suggestion provider."}',
    });

    const result = await provider.suggestCommit(baseRequest);

    expect(result.type).toBe("feat");
    expect(result.scope).toBe("api");
    expect(result.subject).toBe("add gemini support");
    expect(result.body).toBe("Integrates Google Gemini as a commit suggestion provider.");
  });

  it("throws EMPTY_MODEL_RESPONSE when the model returns empty text", async () => {
    const provider = new GeminiSuggestionProvider({ apiKey: "test", model: "gemini-2.5-flash-lite" });
    (provider as unknown as { client: ReturnType<typeof makeClient> }).client = makeClient({ text: "   " });

    await expect(provider.suggestCommit(baseRequest)).rejects.toMatchObject({
      code: "EMPTY_MODEL_RESPONSE",
    });
  });

  it("throws MODEL_NOT_FOUND when the SDK raises a 404 error", async () => {
    const provider = new GeminiSuggestionProvider({ apiKey: "test", model: "gemini-old" });
    const client = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error("404 This model models/gemini-old is not found.")),
      },
    };
    (provider as unknown as { client: typeof client }).client = client;

    await expect(provider.suggestCommit(baseRequest)).rejects.toMatchObject({
      code: "MODEL_NOT_FOUND",
    });
  });

  it("throws AUTH_FAILED when the SDK raises a 403 error", async () => {
    const provider = new GeminiSuggestionProvider({ apiKey: "bad-key", model: "gemini-2.5-flash-lite" });
    const client = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error("403 API key not valid.")),
      },
    };
    (provider as unknown as { client: typeof client }).client = client;

    await expect(provider.suggestCommit(baseRequest)).rejects.toMatchObject({
      code: "AUTH_FAILED",
    });
  });

  it("throws PROVIDER_ERROR for generic SDK errors", async () => {
    const provider = new GeminiSuggestionProvider({ apiKey: "test", model: "gemini-2.5-flash-lite" });
    const client = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error("Network timeout")),
      },
    };
    (provider as unknown as { client: typeof client }).client = client;

    await expect(provider.suggestCommit(baseRequest)).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      message: expect.stringContaining("Network timeout"),
    });
  });
});
