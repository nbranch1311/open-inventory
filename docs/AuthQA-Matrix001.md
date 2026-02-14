# Auth QA Matrix 001

## Purpose

Define minimum QA coverage for auth/session/onboarding reliability before expanding UI scope.

## Test Matrix

| Area | Scenario | Expected Result | Priority |
| --- | --- | --- | --- |
| Signup | Email confirmation OFF (dev) | User can sign up and proceed by contract | P0 |
| Signup | Email confirmation ON (staging/prod) | User sees confirmation guidance; protected routes blocked until confirmed | P0 |
| Login | Valid credentials | Redirect by state contract (onboarding or dashboard) | P0 |
| Login | Invalid credentials | Inline user-safe error shown, no false success redirect | P0 |
| Session | Sign out from account menu | Session invalidated server+client; protected routes redirect to `/login` | P0 |
| Session | Back button after sign out | Authenticated pages are not restored | P0 |
| Session | Expired session on protected route | Redirect to `/login` with session-expired guidance | P0 |
| Onboarding | First household creation success | Household + owner membership created; redirect to dashboard | P0 |
| Onboarding | Household creation policy failure (`42501`) | User sees safe actionable error; internal diagnostics logged | P0 |
| Route Guard | Unauthenticated access to `/dashboard` and `/onboarding` | Redirect to `/login` | P0 |
| Theming | Auth + onboarding in light mode | Layout, copy, errors are readable and consistent | P1 |
| Theming | Auth + onboarding in dark mode | Layout, copy, errors are readable and consistent | P1 |
| Responsive | Auth + onboarding mobile viewport | Controls usable, no horizontal overflow, tap targets acceptable | P1 |
| Responsive | Auth + onboarding desktop viewport | Layout and interactions remain stable | P1 |

## Required Environments

- Local/dev (confirmation OFF allowed)
- Staging (confirmation ON)
- Production-like smoke validation for redirect contract

## Exit Criteria

- All P0 scenarios pass.
- No silent mutation failures in auth/onboarding flows.
- Redirect contract behavior matches `docs/AuthFlow001.md`.
- Known issues are documented with severity and owner.

## P0 Execution Mapping (2026-02-14, `T-004.8-API` Final Gate Re-Run)

Reference evidence: `docs/AuthQA-Execution-001.md`

| Area | Scenario | Status | Evidence |
| --- | --- | --- | --- |
| Signup | Email confirmation OFF (dev) | not_run | Controlled signup probe produced confirmation-required behavior, so OFF path was not active/reachable in this environment. |
| Signup | Email confirmation ON (staging/prod) | passed | Controlled signup probe stayed on `/signup` with user-safe alert `Confirm your email, then sign in to continue.` |
| Login | Valid credentials | passed | Seeded account (`nbranch1311@gmail.com`) signed in and landed on `/dashboard` deterministically. |
| Login | Invalid credentials | passed | Playwright `login invalid credentials shows safe error and no redirect` passed; remained on `/login` with safe error copy. |
| Session | Sign out from account menu | passed | Seeded signed-in run opened account menu and executed sign-out; app redirected to `/login`. |
| Session | Back button after sign out | passed | After sign-out redirect, browser back remained on `/login`; authenticated pages were not restored. |
| Session | Expired session on protected route | passed | Harness-feasible simulation (clear auth cookies) redirected protected route request to `/login`. |
| Onboarding | First household creation success | not_run | Still not exercised via fresh deterministic signup chain because current environment requires email confirmation on signup. |
| Onboarding | Household creation policy failure (`42501`) | passed | Fresh regression run passed: `pnpm test -- src/actions/household.test.ts src/actions/auth.test.ts src/utils/supabase/middleware.test.ts` (includes `household.test.ts` `42501` mapping checks). |
| Route Guard | Unauthenticated access to `/dashboard` and `/onboarding` | passed | Playwright strict unauth route assertions now pass; protected routes redirect to `/login`. |

## P0 Environment Mapping (Deterministic Target)

Evidence sources:
- `docs/EnvSplitChecklist001.md` Target Environment Model and QA Gate Readiness Mapping checklist.
- Scenario definitions in this matrix (including explicit `(dev)` and `(staging/prod)` labels).
- `docs/AuthQA-Execution-001.md` rerun evidence showing active environment behavior was confirmation-required.

| Area | Scenario | Intended Env | Mapping Basis | Evidence Coverage (2026-02-14) |
| --- | --- | --- | --- | --- |
| Signup | Email confirmation OFF (dev) | dev | Scenario label + Env Split target model states dev confirmation OFF. | not_run in rerun; active env behaved confirmation ON. |
| Signup | Email confirmation ON (staging/prod) | staging | Scenario label + Env Split target model states staging confirmation ON. | passed via controlled signup probe. |
| Login | Valid credentials | dev + staging | Required Environments include both dev and staging for auth QA contract checks. | passed in active confirmation-ON environment only. |
| Login | Invalid credentials | dev + staging | Required Environments include both dev and staging for auth QA contract checks. | passed via prior deterministic Playwright run. |
| Session | Sign out from account menu | dev + staging | Required Environments include both dev and staging for auth QA contract checks. | passed in active confirmation-ON environment only. |
| Session | Back button after sign out | dev + staging | Required Environments include both dev and staging for auth QA contract checks. | passed in active confirmation-ON environment only. |
| Session | Expired session on protected route | dev + staging | Required Environments include both dev and staging for auth QA contract checks. | passed in active confirmation-ON environment only. |
| Onboarding | First household creation success | dev (primary), staging (parity) | Env Split checklist requires deterministic onboarding reachability and reusable seeded accounts in both envs. | not_run in rerun due to confirmation-required signup behavior. |
| Onboarding | Household creation policy failure (`42501`) | dev + staging | Policy/error mapping is release contract behavior and should be env-parity validated. | passed via unit coverage evidence. |
| Route Guard | Unauthenticated access to `/dashboard` and `/onboarding` | dev + staging | Required Environments include both dev and staging for protected-route contract checks. | passed via strict unauth route assertions. |
