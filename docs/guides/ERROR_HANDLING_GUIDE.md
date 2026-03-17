# Error Handling Guide

## Goals
- Keep errors actionable for users
- Keep logs safe (no sensitive payloads)
- Keep recovery paths explicit and testable

## Error Classification
- Validation errors: user input/data shape violations
- State errors: invalid transitions or missing required app state
- Service errors: API/auth/network failures
- Storage errors: local persistence failures, quota constraints
- Unknown errors: unexpected exceptions

## Recommended Error Object Shape
```js
{
  code: 'INVALID_PAYMENT_SETTINGS',
  message: 'Pay period start date is invalid.',
  recoverable: true,
  context: { field: 'startDate' }
}
```

## Handler Template
```js
export function handleFeatureAction(input) {
  try {
    const validation = validateInput(input);
    if (!validation.ok) {
      return {
        error: {
          code: 'VALIDATION_FAILED',
          message: validation.message,
          recoverable: true
        }
      };
    }

    // perform action
    return { data: result, error: null };
  } catch (err) {
    logger.error('Feature action failed', { message: err?.message });
    return {
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Something went wrong. Please try again.',
        recoverable: true
      }
    };
  }
}
```

## User-Facing Message Strategy
- Use direct, non-technical language
- Tell the user what failed and what to do next
- Avoid leaking internals (stack traces, keys, ids)

Examples:
- Good: "Your changes could not be saved to the cloud. Check your connection."
- Bad: "POST /user_data returned 500 with payload validation mismatch"

## Logging Strategy
- Log categories: `debug`, `info`, `warn`, `error`
- Never log sensitive values (email, auth tokens, bill notes/payment details)
- Log summaries and booleans instead (`hasError`, `action`, `entityType`)

## Testing Strategy
- Unit test both success and error branches
- Test recoverable errors with expected user notification
- Test unknown errors return safe fallback messages
- Include negative tests for malformed JSON and oversized imports

## Centralized Error Codes
Canonical definitions live in `src/errors/errorCodes.js`.

| Code | Message | Recoverable |
| :--- | :--- | :--- |
| `STORAGE_QUOTA_EXCEEDED` | Not enough storage space is available to save your data. | `true` |
| `INVALID_PAYMENT_SETTINGS` | Payment settings are invalid. Please review and try again. | `true` |
| `IMPORT_NO_FILE_SELECTED` | No file selected. | `true` |
| `IMPORT_INVALID_FILE_TYPE` | Please select a valid JSON file. | `true` |
| `IMPORT_FILE_TOO_LARGE` | Import file is too large. Maximum allowed size is 5 MB. | `true` |
| `IMPORT_INVALID_JSON` | Invalid JSON format in file. | `true` |
| `IMPORT_INVALID_BILLS_ARRAY` | Invalid file format: bills must be an array. | `true` |
| `IMPORT_EMPTY_BILLS` | File contains no bills to import. | `true` |
| `IMPORT_TOO_MANY_BILLS` | Import file exceeds the maximum supported bill count. | `true` |
| `IMPORT_INVALID_BILL_ENTRIES` | Import contains invalid bill entries. | `true` |
| `IMPORT_NO_VALID_BILLS` | No valid bills found to import. | `true` |
| `IMPORT_FILE_READ_FAILED` | Error reading file. Please try again. | `true` |
| `SUPABASE_NOT_INITIALIZED` | Supabase not initialized. | `true` |
| `SUPABASE_AUTH_REQUIRED` | User not logged in. | `true` |
| `SUPABASE_INVALID_HOUSEHOLD_ID` | Invalid Household ID. | `true` |
| `SUPABASE_SYNC_FAILED` | Cloud sync failed. Please try again. | `true` |
| `UNKNOWN` | Something went wrong. Please try again. | `true` |

## Current Adoption
- Import validation and import UI error paths use centralized app errors.
- Supabase service response errors now return standardized `{ code, message, recoverable }` objects.
- Remaining modules should migrate incrementally to preserve behavior while improving consistency.
