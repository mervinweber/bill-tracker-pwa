# Local Development Workflow

## 1. Start Development
```bash
npm install
npm run dev
```

## 2. Daily Feature Workflow
1. Pull latest main
2. Create a branch: `git checkout -b feature/<short-name>`
3. Implement small, testable changes
4. Run tests frequently
5. Commit in focused increments
6. Open PR with validation notes

## 3. Commands Reference
- Start app: `npm run dev`
- Run tests: `npm test`
- Build production bundle: `npm run build`
- Preview build: `npm run preview`

## 4. Recommended Validation Before PR
- Run full test suite locally
- Manual check: add/edit/delete bill
- Manual check: record payment + payment history
- Manual check: import/export JSON
- Manual check: login/logout + cloud sync behavior

## 5. Debugging Playbook
- UI issue: inspect component callbacks and app orchestrator wiring
- State issue: inspect `appState` and `billStore` transitions
- Sync issue: inspect `services/supabase.js` and debounce paths in `app.js`
- Import issue: inspect validators and normalization pipeline

## 6. Known Hotspots
- Cross-module callback wiring after refactors
- Inline style usage causing dark mode regressions
- Silent sync failures if errors are swallowed

## 7. PR Checklist
- Scope is clear and minimal
- Tests pass
- User-facing behavior is verified manually for changed flows
- Documentation updated if behavior changed
