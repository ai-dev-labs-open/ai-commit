import { resolveConfig } from "./config";
import { prepareDiffForModel } from "./git";
import { normalizeCommitSuggestion } from "./normalize";
import { CliOptions, CommitSuggestion, GitClient, ProviderFactory } from "./types";

export interface RunDependencies {
  cwd: () => string;
  env: NodeJS.ProcessEnv;
  gitClient: GitClient;
  providerFactory: ProviderFactory;
}

export async function generateCommitSuggestion(
  options: CliOptions,
  dependencies: RunDependencies
): Promise<CommitSuggestion> {
  const config = resolveConfig(options, dependencies.env);
  const stagedDiff = await dependencies.gitClient.getStagedDiff(dependencies.cwd());
  const preparedDiff = prepareDiffForModel(stagedDiff);
  const provider = dependencies.providerFactory({
    apiKey: config.apiKey,
    model: config.model
  });
  const rawSuggestion = await provider.suggestCommit({
    diff: preparedDiff,
    includeBody: config.includeBody,
    maxSubjectLength: config.maxSubjectLength,
    forcedType: config.forcedType,
    forcedScope: config.forcedScope
  });

  return normalizeCommitSuggestion(rawSuggestion, {
    includeBody: config.includeBody,
    maxSubjectLength: config.maxSubjectLength,
    forcedType: config.forcedType,
    forcedScope: config.forcedScope
  });
}

