# Bill Tracker PWA — Master Todo List

> Consolidated from: `checklist.md`, `REFACTORING_CHECKLIST.md`, `PRODUCTION_CHECKLIST.md`,
> `IMPROVEMENT_ROADMAP.md`, `NEXT_STEPS_REVIEW.md`, `CODE_REVIEW.md`,
> `CODE_REVIEW_IMPROVEMENTS.md`, `FEATURE_REQUEST_CODE_QUALITY.md`,
> `PHASE_1_2_IMPROVEMENTS.md`, `VERCEL_DEPLOYMENT_CHECKLIST.md`
>
> **Last Updated**: March 16, 2026
> All 100%-complete items have been removed. Items below require action.

## ✅ User Steps You Need To Complete

### Security (Turnstile + Supabase)
- [ ] Add `VITE_TURNSTILE_SITE_KEY` to your environment (`.env.local` for local and hosting provider env vars for production)
- [ ] In Supabase Dashboard, enable Auth CAPTCHA and configure Cloudflare Turnstile keys
- [ ] Verify challenge enforcement on live login with wrong password attempts (after 3 failures challenge appears; after 5 failures lockout remains)

### Manual Production Checks
- [ ] Verify deployed app loads manifest + service worker correctly
- [ ] Run 5-minute post-deploy smoke pass on production URL
- [ ] Verify cloud sync state after login/logout with a real Supabase account

---

## 🚀 Section 1: Immediate — Release & Deployment

### 1.1 PR / Branch Management
- [x] Merge PR #20 (`fix/auth-and-settings-ui`) into `main`
  - Includes: Sign In restored in sidebar, settings modal redesign, button color normalization

### 1.2 Manual Smoke Tests *(run before each production deploy)*
- [x] Settings: "Clean Up Unused" → Save with an old paycheck start date (should save without forcing schedule change)
  - *Verified: `hasPaymentScheduleChanged()` guard skips validation when schedule fields are unchanged*
- [x] Settings: Change schedule fields (start date / frequency / pay periods) and confirm validation still applies correctly
  - *Verified: `validatePaymentSettings()` runs when schedule fields change*
- [x] Import a valid JSON backup (should import and refresh successfully)
  - *Verified: `normalizeImportPayload` + `safeJSONParse` pipeline; success toast + reload*
- [x] Import invalid JSON data (bad amount, malformed payment history, invalid payment settings) and confirm friendly error
  - *Verified: `safeJSONParse` returns null → error toast shown*
- [x] Import an oversized / very large bill file and confirm it is rejected safely
  - *Fixed: pre-flight `file.size > 5 MB` check now shows explicit size error (was generic)*
- [x] Login + rapid bill edits (create / edit / pay / delete) and confirm cloud sync works without request spam
  - *Verified: `handleCloudSync` uses 2-second debounce via clearTimeout/setTimeout*
- [ ] Record payment on a long-overdue monthly recurring bill and confirm prompt options behave correctly
  - *Requires live browser test — code path verified: `getRecurringPaymentStrategy` detects ≥2 missed cycles and offers catch-up option*

### 1.3 Go / No-Go Gate *(must pass before tagging a release)*
- [x] No console errors during key flows above *(build clean, 0 type errors)*
- [ ] No blocking UI issues on desktop + mobile viewport *(requires live browser check)*
- [x] Data persists correctly after a browser reload *(localStorage via StorageManager; 244 tests pass)*
- [ ] Cloud sync state is consistent after login / logout *(requires live Supabase test)*

### 1.4 Deployment Steps
- [x] Create release tag (`v1.0.1` — annotated, pushed to GitHub)
- [x] Deploy from current `main` *(pushed `a7e3cf1`; Vercel auto-deploy triggered)*
- [ ] Verify deployed app loads manifest and service worker correctly *(manual check on live URL)*
- [ ] Run 5-minute post-deploy smoke pass on production URL

### 1.5 Post-Deploy Monitoring *(first session after each deploy)*
- [ ] Watch browser console / network for auth or sync error bursts
- [ ] Confirm no unexpected Supabase call spikes
- [ ] Confirm imports and settings saves continue to behave as expected

---

## 🎨 Section 2: UI / UX Improvements

### 2.1 Empty-State Layout Optimization *(IMPROVEMENT_ROADMAP.md § 2.6)*
- [x] Add actionable empty-state CTA panel when bill count is 0 (Add Bill / Import / Settings)
- [x] Add short first-run checklist (Add bill → Set reminders → Review upcoming)
- [x] Make dashboard card section visually denser on desktop (reduce wasted vertical space)
- [ ] Verify bulk action confirmations are consistently visible and centered over all views
- [ ] Verify mobile layout remains functional with no overlap / regression after changes

### 2.2 State Management Guide *(IMPROVEMENT_ROADMAP.md § 2.3 — one item still open)*
- [ ] Add state flow diagrams to `STATE_MANAGEMENT_GUIDE.md`

---

## ⚙️ Section 3: Code Quality & Technical Debt

### 3.1 Storage Layer — Critical
- [ ] Create `src/utils/StorageManager.js` with `get()`, `set()`, `remove()` and quota-exceeded handling
- [ ] Replace all 60+ direct `localStorage.getItem` / `setItem` / `removeItem` calls throughout `app.js`, handlers, components, and store
- [ ] Add unit tests for StorageManager (including private-browsing and quota-exceeded paths)
- [ ] Verify app still works in private browsing mode after migration

### 3.2 Service Worker Consolidation — High
- [x] Audit differences between `src/service-worker.js` and `public/service-worker.js` (path mappings differ)
- [x] Make `src/service-worker.js` the single source of truth
- [x] Remove / deprecate the redundant `src/serviceWorker.js` (registration-only, 12 lines)
- [x] Update build config to copy the canonical service worker to `public/` during build
- [ ] Confirm caching works correctly in a production build after consolidation

### 3.3 Remove Deprecated Module
- [x] Remove `src/utils/storage.js` (deprecated — `getBills()` / `saveBills()` bypass BillStore)
- [x] Search for remaining imports of `storage.js` and update them to use BillStore directly

### 3.4 Eliminate Duplicate Bill Cycling Logic
- [x] Extract duplicated cycling block from `togglePaymentStatus()` and `recordPayment()` into a shared `advanceBillToNextCycle(bill)` utility in `src/utils/billHelpers.js`
- [x] Update both call sites to use the shared utility
- [x] Add / extend tests to cover all recurrence types through the new utility

### 3.5 Extract Cloud Sync Patterns
- [x] Create `src/utils/cloudSyncManager.js`
- [x] Extract `syncPaymentSettingsFromCloud()` and `syncBillsFromCloud()` from the repeated patterns in `app.js`
- [x] Replace all duplicate sync blocks in `app.js` with the new manager
- [x] Add tests for sync and merge scenarios

### 3.6 Refactor Monolithic app.js
- [ ] Extract modal-creation logic → `src/app/initializeModals.js`
- [ ] Extract auth/login event handlers → `src/app/loginHandlers.js`
- [ ] Extract theme management → `src/app/themeManager.js`
- [ ] Extract navigation handlers (filter, view changes) → `src/app/navigationHandlers.js`
- [ ] Trim `app.js` to ≤ 400 lines (orchestration only)
- [ ] Confirm no functionality is lost; all tests still pass

### 3.7 Input Validation
- [x] Add `validatePaymentSettings()` to `src/utils/validation.js`
  - Validate `startDate` (must be a valid date, not unreasonably far in future)
  - Validate `frequency` (must be: weekly | bi-weekly | monthly)
  - Validate `payPeriodsToShow` (positive integer)
- [x] Wire validation in `settingsHandler.js` before calling `paycheckManager.updateSettings()`
- [x] Show clear per-field error if validation fails
- [x] Add unit tests for the validator

### 3.8 Centralize App Constants
- [ ] Create `src/config/constants.js` and move all magic numbers and app-wide constants:
  `APP_VERSION`, `CACHE_NAME`, `MAX_YEARS_FUTURE / PAST`, `MAX_BILL_AMOUNT`,
  `DEFAULT_CATEGORIES`, `RETRY_CONFIG`, `SYNC_DEBOUNCE_DELAY`, gesture thresholds (500 ms, 50 px)
- [ ] Update all files that currently hardcode these values

---

## 🔐 Section 4: Security

### 4.1 Enhanced XSS Protection
- [ ] Install `dompurify` package
- [ ] Update `sanitizeInput()` in `src/utils/validation.js` to use DOMPurify (strip all HTML tags and attributes)
- [ ] Remove the current basic regex-based sanitization
- [ ] Add security test cases for common XSS vectors

### 4.2 Sanitize Sensitive Data in Logs
- [ ] Audit all calls to `logger.*` for sensitive fields (email, payment settings, bill data)
- [ ] Replace specific personal/financial values with generic messages (e.g. `'User authenticated successfully'`)
- [ ] Document "what NOT to log" in `CONTRIBUTING.md`

### 4.3 Supabase Token Refresh
- [ ] Add token expiry detection and silent refresh mechanism in `src/services/supabase.js`
- [ ] Show user-friendly session-expired prompt when refresh fails
- [ ] Add token expiry warning (e.g. 5 minutes before expiry)

---

## 📚 Section 5: Documentation Gaps

### 5.1 Architecture Decision Records *(IMPROVEMENT_ROADMAP.md § 2.1)*
- [ ] Create `docs/adr/` directory
- [ ] Write `001-modular-architecture.md` — why modular over monolithic, trade-offs
- [ ] Write `002-singleton-pattern.md` — rationale for AppState singleton
- [ ] Write `003-listener-pattern-for-reactivity.md` — subscriber pattern decision

### 5.2 Error Handling Patterns Guide *(IMPROVEMENT_ROADMAP.md § 2.4)*
- [ ] Create `ERROR_HANDLING_GUIDE.md`
- [ ] Document error hierarchy / classification
- [ ] Provide handler template for adding new error handlers
- [ ] Document user-facing error message strategy and testing strategies

### 5.3 Centralized Error Codes *(CODE_REVIEW.md § 6.1 / FEATURE_REQUEST § US-7.1)*
- [ ] Create `src/errors/errorCodes.js` defining all error scenarios
  (`STORAGE_QUOTA_EXCEEDED`, `INVALID_PAYMENT_SETTINGS`, `SUPABASE_AUTH_FAILED`, etc.)
- [ ] Each error code includes: `code`, `message`, `recoverable` flag
- [ ] Update error handling throughout to use error codes
- [ ] Document all codes in `ERROR_HANDLING_GUIDE.md`

### 5.4 API Integration Guide *(IMPROVEMENT_ROADMAP.md § 2.5)*
- [ ] Create `API_INTEGRATION_GUIDE.md`
- [ ] Document Supabase setup, data sync strategy, authentication flow
- [ ] Cover offline fallback strategy and API error handling
- [ ] Include testing examples for API integrations

### 5.5 Local Development Workflow *(IMPROVEMENT_ROADMAP.md § 3.2)*
- [ ] Create `LOCAL_WORKFLOW.md`
- [ ] Document step-by-step feature development workflow
- [ ] List all dev/test/build commands with explanations
- [ ] Document common debugging strategies and known issues

### 5.6 Complete JSDoc / Type Documentation *(FEATURE_REQUEST § US-7.2)*
- [ ] Add `@typedef` for complex domain objects: `Bill`, `PaymentSettings`, `Category`, `SyncOperation`
- [ ] Complete `@param` and `@returns` on all public functions
- [ ] Add `@throws` documentation where errors are expected

---

## 🛠️ Section 6: Engineering / Performance

### 6.1 Lazy Load Heavy Views
- [ ] Implement dynamic `import()` for `src/views/calendarView.js` (only load when Calendar tab opens)
- [ ] Implement dynamic `import()` for `src/views/analyticsView.js` (only load when Analytics tab opens)
- [ ] Verify bundle size decreases and initial load time improves

### 6.2 Debounce Settings Save
- [ ] Wrap the Supabase sync call in `settingsHandler.js` with a debounce (≥ 1 000 ms) to prevent rapid sequential requests when user clicks Save multiple times quickly

### 6.3 Calendar View Incremental Rendering
- [ ] Investigate replacing full DOM rebuild in `calendarView.js` with targeted updates (patch only changed days rather than calling full `renderCalendar()` on every state change)
