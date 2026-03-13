import { CliError } from './errors'
import { CliOptions } from './types'

export const DEFAULT_MODEL_ANTHROPIC = 'claude-3-5-sonnet-latest'
export const DEFAULT_MODEL_GEMINI = 'gemini-2.5-flash-lite'
export const DEFAULT_MAX_SUBJECT_LENGTH = 72
export type Provider = 'anthropic' | 'gemini'

export interface RuntimeConfig {
    provider: Provider
    apiKey: string
    model: string
    maxSubjectLength: number
    includeBody: boolean
    forcedType?: string
    forcedScope?: string
    json: boolean
    providerWarning?: string
}

function parsePositiveInteger(value: string, source: string): number {
    const parsed = Number.parseInt(value, 10)

    if (!Number.isInteger(parsed) || parsed < 20 || parsed > 120) {
        throw new CliError(
            `${source} must be an integer between 20 and 120.`,
            'INVALID_INTEGER'
        )
    }

    return parsed
}

function sanitizeType(value: string): string {
    const normalized = value.trim().toLowerCase()

    if (!/^[a-z0-9-]+$/.test(normalized)) {
        throw new CliError(
            'Commit type must contain only lowercase letters, numbers, or hyphens.',
            'INVALID_TYPE'
        )
    }

    return normalized
}

function sanitizeScope(value: string): string {
    const normalized = value.trim().toLowerCase()

    if (!/^[a-z0-9._-]+$/.test(normalized)) {
        throw new CliError(
            'Commit scope must contain only letters, numbers, dots, underscores, or hyphens.',
            'INVALID_SCOPE'
        )
    }

    return normalized
}

export function resolveConfig(
    options: CliOptions,
    env: NodeJS.ProcessEnv
): RuntimeConfig {
    const anthropicKey = env.ANTHROPIC_API_KEY?.trim()
    const geminiKey = env.GEMINI_API_KEY?.trim()

    let provider: Provider
    let apiKey: string

    let providerWarning: string | undefined

    if (anthropicKey) {
        provider = 'anthropic'
        apiKey = anthropicKey

        if (geminiKey) {
            providerWarning =
                'Warning: Both ANTHROPIC_API_KEY and GEMINI_API_KEY are set. Using Anthropic.'
        }
    } else if (geminiKey) {
        provider = 'gemini'
        apiKey = geminiKey
    } else {
        throw new CliError(
            'ANTHROPIC_API_KEY or GEMINI_API_KEY is required.',
            'MISSING_API_KEY'
        )
    }

    const defaultModel =
        provider === 'gemini' ? DEFAULT_MODEL_GEMINI : DEFAULT_MODEL_ANTHROPIC
    const model = env.AI_COMMIT_MODEL?.trim() || defaultModel
    const maxSubjectLength =
        options.maxSubjectLength ??
        (env.AI_COMMIT_MAX_SUBJECT_LENGTH
            ? parsePositiveInteger(
                  env.AI_COMMIT_MAX_SUBJECT_LENGTH,
                  'AI_COMMIT_MAX_SUBJECT_LENGTH'
              )
            : DEFAULT_MAX_SUBJECT_LENGTH)

    return {
        provider,
        apiKey,
        model,
        maxSubjectLength,
        includeBody: options.body !== false,
        forcedType: options.type ? sanitizeType(options.type) : undefined,
        forcedScope: options.scope ? sanitizeScope(options.scope) : undefined,
        json: options.json === true,
        providerWarning,
    }
}
