export interface CliOptions {
  json?: boolean;
  type?: string;
  scope?: string;
  body?: boolean;
  maxSubjectLength?: number;
}

export interface ProviderRequest {
  diff: string;
  includeBody: boolean;
  maxSubjectLength: number;
  forcedType?: string;
  forcedScope?: string;
}

export interface RawCommitSuggestion {
  type?: string;
  scope?: string | null;
  subject?: string;
  body?: string | null;
  rawText: string;
}

export interface CommitSuggestion {
  type: string;
  scope: string | null;
  subject: string;
  body: string | null;
  fullMessage: string;
}

export interface SuggestionProvider {
  suggestCommit(request: ProviderRequest): Promise<RawCommitSuggestion>;
}

export interface GitClient {
  getStagedDiff(cwd: string): Promise<string>;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
}

export type ProviderFactory = (config: ProviderConfig) => SuggestionProvider;

export interface WritableLike {
  write(chunk: string): void;
}

