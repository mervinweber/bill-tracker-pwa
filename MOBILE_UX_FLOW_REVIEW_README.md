# Mobile UX Flow Review & Planning (March 2026)

## Purpose
This document captures the current bill payment schema review, UX pain points, and the prioritized implementation plan so we can reference a single source during upcoming planning and delivery.

## Current Payment Schema (As Implemented)
The app currently uses a hybrid payment model:

- **Bill-level state**
  - `isPaid`, `balance`, `amountDue`, `dueDate`, `recurrence`
- **Payment ledger**
  - `paymentHistory[]` entries with `date`, `amount`, `method`, `confirmationNumber`, `notes`
- **Recurring advancement behavior**
  - Due date advances when recurring bills are fully paid
  - Monthly overdue path supports `single-cycle` vs `catch-up-to-current`

Key flow locations:
- `src/components/billGrid.js`
- `src/handlers/billActionHandlers.js`
- `src/app.js`
- `src/utils/billHelpers.js`

## UX Assessment Summary
### What works
- Payment recording is flexible and supports partial payments.
- Recurring catch-up logic exists for long-overdue monthly bills.
- Accessibility coverage (ARIA/keyboard) has improved substantially.

### Why users still perceive clunkiness
1. **Too many payment entry points**
   - Paid toggle checkbox
   - Record Payment modal
   - Mark Paid from edit form
2. **High friction for common mobile action**
   - Fast user intent is usually “pay this now in full,” but modal asks for multiple details first.
3. **Dense control surfaces in header + sidebar**
   - Users make multiple state selections before seeing actionable bills.
4. **Ambiguous mental model between bill state and payment history**
   - Multiple ways to mark paid can feel inconsistent.
5. **Native confirm dialogs for critical branching**
   - Mobile UX for `OK/Cancel` strategy choice is not explicit enough.

## Product Direction (Recommended)
### Near-term (low risk, high impact)
- Make a **single primary payment path** from bill row.
- Add **one-tap quick pay full** in payment modal.
- Show bill context in modal (name + remaining).
- Move optional fields behind expandable details.

### Mid-term
- Reduce overlap between “toggle paid” and “record payment” to one consistent path.
- Replace native `confirm()` catch-up decision with explicit in-app action choices.

### Long-term schema target
Move toward a clearer domain split:
- **Bill Template** (recurrence, metadata)
- **Bill Instance** (cycle due amount/state)
- **Payment Event** (immutable ledger)

This model improves clarity for overdue handling, reporting, and mobile-first interactions.

## Prioritized Mobile UX Backlog
### P0 (Do first)
1. One-tap “Pay full today” flow
2. Payment modal context + streamlined defaults
3. Optional details collapsed by default

### P1
1. Replace native monthly catch-up confirm with explicit modal choices
2. Rework bill-row actions for touch targets and reduced icon overload

### P2
1. Simplify global controls (header/sidebar) into progressive disclosure on mobile
2. Add guided “Due now” queue with minimal controls

## This Branch Scope
This branch starts with the highest user-impact mobile improvements:
- Add payment modal summary context
- Add one-tap quick pay full action
- Keep optional payment metadata in expandable details
- Preserve existing validation, recurring logic, and test/build compatibility

## Validation Checklist for This Work
- [ ] Full test suite passes
- [ ] Build passes
- [ ] Payment modal still supports manual amount/date entry
- [ ] Quick pay path correctly records payment and updates recurring due date behavior
- [ ] Mobile viewport interaction feels faster with fewer taps

## Notes for Next Planning Session
When reviewing next iteration priorities, start with:
1. Consolidating duplicate payment paths
2. Replacing native monthly catch-up confirm UI
3. Mobile-first simplification of top-level filtering controls
