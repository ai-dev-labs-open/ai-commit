import { resolveConfig } from './config'
import { prepareDiffForModel } from './git'
import { createGeminiProvider } from './gemini'
import { normalizeCommitSuggestion } from './normalize'
import {
    CliOptions,
    CommitSuggestion,
    GitClient,
    ProviderFactory,
    SuggestionProvider,
    WritableLike,
} from './types'

export interface RunDependencies {
    cwd: () => string
    env: NodeJS.ProcessEnv
    gitClient: GitClient
    providerFactory: ProviderFactory
    stderr?: WritableLike
}

export async function generateCommitSuggestion(
    options: CliOptions,
    dependencies: RunDependencies
): Promise<CommitSuggestion> {
    const config = resolveConfig(options, dependencies.env)

    if (config.providerWarning) {
        dependencies.stderr?.write(`${config.providerWarning}\n`)
    }

    const stagedDiff = await dependencies.gitClient.getStagedDiff(
        dependencies.cwd()
    )
    const preparedDiff = prepareDiffForModel(stagedDiff)

    let provider: SuggestionProvider

    if (config.provider === 'gemini') {
        provider = createGeminiProvider({
            apiKey: config.apiKey,
            model: config.model,
        })
    } else {
        provider = dependencies.providerFactory({
            apiKey: config.apiKey,
            model: config.model,
        })
    }
    const rawSuggestion = await provider.suggestCommit({
        diff: preparedDiff,
        includeBody: config.includeBody,
        maxSubjectLength: config.maxSubjectLength,
        forcedType: config.forcedType,
        forcedScope: config.forcedScope,
    })

    return normalizeCommitSuggestion(rawSuggestion, {
        includeBody: config.includeBody,
        maxSubjectLength: config.maxSubjectLength,
        forcedType: config.forcedType,
        forcedScope: config.forcedScope,
    })
}
