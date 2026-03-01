# Changelog

## 2026-03-01

### Added
- **Analytics Forecasting**:
  - Spending forecast for next month based on recurring bills
  - 3-month trend analysis (up/down/flat with percentage)
  - Intelligent spending alerts (high amounts, overdue, due soon)
  - Real-time metrics dashboard in analytics view
  - Category-wise forecast breakdown
  
- **Mobile Optimizations**:
  - Swipe-to-delete gesture for bill rows on touch devices
  - Mobile-friendly form UX with larger touch targets
  - Offline operations queue system (max 250 operations)
  - Responsive viewport detection with mobile class
  - Improved form accessibility and touch targets
  
- **Improved Error Handling**:
  - Input validation in offline queue (operationType, data, id)
  - Operation size limits (10KB per operation)
  - Logging for invalid bills in forecasting calculations
  - Graceful error handling in all new utilities

- **New Utilities**:
  - `src/utils/forecastingHelpers.js` - Spending prediction and analysis engine
  - `src/utils/mobileGestures.js` - Touch gesture support
  - `src/utils/offlineQueue.js` - Enhanced offline operations queue

### Changed
- Offline queue now enforces max size (250 operations)
- Forecasting functions now log data quality issues
- Analytics view displays spending alerts prominently
- Bill form improved for mobile screens

### Notes
- Swipe-to-delete works alongside delete button (not replacement)
- Analytics features only show on unpaid bills
- Queue capacity defaults to 250 operations

---

### Added
- Bill reminders MVP with notification settings and due-soon reminder checks.
- Settings controls for reminders:
  - Enable/disable reminders globally
  - Reminder lead-time selection
  - Send test reminder action
  - Reminder history panel
- Per-bill reminder preference (`reminderEnabled`) in bill form.
- Inline reminder toggle in bill grid for fast per-bill updates.

### Changed
- App startup/store updates now trigger reminder checks when notifications are enabled.
- Imported bills now default `reminderEnabled` to `true` when field is absent.
- Service worker registration import is wired through app entry (`src/index.js`).

### Notes
- Existing date-sensitive validation test failures remain in `tests/validation.test.js` (`validatePaymentSettings` assertions) and are unchanged by this feature work.
