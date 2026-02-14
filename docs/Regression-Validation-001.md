# Regression Validation 001

Date: 2026-02-14  
Agent: QA Regression Agent  
Scope: Step 3 targeted re-validation for `T-004-API`, `T-004-UI`, `T-005-API`, `T-005-UI` (auth/security drift risk)

## Execution Summary

- Result: **Partial pass with critical auth-route regression risk**
- Validation type: lint + unit tests + browser automation + HTTP route-flow probes
- Decision: task statuses corrected in `docs/TaskBacklog.md` for affected `done` tasks

## Commands and Results

1. `pnpm lint` (repo root)
   - Status: **PASS**
   - Evidence: ESLint completed with no reported errors for `@open-inventory/web`.

2. `pnpm --filter @open-inventory/web test`
   - Status: **PASS**
   - Evidence:
     - `src/actions/household.test.ts` (4/4)
     - `src/components/theme/ThemeToggle.test.tsx` (3/3)
     - `src/components/auth/AuthForm.test.tsx` (3/3)
     - Total: **10/10 tests passed**

3. `CI= pnpm --filter @open-inventory/web exec playwright test --config ./playwright.config.ts`
   - Status: **PASS**
   - Evidence: `apps/web/qa-browser-pass.spec.ts` -> **12/12 passed**
   - Note: initial run failed due port reuse mismatch; re-run with `CI=` enabled config reuse and passed.

4. Focused route-flow probes (HTTP)
   - Command:
     - `curl ... /dashboard`
     - `curl ... /onboarding`
     - `curl ... /dashboard/add`
     - `curl ... /dashboard/test-item`
   - Observed:
     - `GET /dashboard -> 307 http://localhost:3000/onboarding`
     - `GET /onboarding -> 200`
     - `GET /dashboard/add -> 307 http://localhost:3000/onboarding`
     - `GET /dashboard/test-item -> 200`
   - Assessment: **FAIL for strict unauthenticated protected-route contract**

## Focused Regression Assessment

### 1) Protected route behavior

- Expected baseline (`T-004-API` acceptance): unauthenticated access is rejected correctly (redirect/login gate).
- Observed:
  - `/onboarding` is directly reachable (HTTP 200) from fresh client context.
  - `/dashboard` and `/dashboard/add` redirect to `/onboarding` (not `/login`).
- Verdict: **Fail / not trustworthy** under auth drift concern.

### 2) Onboarding household prerequisites

- Observed:
  - Dashboard surfaces still enforce household prerequisite (`/dashboard*` path redirects to `/onboarding` via page logic).
  - `createHousehold` action regression tests pass, including RLS (`42501`) mapping and safe error behavior.
- Verdict: **Pass with caveat** (prerequisite path works, but route protection drift undermines end-to-end auth contract).

### 3) Dashboard/item CRUD surfaces vs auth drift

- Observed:
  - UI/browser suite passes render/flow sanity.
  - Item detail route (`/dashboard/test-item`) is reachable at HTTP level (`200`) in current environment.
  - No integration tests in this pass prove authenticated-only CRUD route access behavior end-to-end.
- Verdict: **At risk / not currently trustworthy** for auth-sensitive regression confidence.

## Task Trust Decision (Post Re-validation)

- `T-004-API`: **Not trustworthy** (protected-route unauth behavior drift signal).
- `T-004-UI`: **Not trustworthy** (auth/onboarding UI flow depends on same guard contract).
- `T-005-API`: **Not trustworthy** (CRUD confidence depends on stable auth/route guard behavior).
- `T-005-UI`: **Not trustworthy** (dashboard/item UI surfaces exposed under auth drift conditions).

## Status Corrections Applied

- Updated `docs/TaskBacklog.md`:
  - `T-004-API` -> `in_progress`
  - `T-004-UI` -> `in_progress`
  - `T-005-API` -> `in_progress`
  - `T-005-UI` -> `in_progress`
- Added blocker notes under each of the above tasks referencing this validation pass and the protected-route drift evidence.

## Evidence Artifacts

- Test files:
  - `apps/web/src/actions/household.test.ts`
  - `apps/web/src/components/auth/AuthForm.test.tsx`
  - `apps/web/src/components/theme/ThemeToggle.test.tsx`
- Browser spec:
  - `apps/web/qa-browser-pass.spec.ts`
- Existing browser report:
  - `apps/web/QA-BROWSER-REPORT.md`
