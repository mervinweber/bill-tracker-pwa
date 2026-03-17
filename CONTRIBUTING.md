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

### Run full test suite

```bash
npm test
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

## Logging Best Practices

When adding logging statements, **never log sensitive user data** that could expose personal or financial information in browser console or server logs.

### ❌ DO NOT LOG:
- User email addresses or any PII (personally identifiable information)
- Password reset tokens or authentication credentials
- Payment settings, bill amounts, or financial data
- User-provided input that may contain sensitive values
- Full error objects that contain nested sensitive properties

### ✅ DO LOG:
- Generic operation status: `'User authenticated successfully'`, `'Payment settings updated'`
- Aggregate counts: `'Loaded 5 bills from storage'`
- Non-sensitive error descriptions: `'Failed to sync cloud data'`
- Flags/booleans indicating success/failure: `{ hasError: true }` (without the error details)
- Context identifiers that are not personally identifiable: `{ billId: 'bill_123' }`

### Example Refactors:

**Before (sensitive):**
```javascript
logger.info('User logged in', { email: user.email });
logger.info('Payment settings loaded', { settings });
logger.info('Reset password requested', { email });
```

**After (sanitized):**
```javascript
logger.info('User authenticated and session initialized');
logger.info('Payment settings retrieved', { categoryCount: settings.categories?.length });
logger.info('Password reset requested');
```

The logger uses `[DEBUG]`, `[INFO]`, `[WARN]`, `[ERROR]` severity levels. Use logs for debugging workflow, not storing user data.
