# ai-commit

`ai-commit` turns staged Git changes into clean conventional commit suggestions using Claude.

## What It Does

`ai-commit` reads the diff for your staged changes, asks Claude for one conventional commit suggestion, normalizes the response, and prints a paste-ready commit message. It is intentionally narrow:

- staged changes only
- suggestion only, no auto-commit
- Anthropic Claude only in v1

## Why It Exists

Good commit messages are small, but they still cost focus. `ai-commit` is for the moment after `git add` when you want a useful commit message quickly without handing control of your Git history to an automated tool.

This repository is also designed to be a credible, maintainable open-source CLI:

- small surface area
- typed codebase
- examples and tests
- npm-ready packaging

## Quick Start

```bash
npm install
export ANTHROPIC_API_KEY=your_api_key
npm run build
git add <files>
node dist/cli.js
```

Example output:

```text
feat(cli): add JSON output flag

Return structured commit data for shell automation workflows.
```

## Environment Setup

Required:

- `ANTHROPIC_API_KEY`

Optional:

- `AI_COMMIT_MODEL`
- `AI_COMMIT_MAX_SUBJECT_LENGTH`

Defaults:

- model: `claude-3-5-sonnet-latest`
- max subject length: `72`

## Example Usage

Generate a standard suggestion:

```bash
node dist/cli.js
```

Force a type and scope:

```bash
node dist/cli.js --type feat --scope cli
```

Omit the body:

```bash
node dist/cli.js --no-body
```

See [`examples/sample-staged-diff.patch`](/Users/levan/Documents/GitHub/ai-commit/examples/sample-staged-diff.patch) and [`examples/expected-output.txt`](/Users/levan/Documents/GitHub/ai-commit/examples/expected-output.txt) for a minimal fixture.

## JSON Mode

Use `--json` for automation-friendly output:

```bash
node dist/cli.js --json
```

Example response:

```json
{
  "type": "feat",
  "scope": "cli",
  "subject": "add JSON output flag",
  "body": "Return structured commit data for shell automation workflows.",
  "fullMessage": "feat(cli): add JSON output flag\n\nReturn structured commit data for shell automation workflows."
}
```

## Roadmap

- optional Git hook integration
- optional flag to run `git commit`
- more model providers behind a stable interface
- PR and changelog generation

## Contributing

The first milestone is a small, reliable CLI. Contributions should preserve that shape:

- keep the core flow readable
- avoid speculative abstractions
- prefer tests for normalization and CLI behavior

Run the local checks before opening a pull request:

```bash
npm test
npm run typecheck
npm run build
```

