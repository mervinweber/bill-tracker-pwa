# ADR 003: Listener Pattern for Reactivity

- Status: Accepted
- Date: 2026-03-16
- Decision Owner: Bill Tracker maintainers

## Context
The app is not using a framework-level reactive system. UI updates must remain consistent when state and bill data change.

## Decision
Use a listener/subscriber pattern for state and data updates:
- `appState.subscribe(...)` for view/filter/UI state updates
- `billStore.subscribe(...)` for bill collection changes and side effects (render, sync, reminders)

## Rationale
- Framework-independent, lightweight reactivity model
- Keeps render updates explicit and debuggable
- Enables centralized side effects on state transitions

## Trade-offs
- Ordering of listeners matters when side effects are chained
- Requires care to avoid redundant renders and loops
- Missing unsubscribe can create leaks in long-lived contexts

## Implementation Rules
- Subscribe during app initialization; unsubscribe in cleanup paths where applicable
- Keep listener callbacks small and delegate to handlers
- Debounce expensive side effects (for example cloud sync)

## Consequences
- New stateful features should integrate through existing subscription mechanisms
- Direct DOM mutation should remain coordinated through orchestrator/component boundaries
