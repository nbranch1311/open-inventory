# Project Review 018: T-008.10-QA Stale-Item Flake Remediation Closure

**Date:** 2026-02-16  
**Reviewer:** QA + Reviewer Pod  
**Scope:** Re-run `T-008.10-QA` after stale-item selection flake remediation in `qa-inventory-space-management.spec.ts`

---

## 1) GO/NO-GO Summary

| Area | Verdict | Notes |
|------|---------|-------|
| Close `T-008.10-QA` | **GO** | Dedicated pre-AI usability gate is green in desktop + mobile scenarios |
| AI readiness (`T-009-AI`) | **GO (Ready)** | Prerequisite reviewer GO for `T-008.10-QA` is now satisfied |

Decision: **GO** for `T-008.10-QA` closure.  
Decision: `T-009-AI` may proceed (ready for dispatch).

---

## 2) Remediation Applied

- Updated stale-item selection sequence in `apps/web/qa-inventory-space-management.spec.ts` to explicitly wait for search-clear state before selecting stale item:
  - assert search input value is `''`,
  - assert URL no longer has `q` search param,
  - assert stale item checkbox is visible before `check()`.
- Test intent remains unchanged: still validates stale-item bulk-move failure handling and downstream limits behavior.

---

## 3) Commands and Results

1. `CI='' pnpm --filter @open-inventory/web exec playwright test qa-inventory-space-management.spec.ts --config playwright.config.ts`
   - Exit code: `0`
   - Output summary:
     - `2 passed (2)`
     - Desktop gate case passed
     - Mobile gate case passed

2. `pnpm --filter @open-inventory/web test src/components/inventory/RoomDashboardSurface.test.tsx src/app/dashboard/page.test.tsx`
   - Exit code: `0`
   - Output summary:
     - `Test Files 2 passed (2)`
     - `Tests 5 passed (5)`

---

## 4) Reviewer Recommendation

- Mark `T-008.10-QA` as `done`.
- Move pre-AI gate status to satisfied and allow `T-009-AI` dispatch.
- Keep `T-009-UI` dependent on `T-009-AI` sequencing as currently defined.
