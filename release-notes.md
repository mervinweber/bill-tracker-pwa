# Release Notes

## Release Date
- 2026-03-04

## Scope
This release adds the new Upcoming Bills experience, introduces optional paycheck amount tracking for coverage insight, and fixes a settings-save regression for amount-only edits when legacy paycheck dates are in the past.

## Customer-Facing Summary
BillTracker now includes a dedicated Upcoming tab with cleaner at-a-glance bill cards, inline actions, total upcoming due, and a paycheck coverage indicator. You can also save an optional paycheck amount in setup/settings to power coverage feedback. A regression fix ensures amount-only edits save correctly without incorrectly triggering schedule-date validation.

## Included PRs

### PR #19 — Paycheck Amount Save Regression Fix + Regression Guard
- URL: https://github.com/mervinweber/bill-tracker-pwa/pull/19
- Key changes:
  - Fixed schedule-change detection to exclude paycheck amount-only edits
  - Added regression test coverage to prevent reintroduction

### Main Branch Feature Commit — Upcoming Bills + Coverage + Amount Input
- Commit: 4882cd5
- Key changes:
  - Added dedicated Upcoming Bills tab and rendering flow
  - Added inline mark-paid, update-due-date, and edit actions in Upcoming view
  - Added total upcoming due summary and paycheck coverage indicator
  - Added optional paycheck amount field in setup and settings

## Validation Summary
- Full test suite passes
- Production build passes
- Service worker cache manifest validation passes
- Runtime dependency audit (`npm audit --omit=dev`) reports 0 vulnerabilities
- Local dev server smoke check returns HTTP 200 and valid app shell on `http://127.0.0.1:4173/`

## Recommended Post-Release Checks
- Manual UI pass for Upcoming tab on desktop + mobile viewport
- Manual confirmation of amount-only settings save with legacy past paycheck start date
- Quick sanity pass on inline Upcoming actions (Mark Paid, Update Date, Edit)

---

## Release Date
- 2026-03-02

## Scope
This release adds a mobile-first UX pass across payment flows and list interactions, plus closes a lingering settings-handler regression test mismatch.

## Customer-Facing Summary
BillTracker is now faster and cleaner on mobile: payment actions are streamlined, overdue monthly catch-up behavior uses explicit in-app choices, header controls are simplified with progressive disclosure, and bill-row actions/columns are optimized for small screens.

## Included PRs

### PR #17 — Mobile-First Payment Flow + UX Improvements
- URL: https://github.com/mervinweber/bill-tracker-pwa/pull/17
- Key changes:
  - Added payment modal quick-pay flow with contextual bill summary
  - Replaced native monthly-overdue confirm flow with explicit strategy controls
  - Consolidated duplicate payment entry paths into payment modal flow
  - Added mobile progressive disclosure for advanced header controls
  - Added compact row-action disclosure and larger touch targets
  - Prioritized core table columns on small screens
  - Added `MOBILE_UX_FLOW_REVIEW_README.md` planning reference

### Maintenance — Settings Handler Regression Test Alignment
- Key changes:
  - Updated `tests/settingsHandler.test.js` to validate helper-based schedule comparison logic via `hasPaymentScheduleChanged()`

## Validation Summary
- Full test suite passes
- Production build passes
- Service worker cache manifest validation passes
- Runtime dependency audit (`npm audit --omit=dev`) reports 0 vulnerabilities

---

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
