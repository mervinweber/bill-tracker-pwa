# JSON Import Process Flow

## Supported Input Shape
```json
{
  "bills": [
    {
      "name": "Electric Bill",
      "category": "Utilities",
      "dueDate": "2026-03-01",
      "amountDue": 120,
      "recurrence": "Monthly"
    }
  ],
  "paymentSettings": {
    "startDate": "2026-01-01",
    "frequency": "bi-weekly",
    "payPeriodsToShow": 4
  },
  "categories": ["Utilities", "Rent", "Subscriptions"]
}
```

## End-to-End Flow
1. User selects a `.json` file from import UI
2. Pre-flight checks:
   - File type is JSON
   - File size is within guardrail limits (max 5MB)
3. Parse and sanitize:
   - `safeJSONParse()` protects against malformed payloads
4. Normalize:
   - Missing optional fields are defaulted
   - IDs are generated when absent
5. Validate:
   - Bills and payment settings validated by schema/business rules
6. Merge and persist:
   - Bills persisted to local storage/store
   - Categories merged without duplicates
   - Payment settings persisted when valid
7. Post-import actions:
   - Success notification shown
   - App refreshes/rerenders to reflect imported state

## Error Scenarios and User Messages
- Invalid JSON: "Could not import file. The JSON format is invalid."
- Oversized file: "Import file is too large. Maximum supported size is 5MB."
- Invalid bill payload: "Import contains invalid bill data."
- Invalid payment settings: "Import contains invalid payment settings."

## Manual QA Checklist
- Import valid JSON with multiple bills
- Import malformed JSON and verify safe failure
- Import oversized file and verify guardrail message
- Import with missing bill IDs and confirm IDs are generated
- Import with new categories and confirm merge behavior
- Verify app state after reload
