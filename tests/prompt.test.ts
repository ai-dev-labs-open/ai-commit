import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "../src/prompt";

describe("buildSystemPrompt", () => {
  it("describes the JSON-only contract", () => {
    expect(buildSystemPrompt()).toContain("Return JSON only");
  });
});

describe("buildUserPrompt", () => {
  it("includes overrides and diff content", () => {
    const prompt = buildUserPrompt({
      diff: "diff --git a/a.ts b/a.ts\n+hello",
      includeBody: true,
      maxSubjectLength: 60,
      forcedType: "feat",
      forcedScope: "cli"
    });

    expect(prompt).toContain("Forced type: feat");
    expect(prompt).toContain("Forced scope: cli");
    expect(prompt).toContain("<staged_diff>");
    expect(prompt).toContain("+hello");
  });
});

