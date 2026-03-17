# ADR 002: Singleton Pattern for Shared State

- Status: Accepted
- Date: 2026-03-16
- Decision Owner: Bill Tracker maintainers

## Context
The app requires globally consistent state for bills, filters, selected pay period, and display mode. Multiple components interact with these values in one runtime context.

## Decision
Use singleton instances for core state and data stores:
- `billStore` as single source of truth for bill data
- `appState` as single source of truth for UI selection state

## Rationale
- Ensures all views/components observe the same state
- Removes duplicate state synchronization logic
- Simplifies subscriptions and cross-component updates

## Trade-offs
- Singleton access can become implicit coupling if overused
- Harder to isolate in some integration tests without reset hooks
- Requires discipline to avoid writing state from the wrong layer

## Guardrails
- Mutations should happen through store/action APIs, not direct object edits
- Keep side effects in handlers/services, not in raw store methods
- Prefer dependency injection in utility functions where practical

## Consequences
- New modules should consume existing singleton APIs instead of creating parallel stores
- Tests should reset singleton-backed state between cases
