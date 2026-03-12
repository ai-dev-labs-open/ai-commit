# Contributing to ai-commit

Thank you for your interest in contributing. This project is intentionally small — please read this guide before opening a pull request.

## Project Shape

`ai-commit` is a narrow CLI: read a staged diff, ask Claude, normalize the result, print it. Contributions that preserve that shape are welcome. Contributions that add multi-provider support, PR generation, changelog tooling, or large abstractions are out of scope for this release line.

## Getting Started

```bash
git clone https://github.com/ai-dev-labs-open/ai-commit.git
cd ai-commit
npm install
```

Set your API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Development Workflow

Run all checks before opening a PR:

```bash
npm test          # unit tests (vitest)
npm run typecheck # tsc --noEmit
npm run build     # tsup → dist/
```

All three must pass. CI runs them on Node 20 and 22.

## Adding or Changing Behavior

- **Every behavioral change needs a test.** Tests live in `tests/` and use vitest.
- **Keep the CLI injectable.** `runCli` accepts a `CliDependencies` object so tests never touch the real filesystem or network.
- **Update `README.md`** if you add a flag, change an env var, or alter the output format.
- **Use conventional commits** for your commit messages (the tool itself can help).

## Pull Request Checklist

- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] New behavior is covered by tests
- [ ] `README.md` is updated if the interface changed
- [ ] Commit messages follow the conventional commit format

## Reporting Issues

Open an issue at <https://github.com/ai-dev-labs-open/ai-commit/issues> with steps to reproduce and the output of `ai-commit --help`.
