# Financial Planning Foundation

The Debt route now contains two compact views:

- **Debt plan** stores dedicated debts, compares snowball and avalanche strategies, and projects payoff dates and interest with monthly amortization.
- **Cash flow** combines bills, debt payments, paycheck settings or dedicated income sources, cash accounts, and saved what-if scenarios.

## Compatibility

Existing bill records are not rewritten. Bills with `debtTotal`, `interestRate`, or `includeInDebtSnowball` are adapted into the versioned financial plan and remain linked to their bill editor. Recurring occurrences are collapsed into one debt series.

Local planning data is stored under the `financialPlan` key with `schemaVersion: 1`. The record currently contains debts, accounts, income sources, budget categories, cash-flow scenarios, settings, and `updatedAt`.

## Cloud Deployment

Run the updated `scripts/supabase_security_policies.sql` in Supabase before expecting planning data to sync. It adds:

```sql
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS "financialPlan" JSONB;
```

The application retries bill-only synchronization when this optional column is not available, so the database migration can be deployed independently without interrupting the existing bill tracker.

## Verification

Before deployment, run:

```sh
npm test
npm run type-check
npm run build
npm run verify:sw-cache
```

Production security verification additionally requires a real `VITE_TURNSTILE_SITE_KEY` in the deployment environment.
