# Bill Tracker PWA - Architecture Documentation

## Overview

The Bill Tracker PWA is built with a **modular, layered architecture** that separates concerns into distinct, testable modules. This design evolved from refactoring a 1,349-line monolithic entry point into focused, maintainable components.

## Architecture Principles

1. **Separation of Concerns** - Each module has a single, well-defined responsibility
2. **Reactive State Management** - UI automatically updates when state changes (subscriber pattern)
3. **Centralized Data Flow** - All data flows through BillStore (single source of truth)
4. **Error Handling First** - Comprehensive validation and user feedback at every layer
5. **Testability** - Pure functions and isolated business logic enable easy testing
6. **No Global Variables** - All shared state is managed through singletons

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Entry Point (index.js)                  │
│                       16 lines of code                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              App Orchestrator (app.js)                       │
│  • Initializes all components                                │
│  • Coordinates state synchronization                         │
│  • Delegates user interactions                               │
│  • Manages reactive re-rendering                             │
└──────────────────────────────────────────────────────────────┘
       ▲                    ▲                    ▲
       │                    │                    │
       │ coordinates        │ uses              │ uses
       │                    │                   │
   ┌───┴────────┐   ┌──────┴─────┐    ┌────────┴──────┐
   │   State    │   │   Data      │    │   Business    │
   │   Layer    │   │   Layer     │    │   Logic       │
   └────────────┘   └─────────────┘    └───────────────┘
        │                  │                    │
        ├─ appState.js     ├─ BillStore.js     ├─ paycheckManager.js
        │  (UI state)      │  (bills data)      │  (paycheck logic)
        │                  │                    │
        │                  │                    └─ billActionHandlers.js
        │                  │                       (bill operations)
        │                  │
        │                  └─ settingsHandler.js
        │                     (categories & settings)
        │
        └─ Subscribers (UI Components)
           ├─ header.js
           ├─ sidebar.js
           ├─ billGrid.js
           ├─ billForm.js
           └─ dashboard.js

       ┌──────────────────┐
       │   View Modules   │
       ├──────────────────┤
       │ calendarView.js  │
       │ analyticsView.js │
       └──────────────────┘

       ┌──────────────────┐
       │   Services       │
       ├──────────────────┤
       │ supabase.js      │  (Cloud sync)
       │ storage.js       │  (localStorage)
       └──────────────────┘
```

## Layer Descriptions

### 1. **Entry Point** (`src/index.js`)
- **Purpose**: Bootstrap the application
- **Lines**: 16
- **Responsibility**: Load DOM, initialize App Orchestrator on DOMContentLoaded
- **No Logic**: Pure delegation

### 2. **App Orchestrator** (`src/app.js`)
- **Purpose**: Central command center for app coordination
- **Size**: ~530 lines
- **Responsibilities**:
  - Component initialization
  - State synchronization
  - Event delegation
  - Reactive re-rendering
  - Error handling boundaries

**Example Flow**:
```
User clicks "Add Bill" 
  → billForm.openBillForm()
    → User submits form
      → app.handleBillSubmit()
        → billActionHandlers.validateBill()
        → billStore.add()
        → appState.setState() [triggers subscribers]
        → Components re-render [subscriber pattern]
```

### 3. **State Management Layer**

#### `appState.js` (125 lines)
- **Pattern**: Singleton with subscriber pattern
- **State Properties**:
  - `selectedPaycheck`: Current paycheck index
  - `selectedCategory`: Active category filter
  - `viewMode`: 'filtered' or 'all'
  - `displayMode`: 'list', 'calendar', or 'analytics'
  - `paymentFilter`: 'all', 'paid', or 'unpaid'
  - `isLoading`: Boolean for async operations
  - `error`: Current error message

**Data Flow**:
```
setState() 
  → Merges updates into state
    → notifySubscribers()
      → All UI components re-render
```

### 4. **Data Layer**

#### `BillStore.js` (290 lines)
- **Pattern**: Singleton data store with listener pattern
- **Responsibility**: Single source of truth for all bill data
- **Persistence**: Automatic localStorage sync
- **Bill Object Structure**:
  ```javascript
  {
    id: 'unique-id',
    name: 'Electric Bill',
    category: 'Utilities',
    dueDate: '2026-01-15',
    amountDue: 150.00,
    balance: 150.00,
    isPaid: false,
    recurrence: 'Monthly',
    notes: 'Optional notes',
    paymentHistory: [
      { date: '2025-12-15', amount: 75.00 },
      { date: '2025-12-20', amount: 75.00 }
    ]
  }
  ```

**Key Methods**:
- `getAll()` - Get all bills
- `add(bill)` - Add new bill
- `update(bill)` - Update existing bill
- `delete(id)` - Delete bill
- `subscribe(listener)` - Listen for changes

### 5. **Business Logic Layer**

#### `paycheckManager.js` (410 lines)
- **Purpose**: Paycheck date generation and recurring bill management
- **Responsibilities**:
  - Generate paycheck dates based on frequency
  - Create recurring bills for upcoming paychecks
  - Validate payment settings
  - Auto-select current pay period

**Supported Frequencies**:
- Weekly (7 days)
- Bi-weekly (14 days)
- Semi-monthly (15th & last day)
- Monthly (same day)
- Annual (same day)

#### `billActionHandlers.js` (350 lines)
- **Purpose**: All bill operations with comprehensive validation
- **Responsibilities**:
  - Bill CRUD operations
  - Payment recording
  - Balance calculations
  - Data import/export
  - Input validation
  - User notifications

**Pattern**: Pure functions with error handling

#### `settingsHandler.js` (310 lines)
- **Purpose**: Settings and category management
- **Responsibilities**:
  - Settings modal UI
  - Category CRUD
  - Conflict resolution
  - Input validation

### 6. **View Layer** (Presentation)

#### Components (`src/components/`)
- `header.js` - Title, paycheck selector, status display
- `sidebar.js` - Category selector, theme toggle
- `billGrid.js` - Bill table display
- `billForm.js` - Add/edit bill modal
- `dashboard.js` - Stats bar with totals
- `authModal.js` - Login/signup UI

**Pattern**: Event-driven, subscribe to appState changes

#### Views (`src/views/`)
- `calendarView.js` - Calendar rendering
- `analyticsView.js` - Chart.js visualizations

**Pattern**: Isolated rendering logic, proper cleanup

### 7. **Service Layer**

#### `supabase.js`
- **Purpose**: Cloud data synchronization
- **Responsibility**: Optional Supabase integration for cross-device sync

#### `storage.js`
- **Purpose**: localStorage management utilities
- **Responsibility**: Safe storage access with error handling

## Data Flow Patterns

### 1. **Adding a Bill**
```
User Input (billForm)
  ↓
validateBill() [billActionHandlers]
  ↓
billStore.add() [saves to state]
  ↓
Save to localStorage [BillStore]
  ↓
notify() [trigger subscribers]
  ↓
Components Re-render [reactive]
  ↓
User sees new bill [billGrid]
```

### 2. **Filtering Bills**
```
User selects category (sidebar)
  ↓
appState.setState({selectedCategory: 'Utilities'})
  ↓
notifySubscribers() [all listeners called]
  ↓
app.renderBillGrid() [re-filters bills]
  ↓
billGrid displays filtered bills [reactive]
```

### 3. **Recording a Payment**
```
User clicks "Record Payment"
  ↓
billActionHandlers.recordPayment()
  ↓
validatePayment() [ensure amount is valid]
  ↓
billStore.update() [add to payment history]
  ↓
updateBillBalance() [update balance]
  ↓
Save to localStorage + notify subscribers
  ↓
showSuccessNotification()
  ↓
billGrid re-renders [updated balance shown]
```

## Communication Between Modules

### Subscriber Pattern (for UI components)
```javascript
// Subscribe to state changes
appState.subscribe((newState) => {
  // Re-render when state changes
  renderBillGrid();
  updateHeaderUI();
});
```

### Direct Function Calls (for operations)
```javascript
// Bill operations
billActionHandlers.updateBillBalance(billId, newBalance);
billActionHandlers.recordPayment(billId, amount);

// Paycheck operations
paycheckManager.generateRecurringBills();
paycheckManager.getPaycheckDates();
```

### Listener Pattern (for data changes)
```javascript
// Subscribe to bill store changes
billStore.subscribe((bills) => {
  // Re-render when bills change
  renderBillGrid(bills);
});
```

## Error Handling Strategy

### Three-Layer Error Handling

1. **Input Validation**
   - `validateBill()` - Check required fields
   - `validateRequired()` - Generic validation
   - Type checking in handlers

2. **Operation Protection**
   - Try-catch blocks around all operations
   - Safe fallbacks for failures
   - Graceful degradation

3. **User Feedback**
   - Error notifications (red, top-right)
   - Success notifications (green, bottom-right)
   - Clear, actionable messages
   - Auto-dismiss with manual close option

### Example Error Flow
```
User submits invalid form
  ↓
validateBill() throws ValidationError
  ↓
billActionHandlers catches error
  ↓
showErrorNotification('Bill name is required')
  ↓
User sees message and fixes input
```

## State Persistence

### What's Persisted
1. **bills** - Bill data array (localStorage + optional Supabase)
2. **paymentSettings** - Paycheck frequency, start date, amount
3. **customCategories** - User-defined bill categories
4. **selectedCategory** - User's last selected category
5. **themePreference** - Dark/light mode choice

### Persistence Strategy
```
billStore.add() 
  → billStore.save() 
    → localStorage.setItem('bills', JSON.stringify(bills))
    → billStore.notify()
      → Subscribers re-render
```

## Performance Considerations

1. **No Re-renders on Every Change**
   - Only subscribers re-render on relevant state changes
   - Components filter by necessary state

2. **Bill Array Optimization**
   - Bills kept in memory for fast access
   - localStorage as persistent backup
   - Optional Supabase for cloud sync

3. **Chart Cleanup**
   - analyticsView properly disposes Chart.js instances
   - Prevents memory leaks on view switch

4. **Event Delegation**
   - app.js uses event delegation for handlers
   - Reduces event listener count

## Extending the Architecture

### Adding a New Component
1. Create file in `src/components/yourComponent.js`
2. Subscribe to `appState` for reactive updates
3. Export `initialize()` and `render()` functions
4. Import and call from `app.js`

### Adding a New Feature
1. Add state to `appState.js` if UI-related
2. Create handler in `src/handlers/yourHandler.js` if operations-related
3. Update BillStore if data structure changes
4. Create tests in `tests/`
5. Update components that display new feature

### Adding a New View
1. Create in `src/views/yourView.js`
2. Export `initialize()` and `render()` functions
3. Handle cleanup and resource management
4. Import and delegate from `app.js`

## Testing Architecture

### Unit Tests
- `appState.test.js` - State management tests
- `paycheckManager.test.js` - Business logic tests
- `billActionHandlers.test.js` - Bill operation tests
- `importExport.test.js` - Data I/O tests

### Test Pattern
```javascript
// Pure function = easy to test
const result = billActionHandlers.validateBill(testBill);
expect(result.isValid).toBe(true);
```

### Running Tests
```bash
node tests/appState.test.js
node tests/billActionHandlers.test.js
# etc...
```

## Benefits of This Architecture

| Aspect | Benefit |
|--------|---------|
| **Maintainability** | Each module ≤530 lines, single responsibility |
| **Testability** | Pure functions, isolated logic |
| **Scalability** | Easy to add new features without touching old code |
| **Reusability** | paycheckManager, billActionHandlers usable independently |
| **Performance** | Reactive updates, no unnecessary re-renders |
| **Error Handling** | Consistent patterns across all operations |
| **User Experience** | Clear feedback on all actions |

## Module Dependency Graph

```
index.js
  └─ app.js
      ├─ appState.js
      ├─ BillStore.js
      ├─ paycheckManager.js
      │   ├─ dates.js
      │   ├─ BillStore.js
      │   └─ errorHandling.js
      ├─ billActionHandlers.js
      │   ├─ BillStore.js
      │   └─ errorHandling.js
      ├─ settingsHandler.js
      │   ├─ BillStore.js
      │   └─ errorHandling.js
      ├─ Components
      │   ├─ header.js
      │   ├─ sidebar.js
      │   ├─ billGrid.js
      │   ├─ billForm.js
      │   ├─ dashboard.js
      │   └─ authModal.js
      ├─ Views
      │   ├─ calendarView.js
      │   └─ analyticsView.js
      └─ supabase.js
```

## Summary

This architecture provides a **clean, scalable foundation** for the Bill Tracker PWA:

- ✅ **Modular** - Clear separation of concerns
- ✅ **Maintainable** - Easy to find and fix bugs
- ✅ **Testable** - Pure functions and isolated logic
- ✅ **Extensible** - Easy to add new features
- ✅ **Reactive** - UI updates automatically when data changes
- ✅ **Reliable** - Comprehensive error handling
- ✅ **User-Friendly** - Clear feedback on all actions
