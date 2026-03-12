import { describe, expect, it } from "vitest";
import { createGitClient, prepareDiffForModel, stripBinarySections, truncateDiff, type ExecFileFn } from "../src/git";

describe("stripBinarySections", () => {
  it("replaces binary summaries and omits binary patch contents", () => {
    const diff = [
      "diff --git a/logo.png b/logo.png",
      "new file mode 100644",
      "index 0000000..1111111",
      "GIT binary patch",
      "literal 4",
      "zcmV+",
      "diff --git a/src/index.ts b/src/index.ts",
      "@@ -1 +1 @@",
      "-old",
      "+new"
    ].join("\n");

    expect(stripBinarySections(diff)).toContain("[binary patch omitted]");
    expect(stripBinarySections(diff)).not.toContain("literal 4");
    expect(stripBinarySections(diff)).toContain("diff --git a/src/index.ts b/src/index.ts");
  });
});

describe("truncateDiff", () => {
  it("adds a truncation notice when the diff is too large", () => {
    const diff = Array.from({ length: 20 }, (_, index) => `line ${index}`).join("\n");
    const truncated = truncateDiff(diff, 50);

    expect(truncated).toContain("[diff truncated:");
    expect(truncated.length).toBeLessThanOrEqual(50);
  });
});

describe("prepareDiffForModel", () => {
  it("strips binary data before truncating", () => {
    const diff = [
      "diff --git a/file.bin b/file.bin",
      "GIT binary patch",
      "literal 1234",
      "diff --git a/src/a.ts b/src/a.ts",
      ...Array.from({ length: 20 }, (_, index) => `+hello ${index}`)
    ].join("\n");

    const prepared = prepareDiffForModel(diff, 140);

    expect(prepared).toContain("[binary patch omitted]");
    expect(prepared).toContain("[diff truncated:");
  });
});

describe("createGitClient", () => {
  it("throws when no staged diff is available", async () => {
    const execFileFn: ExecFileFn = async (_file, args) => {
      if (args[0] === "rev-parse") {
        return { stdout: "/tmp/repo\n", stderr: "" };
      }

      return { stdout: "", stderr: "" };
    };
    const gitClient = createGitClient(execFileFn);

    await expect(gitClient.getStagedDiff("/tmp/repo")).rejects.toThrow("No staged changes found.");
  });
});

describe("createGitClient commit", () => {
  it("resolves when git commit exits successfully", async () => {
    const execFileFn: ExecFileFn = async (_file, _args) => ({ stdout: "[main abc1234] feat: add thing\n", stderr: "" });
    const gitClient = createGitClient(execFileFn);

    await expect(gitClient.commit("feat: add thing", "/tmp/repo")).resolves.toBeUndefined();
  });

  it("throws CliError with COMMIT_FAILED when git commit fails", async () => {
    const execFileFn: ExecFileFn = async (_file, args) => {
      if (args[0] === "commit") {
        throw Object.assign(new Error("git error"), { stderr: "nothing to commit, working tree clean" });
      }

      return { stdout: "", stderr: "" };
    };
    const gitClient = createGitClient(execFileFn);

    const error = await gitClient.commit("feat: add thing", "/tmp/repo").catch((e) => e);

    expect(error.code).toBe("COMMIT_FAILED");
    expect(error.message).toContain("nothing to commit");
  });

  it("passes the message as a -m argument", async () => {
    const calls: string[][] = [];
    const execFileFn: ExecFileFn = async (_file, args) => {
      calls.push(args);
      return { stdout: "", stderr: "" };
    };
    const gitClient = createGitClient(execFileFn);

    await gitClient.commit("fix(parser): correct edge case", "/tmp/repo");

    const commitCall = calls.find((args) => args[0] === "commit");

    expect(commitCall).toEqual(["commit", "-m", "fix(parser): correct edge case"]);
  });
});
