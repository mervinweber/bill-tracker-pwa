# Bill Tracker PWA

A robust, offline-capable Progressive Web App for tracking recurring bills, managing payments, and synchronizing data across devices.

## ✨ Current Status

**Version**: 1.1.0  
**Architecture**: Modular, production-ready  
**Test Coverage**: 312 automated tests  
**Accessibility**: WCAG 2.1 Level AA compliant  
**Latest Update**: April 2026 - Added Debt Snowball Planner, avalanche/snowball strategy toggle, projected payoff months, debt dashboard widget, reconciliation rule engine, unified bill history timeline, and bulk-action undo.

## 🚀 Features

### Core Functionality
*   **PWA Core**: Installable on mobile/desktop, works offline with Service Worker caching and IndexedDB sync queue
*   **Smart Dashboard**: Compact "Stats Bar" with instant visibility of total due, paid, and overdue bills
*   **Multiple Views**:
    *   **📋 List View**: Detailed table with balance tracking and payment toggles
    *   **📅 Calendar View**: Monthly grid with color-coded bill indicators
    *   **📊 Analytics View**: Spending breakdown by category and 6-month historical trends

### Payment Management
*   Track partial payments with full payment history
*   **Credit Balance Support**: Overpayments and refunds are preserved as bill credit instead of being lost when a balance reaches $0
*   **Credit-Aware Dashboard**: Total Credit and Net Due metrics show how credits reduce what is still owed
*   **Credit Visibility Tools**: Dedicated Credit column, credit filter, and payment modal summary make credits easy to find
*   Auto-select current pay period
*   **Bulk Actions**: Mark all visible bills as paid or unpaid depending on current bill state, fill zero balances from bill amounts, or clear all data with one click
*   **Smart Overdue Tracking**: Unpaid bills carry forward automatically into your next planning window
*   **Carried Forward Toggle**: Show/hide bills from past periods in current view

### Recent Workflow Improvements
*   **Mark Unpaid Defaults Balance**: Marking a bill unpaid restores its balance to `amountDue` when the stored balance is zero or missing
*   **Fill Balance Recovery Tool**: Sidebar action repairs unpaid bills whose balances were zeroed during older upgrades or imports
*   **Recurring Credit Carry-Forward**: Extra payment credit follows recurring bills into the next cycle instead of disappearing

### Data Management
*   **Persistent Storage**: Local storage with automatic backup
*   **Cloud Sync**: Optional Supabase integration for cross-device synchronization
*   **Import/Export**: 
    *   JSON import with auto-ID generation and category merging
    *   CSV to JSON conversion utility (`scripts/csv_to_json.py`)
    *   Bulk data import/export capabilities
*   **Custom Categories**: Create and manage your own bill categories

### User Experience
*   **Theme Engine**: Robust Dark Mode and Light Mode support
*   **Paycheck Synchronization**: Views automatically sync to selected pay period
*   **Website Links**: Quick access to bill payment portals
*   **Bill Reminders (MVP)**: Browser notifications with global settings, test reminder, and reminder history
*   **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
*   **Accessibility**: Full keyboard navigation and screen reader support

### Advanced Analytics
*   **Spending Forecasts**: Predicts next month's bills based on recurring bill patterns
*   **Trend Analysis**: 3-month spending direction with percentage change indicators
*   **Intelligent Alerts**: 
    *   High-spend alerts for bills above average
    *   Overdue bill warnings with days past due
    *   Due-soon notifications within 7 days
*   **Real-time Metrics**: Avg monthly spending, spend trends, forecast categories

### Mobile Optimizations
*   **Touch Gestures**: Swipe-to-delete on bill rows (with button fallback)
*   **Mobile-Friendly Form**: Optimized inputs, keyboard hints, responsive modals
*   **Offline Operations Queue**: Queue bulk edits when offline (max 250 operations)
*   **Responsive Design**: Auto-detects viewport and applies mobile viewport class

### 🏔️ Debt Snowball Planner (NEW)
A dedicated planning area for paying down credit cards, loans, and mortgages.

*   **Debt Tracking Fields on Bills**: Each bill can now store a `Debt Total` (outstanding balance) and `APR / Interest Rate (%)`, plus an `Include in Debt Snowball` flag. These live inside a collapsible "Debt Snowball Details" section in the Add/Edit Bill form.
*   **Automatic Candidate Detection**: Any bill with a non-zero debt total, a non-zero interest rate, *or* the snowball flag checked is automatically included in the planner — no manual list to maintain.
*   **Strategy Toggle**: Choose between
    *   🔵 **Snowball** — smallest balance first (psychological wins)
    *   🔴 **Avalanche** — highest interest rate first (mathematically optimal)
*   **Extra Monthly Payment**: Enter an amount to throw at your priority target each month; it stacks on top of the minimum payment.
*   **Projected Payoff Months**: Each debt card shows an estimated month count to pay off that balance at the suggested payment, accounting for monthly interest.
*   **Ranked Debt Cards**: Debts are sorted and numbered by the chosen strategy. The #1 card is highlighted "Focus First" and receives the extra snowball payment.
*   **Debt Overview Widget on Dashboard**: When any debt exists, a summary banner appears on the main dashboard showing total tracked debt, estimated monthly interest, and a one-click link to the Debt Snowball Planner.

#### How to populate the Debt Snowball Planner
1. **Add or edit a bill** (click the ✏️ Edit button on any bill row, or use "+ Add Bill").
2. Scroll to the **Debt Snowball Details** section in the bill form.
3. Enter values for any or all of:
   - **Debt Total ($)** — the current outstanding balance (e.g. `4250.00`)
   - **APR / Interest Rate (%)** — the annual interest rate (e.g. `22.99`)
   - **Include in Debt Snowball** — check this to force the bill into the planner even with `$0` debt
4. Save the bill.
5. Click **🏔️ Debt** in the navigation bar — the planner will now show your debt(s) sorted by your chosen strategy.
6. Optionally enter an **Extra Monthly Payment** and pick a **Strategy** in the settings bar, then click **Save Settings**.

> **Tip**: The `amountDue` field on a bill is used as the minimum payment in the planner. Make sure it reflects your actual minimum monthly payment.

### 🩹 Reconciliation Engine (NEW)
*   **Needs Reconcile Filter**: A "Needs Reconcile" option in the payment filter dropdown highlights bills with data inconsistencies.
*   **Detected Issues**:
    *   `PAID_WITH_BALANCE` — bill is marked paid but still carries a non-zero balance
    *   `UNPAID_WITH_ZERO_BALANCE` — bill is unpaid but balance is `$0`
    *   `INVALID_NEGATIVE_VALUE` — balance or amount is negative
*   **Quick-Fix Button**: Each flagged bill shows a 🩹 button that applies the correct fix automatically and logs an audit event.

### 📜 Unified Bill History Timeline (NEW)
*   The History modal for each bill now combines **payment records** and **audit log events** into a single chronological timeline, making it easy to see the full life of a bill in one view.

### ↩️ Bulk-Action Undo (NEW)
*   Bulk operations (mark all paid, mark all unpaid, fill zero balances) now show a 10-second undo toast. Clicking **Undo** fully restores the previous state before the change was committed.

## 🏗️ Architecture

This project has undergone a **major refactoring** (Phase 4 complete):
- **98.8% reduction** in entry point size (from 1,349 lines to 16 lines)
- **Modular architecture** with clear separation of concerns
- **Comprehensive error handling** with user-friendly notifications
- **Reactive state management** using subscriber pattern
- **Full test coverage** with 312 automated tests

### Project Structure
```
bill-tracker-pwa/
├── src/
│   ├── index.js              # Entry point (16 lines)
│   ├── app.js                # App orchestrator (~530 lines)
│   ├── components/           # UI components
│   │   ├── header.js         # Header with pay period selector
│   │   ├── sidebar.js        # Category selector & theme toggle
│   │   ├── billGrid.js       # Bill table display
│   │   ├── billForm.js       # Add/edit bill modal
│   │   ├── dashboard.js      # Stats bar
│   │   └── authModal.js      # Login/signup UI
│   ├── views/                # View modules
│   │   ├── calendarView.js   # Calendar rendering
│   │   ├── analyticsView.js  # Chart.js visualizations
│   │   ├── upcomingBillsView.js  # Upcoming bills list
│   │   ├── paycheckPlannerView.js# Paycheck planner
│   │   └── debtSnowballView.js   # Debt Snowball Planner UI
│   ├── store/                # State management
│   │   ├── BillStore.js      # Bill data (single source of truth)
│   │   └── appState.js       # UI state with subscriber pattern
│   ├── handlers/             # Business logic
│   │   ├── billActionHandlers.js  # Bill CRUD operations
│   │   └── settingsHandler.js     # Settings & categories
│   ├── utils/                # Utilities
│   │   ├── paycheckManager.js     # Paycheck logic
│   │   ├── dateHelpers.js         # Date helpers
│   │   ├── billHelpers.js         # Bill filtering
│   │   ├── StorageManager.js      # Storage abstraction
│   │   ├── debtSnowball.js        # Debt Snowball calculation engine
│   │   ├── reconciliation.js      # Reconciliation rule engine
│   │   └── historyTimeline.js     # Unified payment+audit timeline adapter
│   ├── services/             # External services
│   │   └── supabase.js       # Cloud sync integration
│   └── index.css             # Styles with dark mode support
├── tests/                    # Unit and integration tests (312 tests)
├── scripts/                  # Utility scripts
│   └── csv_to_json.py        # CSV conversion tool
└── public/
    ├── manifest.json         # PWA manifest
    └── service-worker.js     # Offline caching

## 🛠️ Setup & Configuration

### 1. Run Locally (Terminal)
You can start the app using Node.js (Recommended) or Python.

**Option A: Using Node.js (npm)**
```bash
# Install dependencies
npm install

# Start the server
npm run dev
```
*The app will be available at [http://localhost:5173](http://localhost:5173) (or the port shown by Vite)*

**Option B: Using Python**
If you don't have Node.js installed, you can use Python's built-in server:
```bash
# Navigate to the project folder
cd bill-tracker-pwa

# Start server
python3 -m http.server 8000
```
*The app will be available at [http://localhost:8000](http://localhost:8000)*

### 2. Configure Cloud Sync (Supabase)
To enable Cloud Sync, you need to provide your own free Supabase credentials.

1.  **Create Project**: Go to [Supabase](https://supabase.com) and sign up for a free project.
2.  **Get Credentials**:
    *   Go to **Project Settings** > **API**.
    *   Copy the `Project URL`.
    *   Copy the `anon` / `public` Key.
3.  **Update Code**:
    *   Open `src/services/supabase.js`.
    *   Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual values.
4.  **Create Database Table**:
    *   Go to **SQL Editor** in Supabase dashboard.
    *   Run the following query to create the table:
    ```sql
    create table user_data (
      user_id uuid references auth.users not null primary key,
      bills jsonb
    );
    
    alter table user_data enable row level security;
    
    create policy "Individuals can create user_data." on user_data for
        insert with check (auth.uid() = user_id);
    
    create policy "Individuals can view their own user_data. " on user_data for
        select using (auth.uid() = user_id);
    
    create policy "Individuals can update their own user_data." on user_data for
        update using (auth.uid() = user_id);
    ```

5.  **Enable Google Authentication**:
    *   Go to **Authentication** > **Providers** in Supabase.
    *   Enable **Google**.
    *   You will need to set up OAuth consent screen in Google Cloud Console to get the `Client ID` and `Client Secret`.
    *   Add `https://<YOUR_PROJECT_ID>.supabase.co/auth/v1/callback` to "Authorized redirect URIs" in Google Cloud Console.

## 📚 Documentation

For detailed information about the project, start with:

- **[docs/README.md](docs/README.md)** - Active documentation index and archive map

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete architecture overview and design patterns
- **[DEVELOPER_SETUP.md](DEVELOPER_SETUP.md)** - Development environment setup guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution workflow and pull request checklist
- **[COMPONENT_API.md](COMPONENT_API.md)** - Unified component and view API reference
- **[STATE_MANAGEMENT_GUIDE.md](STATE_MANAGEMENT_GUIDE.md)** - State patterns, data flow, and best practices
- **[docs/adr/001-modular-architecture.md](docs/adr/001-modular-architecture.md)** - Architecture decision record for modularization
- **[docs/guides/API_INTEGRATION_GUIDE.md](docs/guides/API_INTEGRATION_GUIDE.md)** - Supabase auth/sync and offline fallback flow
- **[docs/guides/ERROR_HANDLING_GUIDE.md](docs/guides/ERROR_HANDLING_GUIDE.md)** - Error taxonomy, handler template, and messaging strategy
- **[docs/guides/LOCAL_WORKFLOW.md](docs/guides/LOCAL_WORKFLOW.md)** - Day-to-day dev/test/build workflow
- **[docs/guides/JSON_IMPORT_PROCESS_FLOW.md](docs/guides/JSON_IMPORT_PROCESS_FLOW.md)** - JSON import validation and process flow
- **[IMPROVEMENT_ROADMAP.md](IMPROVEMENT_ROADMAP.md)** - Future enhancements and technical debt
- **[SECURITY.md](SECURITY.md)** - Security best practices and guidelines
- **[BILLSTORE_REFERENCE.md](BILLSTORE_REFERENCE.md)** - BillStore API reference

Legacy planning/session summary docs are preserved in **[docs/archive](docs/archive)** and removed from the project root to reduce user confusion.

## ✅ Completed Features (2025-2026)

- ✅ **Phase 4 Refactoring**: Modular architecture with 98.8% entry point reduction
- ✅ **Payment History**: Full payment tracking with partial payment support
- ✅ **Cloud Sync**: Supabase integration with Google authentication
- ✅ **Analytics View**: Spending breakdown and 6-month trend charts
- ✅ **Calendar View**: Monthly grid with color-coded bill indicators
- ✅ **Bulk Actions**: Smart bulk paid/unpaid toggle, balance recovery fill, clear all data
- ✅ **Carried Forward Logic**: Smart overdue tracking with toggle
- ✅ **Import/Export**: JSON import with auto-ID, CSV conversion utility
- ✅ **Custom Categories**: User-defined bill categories
- ✅ **Unit Testing**: 312 automated tests covering core workflows and regressions
- ✅ **Accessibility**: WCAG 2.1 Level AA compliance
- ✅ **IndexedDB Sync Queue**: Offline-first sync reliability
- ✅ **Bill Reminders MVP**: Global reminders, per-bill opt-out, test reminder, reminder history, and inline grid toggles
- ✅ **Credit Balances**: Overpayment credit tracking, credit filter, credit column, Total Credit, and Net Due metrics
- ✅ **Bulk-Action Undo**: 10-second undo toast for bulk paid/unpaid/fill operations
- ✅ **Reconciliation Engine**: Detect and quick-fix PAID_WITH_BALANCE, UNPAID_WITH_ZERO_BALANCE, INVALID_NEGATIVE_VALUE
- ✅ **Unified Bill History Timeline**: Payment records and audit events merged into one chronological view
- ✅ **Debt Snowball Planner**: Debt tracking fields, snowball/avalanche strategy, projected payoff months, and dashboard debt widget

## 🔮 Future Enhancements

See [IMPROVEMENT_ROADMAP.md](IMPROVEMENT_ROADMAP.md) for the complete roadmap. Key priorities:

### Production Readiness
1.  ✅ **PWA Offline Documentation** - Complete ([PWA_OFFLINE_GUIDE.md](PWA_OFFLINE_GUIDE.md))
2.  ✅ **Performance Guide** - Complete ([PERFORMANCE_GUIDE.md](PERFORMANCE_GUIDE.md))
3.  ✅ **Browser Compatibility Matrix** - Complete ([BROWSER_COMPATIBILITY.md](BROWSER_COMPATIBILITY.md))
4.  ✅ **Deployment Guide** - Complete ([DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md))

### Developer Experience
1.  ✅ **Contributing Guidelines** - Complete ([CONTRIBUTING.md](CONTRIBUTING.md))
2.  ✅ **Component API Documentation** - Complete ([COMPONENT_API.md](COMPONENT_API.md))
3.  ✅ **State Management Guide** - Complete ([STATE_MANAGEMENT_GUIDE.md](STATE_MANAGEMENT_GUIDE.md))

### Future Features
1.  **Advanced Push Notifications** - Scheduled/background reminders with richer delivery controls
2.  **Mobile Gestures** - Swipe actions for quick pay
3.  **Bill Splitting** - Share bills with other users
4.  **Recurring Bill Templates** - Pre-configured bill templates

## 📦 Data Import/Export

### JSON Import Specification

For validation and lifecycle details, see **[docs/guides/JSON_IMPORT_PROCESS_FLOW.md](docs/guides/JSON_IMPORT_PROCESS_FLOW.md)**.

You can bulk import bills by uploading a JSON file. The system automatically handles unique ID generation.

Optional fields such as `balance`, `creditBalance`, `isPaid`, `paymentHistory`, `notes`, and `split` are also accepted. When `balance` is omitted, the app defaults it to `amountDue`. `creditBalance` must be `0` or greater.

### Basic Payload Format
```json
{
  "bills": [
    {
      "name": "Electric Bill",
      "category": "Utilities",
      "dueDate": "2026-02-01",
      "amountDue": 150.00,
            "balance": 150.00,
            "creditBalance": 0,
      "recurrence": "Monthly"
    },
    {
      "name": "Rent",
      "category": "Rent",
      "dueDate": "2026-02-01",
      "amountDue": 1200.00,
            "balance": 1200.00,
            "creditBalance": 0,
      "recurrence": "Monthly"
    },
    {
      "name": "Visa Credit Card",
      "category": "Debt",
      "dueDate": "2026-02-15",
      "amountDue": 45.00,
      "balance": 45.00,
      "creditBalance": 0,
      "recurrence": "Monthly",
      "debtTotal": 3200.00,
      "interestRate": 22.99,
      "includeInDebtSnowball": true
    }
  ]
}
```

### Field Definitions

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| **`name`** | String | Yes | The display name of the bill. |
| **`category`** | String | Yes | Must match one of your categories (e.g., "Utilities", "Rent"). |
| **`dueDate`** | String | Yes | Format: `YYYY-MM-DD`. |
| **`amountDue`**| Number | Yes | The total amount of the bill. |
| **`recurrence`**| String | Yes | Values: `One-time`, `Weekly`, `Bi-weekly`, `Monthly`, `Yearly`. |
| **`notes`** | String | No | Optional additional details. |
| **`website`** | String | No | Optional URL for payment/login. |
| **`balance`** | Number | No | Defaults to `amountDue` if omitted. |
| **`creditBalance`** | Number | No | Optional stored credit. Must be `0` or greater. |
| **`isPaid`** | Boolean| No | Defaults to `false` if omitted. |
| **`id`** | String | No | **Auto-generated** if omitted. Safe to leave blank. |
| **`debtTotal`** | Number | No | Outstanding debt balance for this bill (e.g. credit card balance). Used by the Debt Snowball Planner. |
| **`interestRate`** | Number | No | Annual interest rate as a percentage (e.g. `22.99` for 22.99% APR). Used by the Debt Snowball Planner. |
| **`includeInDebtSnowball`** | Boolean | No | Force-include this bill in the Debt Snowball Planner even if `debtTotal` and `interestRate` are `0`. |

## 📊 Importing from Spreadsheets (CSV)

If you have your bills in Excel or Google Sheets, you can easily convert them to the required JSON format using the provided utility script.

### 1. Prepare your Spreadsheet
Create a spreadsheet with the following headers:
`Name, Category, Due Date, Amount, Recurrence, Notes, Website`

### 2. Export as CSV
Save your spreadsheet as `bills.csv` in the project root.

### 3. Run the Conversion Script
```bash
python3 scripts/csv_to_json.py
```
This will create a file named `bills-import.json`.

### 4. Import into App
1. Open the Bill Tracker PWA.
2. Go to **Settings** or **Sidebar** > **Import Data**.
3. Select the `bills-import.json` file.

## 🧪 Testing

The project includes comprehensive unit tests covering core functionality:

```bash
# Run all tests with Vitest
npm test
```

**Test Coverage** (312 tests across 29 files):
- ✅ State management (appState)
- ✅ Bill operations (CRUD, validation)
- ✅ Paycheck calculations
- ✅ Import/export functionality
- ✅ UI accessibility
- ✅ Functional UX flows
- ✅ Debt Snowball calculation (snowball sort, avalanche sort, payoff months, interest-only edge case)
- ✅ Reconciliation rule engine
- ✅ Unified history timeline adapter
- ✅ Bulk-action undo behavior

## 🤝 Contributing

This project follows a modular architecture with clear separation of concerns. Before contributing:

1. Review [ARCHITECTURE.md](ARCHITECTURE.md) to understand the design
2. Check [IMPROVEMENT_ROADMAP.md](IMPROVEMENT_ROADMAP.md) for planned features
3. Ensure all tests pass before submitting changes
4. Follow the existing code style and patterns

For full contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

This project is licensed under the MIT License.

---

**Last Updated**: April 1, 2026  
**Status**: Production-ready with ongoing enhancements  
**Maintainer**: Mervin Weber
