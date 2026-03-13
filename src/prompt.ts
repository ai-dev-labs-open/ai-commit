import { ProviderRequest } from './types'

export const CONVENTIONAL_TYPES = [
    'feat',
    'fix',
    'docs',
    'style',
    'refactor',
    'test',
    'build',
    'ci',
    'chore',
    'perf',
    'revert',
] as const

export function buildSystemPrompt(): string {
    return [
        'You generate exactly one conventional commit suggestion.',
        'Return JSON only with the keys type, scope, subject, body.',
        `Prefer one of these types when relevant: ${CONVENTIONAL_TYPES.join(', ')}.`,
        'subject must be imperative, concise, and must not end with a period.',
        'scope must be null or a short lowercase noun.',
        'body must be null or one short paragraph with no bullet points.',
        'Do not include markdown fences or explanatory text.',
    ].join(' ')
}

export function buildUserPrompt(request: ProviderRequest): string {
    const lines = [
        'Generate a commit suggestion for the staged Git diff below.',
        `Maximum subject length: ${request.maxSubjectLength} characters.`,
        `Include commit body: ${request.includeBody ? 'yes' : 'no'}.`,
        `Forced type: ${request.forcedType ?? 'none'}.`,
        `Forced scope: ${request.forcedScope ?? 'none'}.`,
        'Return this exact JSON shape (this is only a structural example, not the answer):',
        '{"type":"feat","scope":"cli","subject":"add JSON output flag","body":"Return structured commit data for shell automation workflows."}',
        '',
        '<staged_diff>',
        request.diff,
        '</staged_diff>',
    ]

    if (!request.includeBody) {
        lines.splice(6, 0, 'Set "body" to null.')
    }

    return lines.join('\n')
}
