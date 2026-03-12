import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CliError } from "./errors";
import { GitClient } from "./types";

const execFileAsync = promisify(execFile);
const GIT_DIFF_ARGS = ["diff", "--cached", "--binary", "--no-color", "--no-ext-diff", "--unified=3"];
const DEFAULT_MODEL_DIFF_LIMIT = 12000;

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export type ExecFileFn = (
  file: string,
  args: string[],
  options: { cwd: string; maxBuffer?: number }
) => Promise<ExecResult>;

export async function defaultExecFile(
  file: string,
  args: string[],
  options: { cwd: string; maxBuffer?: number }
): Promise<ExecResult> {
  const result = await execFileAsync(file, args, {
    cwd: options.cwd,
    maxBuffer: options.maxBuffer ?? 1024 * 1024,
    encoding: "utf8"
  });

  return {
    stdout: String(result.stdout),
    stderr: String(result.stderr)
  };
}

export function stripBinarySections(diff: string): string {
  const lines = diff.split("\n");
  const output: string[] = [];
  let skippingBinaryPatch = false;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      skippingBinaryPatch = false;
      output.push(line);
      continue;
    }

    if (line === "GIT binary patch") {
      output.push("[binary patch omitted]");
      skippingBinaryPatch = true;
      continue;
    }

    if (skippingBinaryPatch) {
      continue;
    }

    if (/^Binary files .* differ$/.test(line)) {
      output.push("[binary file changed]");
      continue;
    }

    output.push(line);
  }

  return output.join("\n").trim();
}

export function truncateDiff(diff: string, maxChars: number): string {
  if (diff.length <= maxChars) {
    return diff.trim();
  }

  const lines = diff.split("\n");
  const keptLines: string[] = [];
  let usedChars = 0;
  let omittedLines = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const separator = keptLines.length === 0 ? 0 : 1;

    if (usedChars + separator + line.length > maxChars) {
      omittedLines = lines.length - index;
      break;
    }

    keptLines.push(line);
    usedChars += separator + line.length;
  }

  if (omittedLines === 0) {
    return diff.trim();
  }

  let suffix = `\n[diff truncated: ${omittedLines} line${omittedLines === 1 ? "" : "s"} omitted]`;
  let result = keptLines.join("\n").trimEnd();

  while (keptLines.length > 0 && result.length + suffix.length > maxChars) {
    keptLines.pop();
    omittedLines += 1;
    suffix = `\n[diff truncated: ${omittedLines} line${omittedLines === 1 ? "" : "s"} omitted]`;
    result = keptLines.join("\n").trimEnd();
  }

  return `${result}${suffix}`.trim();
}

export function prepareDiffForModel(diff: string, maxChars = DEFAULT_MODEL_DIFF_LIMIT): string {
  return truncateDiff(stripBinarySections(diff), maxChars);
}

export function createGitClient(execFileFn: ExecFileFn = defaultExecFile): GitClient {
  return {
    async getStagedDiff(cwd: string): Promise<string> {
      try {
        await execFileFn("git", ["rev-parse", "--show-toplevel"], { cwd });
      } catch {
        throw new CliError("Not inside a Git repository.", "NOT_GIT_REPO");
      }

      const result = await execFileFn("git", GIT_DIFF_ARGS, {
        cwd,
        maxBuffer: 4 * 1024 * 1024
      });
      const diff = result.stdout.trim();

      if (!diff) {
        throw new CliError("No staged changes found. Stage files before running ai-commit.", "NO_STAGED_CHANGES");
      }

      return diff;
    }
  };
}

