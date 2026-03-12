import { CliError } from "./errors";
import { CliOptions } from "./types";

export const DEFAULT_MODEL = "claude-3-5-sonnet-latest";
export const DEFAULT_MAX_SUBJECT_LENGTH = 72;

export interface RuntimeConfig {
  apiKey: string;
  model: string;
  maxSubjectLength: number;
  includeBody: boolean;
  forcedType?: string;
  forcedScope?: string;
  json: boolean;
}

function parsePositiveInteger(value: string, source: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 20 || parsed > 120) {
    throw new CliError(`${source} must be an integer between 20 and 120.`, "INVALID_INTEGER");
  }

  return parsed;
}

function sanitizeType(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!/^[a-z0-9-]+$/.test(normalized)) {
    throw new CliError("Commit type must contain only lowercase letters, numbers, or hyphens.", "INVALID_TYPE");
  }

  return normalized;
}

function sanitizeScope(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!/^[a-z0-9._-]+$/.test(normalized)) {
    throw new CliError("Commit scope must contain only letters, numbers, dots, underscores, or hyphens.", "INVALID_SCOPE");
  }

  return normalized;
}

export function resolveConfig(options: CliOptions, env: NodeJS.ProcessEnv): RuntimeConfig {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    throw new CliError("ANTHROPIC_API_KEY is required.", "MISSING_API_KEY");
  }

  const model = env.AI_COMMIT_MODEL?.trim() || DEFAULT_MODEL;
  const maxSubjectLength = options.maxSubjectLength ??
    (env.AI_COMMIT_MAX_SUBJECT_LENGTH
      ? parsePositiveInteger(env.AI_COMMIT_MAX_SUBJECT_LENGTH, "AI_COMMIT_MAX_SUBJECT_LENGTH")
      : DEFAULT_MAX_SUBJECT_LENGTH);

  return {
    apiKey,
    model,
    maxSubjectLength,
    includeBody: options.body !== false,
    forcedType: options.type ? sanitizeType(options.type) : undefined,
    forcedScope: options.scope ? sanitizeScope(options.scope) : undefined,
    json: options.json === true
  };
}

