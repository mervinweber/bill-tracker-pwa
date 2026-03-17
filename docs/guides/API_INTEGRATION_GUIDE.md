# API Integration Guide

## Scope
This guide covers Supabase authentication, cloud sync, token refresh, and offline behavior in Bill Tracker.

## Environment Setup
Required env keys:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`
- `VITE_TURNSTILE_SITE_KEY` (when CAPTCHA is enabled)

## Initialization Flow
1. App initializes local state and theme
2. `initializeSupabase()` validates configuration and endpoint reachability
3. `getUser()` resolves authenticated user (with cache)
4. If authenticated, app hydrates local data from cloud and performs merge sync

## Authentication Flow
- Sign in/up/reset managed by auth handlers
- On sign-in success:
  - local user identity stored for UI
  - cloud bills/payment settings fetched
  - local-to-cloud sync performed when needed

## Token Refresh and Session Expiry
- `setupTokenRefreshMonitor()` subscribes to auth state changes
- A warning is scheduled before expiry (`TOKEN_EXPIRY_WARNING_MS`)
- Silent refresh updates session without user interruption
- If session expires unexpectedly, user sees a re-auth prompt

## Cloud Sync Strategy
- Debounced sync from bill store changes
- Sync payload includes:
  - bills
  - payment settings
- Failures are logged and surfaced as non-blocking user notifications

## Offline Fallback
- Local storage remains source of continuity when network is unavailable
- User operations can continue locally
- Sync resumes when connectivity/auth is restored

## API Error Handling
- Return `{ data, error }` shape from service methods
- Map service errors to user-safe messages
- Avoid exposing raw backend details in UI

## Integration Testing Checklist
- Auth sign-in/sign-out with valid credentials
- Token warning appears before expiry window
- Session-expired prompt appears when refresh fails
- Bill create/edit/pay/delete triggers cloud sync
- Offline edits do not crash app
- Resumed connectivity syncs latest data
