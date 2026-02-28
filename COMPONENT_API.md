# Component API Reference

This document is the unified API reference for UI and view modules used by the app orchestrator.

## Scope

- UI components in `src/components/`
- View modules in `src/views/`
- Public exports only (functions imported by `src/app.js`)

---

## `src/components/header.js`

### `initializeHeader(paychecks, actions)`

Initializes the header UI and binds control handlers.

**Parameters**
- `paychecks: string[]` — Labels for paycheck dropdown options.
- `actions: object`
  - `onPaycheckSelect(index: number): void`
  - `onAllBillsSelect(): void`
  - `onFilterChange(filter: 'all' | 'paid' | 'unpaid'): void`
  - `onDisplayModeSelect(mode: 'list' | 'calendar' | 'analytics'): void`
  - `onToggleCarriedForward(show: boolean): void`

**Side effects**
- Replaces `#header` DOM content.
- Registers event listeners for view selection, pay period, payment filter, and overdue toggle.

### `updateHeaderUI(viewMode, selectedPaycheck, displayMode, showCarriedForward)`

Synchronizes header control visual state with app state.

**Parameters**
- `viewMode: 'all' | 'filtered'`
- `selectedPaycheck: number | null`
- `displayMode: 'list' | 'calendar' | 'analytics'`
- `showCarriedForward: boolean`

---

## `src/components/sidebar.js`

### `initializeSidebar(categories, actions)`

Builds category navigation, bulk actions, backup controls, auth controls, and theme toggle.

**Parameters**
- `categories: string[]`
- `actions: object`
  - `onCategorySelect(category: string): void`
  - `onOpenAddBill(): void`
  - `onRegenerateBills(): void`
  - `onExportData(): void`
  - `onImportData(file: File): void`
  - `onOpenAuth(): void`
  - `onLogout(): void`
  - `onBulkDelete(): void`
  - `onBulkMarkPaid(): void`
  - `onShowSettings(): void`

**Side effects**
- Replaces `#sidebar` DOM content.
- Persists theme to local storage key `theme`.
- Reads logged-in email from local storage key `userEmail`.

---

## `src/components/billGrid.js`

### `initializeBillGrid()`

Renders initial empty-state prompt in `#billGrid`.

### `renderBillGrid(state, actions)`

Renders the list-table bill view with filtering and row actions.

**`state` shape**
- `bills: Bill[]`
- `viewMode: 'all' | 'filtered'`
- `selectedPaycheck: number | null`
- `selectedCategory: string | null`
- `paymentFilter: 'all' | 'paid' | 'unpaid'`
- `showCarriedForward: boolean`
- `payCheckDates: Date[]`

**`actions`**
- `onUpdateBalance(billId: string, newBalance: number): void`
- `onTogglePayment(billId: string, isPaid: boolean): void`
- `onRecordPayment(billId: string): void`
- `onViewHistory(billId: string): void`
- `onDeleteBill(billId: string): void`
- `onEditBill(billId: string): void`

**Notes**
- Uses shared period/category/payment filtering via `filterBillsByPeriod`.
- Expects stable `bill.id` values for event routing.

---

## `src/components/dashboard.js`

### `initializeDashboard()`

Performs initial dashboard render.

### `renderDashboard(bills, viewMode, selectedPaycheck, selectedCategory, paymentFilter, payCheckDates, showCarriedForward = true)`

Renders top summary stats for current scope.

**Inputs**
- `bills: Bill[]`
- `viewMode: 'all' | 'filtered'`
- `selectedPaycheck: number | null`
- `selectedCategory: string | null`
- `paymentFilter: 'all' | 'paid' | 'unpaid'`
- `payCheckDates: Date[]`
- `showCarriedForward?: boolean`

---

## `src/components/billForm.js`

### `initializeBillForm(categories, actions)`

Builds the add/edit bill modal and binds form event handlers.

**Parameters**
- `categories: string[]`
- `actions: object`
  - `onSaveBill(billData: BillDraft): void`
  - `onMarkPaid(billId: string, isPaid: boolean): void`

### `openBillForm(bill)`

Opens modal in create or edit mode.

**Parameters**
- `bill?: Bill`

### `resetBillForm()`

Resets modal fields and validation state.

### `closeBillForm()`

Closes and resets modal.

---

## `src/components/authModal.js`

### `initializeAuthModal(actions)`

Injects and initializes login/signup modal.

**Parameters**
- `actions: object`
  - `onLogin(email: string, password: string): Promise<void> | void`
  - `onSignUp(email: string, password: string): Promise<void> | void`
  - `onResetPassword(email: string): Promise<void> | void`

### `openAuthModal()`

Displays modal and focuses email field.

### `closeAuthModal()`

Hides modal and clears message/inputs.

### `setAuthMessage(msg, isError = true)`

Sets transient modal status/error message.

---

## `src/views/calendarView.js`

### `initializeCalendarView()`

Ensures `#calendarView` exists under `#mainContent`.

### `renderCalendar()`

Renders current month calendar based on `appState.currentCalendarDate` and `billStore.getAll()`.

---

## `src/views/analyticsView.js`

### `initializeAnalyticsView()`

Ensures `#analyticsView` exists under `#mainContent`.

### `renderAnalytics({ bills, viewMode, selectedPaycheck, payCheckDates } = {})`

Renders category and trend charts (Chart.js) with optional filtered input.

### `cleanupCharts()`

Destroys active chart instances to prevent leaks.

---

## Minimal Integration Pattern

Used by the app orchestrator (`src/app.js`):

1. Initialize view containers (`initializeCalendarView`, `initializeAnalyticsView`).
2. Initialize components with action callbacks.
3. Subscribe to `appState` and `billStore`.
4. Re-render current display mode in a single `rerender()` path.

---

## Bill Shape (de-facto contract)

Common bill fields used across components:

- `id: string`
- `category: string`
- `name: string`
- `dueDate: string` (`YYYY-MM-DD`)
- `amountDue: number`
- `balance: number`
- `isPaid: boolean`
- `recurrence: 'One-time' | 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Yearly'`
- `notes?: string`
- `website?: string`
- `lastPaymentDate?: string | null`
- `paymentHistory?: Array<{ amount: number; date: string; method?: string; confirmationNumber?: string }>`
