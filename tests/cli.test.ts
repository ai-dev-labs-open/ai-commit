import { describe, expect, it, vi } from "vitest";
import { CliError } from "../src/errors";
import { runCli } from "../src/cli";
import { GitClient, ProviderConfig, ProviderRequest, RawCommitSuggestion, SuggestionProvider } from "../src/types";

class MemoryWriter {
  value = "";

  write(chunk: string): void {
    this.value += chunk;
  }
}

function createGitClient(diff: string | Error, commitFn?: (message: string) => Promise<void>): GitClient {
  return {
    async getStagedDiff(): Promise<string> {
      if (diff instanceof Error) {
        throw diff;
      }

      return diff;
    },
    async commit(message: string): Promise<void> {
      if (commitFn) {
        return commitFn(message);
      }
    }
  };
}

function createProvider(
  response: RawCommitSuggestion,
  onRequest?: (request: ProviderRequest, config: ProviderConfig) => void
): (config: ProviderConfig) => SuggestionProvider {
  return (config: ProviderConfig) => ({
    async suggestCommit(request: ProviderRequest): Promise<RawCommitSuggestion> {
      onRequest?.(request, config);
      return response;
    }
  });
}

describe("runCli", () => {
  it("prints plain text output for a normal staged diff", async () => {
    const stdout = new MemoryWriter();
    const stderr = new MemoryWriter();
    const exitCode = await runCli(
      ["node", "ai-commit"],
      {
        env: { ANTHROPIC_API_KEY: "test-key" },
        stdout,
        stderr,
        gitClient: createGitClient("diff --git a/a.ts b/a.ts\n+hello"),
        providerFactory: createProvider({
          type: "feat",
          scope: "cli",
          subject: "add JSON output",
          body: "Return structured data for scripts.",
          rawText: ""
        })
      }
    );

    expect(exitCode).toBe(0);
    expect(stdout.value).toBe("feat(cli): add JSON output\n\nReturn structured data for scripts.\n");
    expect(stderr.value).toBe("");
  });

  it("prints JSON output when requested", async () => {
    const stdout = new MemoryWriter();
    const exitCode = await runCli(
      ["node", "ai-commit", "--json"],
      {
        env: { ANTHROPIC_API_KEY: "test-key" },
        stdout,
        stderr: new MemoryWriter(),
        gitClient: createGitClient("diff --git a/a.ts b/a.ts\n+hello"),
        providerFactory: createProvider({
          type: "feat",
          scope: "cli",
          subject: "add JSON output",
          body: "Return structured data for scripts.",
          rawText: ""
        })
      }
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.value)).toMatchObject({
      type: "feat",
      scope: "cli",
      subject: "add JSON output"
    });
  });

  it("fails when the API key is missing", async () => {
    const stderr = new MemoryWriter();
    const exitCode = await runCli(
      ["node", "ai-commit"],
      {
        env: {},
        stdout: new MemoryWriter(),
        stderr,
        gitClient: createGitClient("diff --git a/a.ts b/a.ts\n+hello"),
        providerFactory: createProvider({
          rawText: "",
          subject: "unused"
        })
      }
    );

    expect(exitCode).toBe(1);
    expect(stderr.value).toContain("ANTHROPIC_API_KEY is required.");
  });

  it("fails when not inside a Git repository", async () => {
    const stderr = new MemoryWriter();
    const exitCode = await runCli(
      ["node", "ai-commit"],
      {
        env: { ANTHROPIC_API_KEY: "test-key" },
        stdout: new MemoryWriter(),
        stderr,
        gitClient: createGitClient(new CliError("Not inside a Git repository.", "NOT_GIT_REPO")),
        providerFactory: createProvider({
          rawText: "",
          subject: "unused"
        })
      }
    );

    expect(exitCode).toBe(1);
    expect(stderr.value).toContain("Not inside a Git repository.");
  });

  it("fails when no staged changes exist", async () => {
    const stderr = new MemoryWriter();
    const exitCode = await runCli(
      ["node", "ai-commit"],
      {
        env: { ANTHROPIC_API_KEY: "test-key" },
        stdout: new MemoryWriter(),
        stderr,
        gitClient: createGitClient(
          new CliError("No staged changes found. Stage files before running ai-commit.", "NO_STAGED_CHANGES")
        ),
        providerFactory: createProvider({
          rawText: "",
          subject: "unused"
        })
      }
    );

    expect(exitCode).toBe(1);
    expect(stderr.value).toContain("No staged changes found.");
  });

  it("passes a truncated diff to the provider for oversized changes", async () => {
    const oversizedDiff = Array.from({ length: 4000 }, (_, index) => `+line ${index} with additional content`).join("\n");
    const requestSpy = vi.fn();
    const exitCode = await runCli(
      ["node", "ai-commit"],
      {
        env: { ANTHROPIC_API_KEY: "test-key" },
        stdout: new MemoryWriter(),
        stderr: new MemoryWriter(),
        gitClient: createGitClient(oversizedDiff),
        providerFactory: createProvider(
          {
            type: "chore",
            scope: null,
            subject: "trim oversized diffs",
            body: null,
            rawText: ""
          },
          requestSpy
        )
      }
    );

    expect(exitCode).toBe(0);
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy.mock.calls[0]?.[0].diff).toContain("[diff truncated:");
  });

  it("supports no-body and forced type/scope flags", async () => {
    const stdout = new MemoryWriter();
    const exitCode = await runCli(
      ["node", "ai-commit", "--no-body", "--type", "fix", "--scope", "parser"],
      {
        env: { ANTHROPIC_API_KEY: "test-key" },
        stdout,
        stderr: new MemoryWriter(),
        gitClient: createGitClient("diff --git a/a.ts b/a.ts\n+hello"),
        providerFactory: createProvider({
          type: "feat",
          scope: "cli",
          subject: "handle empty responses",
          body: "This should be removed.",
          rawText: ""
        })
      }
    );

    expect(exitCode).toBe(0);
    expect(stdout.value).toBe("fix(parser): handle empty responses\n");
  });

  it("runs git commit when --commit flag is passed", async () => {
    const stdout = new MemoryWriter();
    const committed: string[] = [];
    const exitCode = await runCli(
      ["node", "ai-commit", "--commit"],
      {
        env: { ANTHROPIC_API_KEY: "test-key" },
        stdout,
        stderr: new MemoryWriter(),
        gitClient: createGitClient(
          "diff --git a/a.ts b/a.ts\n+hello",
          async (msg) => { committed.push(msg); }
        ),
        providerFactory: createProvider({
          type: "feat",
          scope: "cli",
          subject: "add commit flag",
          body: null,
          rawText: ""
        })
      }
    );

    expect(exitCode).toBe(0);
    expect(committed).toHaveLength(1);
    expect(committed[0]).toBe("feat(cli): add commit flag");
    expect(stdout.value).toBe("feat(cli): add commit flag\n");
  });

  it("fails and returns non-zero exit code when git commit fails", async () => {
    const stderr = new MemoryWriter();
    const exitCode = await runCli(
      ["node", "ai-commit", "--commit"],
      {
        env: { ANTHROPIC_API_KEY: "test-key" },
        stdout: new MemoryWriter(),
        stderr,
        gitClient: createGitClient(
          "diff --git a/a.ts b/a.ts\n+hello",
          async () => {
            throw new CliError("git commit failed: nothing to commit", "COMMIT_FAILED");
          }
        ),
        providerFactory: createProvider({
          type: "fix",
          scope: null,
          subject: "patch bug",
          body: null,
          rawText: ""
        })
      }
    );

    expect(exitCode).toBe(1);
    expect(stderr.value).toContain("git commit failed");
  });

  it("does not run git commit when --commit flag is absent", async () => {
    const committed: string[] = [];
    const exitCode = await runCli(
      ["node", "ai-commit"],
      {
        env: { ANTHROPIC_API_KEY: "test-key" },
        stdout: new MemoryWriter(),
        stderr: new MemoryWriter(),
        gitClient: createGitClient(
          "diff --git a/a.ts b/a.ts\n+hello",
          async (msg) => { committed.push(msg); }
        ),
        providerFactory: createProvider({
          type: "chore",
          scope: null,
          subject: "update deps",
          body: null,
          rawText: ""
        })
      }
    );

    expect(exitCode).toBe(0);
    expect(committed).toHaveLength(0);
  });
});
