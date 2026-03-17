# ADR 001: Modular Architecture

- Status: Accepted
- Date: 2026-03-16
- Decision Owner: Bill Tracker maintainers

## Context
The original orchestration and UI logic grew into large, tightly coupled files that made feature changes risky and slowed debugging. The application now includes offline behavior, authentication, cloud sync, import/export, and multiple views.

## Decision
Adopt a modular architecture with focused modules by responsibility:
- `src/components/*` for UI render and interaction boundaries
- `src/handlers/*` for business actions
- `src/store/*` for state and persistence boundaries
- `src/services/*` for external API integration
- `src/utils/*` for pure/shared utilities
- `src/app/*` for orchestrator helper modules extracted from `app.js`

## Why This Over Monolithic Files
- Improves change safety by reducing unrelated side effects
- Increases testability with smaller, isolated functions
- Improves review quality and ownership boundaries
- Supports staged refactors without full rewrites

## Trade-offs
- More files and imports to navigate
- Requires stricter conventions for module boundaries
- Some cross-module wiring moves complexity to integration points

## Consequences
- Feature work should prefer extracting logic into dedicated modules
- `app.js` remains orchestration-oriented and delegates work
- New behavior should include unit tests near the owning module
