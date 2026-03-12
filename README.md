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

## Installation

From npm (once published):

```bash
npm install -g ai-commit
export ANTHROPIC_API_KEY=sk-ant-...
```

From source:

```bash
git clone https://github.com/ai-dev-labs-open/ai-commit.git
cd ai-commit
npm install && npm run build
export ANTHROPIC_API_KEY=sk-ant-...
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

## Usage

Generate a suggestion for your staged changes:

```bash
git add <files>
ai-commit
```

Force a type and scope:

```bash
ai-commit --type feat --scope cli
```

Omit the body:

```bash
ai-commit --no-body
```

Commit immediately with the generated message (opt-in):

```bash
ai-commit --commit
```

See [`examples/sample-staged-diff.patch`](examples/sample-staged-diff.patch) and [`examples/expected-output.txt`](examples/expected-output.txt) for a minimal fixture.

## JSON Mode

Use `--json` for automation-friendly output:

```bash
ai-commit --json
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

