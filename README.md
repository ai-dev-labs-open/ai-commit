# ai-commit

`ai-commit` turns staged Git changes into clean conventional commit suggestions using Claude.

## What It Does

`ai-commit` reads the diff for your staged changes, asks Claude for one conventional commit suggestion, normalizes the response, and prints a paste-ready commit message. It is intentionally narrow:

- staged changes only
- suggestion-only by default; use `--commit` to apply it
- Anthropic Claude only in this release line

## Why It Exists

Good commit messages are small, but they still cost focus. `ai-commit` is for the moment after `git add` when you want a useful commit message quickly without handing control of your Git history to an automated tool.

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

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | — | Your Anthropic API key |
| `AI_COMMIT_MODEL` | no | `claude-3-5-sonnet-latest` | Model to use |
| `AI_COMMIT_MAX_SUBJECT_LENGTH` | no | `72` | Maximum subject line length |

## Usage

Generate a suggestion for your staged changes:

```bash
git add <files>
ai-commit
```

Example output:

```text
feat(cli): add JSON output flag

Return structured commit data for shell automation workflows.
```

Apply the generated message immediately:

```bash
ai-commit --commit
```

Force a type and scope:

```bash
ai-commit --type feat --scope cli
```

Omit the body:

```bash
ai-commit --no-body
```

## Flags

| Flag | Description |
|---|---|
| `--commit` | Run `git commit -m` with the generated message (opt-in) |
| `--json` | Print a JSON object instead of plain text |
| `--type <type>` | Force the conventional commit type |
| `--scope <scope>` | Force the conventional commit scope |
| `--no-body` | Omit the commit body |
| `--max-subject-length <n>` | Override the maximum subject line length |

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

See [`examples/sample-staged-diff.patch`](examples/sample-staged-diff.patch) and [`examples/expected-output.txt`](examples/expected-output.txt) for a minimal fixture.

## Roadmap

- Git hook integration (deferred: requires a subcommand and extra edge-case handling for merge/amend commits)
- More model providers behind a stable interface
- PR and changelog generation

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
