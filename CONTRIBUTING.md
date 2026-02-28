# Contributing to Bill Tracker PWA

Thanks for contributing.

## Prerequisites

- Node.js 14+ and npm 6+
- Git

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open the local URL shown in terminal (typically `http://localhost:5173`).

## Branching and PR Workflow

1. Sync with latest `main`.
2. Create a focused feature/fix branch.
3. Keep changes scoped to a single concern.
4. Open a pull request to `main` with a clear summary and testing notes.

## Code Style Guidelines

- Follow existing project patterns and naming conventions.
- Keep modules focused and small.
- Prefer utility reuse over duplicate logic.
- Avoid unrelated refactors in feature/fix PRs.
- Preserve accessibility and keyboard behavior in UI changes.

## Testing Expectations

Run relevant tests before opening a PR.

### Run all Node-based test files

```bash
bash -lc 'for f in tests/*.test.js; do echo "\n== $f =="; node "$f" || exit 1; done'
```

### Run browser-based test runner

```bash
open tests/test-runner.html
```

## Commit Guidelines

- Use clear, imperative commit messages.
- Reference the area changed (for example: `Fix paycheck carry-forward logic`).
- Include why the change was needed in the PR description.

## Documentation

When behavior or architecture changes, update relevant docs:

- `README.md`
- `ARCHITECTURE.md`
- `DEVELOPER_SETUP.md`
- `IMPROVEMENT_ROADMAP.md`

## Security

If you discover a security issue, follow guidance in `SECURITY.md`.
