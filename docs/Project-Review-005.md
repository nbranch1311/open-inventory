# Project Review 005: Final Gate Decision for `T-004.8-API`

**Document:** `Project-Review-005`  
**Reviewer:** Project Reviewer Agent  
**Date:** 2026-02-14  
**Scope:** Final GO/NO-GO decision for closing `T-004.8-API` using latest QA and regression artifacts.

---

## Verdict

**NO-GO** for closing `T-004.8-API`.

`T-004.8-API` remains **blocked**. P0 is not clean, and deterministic full end-to-end acceptance has not passed in this gate attempt.

---

## Evidence Summary

1. **P0 route-guard contract has a hard fail**
   - `docs/AuthQA-Execution-001.md` records Playwright failure for strict unauthenticated access assertions.
   - Expected: unauthenticated `/dashboard` and `/onboarding` redirect to `/login`.
   - Observed: `/dashboard` resolves to `/onboarding`.

2. **Regression validation confirms critical auth-route drift risk**
   - `docs/Regression-Validation-001.md` reports:
     - `GET /dashboard -> 307 /onboarding`
     - `GET /onboarding -> 200`
     - `GET /dashboard/test-item -> 200`
   - Assessment in artifact: strict unauthenticated protected-route contract is failing/trust is not restored.

3. **Deterministic full E2E acceptance path is still not executed successfully**
   - Required release-critical path remains pending:
     - `signup -> login -> onboarding -> household creation -> dashboard`
   - `docs/AuthQA-Execution-001.md` marks this as `not_run` due signup rate limiting.

4. **P0 matrix remains partially unexecuted**
   - `docs/AuthQA-Matrix001.md` still contains multiple `not_run` P0 lines (signup OFF/ON branch assertion, valid-login contract, sign-out/back-button, expired-session, onboarding success path).
   - Only partial pass evidence exists (`invalid credentials` and `42501` mapping test coverage).

5. **QA spec additions do not override failing gate evidence**
   - `apps/web/qa-auth-p0.spec.ts` defines correct strict assertions and deterministic flow intent, but current run evidence includes one fail and skipped/blocked paths.

---

## Blockers

1. **Critical:** Unauthenticated route-guard contract is not compliant with P0 expectation (`/dashboard` and `/onboarding` must resolve to `/login`).
2. **Critical:** Deterministic release-critical E2E flow has not produced a passing evidence run.
3. **High:** Signup rate limiting prevents deterministic credential lifecycle execution for P0 scenarios in current environment.
4. **High:** Sign-out/back-button P0 lines remain unverified because sign-out capability is not implemented (`T-004.5-UI`, `T-004.6-API` pending).

---

## Exact Next Actions

1. Fix guard/middleware/page-level redirect contract so unauthenticated requests to `/dashboard` and `/onboarding` deterministically land on `/login`.
2. Provide deterministic QA credential strategy for gate execution (seeded reusable QA user, or temporary rate-limit relief/reset window).
3. Implement and wire sign-out/session lifecycle actions (`T-004.5-UI`, `T-004.6-API`) so sign-out + back-button P0 lines are executable.
4. Re-run `qa-auth-p0.spec.ts` and update `docs/AuthQA-Execution-001.md` + `docs/AuthQA-Matrix001.md` with command-level evidence showing all P0 lines **passed** (no unresolved fail/blocked/not_run).
5. Re-open final gate only after step 4 is complete; close `T-004.8-API` only when P0 is clean and deterministic full E2E is passed.
