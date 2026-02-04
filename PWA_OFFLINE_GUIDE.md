# PWA Offline Guide - Bill Tracker PWA

**Last Updated**: February 3, 2026  
**Version**: 1.0  
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Offline Capabilities](#offline-capabilities)
3. [Cache Strategy](#cache-strategy)
4. [Offline Data Persistence](#offline-data-persistence)
5. [Sync Strategy](#sync-strategy)
6. [Testing Offline Mode](#testing-offline-mode)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

Bill Tracker PWA is designed as an **offline-first progressive web application**. This means:

✅ **Full functionality without internet** - Add, edit, delete bills locally
✅ **Automatic sync when online** - Changes upload when connectivity returns
✅ **Zero data loss** - Nothing is discarded while offline
✅ **Optional cloud sync** - Works completely offline OR with Supabase

### Architecture

```
┌─────────────────────────────────────────┐
│    User Interface (UI Components)       │
└────────────────────┬────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│   localStorage   │    │   IndexedDB      │
│ (App State)      │    │ (Sync Queue)     │
└──────────────────┘    └──────────────────┘
        │                         │
        │                         │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │   Service Worker        │
        │ (Cache + Offline Logic) │
        └────────────┬────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   Network            │
        │ (Supabase - Optional) │
        └────────────────────────┘
```

---

## Offline Capabilities

### What Works Offline ✅

**Full Bill Management**:
- ✅ Add new bills
- ✅ Edit existing bills
- ✅ Delete bills
- ✅ Record payments
- ✅ View all bills
- ✅ Search and filter bills
- ✅ View calendar view
- ✅ View analytics charts
- ✅ Change theme (dark/light mode)

**Settings Management**:
- ✅ Add/edit/delete custom categories
- ✅ Update payment frequency and dates
- ✅ Manage paycheck settings
- ✅ Toggle view options

**Data Import/Export**:
- ✅ Export data to JSON file
- ✅ Import data from JSON file

### Limitations ⚠️

**Cloud Sync Features** (Require Internet):
- ❌ Real-time sync across devices
- ❌ Cloud backup
- ❌ Automatic account recovery
- ❌ Shared access with other users

**Note**: These features are **optional**. The app works 100% offline without them.

---

## Cache Strategy

### Static Assets (Service Worker Cache)

**What is Cached**:
- HTML files
- CSS files
- JavaScript files
- Images and icons
- Fonts
- Manifest.json
- Service worker itself

**Cache Strategy**: `Cache First, Network Fallback`
```
1. Check service worker cache
2. If found → Use cached version
3. If not found → Fetch from network
4. Update cache with network response
```

**Benefits**:
- ✅ Instant page loads (from cache)
- ✅ Works completely offline
- ✅ Reduced server load
- ✅ Reduced bandwidth usage

**Cache Invalidation**:
```javascript
// Service worker checks cache version
const CACHE_VERSION = 'v1.0';
const CACHE_NAME = `bill-tracker-${CACHE_VERSION}`;

// When app is updated:
// 1. New version increments CACHE_VERSION
// 2. Service worker detects old cache
// 3. Old cache is deleted automatically
// 4. New assets are cached on first load
```

### Dynamic Data (IndexedDB)

**What is Stored**:
```javascript
{
  bills: [
    {
      id: "uuid",
      name: "Electric Bill",
      amount: 150,
      dueDate: "2026-02-15",
      paymentStatus: "pending",
      category: "Utilities",
      recurring: true,
      frequency: "monthly",
      // ... more fields
    }
  ],
  paymentSettings: {
    frequency: "bi-weekly",
    startDate: "2026-01-01",
    amount: 2500
  },
  customCategories: ["Utilities", "Groceries", ...],
  themePreference: "dark",
  // ... more user data
}
```

**Storage Strategy**: `IndexedDB for structured data`
- Automatically syncs to localStorage for app state
- IndexedDB queue tracks pending changes
- Queued changes upload when online

### Cache Size Limits

**Recommended Limits**:
- Static assets cache: 50-100 MB
- IndexedDB database: 50 MB (browser default)
- localStorage: 5-10 MB

**Monitoring Cache Size**:
```javascript
// Check IndexedDB usage in DevTools
// Application → Storage → Indexed Databases

// Check Cache Storage in DevTools
// Application → Cache Storage

// Browser cache size varies by device
// Mobile: typically 50-100 MB
// Desktop: typically 500 MB - 1 GB
```

---

## Offline Data Persistence

### Primary Storage: localStorage

**Purpose**: Store app state and bill data

**Data Structure**:
```javascript
localStorage = {
  'bills': JSON.stringify([...]),
  'paymentSettings': JSON.stringify({...}),
  'customCategories': JSON.stringify([...]),
  'selectedCategory': 'categoryName',
  'themePreference': 'dark' | 'light',
  'carriedForwardBills': JSON.stringify([...])
}
```

**Persistence Behavior**:
- ✅ Data persists across browser sessions
- ✅ Data persists during power loss
- ✅ Data persists when browser is closed
- ⚠️ Data lost if user clears browser storage
- ⚠️ Data isolated per browser and device

### Secondary Storage: IndexedDB

**Purpose**: Store sync queue and detailed transaction logs

**Data Structure**:
```javascript
IndexedDB {
  syncQueue: [
    {
      id: "sync-id-1",
      action: "create" | "update" | "delete",
      tableName: "bills",
      data: {...},
      timestamp: 1707000000,
      status: "pending" | "synced" | "failed"
    }
  ],
  offlineCache: {
    bills: [...],
    lastSync: 1707000000
  }
}
```

**Benefits**:
- ✅ Stores more data than localStorage
- ✅ Better for structured data
- ✅ Asynchronous access (doesn't block UI)
- ✅ Transaction support for data integrity

### Data Backup

**Automatic Backups**:
```javascript
// Bill Tracker automatically exports backup every hour
// File: bill-tracker-backup-YYYY-MM-DD.json
// Location: Downloads folder (if user allows)
```

**Manual Backup**:
1. Open Settings → Export Data
2. Choose format: JSON
3. Save file to safe location
4. Backup includes all bills and settings

**Recovery from Backup**:
1. Open Settings → Import Data
2. Select previously exported JSON file
3. Choose: Replace all data OR Merge with existing
4. App automatically validates import

---

## Sync Strategy

### When is Data Synced?

**Automatic Sync Triggers**:
1. **App startup** - Syncs any pending changes
2. **Every 30 seconds** - Checks for connectivity changes
3. **When online detected** - Immediately syncs pending changes
4. **User action** - "Sync Now" button in settings

**Manual Sync**:
```
Settings → General → Sync Now (Refresh Button)
```

### Sync Process Flow

```
┌─────────────────────────────────┐
│  Detect Online Connectivity     │
│  (navigator.onLine)             │
└────────────┬────────────────────┘
             │
             ▼ (Yes, online)
┌─────────────────────────────────┐
│  Retrieve Pending Changes       │
│  from IndexedDB Sync Queue      │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Validate Changes               │
│  (Type, structure, etc)         │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  Send to Supabase               │
│  (Using Supabase API)           │
└────────────┬────────────────────┘
             │
        ┌────┴────┐
        │          │
        ▼ Success  ▼ Failure
   ┌────────┐  ┌─────────────┐
   │ Remove │  │ Retry Logic │
   │ from   │  │ (Exponential│
   │ Queue  │  │  Backoff)   │
   └────────┘  └─────────────┘
```

### Conflict Resolution

**Scenario**: User edits bill offline, then another device updates same bill while offline

**Resolution Strategy**: `Last Write Wins (LWW)`

```javascript
// Bill A edited at 10:00 on Device 1 (offline)
// Bill A edited at 10:05 on Device 2 (online)
// When Device 1 syncs:
// - Device 2 version (10:05) is kept
// - Device 1 version is discarded
// - Sync indicator shows: "Remote version used"
```

**Conflict Handling**:
1. ✅ Minor conflicts (different fields) - auto-merge
2. ⚠️ Major conflicts (same field) - use remote version
3. 🔔 User notification - explains conflict resolution

### Retry Logic

**Failed Sync Behavior**:

```javascript
// Exponential backoff retry strategy
Attempt 1: Retry after 1 second
Attempt 2: Retry after 2 seconds
Attempt 3: Retry after 4 seconds
Attempt 4: Retry after 8 seconds
Attempt 5: Retry after 16 seconds

// After 5 failed attempts:
// - Queue persists in IndexedDB
// - User notified: "Sync pending - will retry when connection improves"
// - Retries resume automatically when online
```

**Error Scenarios**:

| Error | Cause | Action |
|-------|-------|--------|
| Network timeout | Internet lost | Retry with backoff |
| 401 Unauthorized | Auth expired | Show login prompt |
| 403 Forbidden | No permission | Show error, log out |
| 500 Server Error | Backend down | Retry with backoff |
| Validation error | Invalid data | Log error, skip item |

### Sync Status Indicator

**UI Indicators**:

```
🟢 Synced       → All data in sync with server
🟡 Syncing...   → Currently uploading changes
🔴 Sync Failed  → Error during sync (retry pending)
⚪ Offline      → No internet connection
```

**Status Display Location**:
- Top-right corner of dashboard
- Settings page (detailed sync history)
- Notification badge on bills when syncing

---

## Testing Offline Mode

### Enable Offline Testing in DevTools

**Chrome/Edge DevTools**:
```
1. Open DevTools (F12)
2. Go to "Network" tab
3. Find "Throttling" dropdown (top-left)
4. Select "Offline"
5. Browser now simulates offline mode
```

**Firefox DevTools**:
```
1. Open DevTools (F12)
2. Go to "Network" tab
3. Click settings gear icon
4. Enable "Disable all storage" (simulates offline)
```

**Safari DevTools**:
```
1. Open Develop menu
2. Select "Develop" → "Simulate Offline"
```

### Manual Offline Testing Checklist

**Test Case 1: Add Bill While Offline**
```
✅ Steps:
  1. Enable offline mode in DevTools
  2. Add new bill "Internet Bill - $50"
  3. Verify bill appears in list
  4. Close and reopen app
  5. Verify bill still there
  6. Go back online
  7. Verify sync indicator shows "Synced"
```

**Test Case 2: Edit Bill While Offline**
```
✅ Steps:
  1. Add bill while online
  2. Enable offline mode
  3. Edit bill amount to $100
  4. Go back online
  5. Verify sync completes
  6. Refresh page
  7. Verify amount is $100
```

**Test Case 3: Delete Bill While Offline**
```
✅ Steps:
  1. Add bill while online
  2. Enable offline mode
  3. Delete the bill
  4. Verify bill removed from list
  5. Go back online
  6. Verify sync completes
  7. Refresh page
  8. Verify bill still deleted on server
```

**Test Case 4: Switch Between Online/Offline**
```
✅ Steps:
  1. Start online with synced data
  2. Enable offline mode
  3. Add 3 bills
  4. Go back online
  5. Verify all 3 bills sync
  6. Wait for sync completion
  7. Refresh page
  8. Verify all 3 bills persist
```

**Test Case 5: Service Worker Cache**
```
✅ Steps:
  1. Load app while online
  2. DevTools → Application → Cache Storage
  3. Verify "bill-tracker-vX.X" cache exists
  4. Enable offline mode
  5. Refresh page (should load from cache)
  6. Verify app loads without network
  7. Verify offline.html or app shell appears
```

### Automated Test Suite

**Test File**: `tests/offlineMode.test.js`

```javascript
describe('Offline Mode', () => {
  test('Bills persist in localStorage while offline', async () => {
    const bill = { name: 'Test Bill', amount: 50, dueDate: '2026-02-15' };
    localStorage.setItem('bills', JSON.stringify([bill]));
    
    // Simulate offline
    navigator.onLine = false;
    
    const retrieved = JSON.parse(localStorage.getItem('bills'));
    expect(retrieved[0].name).toBe('Test Bill');
  });

  test('Sync queue stores changes when offline', async () => {
    const change = { action: 'create', data: {...} };
    indexedDB.add('syncQueue', change);
    
    const stored = await indexedDB.get('syncQueue');
    expect(stored.length).toBe(1);
  });

  test('Service worker serves cached assets when offline', async () => {
    const cache = await caches.open('bill-tracker-v1.0');
    const response = await cache.match('/index.html');
    expect(response).toBeDefined();
  });
});
```

**Run Tests**:
```bash
npm test -- tests/offlineMode.test.js
```

---

## Troubleshooting

### Issue: "Data doesn't persist after closing browser"

**Possible Causes**:
1. Browser set to clear storage on exit
2. Storage quota exceeded
3. localStorage disabled by browser settings

**Solutions**:
```
Chrome/Edge:
  Settings → Privacy → Cookies and other site data
  → Make sure "Keep local data" is enabled

Firefox:
  Preferences → Privacy & Security
  → Cookies and Site Data → "Always" use strict mode disabled

Safari:
  Preferences → Privacy
  → "Prevent cross-site tracking" OFF
  → Website Data: Keep stored data (don't delete on exit)
```

---

### Issue: "Sync stuck on 'Syncing...'"

**Possible Causes**:
1. Lost internet connection during sync
2. Supabase authentication expired
3. Invalid data in sync queue
4. Rate limiting from server

**Solutions**:
```
Quick Fix:
  1. Go to Settings
  2. Click "Sync Now" button
  3. Wait 30 seconds

If still stuck:
  1. Check internet connection
  2. Logout and login again (if using cloud sync)
  3. Open DevTools → Application → Indexed Databases
  4. Look at syncQueue table - check for errors
  5. Delete problematic sync entries manually

Last Resort:
  1. Export all data (Settings → Export)
  2. Clear browser storage (Settings → Clear Data)
  3. Refresh page
  4. Import data back
```

---

### Issue: "App loads offline page instead of app"

**Possible Causes**:
1. Service worker not activated
2. Cache corrupted
3. Browser cache not updated after app update

**Solutions**:
```
Option 1 - Force Update Service Worker:
  1. Open DevTools (F12)
  2. Application tab → Service Workers
  3. Click "Unregister" for bill-tracker-pwa
  4. Close DevTools
  5. Refresh page 3 times
  6. Service worker should re-register

Option 2 - Clear Cache:
  1. Open DevTools → Application → Cache Storage
  2. Right-click "bill-tracker-v*" cache
  3. Click "Delete"
  4. Refresh page
  5. Cache should rebuild

Option 3 - Hard Reset:
  Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
  This forces browser to skip all caches
```

---

### Issue: "Sync creates duplicate bills"

**Possible Causes**:
1. Sync retry created duplicate entries
2. UUID collision (extremely rare)
3. Merge conflict resolution

**Solutions**:
```
Prevention:
  - App uses UUID v4 for bill IDs (collision impossible)
  - Sync logic checks for duplicates before creating
  - If duplicates detected, they're merged automatically

If duplicates occur:
  1. Check if bills have same details (likely duplicates)
  2. Manually delete duplicate (app won't create new one)
  3. Sync should reconcile within 30 seconds
  4. If still duplicated, export data and contact support
```

---

### Issue: "High battery drain / App running in background"

**Possible Causes**:
1. Service worker constantly syncing
2. Network requests not throttled
3. Background script polling too frequently

**Solutions**:
```
Optimize Sync Frequency:
  Settings → Sync Settings
  Reduce sync frequency if not needed

Disable Background Sync (if available):
  Settings → Advanced
  Uncheck "Continuous Background Sync"

Check DevTools Performance:
  1. Open DevTools → Performance tab
  2. Record 10 seconds of app usage
  3. Look for constantly firing timers
  4. Report to developers if excessive

Battery Optimization:
  - App only syncs when changes detected
  - Service worker sleeps when no activity
  - No background tasks unless configured
```

---

### Issue: "Can't login (401 error) while offline"

**Explanation**: This is expected behavior

**Expected Behavior**:
- ✅ App works perfectly offline without login
- ✅ All local data remains accessible
- ❌ Cannot sync to cloud while offline
- ❌ Cannot create new cloud account offline

**When Connectivity Returns**:
1. Login automatically attempts
2. If credentials valid → sync resumes
3. If credentials invalid → shows login prompt
4. User can then login and sync

---

## Best Practices

### For Users

**✅ DO**:
- ✅ Regularly backup your data (Export JSON)
- ✅ Check sync status before closing browser
- ✅ Enable notifications for sync alerts
- ✅ Test offline mode occasionally
- ✅ Keep browser updated

**❌ DON'T**:
- ❌ Don't clear browser storage unless intentional (loses data)
- ❌ Don't disable service workers (breaks offline mode)
- ❌ Don't share Supabase credentials
- ❌ Don't rely only on cloud storage (always keep local backup)
- ❌ Don't edit data in two places simultaneously (conflicts)

### For Developers

**✅ DO**:
- ✅ Test every change in offline mode
- ✅ Monitor sync queue for anomalies
- ✅ Use Lighthouse PWA audit regularly
- ✅ Check service worker registration
- ✅ Validate data before sync

**❌ DON'T**:
- ❌ Don't add network-only operations (breaks offline)
- ❌ Don't store unencrypted sensitive data in localStorage
- ❌ Don't ignore sync errors
- ❌ Don't modify service worker without testing
- ❌ Don't assume internet always available

### Monitoring Offline Experience

**Key Metrics to Track**:

```javascript
// Track offline usage
const offlineSession = {
  startTime: new Date(),
  billsAdded: 0,
  billsEdited: 0,
  billsDeleted: 0,
  syncTime: null,
  syncStatus: 'pending' | 'success' | 'failed'
};

// Track sync performance
const syncMetrics = {
  duration: 500, // milliseconds
  itemsSync: 25,
  retries: 0,
  errors: []
};
```

---

## Frequently Asked Questions

### Q: Will I lose data if I clear browser storage?
**A**: Yes. localStorage stores all bills and settings. Clear it only if you want to reset everything. Always export first as backup.

---

### Q: Can I sync across multiple devices?
**A**: Not without Supabase (cloud sync). Each device has separate local storage. To share data:
1. Export from Device 1 (Settings → Export)
2. Import on Device 2 (Settings → Import)

---

### Q: Does offline mode work on mobile?
**A**: Yes! Bill Tracker PWA works perfectly offline on iOS and Android:
- Add to home screen for best experience
- Works in Safari, Chrome, Firefox on mobile
- Same offline capabilities as desktop

---

### Q: How much data can I store offline?
**A**: Typically 5-10 MB in localStorage + 50 MB in IndexedDB = ~55-60 MB total. Enough for ~5,000+ bills.

---

### Q: What happens if sync fails permanently?
**A**: Your local data is safe. The app:
1. Keeps local copy
2. Queues changes in IndexedDB
3. Retries sync automatically when online
4. Never loses data

---

### Q: Can I delete my Supabase account but keep local data?
**A**: Yes. Your local data persists independently:
1. Delete Supabase account
2. All local bills/settings remain
3. Disable cloud sync in settings
4. App continues to work offline

---

## References

- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Offline-First Architecture](https://offlinefirst.org/)

---

## Support

For issues or questions:
1. Check this guide first
2. Review [TROUBLESHOOTING.md](SETUP_TROUBLESHOOTING.md) for general issues
3. Check [SECURITY.md](SECURITY.md) for security-related questions
4. Open an issue on GitHub with:
   - Browser and OS
   - Steps to reproduce
   - DevTools console errors
   - IndexedDB state (screenshot)

