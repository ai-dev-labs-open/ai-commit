#!/usr/bin/env node

import { Command, CommanderError, InvalidArgumentError } from "commander";
import { createAnthropicProvider } from "./anthropic";
import { CliError, isCliError } from "./errors";
import { createGitClient } from "./git";
import { generateCommitSuggestion } from "./run";
import { CliOptions, GitClient, ProviderFactory, WritableLike } from "./types";

export interface CliDependencies {
  cwd?: () => string;
  env?: NodeJS.ProcessEnv;
  stdout?: WritableLike;
  stderr?: WritableLike;
  gitClient?: GitClient;
  providerFactory?: ProviderFactory;
}

function parsePositiveIntegerOption(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError("Expected a positive integer.");
  }

  return parsed;
}

function writeError(error: unknown, stderr: WritableLike): number {
  if (isCliError(error)) {
    stderr.write(`${error.message}\n`);
    return error.exitCode;
  }

  const message = error instanceof Error ? error.message : "Unexpected error.";
  stderr.write(`${message}\n`);
  return 1;
}

export async function runCli(argv = process.argv, dependencies: CliDependencies = {}): Promise<number> {
  let exitCode = 0;
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  const gitClient = dependencies.gitClient ?? createGitClient();
  const providerFactory = dependencies.providerFactory ?? ((config) => createAnthropicProvider(config));
  const cwd = dependencies.cwd ?? (() => process.cwd());
  const env = dependencies.env ?? process.env;
  const program = new Command();

  program
    .name("ai-commit")
    .description("Generate conventional commit suggestions from staged Git changes using Claude.")
    .showHelpAfterError()
    .option("--json", "Print a JSON object instead of plain text.")
    .option("--type <type>", "Force the conventional commit type.")
    .option("--scope <scope>", "Force the conventional commit scope.")
    .option("--no-body", "Omit the commit body.")
    .option(
      "--max-subject-length <n>",
      "Limit the maximum subject length.",
      parsePositiveIntegerOption
    )
    .action(async (options: CliOptions) => {
      try {
        const suggestion = await generateCommitSuggestion(options, {
          cwd,
          env,
          gitClient,
          providerFactory
        });

        if (options.json) {
          stdout.write(`${JSON.stringify(suggestion, null, 2)}\n`);
          return;
        }

        stdout.write(`${suggestion.fullMessage}\n`);
      } catch (error) {
        exitCode = writeError(error, stderr);
      }
    });

  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    throw error;
  }

  return exitCode;
}

if (require.main === module) {
  void runCli().then((code) => {
    process.exitCode = code;
  });
}

