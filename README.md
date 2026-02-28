# Bill Tracker PWA

A robust, offline-capable Progressive Web App for tracking recurring bills, managing payments, and synchronizing data across devices.

## ✨ Current Status

**Version**: 1.0.0  
**Architecture**: Modular, production-ready  
**Test Coverage**: 24+ unit tests  
**Accessibility**: WCAG 2.1 Level AA compliant  
**Latest Update**: February 2026 - Bill reminders MVP (global settings, per-bill preferences, inline toggles)

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
*   Auto-select current pay period
*   **Bulk Actions**: Mark all visible bills as paid or clear all data with one click
*   **Smart Overdue Tracking**: Unpaid bills carry forward automatically into your next planning window
*   **Carried Forward Toggle**: Show/hide bills from past periods in current view

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

## 🏗️ Architecture

This project has undergone a **major refactoring** (Phase 4 complete):
- **98.8% reduction** in entry point size (from 1,349 lines to 16 lines)
- **Modular architecture** with clear separation of concerns
- **Comprehensive error handling** with user-friendly notifications
- **Reactive state management** using subscriber pattern
- **Full test coverage** with 24+ unit tests

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
│   │   └── analyticsView.js  # Chart.js visualizations
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
│   │   └── StorageManager.js      # Storage abstraction
│   ├── services/             # External services
│   │   └── supabase.js       # Cloud sync integration
│   └── index.css             # Styles with dark mode support
├── tests/                    # Unit tests (24+ tests)
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

For detailed information about the project, see:

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete architecture overview and design patterns
- **[DEVELOPER_SETUP.md](DEVELOPER_SETUP.md)** - Development environment setup guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution workflow and pull request checklist
- **[COMPONENT_API.md](COMPONENT_API.md)** - Unified component and view API reference
- **[STATE_MANAGEMENT_GUIDE.md](STATE_MANAGEMENT_GUIDE.md)** - State patterns, data flow, and best practices
- **[REFACTORING_COMPLETE.md](REFACTORING_COMPLETE.md)** - Phase 4 refactoring summary
- **[IMPROVEMENT_ROADMAP.md](IMPROVEMENT_ROADMAP.md)** - Future enhancements and technical debt
- **[SECURITY.md](SECURITY.md)** - Security best practices and guidelines
- **[BILLSTORE_REFERENCE.md](BILLSTORE_REFERENCE.md)** - BillStore API reference

## ✅ Completed Features (2025-2026)

- ✅ **Phase 4 Refactoring**: Modular architecture with 98.8% entry point reduction
- ✅ **Payment History**: Full payment tracking with partial payment support
- ✅ **Cloud Sync**: Supabase integration with Google authentication
- ✅ **Analytics View**: Spending breakdown and 6-month trend charts
- ✅ **Calendar View**: Monthly grid with color-coded bill indicators
- ✅ **Bulk Actions**: Mark all as paid, clear all data
- ✅ **Carried Forward Logic**: Smart overdue tracking with toggle
- ✅ **Import/Export**: JSON import with auto-ID, CSV conversion utility
- ✅ **Custom Categories**: User-defined bill categories
- ✅ **Unit Testing**: 24+ comprehensive tests
- ✅ **Accessibility**: WCAG 2.1 Level AA compliance
- ✅ **IndexedDB Sync Queue**: Offline-first sync reliability
- ✅ **Bill Reminders MVP**: Global reminders, per-bill opt-out, test reminder, reminder history, and inline grid toggles

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

You can bulk import bills by uploading a JSON file. The system automatically handles unique ID generation.

### Basic Payload Format
```json
{
  "bills": [
    {
      "name": "Electric Bill",
      "category": "Utilities",
      "dueDate": "2026-02-01",
      "amountDue": 150.00,
      "recurrence": "Monthly"
    },
    {
      "name": "Rent",
      "category": "Rent",
      "dueDate": "2026-02-01",
      "amountDue": 1200.00,
      "recurrence": "Monthly"
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
| **`isPaid`** | Boolean| No | Defaults to `false` if omitted. |
| **`id`** | String | No | **Auto-generated** if omitted. Safe to leave blank. |

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
# Run all tests (open in browser)
open tests/test-runner.html

# Individual test files
node tests/appState.test.js
node tests/billActionHandlers.test.js
node tests/paycheckManager.test.js
node tests/importExport.test.js
```

**Test Coverage**:
- ✅ State management (appState)
- ✅ Bill operations (CRUD, validation)
- ✅ Paycheck calculations
- ✅ Import/export functionality
- ✅ UI accessibility
- ✅ Functional UX flows

See [TESTING_IMPROVEMENTS.md](TESTING_IMPROVEMENTS.md) for details.

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

**Last Updated**: February 26, 2026  
**Status**: Production-ready with ongoing enhancements  
**Maintainer**: Mervin Weber
