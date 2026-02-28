# Changelog

## 2026-02-28

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
