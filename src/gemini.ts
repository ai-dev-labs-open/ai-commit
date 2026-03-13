import { GoogleGenAI } from '@google/genai'
import { CliError } from './errors'
import { parseSuggestionText } from './normalize'
import { buildSystemPrompt, buildUserPrompt } from './prompt'
import {
    ProviderConfig,
    ProviderRequest,
    RawCommitSuggestion,
    SuggestionProvider,
} from './types'

export class GeminiSuggestionProvider implements SuggestionProvider {
    private readonly client: GoogleGenAI
    private readonly model: string

    constructor(config: ProviderConfig) {
        this.client = new GoogleGenAI({ apiKey: config.apiKey })
        this.model = config.model
    }

    async suggestCommit(
        request: ProviderRequest
    ): Promise<RawCommitSuggestion> {
        let response

        try {
            response = await this.client.models.generateContent({
                model: this.model,
                config: {
                    systemInstruction: buildSystemPrompt(),
                    temperature: 0,
                    maxOutputTokens: 256,
                },
                contents: buildUserPrompt(request),
            })
        } catch (error) {
            const raw = error instanceof Error ? error.message : String(error)
            const modelNotFound =
                raw.includes('404') || raw.toLowerCase().includes('not found')
            const authFailed =
                raw.includes('400') ||
                raw.includes('403') ||
                raw.toLowerCase().includes('api key')

            if (modelNotFound) {
                throw new CliError(
                    `Gemini model "${this.model}" is not available. Set AI_COMMIT_MODEL to a supported model (e.g. gemini-2.5-flash-lite).`,
                    'MODEL_NOT_FOUND'
                )
            }

            if (authFailed) {
                throw new CliError(
                    'Gemini API key is invalid or unauthorized.',
                    'AUTH_FAILED'
                )
            }

            throw new CliError(
                `Gemini request failed: ${raw}`,
                'PROVIDER_ERROR'
            )
        }

        const text = response.text?.trim() ?? ''

        if (!text) {
            throw new CliError(
                'Gemini returned an empty response.',
                'EMPTY_MODEL_RESPONSE'
            )
        }

        return parseSuggestionText(text)
    }
}

export function createGeminiProvider(
    config: ProviderConfig
): SuggestionProvider {
    return new GeminiSuggestionProvider(config)
}
