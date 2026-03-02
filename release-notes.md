# Release Notes

## Release Date
- 2026-03-01

## Scope
This release focuses on settings reliability, recurring-payment UX clarity, security hardening for JSON imports, and reduced-cost Supabase usage.

## Customer-Facing Summary
This update makes BillTracker more reliable and safer: saving settings now works smoothly even when cleaning up unused categories, overdue monthly bill payment prompts are clearer about what will happen, and import handling is more robust against malformed JSON data. We also reduced unnecessary cloud-auth and sync overhead to help keep API usage efficient while preserving normal sync behavior.

## Included PRs

### PR #13 — Security + API Cost Hardening
- URL: https://github.com/mervinweber/bill-tracker-pwa/pull/13
- Key changes:
  - Hardened JSON import validation and sanitization for bills and payment metadata
  - Added import guardrail for overly large bill imports
  - Validated imported payment settings before persistence
  - Reduced Supabase overhead by deduplicating/caching `getUser()` lookups
  - Removed unnecessary response payloads from sync upserts

### PR #12 — Regression Coverage for Settings Save Guard
- URL: https://github.com/mervinweber/bill-tracker-pwa/pull/12
- Key changes:
  - Added stronger regression tests ensuring schedule validation only runs when schedule fields are changed
  - Verifies guard behavior for `startDate`, `frequency`, and `payPeriodsToShow`

### PR #11 — Settings Save Fix for Category Cleanup
- URL: https://github.com/mervinweber/bill-tracker-pwa/pull/11
- Key changes:
  - Fixed settings-save flow so category/reminder changes are not blocked by legacy past schedule dates
  - Schedule validation now runs only when schedule fields are modified

### PR #10 — Overdue Monthly Catch-up Prompt Clarity
- URL: https://github.com/mervinweber/bill-tracker-pwa/pull/10
- Key changes:
  - Clarified the overdue monthly catch-up confirmation copy
  - Prompt now clearly states both outcomes and resulting due dates

## Validation Summary
- Full test suite passes
- Production build passes
- Service worker cache manifest validation passes
- Runtime dependency audit (`npm audit --omit=dev`) reports 0 vulnerabilities

## Recommended Post-Release Checks
- Manual smoke test for Settings → Clean Up Unused → Save with old schedule date
- Valid + invalid JSON import sanity checks
- Signed-in quick edit/payment flow to confirm sync behavior and no request spikes
