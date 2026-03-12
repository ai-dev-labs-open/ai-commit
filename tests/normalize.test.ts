import { describe, expect, it } from "vitest";
import { formatCommitMessage, normalizeCommitSuggestion, parseSuggestionText } from "../src/normalize";

describe("parseSuggestionText", () => {
  it("parses JSON responses", () => {
    const parsed = parseSuggestionText('{"type":"feat","scope":"cli","subject":"add JSON output","body":"Return structured data."}');

    expect(parsed.type).toBe("feat");
    expect(parsed.scope).toBe("cli");
    expect(parsed.subject).toBe("add JSON output");
    expect(parsed.body).toBe("Return structured data.");
  });

  it("falls back to conventional header parsing", () => {
    const parsed = parseSuggestionText("fix(parser): handle empty responses\n\nAvoid crashing on blank text.");

    expect(parsed.type).toBe("fix");
    expect(parsed.scope).toBe("parser");
    expect(parsed.subject).toBe("handle empty responses");
    expect(parsed.body).toBe("Avoid crashing on blank text.");
  });
});

describe("normalizeCommitSuggestion", () => {
  it("applies forced type and scope overrides", () => {
    const normalized = normalizeCommitSuggestion(
      {
        type: "chore",
        scope: null,
        subject: "update CLI output.",
        body: "Print JSON when requested.",
        rawText: "update CLI output"
      },
      {
        includeBody: true,
        maxSubjectLength: 72,
        forcedType: "feat",
        forcedScope: "cli"
      }
    );

    expect(normalized.type).toBe("feat");
    expect(normalized.scope).toBe("cli");
    expect(normalized.subject).toBe("update CLI output");
    expect(normalized.fullMessage).toBe("feat(cli): update CLI output\n\nPrint JSON when requested.");
  });

  it("truncates overlong subjects safely", () => {
    const normalized = normalizeCommitSuggestion(
      {
        rawText: "feat: add a very long subject that should be cut down because it keeps going for too many characters",
        subject: "add a very long subject that should be cut down because it keeps going for too many characters"
      },
      {
        includeBody: false,
        maxSubjectLength: 40
      }
    );

    expect(normalized.subject.length).toBeLessThanOrEqual(40);
    expect(normalized.body).toBeNull();
  });
});

describe("formatCommitMessage", () => {
  it("formats the final message with optional body", () => {
    expect(
      formatCommitMessage({
        type: "feat",
        scope: "cli",
        subject: "add JSON output",
        body: "Return structured data."
      })
    ).toBe("feat(cli): add JSON output\n\nReturn structured data.");
  });
});
