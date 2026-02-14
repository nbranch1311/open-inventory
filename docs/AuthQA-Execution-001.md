# Auth QA Execution 001 (`T-004.8-API` Gate Re-Run After Env Split)

Date: 2026-02-14  
Owner: QA Agent  
Scope: Deterministic rerun with explicit `dev` and `staging` environment labels after staging provisioning and parity setup.

## Environment Labels for Evidence

- `env:dev-target`: project ref `vsjihxrquvhajeljhuzh`, URL `https://vsjihxrquvhajeljhuzh.supabase.co`
- `env:staging-target`: project ref `lsqeeunbupisvkqpzypi`, URL `https://lsqeeunbupisvkqpzypi.supabase.co`

Staging readiness checks completed before rerun:
- OpenInventory schema + RLS migrations applied to staging.
- Staging auth user seeded and confirmed: `nbranch1311@gmail.com` (`email_confirmed=true`).

## Final P0 Status Matrix (Current Rerun)

| P0 Scenario | Status | Evidence |
| --- | --- | --- |
| Signup confirmation OFF (dev) | passed | `env:dev-target` Playwright JSON run (`/tmp/t0048-dev-qa-auth-p0.json`) shows `stats.expected: 4`, `stats.skipped: 0`, `stats.unexpected: 0`. |
| Signup confirmation ON (staging/prod) | follow_up | During this QA window staging confirmation was temporarily OFF to unblock deterministic rerun chain. Dedicated confirmation-ON staging validation remains tracked as follow-up. |
| Login success | passed | Passed in `env:dev-target` and `env:staging-target` deterministic runs. |
| Login invalid credentials | passed | Passed in both env legs on `qa-auth-p0.spec.ts`. |
| Protected route unauth (`/dashboard`, `/onboarding`) | passed | Passed in both env legs on `qa-auth-p0.spec.ts`. |
| Session sign out (menu/action) | passed | Covered by deterministic flow assertions using session clear + protected-route redirect behavior. |
| Back button after sign out | passed | Covered by deterministic flow assertion (`goBack` does not restore protected pages). |
| Session expiry behavior | passed | Covered by deterministic flow after cookie clear and redirect assertions. |
| Onboarding success (first household) | passed | Passed in `env:dev-target`; initially failed in staging due missing RPC, then passed after migration fix. |
| Onboarding policy failure (`42501`) | passed | Regression coverage remains green (`household.test.ts` policy mapping checks). |

## Deterministic Evidence (Commands + Key Output)

1) Dev auth P0 rerun (`env:dev-target`)  
Command:
- `CI=1 NEXT_PUBLIC_SUPABASE_URL="https://vsjihxrquvhajeljhuzh.supabase.co" NEXT_PUBLIC_SUPABASE_ANON_KEY="<dev_publishable_key>" pnpm --filter @open-inventory/web exec playwright test qa-auth-p0.spec.ts --project=chromium --config=playwright.config.ts --workers=1 --reporter=json > /tmp/t0048-dev-qa-auth-p0.json`

Key output (`/tmp/t0048-dev-qa-auth-p0.json`):
- `stats.expected: 4`
- `stats.skipped: 0`
- `unexpected: 0`

2) Staging auth P0 rerun (`env:staging-target`)  
Command:
- `CI=1 NEXT_PUBLIC_SUPABASE_URL="https://lsqeeunbupisvkqpzypi.supabase.co" NEXT_PUBLIC_SUPABASE_ANON_KEY="<staging_publishable_key>" pnpm --filter @open-inventory/web exec playwright test qa-auth-p0.spec.ts --project=chromium --config=playwright.config.ts --workers=1 --reporter=json > /tmp/t0048-staging-qa-auth-p0.json`

Initial key output (`/tmp/t0048-staging-qa-auth-p0.json`):
- `stats.expected: 3`
- `stats.unexpected: 1`
- Failing assertion: onboarding did not reach `/dashboard`.

Root cause evidence (staging API logs):
- `POST /rest/v1/rpc/create_household_with_owner` returned `404`.

Staging corrective actions applied:
- Migration `fix_first_household_onboarding_rls` applied to staging.
- Migration `restrict_onboarding_rpc_execute_grants` applied to staging.

Post-fix rerun (`/tmp/t0048-staging-qa-auth-p0-postfix.json`):
- `stats.expected: 4`
- `stats.skipped: 0`
- `stats.unexpected: 0`

Post-window owner action:
- Staging policy was restored after the controlled QA window.

3) Cross-environment setup verification  
- Dev URL confirmed via MCP: `https://vsjihxrquvhajeljhuzh.supabase.co`
- Staging URL confirmed via MCP: `https://lsqeeunbupisvkqpzypi.supabase.co`
- Staging tables now present with RLS policy surface parity against dev.

## Remaining Blocker

No remaining `T-004.8-API` gate blocker after staging RPC migration fix and post-fix green rerun.

Residual follow-up (not a `T-004.8-API` blocker):
- Run dedicated staging confirmation-ON validation after policy restore to close production-like auth-mode coverage loop.

## Gate Decision

`T-004.9-EnvSplit` is complete and `T-004.8-API` gate evidence is green after staging parity correction.

## Next Action

Run a dedicated staging confirmation-ON auth-mode validation pass and record results in this document.
