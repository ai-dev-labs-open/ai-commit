import { CommitSuggestion, RawCommitSuggestion } from "./types";

const HEADER_PATTERN = /^(?<type>[a-z0-9-]+)(?:\((?<scope>[^)]+)\))?:\s*(?<subject>.+)$/i;
const FALLBACK_TYPE = "chore";
const FALLBACK_SUBJECT = "update project files";

export interface NormalizeOptions {
  includeBody: boolean;
  maxSubjectLength: number;
  forcedType?: string;
  forcedScope?: string;
}

interface HeaderParts {
  type?: string;
  scope?: string | null;
  subject: string;
}

function coerceString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function coerceNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  return typeof value === "string" ? value : undefined;
}

function extractJsonObject(text: string): string | null {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
}

function extractHeader(line?: string): HeaderParts | null {
  if (!line) {
    return null;
  }

  const match = line.trim().match(HEADER_PATTERN);

  if (!match?.groups) {
    return null;
  }

  return {
    type: match.groups.type?.trim().toLowerCase(),
    scope: match.groups.scope?.trim().toLowerCase() ?? null,
    subject: match.groups.subject.trim()
  };
}

function stripCodeFences(text: string): string {
  return text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
}

function firstNonEmptyLine(text: string): string | undefined {
  return stripCodeFences(text)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function extractFallbackBody(text: string): string | null {
  const cleaned = stripCodeFences(text);
  const parts = cleaned.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  return parts.slice(1).join("\n\n");
}

function sanitizeSubject(value: string, maxSubjectLength: number): string {
  let subject = value
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const parsedHeader = extractHeader(subject);

  if (parsedHeader) {
    subject = parsedHeader.subject;
  }

  subject = subject.replace(/[.]+$/, "").trim();

  if (!subject) {
    subject = FALLBACK_SUBJECT;
  }

  if (subject.length <= maxSubjectLength) {
    return subject;
  }

  const truncated = subject.slice(0, Math.max(1, maxSubjectLength - 3));
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace >= 20) {
    return truncated.slice(0, lastSpace).trimEnd() + "...";
  }

  return truncated.trimEnd() + "...";
}

function sanitizeType(value?: string): string {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || !/^[a-z0-9-]+$/.test(normalized)) {
    return FALLBACK_TYPE;
  }

  return normalized;
}

function sanitizeScope(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (!/^[a-z0-9._-]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function sanitizeBody(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleaned || cleaned.toLowerCase() === "null") {
    return null;
  }

  return cleaned;
}

export function parseSuggestionText(text: string): RawCommitSuggestion {
  const jsonCandidate = extractJsonObject(text);

  if (jsonCandidate) {
    try {
      const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;

      return {
        type: coerceString(parsed.type),
        scope: coerceNullableString(parsed.scope),
        subject: coerceString(parsed.subject),
        body: coerceNullableString(parsed.body),
        rawText: text
      };
    } catch {
      // Fall through to plain text parsing.
    }
  }

  const firstLine = firstNonEmptyLine(text);
  const header = extractHeader(firstLine);

  return {
    type: header?.type,
    scope: header?.scope ?? null,
    subject: header?.subject ?? firstLine,
    body: extractFallbackBody(text),
    rawText: text
  };
}

export function formatCommitMessage(commit: Omit<CommitSuggestion, "fullMessage">): string {
  const header = commit.scope
    ? `${commit.type}(${commit.scope}): ${commit.subject}`
    : `${commit.type}: ${commit.subject}`;

  return commit.body ? `${header}\n\n${commit.body}` : header;
}

export function normalizeCommitSuggestion(
  raw: RawCommitSuggestion,
  options: NormalizeOptions
): CommitSuggestion {
  const headerFromSubject = extractHeader(raw.subject);
  const headerFromRawText = extractHeader(firstNonEmptyLine(raw.rawText));
  const subjectSource = headerFromSubject?.subject ??
    raw.subject ??
    headerFromRawText?.subject ??
    FALLBACK_SUBJECT;
  const type = sanitizeType(options.forcedType ?? raw.type ?? headerFromSubject?.type ?? headerFromRawText?.type);
  const scope = sanitizeScope(options.forcedScope ?? raw.scope ?? headerFromSubject?.scope ?? headerFromRawText?.scope ?? null);
  const subject = sanitizeSubject(subjectSource, options.maxSubjectLength);
  const body = options.includeBody
    ? sanitizeBody(raw.body ?? extractFallbackBody(raw.rawText))
    : null;
  const fullMessage = formatCommitMessage({ type, scope, subject, body });

  return {
    type,
    scope,
    subject,
    body,
    fullMessage
  };
}

