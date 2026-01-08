# Refactoring Strategy: Modular Architecture

## Goal
Transform the monolithic `src/index.js` (~1500 lines) into a maintainable, modular system using ES Modules. This improves readability, testability, and enables easier feature development.

## Architecture Overview

We will move from a "Script" approach to a "Component" approach.

### 1. State Management (`src/store/`)
Instead of global variables (`let bills = []`), we will use a centralized Store.
-   **`BillStore.js`**: Manages bills, CRUD operations, and `localStorage` persistence.
-   **`CategoryStore.js`**: Manages custom categories.
-   **`SettingsStore.js`**: Manages theme, payment history, and user preferences.

### 2. UI Components (`src/components/`)
Each major UI section gets its own module with `render()` and `init()` methods.
-   **`Header.js`**: Auth, Theme Toggle, View Filters.
-   **`Sidebar.js`**: Category list, Add Bill button.
-   **`Dashboard.js`**: Stats cards (Total, Paid, Unpaid).
-   **`BillGrid.js`**: The main table/list view.
-   **`CalendarView.js`**: The calendar rendering logic.
-   **`AnalyticsView.js`**: The Chart.js integration.
-   **`Modals.js`**: Logic for Add/Edit Bill, Payment, and History modals.

### 3. Utilities (`src/utils/`)
Pure functions that don't depend on DOM or Global State.
-   **`dates.js`**: `createLocalDate`, `formatLocalDate`, `calculateNextDueDate`.
-   **`currency.js`**: Formatting numbers as currency.

## Execution Plan (Phased)

### Phase 1: extraction (Low Risk)
1.  Create `src/utils/dates.js`.
2.  Move date helper functions from `index.js` to `dates.js`.
3.  Import them back into `index.js`.
4.  *Result: `index.js` shrinks by ~50 lines, logic isolated.*

### Phase 2: State Centralization (Medium Risk)
1.  Create `src/store/BillStore.js`.
2.  Move `bills` array and `save/load` logic there.
3.  Update `index.js` to use `BillStore.getAll()` instead of direct access.
4.  *Result: Business logic separated from UI logic.*

### Phase 3: Component Isolation (High Risk)
1.  Extract `Header` and `Sidebar` first.
2.  Extract `Dashboard` and `BillGrid`.
3.  `index.js` becomes an "Orchestrator" that just calls `Header.init()`, `Sidebar.init()`, etc.

## Discussion Points
-   **Event Handling**: How do components talk? (e.g., changing a filter in Header updates Grid).
    -   *Proposal*: Use a simple Event Bus or Pub/Sub pattern, OR pass update callbacks to `init()` methods.
-   **Directory Structure**:
    ```
    src/
    ├── components/
    │   ├── Header.js
    │   └── ...
    ├── store/
    │   └── ...
    ├── utils/
    │   └── ...
    ├── main.js (Entry point)
    └── styles/ (Optional css split)
    ```
