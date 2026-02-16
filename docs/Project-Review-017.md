# Project Review 017: T-008.10-QA Re-run After Migration Remediation

**Date:** 2026-02-16  
**Reviewer:** QA + Reviewer Pod  
**Scope:** Re-run `T-008.10-QA` dedicated gate and supporting tests after spaces/rooms + membership enforcement migration remediation

---

## 1) GO/NO-GO Summary

| Area | Verdict | Blocking Findings |
|------|---------|-------------------|
| Close `T-008.10-QA` | **NO-GO** | Dedicated desktop E2E gate now fails later at stale-item bulk-move setup (`getByLabel('Select <stale item>')` times out) |
| AI readiness (`T-009-AI`) | **NO-GO** | AI phase is not ready; prerequisite reviewer GO for `T-008.10-QA` is still missing |

Decision: **NO-GO** for `T-008.10-QA` closure.  
Decision: `T-009-AI` and `T-009-UI` remain blocked.

---

## 2) QA Coverage Executed

- Dedicated gate:
  - `apps/web/qa-inventory-space-management.spec.ts`
- Targeted supporting tests:
  - `apps/web/src/components/inventory/RoomDashboardSurface.test.tsx`
  - `apps/web/src/app/dashboard/page.test.tsx`

---

## 3) Commands and Results

1. `pnpm --filter @open-inventory/web exec playwright test qa-inventory-space-management.spec.ts`
   - Exit code: `1`
   - Output summary:
     - Runner bootstrap blocked: `http://localhost:3000 is already used` with webServer start conflict.

2. `CI='' pnpm --filter @open-inventory/web exec playwright test qa-inventory-space-management.spec.ts`
   - Exit code: `1`
   - Output summary:
     - `1 failed`
     - `1 passed (4.2m)`
   - Failure detail:
     - Test: desktop gate case
     - Assertion: `locator.check()`
     - Locator: `getByLabel('Select <stale item name>')`
     - Error: `Test timeout of 240000ms exceeded`
     - Location: `apps/web/qa-inventory-space-management.spec.ts:189`

3. `pnpm --filter @open-inventory/web test src/components/inventory/RoomDashboardSurface.test.tsx src/app/dashboard/page.test.tsx`
   - Exit code: `0`
   - Output summary:
     - `Test Files 2 passed (2)`
     - `Tests 5 passed (5)`
     - `Duration 1.11s`

---

## 4) Blocking Findings

1. **P0 - Dedicated desktop E2E gate still fails in desktop scenario (new blocker stage)**
   - The selected-space delete-warning assertion issue was remediated in the spec flow (edit mode is reopened and warning copy assertion is aligned).
   - The same desktop gate now fails later while trying to check the stale-item selection checkbox for bulk-move failure validation.
   - This still blocks deterministic closure evidence for `T-008.10-QA`.

---

## 5) Reviewer Recommendation

- Keep `T-008.10-QA` open (`todo`) and do not issue GO yet.
- Keep `T-009-AI` and `T-009-UI` blocked; AI readiness remains **NO-GO** until `T-008.10-QA` gets a clean dedicated gate rerun and explicit reviewer GO.
