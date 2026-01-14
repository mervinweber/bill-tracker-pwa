# BillStore Class - Complete Reference

The `BillStore` class is the **single source of truth** for all bill data in the Bill Tracker PWA. It manages persistent storage, reactive updates, and safe data access.

## Overview

```javascript
import { billStore } from './store/BillStore.js';

// Get all bills
const bills = billStore.getAll();

// Add a new bill
billStore.add(newBill);

// Subscribe to changes
billStore.subscribe((bills) => {
  console.log('Bills updated:', bills);
});
```

## Class Structure

### Location
- **File**: `src/store/BillStore.js`
- **Export**: Singleton instance `billStore`
- **Pattern**: Listener pattern for reactive updates

### Key Properties
```javascript
billStore.bills;        // Array of bill objects
billStore.listeners;    // Array of subscriber functions
```

### Key Methods
- `getAll()` - Get all bills
- `add(bill)` - Add new bill
- `update(bill)` - Update existing bill
- `delete(id)` - Delete bill
- `setBills(bills)` - Replace all bills
- `subscribe(listener)` - Subscribe to changes
- `load()` - Load from localStorage
- `save()` - Save to localStorage

## Bill Object Structure

Each bill object has the following properties:

```javascript
{
  // Required Fields
  id: "1704067200000",                          // Unique ID (auto-generated)
  name: "Electric Bill",                        // Bill name
  category: "Utilities",                        // Bill category for filtering
  dueDate: "2024-12-15",                        // Due date (YYYY-MM-DD)
  amountDue: 125.50,                            // Amount due in dollars
  balance: 125.50,                              // Current balance owed
  isPaid: false,                                // Payment status
  recurrence: "Monthly",                        // Frequency of bill

  // Optional Fields
  notes: "Pay at least 3 days early",          // Additional notes
  lastPaymentDate: "2024-11-15",               // Last payment date
  paymentHistory: [                             // Payment records
    {
      id: "pay-1",
      date: "2024-11-15",
      amount: 125.50,
      method: "Online",
      notes: "Full payment"
    }
  ]
}
```

### Field Specifications

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique identifier, auto-generated from timestamp |
| `name` | string | ✅ | Bill name (max 100 characters) |
| `category` | string | ✅ | Category for filtering (e.g., "Utilities") |
| `dueDate` | string | ✅ | Due date in YYYY-MM-DD format |
| `amountDue` | number | ✅ | Amount due in dollars (positive) |
| `balance` | number | ✅ | Current balance owed (positive) |
| `isPaid` | boolean | ✅ | Whether bill is marked as paid |
| `recurrence` | string | ✅ | Frequency: 'One-time', 'Weekly', 'Bi-weekly', 'Monthly', 'Yearly' |
| `notes` | string | ❌ | Optional additional notes |
| `lastPaymentDate` | string | ❌ | Last payment date (YYYY-MM-DD) |
| `paymentHistory` | array | ❌ | Array of payment records |

## Methods Reference

### `getAll()`

Returns all bills currently stored.

```javascript
const bills = billStore.getAll();
console.log(bills.length); // Total number of bills
```

**Returns**: `Array<Object>` - Array of bill objects

**Notes**:
- Returns reference to internal array (don't mutate directly)
- Mutations require calling `update()` to persist

### `add(bill)`

Add a new bill to the store.

```javascript
billStore.add({
  name: "Water Bill",
  category: "Utilities",
  dueDate: "2024-12-20",
  amountDue: 45.00,
  balance: 45.00,
  isPaid: false,
  recurrence: "Monthly"
});
```

**Parameters**:
- `bill` (Object) - Bill object to add
  - If `id` is omitted, one is auto-generated from current timestamp

**Returns**: `void`

**Side Effects**:
- ✅ Adds bill to `this.bills` array
- ✅ Calls `save()` (persists to localStorage)
- ✅ Calls `notify()` (triggers subscribers)

**Error Handling**:
- Silently succeeds even with invalid data (validation should happen before calling)
- Use `validateBill()` from billActionHandlers before calling

**Example - Complete Bill**:
```javascript
billStore.add({
  id: "1704067200000",
  name: "Electricity",
  category: "Utilities",
  dueDate: "2024-12-15",
  amountDue: 125.50,
  balance: 75.00,
  isPaid: false,
  recurrence: "Monthly",
  notes: "Auto-pay setup",
  lastPaymentDate: "2024-11-15",
  paymentHistory: [
    { date: "2024-11-15", amount: 125.50, method: "Online" }
  ]
});
```

### `update(bill)`

Update an existing bill.

```javascript
billStore.update({
  id: "1704067200000",
  name: "Electricity",
  balance: 75.00,
  isPaid: false
  // ... other properties
});
```

**Parameters**:
- `bill` (Object) - Updated bill object
  - **Must** include `id` field to match bill to update
  - All other properties are copied as-is

**Returns**: `void`

**Side Effects**:
- ✅ Replaces bill in array (if ID matches)
- ✅ Calls `save()` (persists to localStorage)
- ✅ Calls `notify()` (triggers subscribers)
- ℹ️ No effect if ID not found (silent failure)

**Example - Update Balance**:
```javascript
const bill = billStore.getAll().find(b => b.id === "1704067200000");
if (bill) {
  billStore.update({
    ...bill,
    balance: 50.00  // Update balance
  });
}
```

**Example - Toggle Payment Status**:
```javascript
const bill = billStore.getAll().find(b => b.name === "Electric Bill");
if (bill) {
  billStore.update({
    ...bill,
    isPaid: true,
    lastPaymentDate: new Date().toISOString()
  });
}
```

### `delete(id)`

Delete a bill by ID.

```javascript
billStore.delete("1704067200000");
```

**Parameters**:
- `id` (string) - Bill ID to delete

**Returns**: `void`

**Side Effects**:
- ✅ Removes bill from array (if ID matches)
- ✅ Calls `save()` (persists to localStorage)
- ✅ Calls `notify()` (triggers subscribers)
- ℹ️ No effect if ID not found (silent failure)

**Example**:
```javascript
// Delete specific bill
billStore.delete("1704067200000");

// Delete all bills in category
billStore.getAll()
  .filter(b => b.category === "Utilities")
  .forEach(b => billStore.delete(b.id));
```

### `setBills(bills)`

Replace entire bills array (bulk operation).

```javascript
billStore.setBills([
  { id: "1", name: "Bill 1", ... },
  { id: "2", name: "Bill 2", ... }
]);
```

**Parameters**:
- `bills` (Array<Object>) - Complete new bills array

**Returns**: `void`

**Side Effects**:
- ✅ Overwrites entire `this.bills` array
- ✅ Calls `save()` (persists to localStorage)
- ✅ Calls `notify()` (triggers subscribers)

**Use Cases**:
- ✅ Restore from backup
- ✅ Bulk import data
- ✅ Data migration
- ✅ Reset/clear all bills

**Example - Restore Backup**:
```javascript
const backupJson = localStorage.getItem('backup');
const backup = JSON.parse(backupJson);
billStore.setBills(backup);
```

**Example - Clear All Bills**:
```javascript
billStore.setBills([]);
```

### `subscribe(listener)`

Subscribe to store changes (reactive pattern).

```javascript
const unsubscribe = billStore.subscribe((bills) => {
  console.log('Bills changed:', bills);
  updateUI(bills);
});

// Later, unsubscribe
unsubscribe();
```

**Parameters**:
- `listener` (Function) - Callback function
  - Receives updated bills array as parameter
  - Called on every `save()` call
  - Errors in listener don't affect other listeners

**Returns**: `Function` - Unsubscribe function

**Example - React to Changes**:
```javascript
// Subscribe to changes
billStore.subscribe((bills) => {
  // Update UI with new bills
  renderBillGrid(bills);
  updateStats(bills);
});

// Bills automatically updated on:
// - billStore.add()
// - billStore.update()
// - billStore.delete()
// - billStore.setBills()
```

### `load()` (Private)

Load bills from localStorage.

```javascript
// Called automatically in constructor
// Can be called manually if needed
billStore.load();
```

**Returns**: `void`

**Behavior**:
- Reads `'bills'` key from localStorage
- Parses JSON and populates `this.bills`
- Silently fails if localStorage unavailable or corrupted
- Creates empty array if no bills stored

**Automatically Called**:
- ✅ During `BillStore` construction
- ✅ Can be called manually to reload from storage

### `save()` (Private)

Save bills to localStorage and notify subscribers.

```javascript
// Called automatically after modifications
// Rarely needs to be called manually
billStore.save();
```

**Returns**: `void`

**Behavior**:
- Serializes `this.bills` to JSON
- Writes to localStorage with key `'bills'`
- Calls `notify()` to trigger subscribers
- Silently handles JSON errors

**Automatically Called**:
- ✅ After `add()`
- ✅ After `update()`
- ✅ After `delete()`
- ✅ After `setBills()`

## Lifecycle & State

### 1. Initialization

```
new BillStore()
  → constructor()
    → this.bills = []
    → this.listeners = []
    → this.load()  // Load from localStorage
      → this.bills now populated
```

### 2. Adding Bills

```
billStore.add(bill)
  → Append to this.bills
  → save()
    → localStorage.setItem('bills', JSON.stringify(bills))
    → notify()
      → For each subscriber:
        → Call subscriber(this.bills)
          → UI component re-renders
```

### 3. Updating Bills

```
billStore.update(bill)
  → Find bill with matching id
  → Replace entire bill object
  → save()
    → Persist to localStorage
    → notify() all subscribers
```

### 4. Deleting Bills

```
billStore.delete(id)
  → Filter out bill with matching id
  → save()
    → Persist to localStorage
    → notify() all subscribers
```

### 5. Subscribing

```
unsubscribe = billStore.subscribe(callback)
  → Add callback to listeners array
  → Return unsubscribe function
  → On next save():
    → callback(bills) called
  → To stop listening:
    → unsubscribe()  // Removes from listeners
```

## Usage Patterns

### Pattern 1: CRUD Operations

```javascript
import { billStore } from './store/BillStore.js';

// Create
const newBill = {
  name: "Gas Bill",
  category: "Utilities",
  dueDate: "2024-12-20",
  amountDue: 80.00,
  balance: 80.00,
  isPaid: false,
  recurrence: "Monthly"
};
billStore.add(newBill);

// Read
const allBills = billStore.getAll();
const billNames = allBills.map(b => b.name);

// Update
const bill = billStore.getAll().find(b => b.name === "Gas Bill");
billStore.update({ ...bill, balance: 40.00 });

// Delete
billStore.delete(bill.id);
```

### Pattern 2: Reactive UI Updates

```javascript
// Component file
billStore.subscribe((bills) => {
  // Automatically runs whenever bills change
  const totalDue = bills.reduce((sum, b) => sum + b.balance, 0);
  document.getElementById('totalDue').textContent = `$${totalDue.toFixed(2)}`;
});
```

### Pattern 3: Filtering

```javascript
// Get bills by category
const utilityBills = billStore.getAll()
  .filter(b => b.category === "Utilities");

// Get unpaid bills
const unpaidBills = billStore.getAll()
  .filter(b => !b.isPaid);

// Get bills due this month
const today = new Date();
const dueThisMonth = billStore.getAll()
  .filter(b => {
    const dueDate = new Date(b.dueDate);
    return dueDate.getMonth() === today.getMonth();
  });
```

### Pattern 4: Calculations

```javascript
// Total amount due
const totalDue = billStore.getAll()
  .reduce((sum, b) => sum + b.balance, 0);

// Total paid (from history)
const totalPaid = billStore.getAll()
  .reduce((sum, b) => {
    const historyTotal = (b.paymentHistory || [])
      .reduce((hSum, p) => hSum + p.amount, 0);
    return sum + historyTotal;
  }, 0);

// Count paid vs unpaid
const paid = billStore.getAll().filter(b => b.isPaid).length;
const unpaid = billStore.getAll().filter(b => !b.isPaid).length;
```

### Pattern 5: Bulk Operations

```javascript
// Clear all bills
billStore.setBills([]);

// Archive old bills (keep only last 3 months)
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

const recentBills = billStore.getAll()
  .filter(b => new Date(b.dueDate) > threeMonthsAgo);

billStore.setBills(recentBills);
```

## Error Handling

### Silent Failures (by design)

The BillStore is forgiving to prevent crashes:

```javascript
// These don't throw errors:
billStore.delete("non-existent-id");      // No-op
billStore.update({ id: "missing-id" });   // No-op
billStore.add({ /* incomplete */ });      // Still adds (validation happens elsewhere)
```

### Validation

Validation should happen **before** calling BillStore:

```javascript
import { validateBill } from '../handlers/billActionHandlers.js';

const billData = { /* ... */ };
const errors = validateBill(billData);

if (errors.length > 0) {
  showErrorNotification(errors.join(', '));
  return;
}

// Only now call BillStore
billStore.add(billData);
```

### localStorage Failures

BillStore handles localStorage errors gracefully:

```javascript
// If localStorage is full:
billStore.add(bill);  // Silently fails, no crash

// If localStorage is disabled:
billStore.load();     // Returns empty array
billStore.add(bill);  // Still works in memory only

// If JSON parsing fails:
billStore.load();     // Returns empty array
```

## Performance Considerations

### Optimization Tips

1. **Avoid repeated getAll() calls**
   ```javascript
   // ❌ Bad - getAll() called twice
   const count = billStore.getAll().length;
   billStore.getAll().forEach(bill => ...);
   
   // ✅ Good - getAll() called once
   const bills = billStore.getAll();
   const count = bills.length;
   bills.forEach(bill => ...);
   ```

2. **Use filtering in logic, not in BillStore**
   ```javascript
   // ✅ Good - filter in handler, not in store
   const utilityBills = billStore.getAll()
     .filter(b => b.category === "Utilities");
   ```

3. **Subscribe at component level, not globally**
   ```javascript
   // ✅ Good - subscribe in component initialization
   function initializeComponent() {
     billStore.subscribe((bills) => {
       renderComponent(bills);
     });
   }
   ```

4. **Don't mutate bills directly**
   ```javascript
   // ❌ Bad - direct mutation
   const bill = billStore.getAll()[0];
   bill.balance = 100;  // Change not persisted!
   
   // ✅ Good - use update()
   const bill = billStore.getAll()[0];
   billStore.update({ ...bill, balance: 100 });
   ```

### Storage Limits

- localStorage typically has 5-10MB limit
- Bill Tracker is very efficient (1000 bills ≈ 50KB)
- Add export/archive features for old data if needed

## Integration with Other Modules

### With appState
```javascript
// appState manages UI state
// BillStore manages data state
// They work together:

appState.subscribe((state) => {
  // When UI state changes, filter bills
  const bills = billStore.getAll();
  const filtered = filterByState(bills, state);
  renderUI(filtered);
});
```

### With billActionHandlers
```javascript
// billActionHandlers use BillStore for operations
export function recordPayment(billId, amount) {
  const bill = billStore.getAll().find(b => b.id === billId);
  bill.paymentHistory.push({ date: new Date(), amount });
  billStore.update(bill);  // Persist
}
```

### With Components
```javascript
// Components subscribe to BillStore changes
function initializeComponent() {
  billStore.subscribe((bills) => {
    renderComponent(bills);  // Re-render on bill changes
  });
}
```

## Best Practices

1. ✅ **Validate before storing**
   - Use `validateBill()` before `add()` or `update()`

2. ✅ **Use spread operator for updates**
   - `billStore.update({ ...bill, balance: 100 })`

3. ✅ **Subscribe at initialization time**
   - Not inside event handlers

4. ✅ **Unsubscribe when component unmounts**
   - Call returned function from `subscribe()`

5. ✅ **Handle localStorage limits**
   - Monitor storage usage
   - Implement cleanup/archiving as needed

6. ✅ **Use descriptive IDs**
   - Default timestamp IDs are fine
   - Custom IDs should be unique

## Troubleshooting

### Bills not persisting
```javascript
// Check localStorage
console.log(localStorage.getItem('bills'));

// Force reload
billStore.load();

// Check for errors in console
```

### UI not updating
```javascript
// Ensure component is subscribed
const unsubscribe = billStore.subscribe((bills) => {
  renderUI(bills);
});

// Check that you're using update(), not direct mutation
// ❌ billStore.bills[0].balance = 100;
// ✅ billStore.update(bill);
```

### localStorage full
```javascript
// Clear old backups or archived bills
localStorage.removeItem('old_backup');

// Or implement data cleanup
const recentBills = billStore.getAll()
  .filter(b => /* keep recent only */);
billStore.setBills(recentBills);
```

## Related Files

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall architecture
- [src/store/BillStore.js](./src/store/BillStore.js) - Source code
- [src/handlers/billActionHandlers.js](./src/handlers/billActionHandlers.js) - Bill operations
- [src/store/appState.js](./src/store/appState.js) - UI state management

## Summary

**BillStore is**:
- ✅ Single source of truth for bill data
- ✅ Automatically persistent via localStorage
- ✅ Reactive via listener pattern
- ✅ Safe and forgiving (prevents crashes)
- ✅ Simple and focused (does one thing well)

**Use it for**:
- ✅ Storing all bill data
- ✅ Reacting to data changes
- ✅ Persisting data automatically
- ✅ Querying bills safely

**Don't use it for**:
- ❌ UI state (use appState instead)
- ❌ Validation (use billActionHandlers)
- ❌ UI rendering (use components)
