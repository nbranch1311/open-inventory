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

## P0 Execution Mapping (2026-02-14, `T-004.8-API` Post-Env-Split Rerun)

Reference evidence: `docs/AuthQA-Execution-001.md`

| Area | Scenario | Status | Evidence |
| --- | --- | --- | --- |
| Signup | Email confirmation OFF (dev) | passed | `env:dev-target` JSON evidence (`/tmp/t0048-dev-qa-auth-p0.json`) shows signup probe passed with no skip annotations. |
| Signup | Email confirmation ON (staging/prod) | follow_up | Current green rerun executed during controlled staging window where confirmation was temporarily OFF; dedicated confirmation-ON validation remains open. |
| Login | Valid credentials | passed | Covered in both `env:dev-target` and post-fix `env:staging-target` deterministic runs. |
| Login | Invalid credentials | passed | Passed in both env legs on `qa-auth-p0.spec.ts`. |
| Session | Sign out from account menu | passed | Covered in `env:dev-target` full deterministic flow by clearing session and asserting redirect behavior. |
| Session | Back button after sign out | passed | Covered in `env:dev-target` full deterministic flow (`goBack` does not restore protected routes). |
| Session | Expired session on protected route | passed | Covered in `env:dev-target` full deterministic flow after cookie clear. |
| Onboarding | First household creation success | passed | Covered in `env:dev-target`; staging initially failed due missing RPC then passed after staging migration fix (`/tmp/t0048-staging-qa-auth-p0-postfix.json`). |
| Onboarding | Household creation policy failure (`42501`) | passed | Regression coverage remains green in `household.test.ts` policy mapping checks. |
| Route Guard | Unauthenticated access to `/dashboard` and `/onboarding` | passed | Passed in both env legs (`dev` and `staging`). |

## P0 Environment Mapping (Deterministic Target)

Evidence sources:
- `docs/EnvSplitChecklist001.md` Target Environment Model and QA Gate Readiness Mapping checklist.
- Scenario definitions in this matrix (including explicit `(dev)` and `(staging/prod)` labels).
- `docs/AuthQA-Execution-001.md` fresh rerun evidence including staging post-fix green run and confirmation-ON follow-up note.

| Area | Scenario | Intended Env | Mapping Basis | Evidence Coverage (2026-02-14) |
| --- | --- | --- | --- | --- |
| Signup | Email confirmation OFF (dev) | dev | Scenario label + Env Split target model states dev confirmation OFF. | passed in `env:dev-target` JSON evidence. |
| Signup | Email confirmation ON (staging/prod) | staging | Scenario label + Env Split target model states staging confirmation ON. | follow_up: dedicated confirmation-ON validation pending after policy restore. |
| Login | Valid credentials | dev + staging | Required Environments include both dev and staging for auth QA contract checks. | passed in both env legs post-fix. |
| Login | Invalid credentials | dev + staging | Required Environments include both dev and staging for auth QA contract checks. | passed in both env legs. |
| Session | Sign out from account menu | dev + staging | Required Environments include both dev and staging for auth QA contract checks. | covered by deterministic flow behavior; additional explicit menu-path parity can remain follow-up. |
| Session | Back button after sign out | dev + staging | Required Environments include both dev and staging for auth QA contract checks. | covered by deterministic flow behavior assertions. |
| Session | Expired session on protected route | dev + staging | Required Environments include both dev and staging for auth QA contract checks. | covered in post-fix deterministic runs. |
| Onboarding | First household creation success | dev (primary), staging (parity) | Env Split checklist requires deterministic onboarding reachability and reusable seeded accounts in both envs. | passed in dev and staging post-fix run. |
| Onboarding | Household creation policy failure (`42501`) | dev + staging | Policy/error mapping is release contract behavior and should be env-parity validated. | passed via regression tests; parity setup present in staging. |
| Route Guard | Unauthenticated access to `/dashboard` and `/onboarding` | dev + staging | Required Environments include both dev and staging for protected-route contract checks. | passed in both env legs. |
