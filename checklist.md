# Release & Security Checklist

## Current Automated Status (already completed)
- [x] Full test suite passes
- [x] Production build passes (`npm run build`)
- [x] Service worker cache manifest validates (`node scripts/validate_service_worker_cache.mjs`)
- [x] Runtime dependency audit clean (`npm audit --omit=dev`)
- [x] Branch is clean and synced on `main`

## Manual Smoke Tests (do before deploy)
- [ ] Settings: Clean Up Unused -> Save with old paycheck start date (should save without forcing schedule change)
- [ ] Settings: change schedule fields (start date/frequency/pay periods) and confirm validation still applies correctly
- [ ] Import a valid JSON backup (should import and refresh successfully)
- [ ] Import invalid JSON data (bad amount, malformed payment history, invalid payment settings) and confirm friendly error
- [ ] Import oversized/very large bill file and confirm it is rejected safely
- [ ] Login + rapid bill edits (create/edit/pay/delete) and confirm cloud sync works without obvious request spam
- [ ] Record payment on long-overdue monthly recurring bill and confirm prompt options behave correctly

## Go / No-Go Gate
- [ ] No console errors during key flows above
- [ ] No blocking UI issues on desktop + mobile viewport
- [ ] Data persists correctly after reload
- [ ] Cloud sync state is consistent after login/logout

## Deployment Steps
- [ ] Create release tag (e.g., `v1.0.x`)
- [ ] Deploy from current `main`
- [ ] Verify deployed app loads manifest/service worker correctly
- [ ] Run 5-minute post-deploy smoke pass on production URL

## Post-Deploy Monitoring (first session)
- [ ] Watch browser console/network for auth or sync error bursts
- [ ] Confirm no unexpected Supabase call spikes
- [ ] Confirm imports and settings saves continue to behave as expected
